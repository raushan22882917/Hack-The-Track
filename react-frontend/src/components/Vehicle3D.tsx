import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { Mesh, Group } from 'three';
import { useTelemetryStore } from '../store/telemetryStore';

interface Vehicle3DProps {
  vehicleId: string;
  isSelected: boolean;
}

export function Vehicle3D({ vehicleId, isSelected }: Vehicle3DProps) {
  const groupRef = useRef<Group>(null);
  const { vehicles } = useTelemetryStore();
  const vehicle = vehicles[vehicleId];

  useFrame(() => {
    if (!groupRef.current || !vehicle) return;

    const { position, rotation } = vehicle;

    // Update position
    groupRef.current.position.set(position.x, position.y, position.z);

    // Update rotation based on steering (simplified)
    const yRotation = rotation.y || 0;
    groupRef.current.rotation.y = yRotation;
  });

  if (!vehicle) return null;

  const color = isSelected ? '#3b82f6' : '#ef4444';
  const scale = isSelected ? 1.2 : 1.0;

  return (
    <group ref={groupRef}>
      {/* Car Body */}
      <mesh castShadow receiveShadow scale={[scale, scale, scale]} position={[0, 0.75, 0]}>
        <boxGeometry args={[4, 1.5, 2]} />
        <meshStandardMaterial color={color} metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Wheels */}
      <Wheel position={[-1.5, -0.75, 1]} rotation={vehicle.telemetry.steering || 0} />
      <Wheel position={[-1.5, -0.75, -1]} rotation={vehicle.telemetry.steering || 0} />
      <Wheel position={[1.5, -0.75, 1]} />
      <Wheel position={[1.5, -0.75, -1]} />

      {/* Selection Indicator */}
      {isSelected && (
        <mesh position={[0, 2, 0]}>
          <ringGeometry args={[2, 2.5, 32]} />
          <meshBasicMaterial color="#3b82f6" transparent opacity={0.5} />
        </mesh>
      )}
    </group>
  );
}

function Wheel({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  const wheelRef = useRef<Mesh>(null);

  useFrame(() => {
    if (wheelRef.current) {
      wheelRef.current.rotation.x += 0.1;
    }
  });

  return (
    <mesh ref={wheelRef} position={position} rotation={[0, rotation, 0]} castShadow>
      <cylinderGeometry args={[0.4, 0.4, 0.3, 16]} />
      <meshStandardMaterial color="#1a1a1a" />
    </mesh>
  );
}

