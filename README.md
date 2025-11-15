# Telemetry Rush - HackTheTrack - Real‑Time Racing Telemetry & Endurance Analysis and Game

<img width="1921" height="1089" alt="Screenshot 2025-11-14 202743" src="https://github.com/user-attachments/assets/8f882783-11f2-46c8-90fd-20e8da8e49f7" />

Telemetry Rush is a Unity‑based racing simulation platform that integrates external Python servers to replay, visualize, challenge and analyze motorsport telemetry data. The Python servers are used to simulate live streaming data. In a production version, these servers and the data pre-processing could be replaces with websocket servers, which deliver live data from an actual race.
Built during a hackathon (HackTheTrack by Toyota Gazoo Racing), it combines **live data streaming**, **racing game**, **vehicle visualization**, **weather effects**, and **leaderboard tracking** into a single interactive Windows application.

A Youtube video explaining and walking through the project can be found here

---

## ✨ Key Features

- **Telemetry Playback**  
  - Streams vehicle telemetry from recorded CSV logs at configurable speeds.  
  - Supports play, pause, reverse (WIP), restart (WIP), and seek (WIP) commands.  
  - Displays speed, RPM, gear, throttle, braking, steering, lap distance and many more data in real time.

- **Vehicle Visualization**  
  - Cars are rendered along spline tracks with accurate steering and wheel rotation.  
  - GPS coordinates are converted into Unity positions using `GPSUtils`.  
  - Track paths are drawn dynamically with `LineRenderer`.
  - Ghost cars show the intended position of the currently selected car along the ideal racing line.
  - Ghost cars an be turned on or off.

- **Weather Simulation**  
  - Real‑time weather data (temperature, humidity, wind, rain) gathered from the base dataset applied to the scene.  
  - Fog density, skybox tint, rain particles, and sun position adapt to telemetry input.  
  - UI shows current weather condition and icon.
  - Can be turned on or off.

- **Endurance Racing UI**  
  - Displays lap times, sector splits, top speeds, rankings and flags.  
  - Charts visualize lap performance across vehicles, laps and sectors.  
  - Supports top‑10 fastest lap analysis and race result summaries.

- **Leaderboard Tracking**  
  - Leaderboard streamed via WebSocket.  
  - Shows position, laps completed, gaps to leader/previous, and best lap stats.  
  - Updates Unity UI dynamically with color‑coded rows.
  
- **Camera & Vehicle Selection**  
  - Switch between multiple vehicles and camera perspectives using keyboard shortcuts.  
  - Supports player‑controlled car mode with cockpit and follow cameras.  
  - Records lap and sector times for player car and displays best lap results.

- **Modular Servers**  
  - **Telemetry Server** (`port 8765`) - websocket server which streams vehicle + weather frames.  
  - **Section Endurance Server** (`port 8766`) - websocket server which streams lap events.  
  - **Leaderboard Server** (`port 8767`) - websocket server streams race standings.  
  - All servers are lightweight Python scripts using `asyncio` + `websockets`.
  - Compiled to .exe files with `PyInstaller`, which are started with the application.
  - The servers can be used directly from the dev environment too, for development purposes.

<img width="1918" height="1083" alt="Screenshot 2025-11-14 202423" src="https://github.com/user-attachments/assets/702c2ca8-1b80-444c-aff5-39a017c4851e" />

---

## 🖥️ Windows Application Usage

After building the Unity project, you get a standalone **Windows executable** (`HackTheTrack.exe`).  
Place the Python server executables (`leaderboard_server.exe`, `section_endurance_server.exe`, `telemetry_vehicle_server.exe`) in the same folder as the Unity build.

### Steps to Run
1. **Run the Unity application and start the servers**
  - Double‑click `HackTheTrack.exe`.  
  - The app starts and connects to servers automatically and begins playback.
  - They replay CSV logs and stream data over WebSocket.
  - If the servers don't start, launch the telemetry, endurance, and leaderboard servers manually.
  - Make sure to wait until all servers are running, before starting the main application.

2. **Interact with the UI**  
  - Use Play/Pause/Reverse buttons to control telemetry playback.  
  - Adjust playback speed with the slider.  
  - Toggle weather effects and ghost cars.  
  - View lap times, charts, and leaderboard updates in real time.
  - Spawn your own car and challenge yourself to beat the best racers.

3. **Quit gracefully**  
  - Press **Esc** to exit.  
  - Servers shut down automatically when playback ends or no clients remain.

<img width="1914" height="1083" alt="Screenshot 2025-11-14 202530" src="https://github.com/user-attachments/assets/c93abfb6-33b1-4bc6-b43a-1fec8dea7db4" />

---

## 📖 Project Structure

### Unity Components

