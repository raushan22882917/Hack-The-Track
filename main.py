"""
Telemetry Rush - Unified Backend Server
All services consolidated into one FastAPI application running on port 8000

Features:
- REST API endpoints for controls and data access
- Telemetry, Endurance, and Leaderboard services
- Telemetry preprocessing (converts raw telemetry data to per-vehicle CSVs)
- Real-time data via polling REST endpoints
- All running on a single port (8000)
"""

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import asyncio
import json
from typing import Dict, List, Optional
from datetime import datetime
import uvicorn
import pandas as pd
import numpy as np
from collections import defaultdict
from dateutil import parser as dtparser
import glob
import os
from pathlib import Path
import logging
import sys
import warnings
import bisect
import concurrent.futures

# Suppress uvicorn warnings
logging.getLogger("uvicorn.error").setLevel(logging.ERROR)
logging.getLogger("fastapi").setLevel(logging.WARNING)

# Suppress Windows asyncio ProactorEventLoop socket shutdown warnings
if sys.platform == 'win32':
    # Suppress the specific asyncio ProactorEventLoop socket shutdown error
    warnings.filterwarnings('ignore', category=RuntimeWarning, module='asyncio')
    
    # Also suppress the exception in the event loop callback
    def suppress_proactor_error():
        import asyncio
        original_call_connection_lost = None
        
        try:
            from asyncio.proactor_events import _ProactorBasePipeTransport
            original_call_connection_lost = _ProactorBasePipeTransport._call_connection_lost
            
            def patched_call_connection_lost(self, exc):
                try:
                    return original_call_connection_lost(self, exc)
                except (OSError, AttributeError):
                    # Silently ignore socket shutdown errors on Windows
                    pass
            
            _ProactorBasePipeTransport._call_connection_lost = patched_call_connection_lost
        except (ImportError, AttributeError):
            pass
    
    suppress_proactor_error()

app = FastAPI(title="Telemetry Rush API", version="2.0.0")

# CORS middleware - must be added before exception handlers
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Exception handler to ensure CORS headers are added to error responses
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Ensure CORS headers are added to HTTP error responses"""
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "*",
            "Access-Control-Allow-Headers": "*",
        }
    )

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Ensure CORS headers are added to error responses"""
    import traceback
    error_detail = str(exc)
    print(f"⚠️ Unhandled exception: {error_detail}")
    traceback.print_exc()
    
    return JSONResponse(
        status_code=500,
        content={"detail": error_detail, "error": "Internal server error"},
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "*",
            "Access-Control-Allow-Headers": "*",
        }
    )

# Connection tracking removed - using pure REST API with polling

# Data cache for REST API
telemetry_cache: Dict = {}
endurance_cache: List = []
leaderboard_cache: List = []

# Telemetry playback state
telemetry_is_paused = True
telemetry_is_reversed = False
telemetry_has_started = False
telemetry_playback_speed = 1.0
telemetry_master_start_time = None
telemetry_playback_start_timestamp = None
telemetry_rows = []
telemetry_pending_rows = []
telemetry_broadcast_task = None
telemetry_df = None  # Keep DataFrame for efficient lookups
telemetry_data_loaded = False  # Flag to track if data is loaded

# Endurance state
endurance_broadcast_task = None
endurance_df = None
endurance_data_loaded = False

# Leaderboard state
leaderboard_broadcast_task = None
leaderboard_df = None
leaderboard_data_loaded = False


def get_project_root():
    """Get the fastapi-server directory (where this file is located)"""
    current_file = Path(__file__).resolve()
    return current_file.parent


def cast_num(x):
    """Cast value to number or None"""
    try:
        if pd.isna(x):
            return None
        return float(x)
    except Exception:
        return x


# ==================== TELEMETRY PREPROCESSING ====================

# Configuration for preprocessing
KEEP_NAMES = {
    "nmot",
    "aps",
    "gear",
    "VBOX_Lat_Min",
    "VBOX_Long_Minutes",
    "Laptrigger_lapdist_dls",
    "speed",
    "accx_can",
    "accy_can",
    "pbrake_f",
    "pbrake_r",
    "Steering_Angle"
}

CHUNK_SIZE = 200_000


def latlon_to_xy(lat, lon):
    """Convert latitude/longitude to x/y coordinates"""
    R = 6371000
    x = R * np.radians(lon)
    y = R * np.log(np.tan(np.pi / 4 + np.radians(lat) / 2))
    return np.array([x, y])


