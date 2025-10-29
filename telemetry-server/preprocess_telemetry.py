import pandas as pd
import numpy as np
import os

# CONFIG
INPUT_FILE = "logs/R1_barber_telemetry_data.csv"
OUTPUT_DIR = "logs/vehicles"
CHUNK_SIZE = 200_000

os.makedirs(OUTPUT_DIR, exist_ok=True)

vehicle_data = {}

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

def latlon_to_xy(lat, lon):
    R = 6371000
    x = R * np.radians(lon)
    y = R * np.log(np.tan(np.pi / 4 + np.radians(lat) / 2))
    return np.array([x, y])

def directional_filter(df):
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

print("Processing CSV in chunks with filtering and cleanup...")

for chunk in pd.read_csv(INPUT_FILE, chunksize=CHUNK_SIZE):
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

for vid, parts in vehicle_data.items():
    df = pd.concat(parts, ignore_index=True)
    df = df.sort_values("meta_time")

    out_path = os.path.join(OUTPUT_DIR, f"{vid}.csv")
    df.to_csv(out_path, index=False)
    print(f"✅ Exported {vid} → {out_path} ({len(df)} rows)")

print("All vehicles processed with lap telemetry injected only on change.")
