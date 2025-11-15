import pandas as pd
import asyncio
import json
import websockets

# CONFIG
SECTION_ENDURANCE_DATA = "logs/R1_section_endurance.csv"
PORT = 8766
WAIT = 0.01

clients = set()

async def race_event_stream(shutdown_event):
    df = pd.read_csv(SECTION_ENDURANCE_DATA, sep=";")

    # removes spaces before/after names
    df.columns = df.columns.str.strip()

    # Use car NUMBER (sticker ID) instead of DRIVER_NUMBER
    df["CAR_NUMBER"] = df["NUMBER"].astype(str)
    df.sort_values(["CAR_NUMBER", "LAP_NUMBER", "ELAPSED"], inplace=True)

    print("Section endurance stream started.")

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
            "pit": pd.notna(row.get("CROSSING_FINISH_LINE_IN_PIT")),
            "timestamp": row.get("HOUR"),
        }

        data = json.dumps(msg)
        for c in clients.copy():
            asyncio.create_task(c.send(data))

        await asyncio.sleep(WAIT)  # simulate live feed

    print("Race event stream finished.")
    shutdown_event.set()

async def handle_client(ws, shutdown_event, race_task_ref):
    print("Client connected.")
    clients.add(ws)

    # Start race stream when first client connects
    if race_task_ref["task"] is None or race_task_ref["task"].done():
        race_task_ref["task"] = asyncio.create_task(race_event_stream(shutdown_event))

    try:
        async for msg in ws:
            try:
                data = json.loads(msg)
            except Exception:
                continue
    except websockets.ConnectionClosed:
        pass
    finally:
        clients.remove(ws)
        print("Client disconnected.")

        # If last client disconnected → shut down
        if not clients:
            print("No more clients connected - preparing to shut down.")
            shutdown_event.set()

async def main():
    shutdown_event = asyncio.Event()      # Create inside the running loop
    race_task_ref = {"task": None}        # Mutable container for current race stream task

    async def client_handler(ws):
        return await handle_client(ws, shutdown_event, race_task_ref)
    
    server = await websockets.serve(client_handler, "localhost", PORT)
    print(f"SectionEndurance server running on ws://localhost:{PORT}", flush=True)

    # await race_event_stream()

    await shutdown_event.wait()
    print("Shutting down WebSocket server...")
    server.close()
    await server.wait_closed()

asyncio.run(main())