def directional_filter(df):
    """Filter telemetry data based on direction to remove outliers"""
    df = df.sort_values("meta_time").reset_index(drop=True)
    lat_rows = df[df["telemetry_name"] == "VBOX_Lat_Min"].reset_index(drop=True)
    lon_rows = df[df["telemetry_name"] == "VBOX_Long_Minutes"].reset_index(drop=True)

    if len(lat_rows) != len(lon_rows):
        return df
    if len(lat_rows) < 3:
        return df

    filtered_indices = [0, 1, 2]
    for i in range(3, len(lat_rows)):
        p0 = latlon_to_xy(lat_rows.loc[filtered_indices[-3], "telemetry_value"],
                          lon_rows.loc[filtered_indices[-3], "telemetry_value"])
        p1 = latlon_to_xy(lat_rows.loc[filtered_indices[-2], "telemetry_value"],
                          lon_rows.loc[filtered_indices[-2], "telemetry_value"])
        p2 = latlon_to_xy(lat_rows.loc[filtered_indices[-1], "telemetry_value"],
                          lon_rows.loc[filtered_indices[-1], "telemetry_value"])
        p3 = latlon_to_xy(lat_rows.loc[i, "telemetry_value"],
                          lon_rows.loc[i, "telemetry_value"])
        if np.dot(p2 - p1, p3 - p2) > 0:
            filtered_indices.append(i)

    lat_filtered = lat_rows.loc[filtered_indices]
    lon_filtered = lon_rows.loc[filtered_indices]
    others = df[~df["telemetry_name"].isin(["VBOX_Lat_Min", "VBOX_Long_Minutes"])]
    filtered_df = pd.concat([lat_filtered, lon_filtered, others], ignore_index=True)
    return filtered_df.sort_values("meta_time").reset_index(drop=True)


def _preprocess_telemetry_data_sync(input_file: str, output_dir: Path):
    """
    Synchronous preprocessing function (internal)
    Preprocess raw telemetry data into per-vehicle CSV files
    """
    output_dir.mkdir(parents=True, exist_ok=True)
    vehicle_data = {}
    
    print(f"\n{'='*60}")
    print(f"Preprocessing Telemetry Data")
    print(f"{'='*60}")
    print(f"Input file: {input_file}")
    print(f"Output directory: {output_dir}")
    print(f"Processing CSV in chunks with filtering and cleanup...")
    
    try:
        # Process file in chunks
        for chunk in pd.read_csv(input_file, chunksize=CHUNK_SIZE):
            chunk["meta_time"] = pd.to_datetime(chunk["meta_time"], utc=True, errors="coerce")
            chunk = chunk.dropna(subset=["meta_time"])

            # Extract lap changes only
            lap_changes = (
                chunk[["meta_time", "vehicle_id", "lap"]]
                .dropna(subset=["lap"])
                .sort_values(["vehicle_id", "meta_time"])
                .drop_duplicates(subset=["vehicle_id", "lap"])
                .copy()
            )
            lap_changes["telemetry_name"] = "lap"
            lap_changes["telemetry_value"] = lap_changes["lap"]
            lap_changes = lap_changes.drop(columns=["lap"])

            # Filter telemetry signals
            chunk = chunk[chunk["telemetry_name"].isin(KEEP_NAMES)]

            # Aggregate duplicates
            chunk = (
                chunk.groupby(["meta_time", "vehicle_id", "telemetry_name"], as_index=False)
                     .agg({"telemetry_value": "median"})
            )

            # Format timestamps
            chunk["meta_time"] = pd.to_datetime(chunk["meta_time"], utc=True, errors="coerce")
            lap_changes["meta_time"] = pd.to_datetime(lap_changes["meta_time"], utc=True, errors="coerce")

            # Combine telemetry and lap rows
            combined = pd.concat([chunk, lap_changes], ignore_index=True)
            combined["meta_time"] = combined["meta_time"].dt.strftime("%Y-%m-%dT%H:%M:%S.%fZ").str[:-3] + "Z"

            for vid, df_vid in combined.groupby("vehicle_id"):
                if vid not in vehicle_data:
                    vehicle_data[vid] = []

                df_vid = directional_filter(df_vid)
                df_vid = df_vid.drop(columns=["vehicle_id"], errors="ignore")
                vehicle_data[vid].append(df_vid)
        
        print("Merging and exporting per-vehicle CSVs...")
        
        # Merge and export per-vehicle CSVs
        results = {}
        for vid, parts in vehicle_data.items():
            df = pd.concat(parts, ignore_index=True)
            df = df.sort_values("meta_time")

            out_path = output_dir / f"{vid}.csv"
            df.to_csv(out_path, index=False)
            results[vid] = {
                "path": str(out_path),
                "rows": len(df)
            }
            print(f"✅ Exported {vid} → {out_path} ({len(df)} rows)")
        
        print(f"All vehicles processed with lap telemetry injected only on change.")
        print(f"{'='*60}\n")
        
        return {
            "status": "success",
            "message": f"Successfully processed {len(results)} vehicles",
            "input_file": input_file,
            "output_dir": str(output_dir),
            "vehicles": results,
            "vehicle_count": len(results),
            "total_rows": sum(r["rows"] for r in results.values())
        }
        
    except Exception as e:
        error_msg = f"Error preprocessing telemetry data: {str(e)}"
        print(f"⚠️ {error_msg}")
        import traceback
        traceback.print_exc()
        return {
            "status": "error",
            "message": error_msg,
            "error": str(e)
        }


