import asyncio, json, pandas as pd, websockets
from collections import defaultdict
from dateutil import parser as dtparser
import glob, os

# CONFIG
INPUT_DIR = "logs/vehicles"   # directory with per-vehicle CSVs
PORT = 8765
TARGET_HZ = 60
UNLIMITED_MODE = False   # ✅ set True to send as fast as possible
SEND_INTERVAL = 1.0 / TARGET_HZ if not UNLIMITED_MODE else 0

# Playback state
clients = set()
is_paused = True
playback_speed = 1.0
master_start_time = None
playback_start_timestamp = None

def cast_num(x):
    try:
        if pd.isna(x): return None
        return float(x)
    except Exception:
        return x

async def broadcast_loop():
    global master_start_time, playback_start_timestamp

    # Load all per-vehicle CSVs
    vehicle_files = glob.glob(os.path.join(INPUT_DIR, "*.csv"))
    if not vehicle_files:
        print("No vehicle CSVs found.")
        return

    # Read all into one dataframe with vehicle_id column
    dfs = []
    for f in vehicle_files:
        vehicle_id = os.path.splitext(os.path.basename(f))[0]  # filename without extension
        df = pd.read_csv(f, parse_dates=["meta_time"])
        df["meta_time"] = pd.to_datetime(df["meta_time"], utc=True, errors="coerce")
        df["vehicle_id"] = vehicle_id  # inject vehicle_id from filename
        dfs.append(df)

    df_all = pd.concat(dfs, ignore_index=True)

    # Sort globally by meta_time
    df_all = df_all.sort_values("meta_time")

    # Establish playback start
    playback_start_timestamp = df_all["meta_time"].min()
    master_start_time = None
    print("Starting playback from", playback_start_timestamp)

    # Iterator over rows
    rows = df_all.to_dict("records")
    pending_rows = rows
    last_send_time = asyncio.get_event_loop().time()

    while True:
        await asyncio.sleep(0.001)

        if is_paused or playback_speed == 0:
            continue

        if master_start_time is None:
            master_start_time = asyncio.get_event_loop().time()

        elapsed_real = asyncio.get_event_loop().time() - master_start_time
        sim_time = playback_start_timestamp + pd.to_timedelta(elapsed_real * playback_speed, unit="s")

        # Collect rows up to sim_time
        to_emit = [r for r in pending_rows if r["meta_time"] <= sim_time]
        pending_rows = [r for r in pending_rows if r["meta_time"] > sim_time]

        # Throttle
        # now = asyncio.get_event_loop().time()
        # Throttle
        now = asyncio.get_event_loop().time()
        if not UNLIMITED_MODE and now - last_send_time < SEND_INTERVAL:
            continue
        last_send_time = now

        if not to_emit:
            continue

                # Group into frames by timestamp
        frame = defaultdict(lambda: defaultdict(dict))
        seen = set()
        for r in to_emit:
            ts = r["meta_time"].isoformat()
            vid = r["vehicle_id"]
            key = (ts, vid, r["telemetry_name"])
            if key in seen:
                continue
            seen.add(key)
            name = r["telemetry_name"]
            value = cast_num(r["telemetry_value"])
            frame[ts][vid][name] = int(value) if name == "lap" else value


        # Send one combined frame per timestamp
        for ts, vehicles in frame.items():
            msg = {
                "type": "telemetry_frame",
                "timestamp": ts,
                "vehicles": vehicles
            }
            data = json.dumps(msg)
            for c in clients.copy():
                asyncio.create_task(c.send(data))


        if not pending_rows:
            print("End of log reached.")

            # Notify clients that stream has ended
            end_msg = {
                "type": "telemetry_end",
                "timestamp": sim_time.isoformat()
            }
            data = json.dumps(end_msg)
            for c in clients.copy():
                asyncio.create_task(c.send(data))

            break


async def handle_client(ws):
    print("Client connected.")
    clients.add(ws)
    try:
        async for msg in ws:
            try:
                data = json.loads(msg)
            except Exception:
                continue
            if data.get("type") == "control":
                await process_control(data)
    finally:
        clients.remove(ws)
        print("Client disconnected.")

async def process_control(msg):
    global is_paused, playback_speed, master_start_time, playback_start_timestamp
    cmd = msg.get("cmd")
    if cmd == "play":
        if is_paused:
            is_paused = False
            master_start_time = asyncio.get_event_loop().time()
            print("▶️ Playback started")
    elif cmd == "pause":
        if not is_paused:
            elapsed = asyncio.get_event_loop().time() - master_start_time
            playback_start_timestamp += pd.to_timedelta(elapsed * playback_speed, unit="s")
            is_paused = True
            master_start_time = None
            print("⏸️ Paused")
    elif cmd == "speed":
        val = float(msg.get("value", 1.0))
        if not is_paused and master_start_time:
            elapsed = asyncio.get_event_loop().time() - master_start_time
            playback_start_timestamp += pd.to_timedelta(elapsed * playback_speed, unit="s")
            master_start_time = asyncio.get_event_loop().time()
        playback_speed = val
        print(f"⏩ Speed set to {playback_speed}x")
    elif cmd == "seek":
        playback_start_timestamp = dtparser.parse(msg["timestamp"])
        master_start_time = asyncio.get_event_loop().time()
        print(f"⏩ Seek to {playback_start_timestamp}")

async def main():
    server = await websockets.serve(handle_client, "localhost", PORT)
    print(f"Server running on ws://localhost:{PORT}")
    await broadcast_loop()
    await server.wait_closed()

if __name__ == "__main__":
    asyncio.run(main())
