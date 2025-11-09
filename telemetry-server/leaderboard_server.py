import asyncio
import json
import pandas as pd
import websockets

# CONFIG
LEADERBOARD_FILE = "logs/R1_leaderboard.csv"  # path to your data
PORT = 8767
WAIT = 0.01  # seconds between leaderboard updates

clients = set()

async def load_leaderboard_data():
    """Load leaderboard CSV and clean columns."""
    df = pd.read_csv(LEADERBOARD_FILE, sep=";")
    df.columns = df.columns.str.strip()
    return df.to_dict("records")


async def broadcast_leaderboard(shutdown_event):
    """Continuously broadcast leaderboard updates."""
    df_records = await load_leaderboard_data()

    print("Broadcasting leaderboard data...")
    while clients:
        for row in df_records:
            msg = {
                "type": "leaderboard_entry",
                "class_type": row.get("CLASS_TYPE"),
                "position": int(row.get("POS")),
                "pic": int(row.get("PIC")),
                "vehicle_id": str(row.get("NUMBER")),
                "vehicle": row.get("VEHICLE"),
                "laps": int(row.get("LAPS")),
                "elapsed": row.get("ELAPSED"),
                "gap_first": row.get("GAP_FIRST"),
                "gap_previous": row.get("GAP_PREVIOUS"),
                "best_lap_num": int(row.get("BEST_LAP_NUM")),
                "best_lap_time": row.get("BEST_LAP_TIME"),
                "best_lap_kph": float(row.get("BEST_LAP_KPH")),
            }

            data = json.dumps(msg)
            # send to all connected clients
            for c in clients.copy():
                asyncio.create_task(c.send(data))

            await asyncio.sleep(WAIT)

        # optional: reload data periodically if the file is updated
        await asyncio.sleep(WAIT)

    print("No clients connected — stopping leaderboard broadcast.")
    shutdown_event.set()


async def handle_client(ws, shutdown_event):
    """Handle new client connection."""
    clients.add(ws)
    print(f"Client connected ({len(clients)} total).")

    if len(clients) == 1:
        # first client starts broadcasting
        asyncio.create_task(broadcast_leaderboard(shutdown_event))

    try:
        async for _ in ws:
            pass  # no client commands expected here
    finally:
        clients.remove(ws)
        print(f"Client disconnected ({len(clients)} remaining).")
        if not clients:
            shutdown_event.set()


async def main():
    shutdown_event = asyncio.Event()

    async def client_handler(ws):
        return await handle_client(ws, shutdown_event)

    server = await websockets.serve(client_handler, "localhost", PORT)
    print(f"Leaderboard server running on ws://localhost:{PORT}")

    await shutdown_event.wait()

    print("Shutting down leaderboard server...")
    server.close()
    await server.wait_closed()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("Server stopped manually.")