async def preprocess_telemetry_data(input_file: str = None, output_dir: str = None):
    """
    Preprocess raw telemetry data into per-vehicle CSV files
    
    Args:
        input_file: Path to raw telemetry CSV file (e.g., R1_barber_telemetry_data.csv)
        output_dir: Directory to write processed vehicle CSV files
    
    Returns:
        dict: Status and results of preprocessing
    """
    project_root = get_project_root()
    
    # Set default paths if not provided
    if input_file is None:
        # Try multiple possible locations
        possible_inputs = [
            project_root / "logs" / "R1_barber_telemetry_data.csv",
            project_root.parent / "telemetry-server" / "logs" / "R1_barber_telemetry_data.csv",
        ]
        input_file = None
        for path in possible_inputs:
            if path.exists():
                input_file = str(path)
                break
        
        if input_file is None:
            # Check if data is already processed
            vehicles_dir = project_root / "logs" / "vehicles"
            if vehicles_dir.exists() and len(list(vehicles_dir.glob("*.csv"))) > 0:
                return {
                    "status": "info",
                    "message": "Data is already processed. Vehicle CSV files found in logs/vehicles/",
                    "vehicles_dir": str(vehicles_dir),
                    "vehicle_count": len(list(vehicles_dir.glob("*.csv")))
                }
            
            return {
                "status": "error",
                "message": f"Input file not found. Searched: {[str(p) for p in possible_inputs]}",
                "note": "If data is already processed, check logs/vehicles/ directory"
            }
    else:
        # Resolve relative paths
        if not os.path.isabs(input_file):
            input_file = str(project_root / input_file)
    
    if not os.path.exists(input_file):
        return {
            "status": "error",
            "message": f"Input file not found: {input_file}"
        }
    
    if output_dir is None:
        output_dir = project_root / "logs" / "vehicles"
    else:
        if not os.path.isabs(output_dir):
            output_dir = project_root / output_dir
    
    output_dir = Path(output_dir)
    
    # Run synchronous preprocessing in executor to avoid blocking event loop
    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(
        None,
        _preprocess_telemetry_data_sync,
        input_file,
        output_dir
    )
    
    return result


# ==================== DATA LOADING (Pre-load on startup) ====================

async def load_telemetry_data():
    """Pre-load telemetry data on server startup for fast access"""
    global telemetry_rows, telemetry_pending_rows, telemetry_df, telemetry_data_loaded
    global telemetry_playback_start_timestamp
    
    if telemetry_data_loaded:
        return True
    
    print("\n" + "="*60)
    print("Loading Telemetry Data (Pre-loading for fast access)...")
    print("="*60)
    
    project_root = get_project_root()
    input_dir = project_root / "logs" / "vehicles"
    weather_file = project_root / "logs" / "R1_weather_data.csv"
    
    # Load vehicle telemetry
    vehicle_files = glob.glob(str(input_dir / "*.csv"))
    if not vehicle_files:
        print(f"⚠️ WARNING: No vehicle CSVs found in {input_dir}")
        return False
    
    print(f"✅ Found {len(vehicle_files)} vehicle CSV files")
    print(f"Loading vehicle telemetry files (this may take a moment)...")
    
    # Load files in parallel using asyncio
    import concurrent.futures
    loop = asyncio.get_event_loop()
    
    def load_file(f):
        try:
            vehicle_id = os.path.splitext(os.path.basename(f))[0]
            df = pd.read_csv(f, parse_dates=["meta_time"], low_memory=False)
            df["meta_time"] = pd.to_datetime(df["meta_time"], utc=True, errors="coerce")
            df["vehicle_id"] = vehicle_id
            return df
        except Exception as e:
            print(f"⚠️ ERROR: Failed to load {f}: {e}")
            return None
    
    # Load files concurrently
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
        dfs = await asyncio.gather(*[
            loop.run_in_executor(executor, load_file, f) 
            for f in vehicle_files
        ])
    
    # Filter out None results
    dfs = [df for df in dfs if df is not None]
    
    if not dfs:
        print("⚠️ WARNING: No vehicle telemetry data could be loaded.")
        return False
    
    # Combine and sort
    telemetry_df = pd.concat(dfs, ignore_index=True)
    telemetry_df = telemetry_df.sort_values("meta_time").reset_index(drop=True)
    
    # Convert to list of dicts (only once, after sorting)
    # Use list() to avoid keeping reference to DataFrame
    telemetry_rows = list(telemetry_df.to_dict("records"))
    # Don't copy here - will be set when playback starts
    telemetry_pending_rows = []
    
    if len(telemetry_rows) > 0:
        telemetry_playback_start_timestamp = telemetry_rows[0]["meta_time"]
    
    print(f"✅ Loaded {len(telemetry_df)} telemetry records from {len(dfs)} vehicle files")
    print(f"   Data range: {telemetry_rows[0]['meta_time'] if telemetry_rows else 'N/A'} to {telemetry_rows[-1]['meta_time'] if telemetry_rows else 'N/A'}")
    
    telemetry_data_loaded = True
    print("✅ Telemetry data pre-loaded and ready!")
    print("="*60 + "\n")
    return True


