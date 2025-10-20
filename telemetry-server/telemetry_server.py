import asyncio, json, pandas as pd, websockets, time
from dateutil import parser as dtparser
from collections import defaultdict

# CONFIG
LOG_FILE = "logs/R1_telemetry_data.csv"
CHUNK_SIZE = 4000
PORT = 8765
TARGET_HZ = 200
SEND_INTERVAL = 1.0 / TARGET_HZ  # ~0.0167s

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
    df_iter = pd.read_csv(LOG_FILE, chunksize=CHUNK_SIZE)
    pending_rows = []
    current_chunk = None

    try:
        current_chunk = next(df_iter)
    except StopIteration:
        print("Empty log file.")
        return

    current_chunk["meta_time"] = pd.to_datetime(current_chunk["meta_time"], utc=True)
    playback_start_timestamp = current_chunk["meta_time"].min()
    master_start_time = None
    print("Starting playback from", playback_start_timestamp)

    last_send_time = asyncio.get_event_loop().time()

    while True:
        await asyncio.sleep(0.001)

        if is_paused or playback_speed == 0:
            continue

        if master_start_time is None:
            master_start_time = asyncio.get_event_loop().time()

        elapsed_real = asyncio.get_event_loop().time() - master_start_time
        sim_time = playback_start_timestamp + pd.to_timedelta(elapsed_real * playback_speed, unit="s")

        # Load next chunk if needed
        if current_chunk is not None:
            pending_rows.extend(current_chunk.to_dict("records"))
            try:
                current_chunk = next(df_iter)
                current_chunk["meta_time"] = pd.to_datetime(current_chunk["meta_time"], utc=True)
            except StopIteration:
                current_chunk = None

        # Collect rows up to sim_time
        to_emit = [r for r in pending_rows if r["meta_time"] <= sim_time]
        pending_rows = [r for r in pending_rows if r["meta_time"] > sim_time]

        # Throttle to 60Hz
        now = asyncio.get_event_loop().time()
        if now - last_send_time < SEND_INTERVAL:
            continue
        last_send_time = now

        if not to_emit:
            continue

        # ✅ Sort by timestamp
        to_emit.sort(key=lambda r: r["meta_time"])

        # ✅ Group into one frame: {timestamp: {vehicle_id: {telemetry_name: value}}}
        frame = defaultdict(lambda: defaultdict(dict))
        seen = set()
        for r in to_emit:
            ts = r["meta_time"].isoformat()
            vid = r["vehicle_id"]
            key = (ts, vid, r["telemetry_name"])
            if key in seen:
                continue
            seen.add(key)
            frame[ts][vid][r["telemetry_name"]] = cast_num(r["telemetry_value"])

        # ✅ Send one combined frame per timestamp
        for ts, vehicles in frame.items():
            msg = {
                "type": "telemetry_frame",
                "timestamp": ts,
                "vehicles": vehicles  # { vehicle_id: { telemetry_name: value, ... } }
            }
            data = json.dumps(msg)
            for c in clients.copy():
                asyncio.create_task(c.send(data))

        if current_chunk is None and not pending_rows:
            print("End of log reached.")
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