- **TelemetryReceiver**  
  Connects to the telemetry server, receives telemetry frames, applies weather data, and updates registered vehicles.  
  Provides playback controls (play, pause, reverse, restart, speed).

- **TelemetryVehiclePlayer**  
  Represents a car in the scene. Applies telemetry samples to geometry, wheels, sensors, and track rendering.  
  Classifies acceleration phases and updates UI values.

- **TelemetryUI**  
  Main UI controller for playback and weather toggling.  
  Displays telemetry values (speed, RPM, gear, throttle, braking, steering, lap distance, forces).

- **TelemetryVehicleSelector**  
  Manages vehicle and camera selection.  
  - Registers vehicles and cycles through them.  
  - Switches between Cinemachine cameras (cockpit, follow, external).  
  - Supports player‑controlled car mode with lap and sector time recording.  
  - Keyboard shortcuts:  
    - **X** - toggle player car mode.  
    - **C/V** - switch cameras.  
    - **R** - cycle through vehicles.  
    - **Ctrl** - flip follow camera offset.  
  - Updates UI with current camera label and lap/sector times.

- **WeatherManager**  
  Applies weather data to scene effects (rain, fog, skybox tint, wind, sun).  
  Infers general condition (Sunny, Rainy, Windy, etc.) and updates UI.

- **SectionEnduranceReceiver**  
  Connects to endurance server, receives lap events, stores them per vehicle, and assigns colors.  
  Provides access to lap events for analytics and UI.

- **SectionEnduranceUI**  
  Displays lap times, sector splits, and charts using XCharts.  
  Supports top‑10 fastest lap analysis and race result visualization.

- **LeaderboardReceiver**  
  Connects to leaderboard server, receives race standings, and updates UI.  
  Stores entries in a dictionary keyed by vehicle ID.

- **GPSUtils**  
  Utility for converting GPS coordinates into Unity positions using a local tangent plane approximation.  
  Supports setting reference origin, scaling, and inverse conversion.

<img width="1912" height="1085" alt="Screenshot 2025-11-14 202453" src="https://github.com/user-attachments/assets/d4298768-7ce1-42fe-9281-9478bfbcef65" />

---

### Python Servers

- **telemetry_server.py**  
  Streams telemetry + weather data from CSV logs.  
  Supports playback controls via WebSocket messages.

- **section_endurance_server.py**  
  Streams lap events sequentially from endurance CSV.  
  Simulates live feed with configurable delay.

- **leaderboard_server.py**  
  Streams leaderboard standings from CSV.  
  Updates positions, laps, gaps, and best lap stats.

---

## 🛠️ Installation (for entertainment purposes)
1. Download latest release from releases section.
2. Extract everything into one folder.
3. Start HackTheTrack.exe.
4. When the CMD windows appear, make sure to wait for every server to be started, indicated by the text. This can take a few minutes, especially on older machines.
5. Click on the green button in the main menu, to start Telemetry Rush.
6. Have fun exploring, infering, guessing and playing with the data.

---

## 🛠️ Installation (for development purposes)

1. Clone this repository:
  ```bash
  git clone https://github.com/FireDragonGameStudio/hack-the-track.git
  ```
2. Install Python dependencies:
  ```bash
  pip install pandas websockets python-dateutil
  ```
3. The folder HackTheTrack contains the Unity project, the folder telemetry-server contains all Python scripts for the websocket servers.
4. Build the Unity project for Windows.
5. Copy server executables and the log files folder into the Unity build folder.
6. Run servers and launch the Unity app (or let the Unity app launch everything).

<img width="1917" height="1085" alt="Screenshot 2025-11-14 202509" src="https://github.com/user-attachments/assets/ae88b07f-8d02-45ef-9471-50e6830aec4a" />

---

## 🎯 Hackathon Vision
Telemetry Rush demonstrates how data, visualization and interactivity can merge into a compelling racing analytics tool. It’s designed to be accessible: whether you’re a motorsport fan, a data scientist, or a game developer, you can explore racing telemetry in a fun, interactive way.

<img width="1918" height="1077" alt="Screenshot 2025-11-14 202019" src="https://github.com/user-attachments/assets/b33ed868-cf75-496f-9b7e-1d47650b4588" />

---

## 📜 License
MIT License - free to use, modify, and share.

---

## 📦 Used Assets
- XCharts for Unity - https://github.com/XCharts-Team/XCharts
- Toyota Car Model - https://sketchfab.com/3d-models/toyota-gt86-stock-c4732cfe6f65408eb387668b7a36f768
- Prometeo Car Controller - https://assetstore.unity.com/packages/tools/physics/prometeo-car-controller-209444
- Cartoon Race Track - https://assetstore.unity.com/packages/3d/environments/roadways/cartoon-race-track-oval-175061