async def load_endurance_data():
    """Pre-load endurance data on server startup"""
    global endurance_df, endurance_data_loaded
    
    if endurance_data_loaded:
        return True
    
    project_root = get_project_root()
    endurance_file = project_root / "logs" / "R1_section_endurance.csv"
    
    if not endurance_file.exists():
        print(f"⚠️ WARNING: Endurance file not found at {endurance_file}")
        return False
    
    try:
        endurance_df = pd.read_csv(endurance_file, sep=";", low_memory=False)
        endurance_df.columns = endurance_df.columns.str.strip()
        endurance_df["CAR_NUMBER"] = endurance_df["NUMBER"].astype(str)
        endurance_df.sort_values(["CAR_NUMBER", "LAP_NUMBER", "ELAPSED"], inplace=True)
        endurance_data_loaded = True
        print(f"✅ Loaded {len(endurance_df)} endurance records")
        return True
    except Exception as e:
        print(f"⚠️ ERROR: Failed to load endurance data: {e}")
        return False


async def load_leaderboard_data():
    """Pre-load leaderboard data on server startup"""
    global leaderboard_df, leaderboard_data_loaded
    
    if leaderboard_data_loaded:
        return True
    
    project_root = get_project_root()
    leaderboard_file = project_root / "logs" / "R1_leaderboard.csv"
    
    if not leaderboard_file.exists():
        print(f"⚠️ WARNING: Leaderboard file not found at {leaderboard_file}")
        print(f"   Leaderboard endpoint will return empty data until file is available")
        return False
    
    try:
        leaderboard_df = pd.read_csv(leaderboard_file, sep=";", low_memory=False)
        leaderboard_df.columns = leaderboard_df.columns.str.strip()
        leaderboard_data_loaded = True
        print(f"✅ Loaded {len(leaderboard_df)} leaderboard records")
        return True
    except Exception as e:
        print(f"⚠️ ERROR: Failed to load leaderboard data: {e}")
        return False


# ==================== TELEMETRY BROADCAST ====================

