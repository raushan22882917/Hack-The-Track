import pandas as pd
import asyncio
import json
import websockets

# CONFIG
SECTION_ENDURANCE_DATA = "logs/R1_section_endurance.csv"
PORT = 8766
WAIT = 0.01

clients = set()

async def race_event_stream():
    df = pd.read_csv(SECTION_ENDURANCE_DATA, sep=";")

    # removes spaces before/after names
    df.columns = df.columns.str.strip()

    # Use car NUMBER (sticker ID) instead of DRIVER_NUMBER
    df["CAR_NUMBER"] = df["NUMBER"].astype(str)
    df.sort_values(["CAR_NUMBER", "LAP_NUMBER", "ELAPSED"], inplace=True)

    for _, row in df.iterrows():
        msg = {
            "type": "lap_event",
            "vehicle_id": row["CAR_NUMBER"],  # e.g., "78"
            "lap": int(row["LAP_NUMBER"]),
            "lap_time": row.get("LAP_TIME"),
            "sector_times": [
                row.get("S1_SECONDS"),
                row.get("S2_SECONDS"),
                row.get("S3_SECONDS")
            ],
            "top_speed": row.get("TOP_SPEED"),
            "flag": row.get("FLAG_AT_FL"),
            "pit": bool(row.get("CROSSING_FINISH_LINE_IN_PIT")),
            "timestamp": row.get("HOUR"),
        }

        data = json.dumps(msg)
        for c in clients.copy():
            asyncio.create_task(c.send(data))

        await asyncio.sleep(WAIT)  # simulate live feed

async def handle_client(ws):
    print("Client connected.")
    clients.add(ws)
    try:
        async for msg in ws:
            try:
                data = json.loads(msg)
            except Exception:
                continue
    finally:
        clients.remove(ws)
        print("Client disconnected.")

async def main():
    server = await websockets.serve(handle_client, "localhost", PORT)
    print(f"SectionEndurance server running on ws://localhost:{PORT}")
    await race_event_stream()
    await server.wait_closed()

asyncio.run(main())
