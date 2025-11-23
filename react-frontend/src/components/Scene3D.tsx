import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment } from '@react-three/drei';
import { Vehicle3D } from './Vehicle3D';
import { Track3D } from './Track3D';
import { useTelemetryStore } from '../store/telemetryStore';
import { Suspense, useEffect, useRef } from 'react';
import * as THREE from 'three';

export function Scene3D() {
  const { vehicles, selectedVehicleId, autoSelectFirstVehicle } = useTelemetryStore();
  const vehicleIds = Object.keys(vehicles);

  // Auto-select first vehicle when vehicles appear
  useEffect(() => {
    if (vehicleIds.length > 0 && !selectedVehicleId) {
      autoSelectFirstVehicle();
    }
  }, [vehicleIds.length, selectedVehicleId, autoSelectFirstVehicle]);

  return (
    <Canvas shadows>
      <Suspense fallback={null}>
        {/* Lighting */}
        <ambientLight intensity={0.5} />
        <directionalLight
          position={[10, 10, 5]}
          intensity={1}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />
        <pointLight position={[-10, -10, -10]} intensity={0.5} />

        {/* Camera */}
        <PerspectiveCamera makeDefault position={[0, 50, 100]} fov={50} />
        {selectedVehicleId && vehicles[selectedVehicleId] && (
          <CameraFollow vehicle={vehicles[selectedVehicleId]} />
        )}
        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minDistance={20}
          maxDistance={500}
        />

        {/* Environment */}
        <Environment preset="sunset" />

        {/* Ground */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
          <planeGeometry args={[1000, 1000]} />
          <meshStandardMaterial color="#2a2a2a" />
        </mesh>

        {/* Track */}
        <Track3D vehicles={vehicles} />

        {/* Vehicles */}
        {vehicleIds.map((vehicleId) => (
          <Vehicle3D
            key={vehicleId}
            vehicleId={vehicleId}
            isSelected={vehicleId === selectedVehicleId}
          />
        ))}

        {/* Grid Helper */}
        <gridHelper args={[500, 50]} position={[0, 0.1, 0]} />
      </Suspense>
    </Canvas>
  );
}

// Camera component that follows a vehicle (optional - can be enabled later)
function CameraFollow({ vehicle }: { vehicle: any }) {
  // This is a placeholder - camera following can be added later if needed
  // For now, OrbitControls handles camera movement
  return null;
}