async def telemetry_broadcast_loop():
    """Broadcast telemetry data to connected clients (uses pre-loaded data)"""
    global telemetry_master_start_time, telemetry_playback_start_timestamp
    global telemetry_rows, telemetry_pending_rows, telemetry_has_started
    global telemetry_is_paused, telemetry_is_reversed, telemetry_playback_speed
    global telemetry_cache

    # Ensure data is loaded (should already be from startup, but check anyway)
    if not telemetry_data_loaded:
        await load_telemetry_data()
    
    if not telemetry_rows:
        print("⚠️ WARNING: No telemetry data available for broadcast")
        return

    # Load weather data (lightweight, can load on demand)
    project_root = get_project_root()
    weather_file = project_root / "logs" / "R1_weather_data.csv"
    
    weather_rows = []
    pending_weather = []
    latest_weather = None
    
    if weather_file.exists():
        try:
            df_weather = pd.read_csv(weather_file, sep=";", low_memory=False)
            df_weather["meta_time"] = pd.to_datetime(df_weather["TIME_UTC_SECONDS"], utc=True, errors="coerce")
            df_weather = df_weather.sort_values("meta_time")
            weather_rows = df_weather.to_dict("records")
            pending_weather = weather_rows
            print(f"✅ Loaded {len(weather_rows)} weather records")
        except Exception as e:
            print(f"⚠️ ERROR: Failed to load weather data: {e}")
    else:
        print(f"⚠️ WARNING: Weather file not found at {weather_file}")

    # Create sorted list of timestamps for binary search (O(n) once, then O(log n) lookups)
    telemetry_timestamps = [r["meta_time"] for r in telemetry_rows]
    
    # Initialize playback state
    telemetry_master_start_time = None
    telemetry_has_started = True
    current_index = 0  # Track current position in sorted data
    
    target_hz = 60
    send_interval = 1.0 / target_hz
    print("✅ Telemetry broadcast loop started (using pre-loaded data)")

    last_send_time = asyncio.get_event_loop().time()

    while True:
        # Only sleep when paused to reduce CPU usage
        if telemetry_is_paused or telemetry_playback_speed == 0:
            await asyncio.sleep(0.1)  # Longer sleep when paused
        else:
            await asyncio.sleep(0.001)  # Short sleep when playing

        if telemetry_is_paused or telemetry_playback_speed == 0:
            continue

        if telemetry_master_start_time is None:
            telemetry_master_start_time = asyncio.get_event_loop().time()
            # Reset index when starting playback
            if not telemetry_is_reversed:
                current_index = 0
                # Use slice reference instead of copy for better performance
                telemetry_pending_rows = telemetry_rows

        elapsed_real = asyncio.get_event_loop().time() - telemetry_master_start_time
        delta = -elapsed_real * telemetry_playback_speed if telemetry_is_reversed else elapsed_real * telemetry_playback_speed
        sim_time = telemetry_playback_start_timestamp + pd.to_timedelta(delta, unit="s")

        # Use binary search for efficient time-based filtering
        if telemetry_is_reversed:
            # For reverse, find all rows >= sim_time
            idx = bisect.bisect_left(telemetry_timestamps, sim_time)
            to_emit = telemetry_rows[idx:]
            telemetry_pending_rows = telemetry_rows[:idx]
        else:
            # For forward, find all rows <= sim_time starting from current_index
            end_idx = bisect.bisect_right(telemetry_timestamps, sim_time, lo=current_index)
            to_emit = telemetry_rows[current_index:end_idx]
            current_index = end_idx
            telemetry_pending_rows = telemetry_rows[current_index:]

        # Get latest weather sample
        weather_to_emit = [w for w in pending_weather if w["meta_time"] <= sim_time]
        pending_weather = [w for w in pending_weather if w["meta_time"] > sim_time]
        if weather_to_emit:
            latest_weather = weather_to_emit[-1]

        now = asyncio.get_event_loop().time()
        if now - last_send_time < send_interval:
            continue
        last_send_time = now

        if not to_emit:
            continue

        # Group into frames
        frame = defaultdict(lambda: defaultdict(dict))
        seen = set()
        # Field name mapping for frontend compatibility
        field_mapping = {
            "VBOX_Lat_Min": "gps_lat",
            "VBOX_Long_Minutes": "gps_lon",
        }
        
        for r in to_emit:
            ts = r["meta_time"].isoformat()
            vid = r["vehicle_id"]
            key = (ts, vid, r["telemetry_name"])
            if key in seen:
                continue
            seen.add(key)
            name = r["telemetry_name"]
            # Map field names for frontend compatibility
            mapped_name = field_mapping.get(name, name)
            value = cast_num(r["telemetry_value"])
            frame[ts][vid][mapped_name] = int(value) if name == "lap" else value

        # Send frames
        for ts, vehicles in frame.items():
            msg = {
                "type": "telemetry_frame",
                "timestamp": ts,
                "vehicles": vehicles
            }

            if latest_weather:
                msg["weather"] = {
                    "air_temp": cast_num(latest_weather["AIR_TEMP"]),
                    "track_temp": cast_num(latest_weather["TRACK_TEMP"]),
                    "humidity": cast_num(latest_weather["HUMIDITY"]),
                    "pressure": cast_num(latest_weather["PRESSURE"]),
                    "wind_speed": cast_num(latest_weather["WIND_SPEED"]),
                    "wind_direction": cast_num(latest_weather["WIND_DIRECTION"]),
                    "rain": cast_num(latest_weather["RAIN"])
                }

            data = json.dumps(msg)
            telemetry_cache = msg
            
            # Data is cached and served via REST API (clients poll for updates)

        # End condition
        if (not telemetry_pending_rows and not telemetry_is_reversed) or (not to_emit and telemetry_is_reversed):
            print("End of telemetry log reached.")
            end_msg = {
                "type": "telemetry_end",
                "timestamp": sim_time.isoformat()
            }
            # End message is cached and served via REST API
            telemetry_is_paused = True
            telemetry_master_start_time = None


async def process_telemetry_control(msg: dict):
    """Process control commands for telemetry playback"""
    global telemetry_is_paused, telemetry_is_reversed, telemetry_has_started
    global telemetry_playback_speed, telemetry_master_start_time, telemetry_playback_start_timestamp
    global telemetry_pending_rows, telemetry_rows

    cmd = msg.get("cmd")
    if cmd == "play":
        if not telemetry_has_started:
            # First time starting - initialize
            telemetry_has_started = True
            if telemetry_rows:
                telemetry_playback_start_timestamp = telemetry_rows[0]["meta_time"]
                telemetry_pending_rows = telemetry_rows.copy()
            print("Playback started for the first time")
        if telemetry_is_paused:
            telemetry_is_paused = False
            telemetry_is_reversed = False
            telemetry_master_start_time = asyncio.get_event_loop().time()
            print("Playback resumed/started")
    elif cmd == "reverse":
        if telemetry_is_paused and telemetry_has_started:
            telemetry_is_paused = False
            telemetry_is_reversed = True
            telemetry_master_start_time = asyncio.get_event_loop().time()
            print("Reverse playback started")
    elif cmd == "restart":
        telemetry_is_paused = True
        telemetry_is_reversed = False
        telemetry_has_started = True
        telemetry_playback_start_timestamp = telemetry_rows[0]["meta_time"]
        telemetry_pending_rows = telemetry_rows.copy()
        telemetry_master_start_time = None
        print("Playback restarted")
    elif cmd == "pause":
        if not telemetry_is_paused:
            elapsed = asyncio.get_event_loop().time() - telemetry_master_start_time
            delta = -elapsed * telemetry_playback_speed if telemetry_is_reversed else elapsed * telemetry_playback_speed
            telemetry_playback_start_timestamp += pd.to_timedelta(delta, unit="s")
            telemetry_is_paused = True
            telemetry_master_start_time = None
            print("Paused")
    elif cmd == "speed":
        val = float(msg.get("value", 1.0))
        if not telemetry_is_paused and telemetry_master_start_time:
            elapsed = asyncio.get_event_loop().time() - telemetry_master_start_time
            delta = -elapsed * telemetry_playback_speed if telemetry_is_reversed else elapsed * telemetry_playback_speed
            telemetry_playback_start_timestamp += pd.to_timedelta(delta, unit="s")
            telemetry_master_start_time = asyncio.get_event_loop().time()
        telemetry_playback_speed = val
        print(f"Speed set to {telemetry_playback_speed}x")
    elif cmd == "seek":
        telemetry_playback_start_timestamp = dtparser.parse(msg["timestamp"])
        telemetry_master_start_time = asyncio.get_event_loop().time()
        print(f"Seek to {telemetry_playback_start_timestamp}")


# ==================== ENDURANCE BROADCAST ====================

async def endurance_broadcast_loop():
    """Broadcast endurance/lap event data (uses pre-loaded data)"""
    global endurance_cache, endurance_df

    # Ensure data is loaded
    if not endurance_data_loaded:
        await load_endurance_data()
    
    if endurance_df is None or len(endurance_df) == 0:
        print("⚠️ WARNING: No endurance data available")
        return

    wait = 0.01
    print("✅ Endurance stream started (using pre-loaded data)")

    try:
        # Use itertuples() instead of iterrows() for 10-100x speedup
        for row in endurance_df.itertuples():
            # Always process data for REST API cache
            #     await asyncio.sleep(0.1)
            #     continue

            try:
                msg = {
                    "type": "lap_event",
                    "vehicle_id": str(row.CAR_NUMBER),
                    "lap": int(row.LAP_NUMBER),
                    "lap_time": getattr(row, 'LAP_TIME', None),
                    "sector_times": [
                        getattr(row, 'S1_SECONDS', None),
                        getattr(row, 'S2_SECONDS', None),
                        getattr(row, 'S3_SECONDS', None)
                    ],
                    "top_speed": getattr(row, 'TOP_SPEED', None),
                    "flag": getattr(row, 'FLAG_AT_FL', None),
                    "pit": pd.notna(getattr(row, 'CROSSING_FINISH_LINE_IN_PIT', None)),
                    "timestamp": getattr(row, 'HOUR', None),
                }

                data = json.dumps(msg)
                endurance_cache.append(msg)
                
                # Data is cached and served via REST API (clients poll for updates)

                await asyncio.sleep(wait)
            except Exception as e:
                print(f"Error processing endurance row: {e}")
                await asyncio.sleep(wait)
                continue

        print("Endurance event stream finished. Restarting...")
        await asyncio.sleep(1.0)
    except Exception as e:
        print(f"Endurance broadcast loop error: {e}")
        import traceback
        traceback.print_exc()
        await asyncio.sleep(1.0)


# ==================== LEADERBOARD BROADCAST ====================

async def leaderboard_broadcast_loop():
    """Broadcast leaderboard data (uses pre-loaded data)"""
    global leaderboard_cache, leaderboard_df

    # Ensure data is loaded
    if not leaderboard_data_loaded:
        success = await load_leaderboard_data()
        if not success:
            print("⚠️ WARNING: Failed to load leaderboard data")
            return
    
    if leaderboard_df is None or len(leaderboard_df) == 0:
        print("⚠️ WARNING: No leaderboard data available")
        return

    wait = 0.01
    # Use itertuples() for better performance than to_dict("records")
    print("✅ Broadcasting leaderboard data (using pre-loaded data)...")

    try:
        for row in leaderboard_df.itertuples():
            # Always process data for REST API cache
            #     await asyncio.sleep(0.1)
            #     continue

            try:
                msg = {
                    "type": "leaderboard_entry",
                    "class_type": getattr(row, 'CLASS_TYPE', None),
                    "position": int(getattr(row, 'POS', 0)),
                    "pic": int(getattr(row, 'PIC', 0)),
                    "vehicle_id": str(getattr(row, 'NUMBER', '')),
                    "vehicle": getattr(row, 'VEHICLE', None),
                    "laps": int(getattr(row, 'LAPS', 0)),
                    "elapsed": getattr(row, 'ELAPSED', None),
                    "gap_first": getattr(row, 'GAP_FIRST', None),
                    "gap_previous": getattr(row, 'GAP_PREVIOUS', None),
                    "best_lap_num": int(getattr(row, 'BEST_LAP_NUM', 0)),
                    "best_lap_time": getattr(row, 'BEST_LAP_TIME', None),
                    "best_lap_kph": float(getattr(row, 'BEST_LAP_KPH', 0)),
                }

                data = json.dumps(msg)
                # Update cache (replace existing entry for same vehicle_id)
                existing_idx = next((i for i, e in enumerate(leaderboard_cache) if e.get("vehicle_id") == msg["vehicle_id"]), None)
                if existing_idx is not None:
                    leaderboard_cache[existing_idx] = msg
                else:
                    leaderboard_cache.append(msg)
                
                # Data is cached and served via REST API (clients poll for updates)

                await asyncio.sleep(wait)
            except Exception as e:
                print(f"Error processing leaderboard row: {e}")
                await asyncio.sleep(wait)
                continue

        print("Leaderboard event stream finished. Restarting...")
        await asyncio.sleep(1.0)
    except Exception as e:
        print(f"Leaderboard broadcast loop error: {e}")
        import traceback
        traceback.print_exc()
        await asyncio.sleep(1.0)


# ==================== REST API ENDPOINTS ====================

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Telemetry Rush API - Integrated (All on Port 8000)",
        "version": "2.0.0",
        "endpoints": {
            "rest": {
                "telemetry": "/api/telemetry",
                "endurance": "/api/endurance",
                "leaderboard": "/api/leaderboard",
                "health": "/api/health",
                "preprocess": "/api/preprocess",
                "control": "/api/control"
            },
            "note": "Poll REST endpoints for real-time updates. Use /api/control for playback controls."
        }
    }


@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "data_loaded": {
            "telemetry": telemetry_data_loaded,
            "endurance": endurance_data_loaded,
            "leaderboard": leaderboard_data_loaded
        }
    }


@app.get("/api/telemetry")
async def get_telemetry():
    """Get latest telemetry data - Poll this endpoint for updates"""
    global telemetry_broadcast_task
    
    try:
        # Start broadcast loop if not already running
        if telemetry_broadcast_task is None or telemetry_broadcast_task.done():
            try:
                telemetry_broadcast_task = asyncio.create_task(telemetry_broadcast_loop())
                print("Started telemetry broadcast loop for REST API")
            except Exception as e:
                print(f"⚠️ Error starting telemetry broadcast loop: {e}")
        
        if telemetry_cache:
            return telemetry_cache
        
        # Check if data is loaded but not started
        if telemetry_data_loaded and len(telemetry_rows) > 0:
            return {
                "message": "Telemetry data loaded but playback not started",
                "row_count": len(telemetry_rows),
                "has_data": True,
                "paused": telemetry_is_paused,
                "suggestion": "Poll /api/telemetry for updates. Use /api/control to start playback."
            }
        
        return {
            "message": "No telemetry data available",
            "has_data": False,
            "suggestion": "Ensure CSV files exist in logs/vehicles/ and data has been loaded"
        }
    except Exception as e:
        print(f"⚠️ Error in get_telemetry endpoint: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error retrieving telemetry: {str(e)}")


@app.get("/api/endurance")
async def get_endurance():
    """Get endurance/lap event data - Poll this endpoint for updates"""
    global endurance_broadcast_task
    
    try:
        # Start broadcast loop if not already running
        if endurance_broadcast_task is None or endurance_broadcast_task.done():
            try:
                endurance_broadcast_task = asyncio.create_task(endurance_broadcast_loop())
                print("Started endurance broadcast loop for REST API")
            except Exception as e:
                print(f"⚠️ Error starting endurance broadcast loop: {e}")
        
        return {"events": endurance_cache, "count": len(endurance_cache)}
    except Exception as e:
        print(f"⚠️ Error in get_endurance endpoint: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error retrieving endurance data: {str(e)}")


@app.get("/api/leaderboard")
async def get_leaderboard():
    """Get leaderboard data - Poll this endpoint for updates"""
    global leaderboard_broadcast_task
    
    try:
        # Start broadcast loop if not already running
        if leaderboard_broadcast_task is None or leaderboard_broadcast_task.done():
            try:
                leaderboard_broadcast_task = asyncio.create_task(leaderboard_broadcast_loop())
                print("Started leaderboard broadcast loop for REST API")
            except Exception as e:
                print(f"⚠️ Error starting leaderboard broadcast loop: {e}")
        
        if not leaderboard_data_loaded:
            return {
                "leaderboard": [],
                "count": 0,
                "message": "Leaderboard data not loaded",
                "suggestion": "Ensure R1_leaderboard.csv exists in logs/ directory"
            }
        
        if len(leaderboard_cache) == 0:
            return {
                "leaderboard": [],
                "count": 0,
                "message": "No leaderboard entries in cache yet",
                "has_data": True,
                "suggestion": "Poll /api/leaderboard for updates"
            }
        
        return {"leaderboard": leaderboard_cache, "count": len(leaderboard_cache)}
    except Exception as e:
        print(f"⚠️ Error in get_leaderboard endpoint: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error retrieving leaderboard: {str(e)}")


@app.post("/api/control")
async def control_playback(command: dict):
    """Send control command to telemetry playback"""
    await process_telemetry_control(command)
    return {"status": "command_sent", "command": command.get("cmd")}


@app.post("/api/preprocess")
async def preprocess_telemetry_endpoint(request: dict = None):
    """
    Preprocess raw telemetry data into per-vehicle CSV files
    
    Request body (optional):
    {
        "input_file": "path/to/input.csv",  # Optional, will search common locations
        "output_dir": "path/to/output"      # Optional, defaults to logs/vehicles
    }
    
    Returns:
        dict: Status and results of preprocessing
    """
    input_file = None
    output_dir = None
    
    if request:
        input_file = request.get("input_file")
        output_dir = request.get("output_dir")
    
    result = await preprocess_telemetry_data(input_file, output_dir)
    
    # If preprocessing was successful, optionally reload telemetry data
    if result.get("status") == "success":
        # Optionally reload telemetry data if it was loaded before
        global telemetry_data_loaded
        if telemetry_data_loaded:
            print("🔄 Reloading telemetry data after preprocessing...")
            telemetry_data_loaded = False
            await load_telemetry_data()
    
    return result


# ==================== REST API ONLY - NO SSE/WEBSOCKET ====================
# Broadcast loops run in background to update cache
# Clients poll REST endpoints for updates


# ==================== STARTUP/SHUTDOWN ====================

@app.on_event("startup")
async def startup_event():
    """Initialize on startup - Pre-load all data for fast access (non-blocking)"""
    print("\n" + "="*60)
    print("Telemetry Rush - FastAPI Server (Integrated)")
    print("="*60)
    
    # Start data loading in background (non-blocking) so server can start immediately
    # This is critical for Cloud Run which has startup timeout requirements
    print("\n🚀 Starting data pre-loading in background (non-blocking)...")
    asyncio.create_task(load_telemetry_data())
    asyncio.create_task(load_endurance_data())
    asyncio.create_task(load_leaderboard_data())
    
    print("✅ Server is ready and listening (data loading in background)")
    print("\n✅ REST API Endpoints (Poll for updates):")
    print("   GET  - http://127.0.0.1:8000/api/telemetry")
    print("   GET  - http://127.0.0.1:8000/api/endurance")
    print("   GET  - http://127.0.0.1:8000/api/leaderboard")
    print("   GET  - http://127.0.0.1:8000/api/health")
    print("   POST - http://127.0.0.1:8000/api/control (play/pause/speed/seek)")
    print("   POST - http://127.0.0.1:8000/api/preprocess")
    print("\n✅ API Documentation: http://127.0.0.1:8000/docs")
    print("\n💡 Note: Poll REST endpoints for real-time updates. Broadcast loops start automatically.")
    print("="*60 + "\n")


if __name__ == "__main__":
    # Get port from environment variable (Render provides $PORT) or default to 8000
    port = int(os.environ.get("PORT", 8000))
    
    print("\n" + "="*60)
    print("Telemetry Rush - FastAPI Server (Integrated)")
    print(f"All services running on port {port}")
    print("="*60)
    print(f"\nStarting FastAPI server on http://0.0.0.0:{port}")
    print("Press Ctrl+C to stop")
    print("="*60 + "\n")
    
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")

