import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Edges, Sparkles } from "@react-three/drei";
import * as THREE from "three";
import { useNearViewport } from "../../hooks/useNearViewport";

const NODES = [
  { radius: 1.55, speed: 0.55, phase: 0, tilt: 0.22, color: "#7fffd9", size: 0.13 },
  { radius: 1.8, speed: -0.42, phase: 1.1, tilt: 0.55, color: "#c8ff3d", size: 0.16 },
  { radius: 2.05, speed: 0.34, phase: 2.2, tilt: 0.12, color: "#9aa8ff", size: 0.11 },
  { radius: 1.7, speed: -0.62, phase: 3.3, tilt: 0.75, color: "#7fffd9", size: 0.14 },
  { radius: 2.2, speed: 0.28, phase: 4.4, tilt: 0.36, color: "#c8ff3d", size: 0.12 },
  { radius: 1.9, speed: -0.38, phase: 5.5, tilt: 0.62, color: "#9aa8ff", size: 0.15 },
];

function Hub() {
  const shell = useRef(null);
  const inner = useRef(null);

  useFrame((state, delta) => {
    if (shell.current) {
      shell.current.rotation.y += delta * 0.4;
      shell.current.rotation.x += delta * 0.18;
    }
    if (inner.current) {
      inner.current.rotation.y -= delta * 0.6;
      inner.current.rotation.z += delta * 0.3;
    }
  });

  return (
    <group>
      <mesh ref={shell}>
        <boxGeometry args={[1.45, 1.45, 1.45]} />
        <meshBasicMaterial
          color="#c8ff3d"
          wireframe
          transparent
          opacity={0.32}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>

      <mesh ref={inner}>
        <boxGeometry args={[0.62, 0.62, 0.62]} />
        <meshStandardMaterial
          color="#0a1407"
          emissive="#c8ff3d"
          emissiveIntensity={0.9}
          metalness={0.8}
          roughness={0.2}
        />
        <Edges color="#c8ff3d" threshold={12} />
      </mesh>

      <pointLight position={[0, 0, 0]} intensity={9} color="#c8ff3d" />
    </group>
  );
}

function Network() {
  const group = useRef(null);
  const nodes = useRef([]);
  const lines = useRef(null);
  const positions = useMemo(() => new Float32Array(NODES.length * 6), []);

  useFrame((state, delta) => {
    if (group.current) group.current.rotation.y += delta * 0.05;

    NODES.forEach((node, index) => {
      const t = state.clock.elapsedTime * node.speed + node.phase;
      const x = Math.cos(t) * node.radius;
      const y = Math.sin(t) * node.radius * Math.sin(node.tilt);
      const z = Math.sin(t) * node.radius * Math.cos(node.tilt);

      const mesh = nodes.current[index];
      if (mesh) {
        mesh.position.set(x, y, z);
        mesh.rotation.x += delta * 0.8;
        mesh.rotation.y += delta * 0.6;
      }

      positions[index * 6] = 0;
      positions[index * 6 + 1] = 0;
      positions[index * 6 + 2] = 0;
      positions[index * 6 + 3] = x;
      positions[index * 6 + 4] = y;
      positions[index * 6 + 5] = z;
    });

    if (lines.current) {
      lines.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <group ref={group}>
      <lineSegments ref={lines}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <lineBasicMaterial
          color="#7fffd9"
          transparent
          opacity={0.2}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </lineSegments>

      {NODES.map((node, index) => (
        <group
          key={index}
          ref={(element) => {
            nodes.current[index] = element;
          }}
        >
          <mesh>
            <boxGeometry args={[node.size, node.size, node.size]} />
            <meshBasicMaterial color={node.color} toneMapped={false} />
          </mesh>
          <mesh scale={2.2}>
            <boxGeometry args={[node.size, node.size, node.size]} />
            <meshBasicMaterial
              color={node.color}
              transparent
              opacity={0.14}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
              toneMapped={false}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Frame() {
  const ref = useRef(null);

  const geometry = useMemo(() => {
    const box = new THREE.BoxGeometry(3.6, 3.6, 3.6);
    const edges = new THREE.EdgesGeometry(box);
    box.dispose();
    return edges;
  }, []);

  useFrame((state, delta) => {
    if (!ref.current) return;
    ref.current.rotation.y -= delta * 0.06;
    ref.current.rotation.x += delta * 0.03;
  });

  return (
    <lineSegments ref={ref} geometry={geometry}>
      <lineBasicMaterial
        color="#7fffd9"
        transparent
        opacity={0.09}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </lineSegments>
  );
}

function Lights() {
  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[3, 4, 4]} intensity={22} color="#c8ff3d" />
      <pointLight position={[-4, -2, 3]} intensity={14} color="#7fffd9" />
      <pointLight position={[0, 0, 5]} intensity={10} color="#9aa8ff" />
    </>
  );
}

export default function IntegrationScene() {
  const container = useRef(null);
  const near = useNearViewport(container, "200px");

  return (
    <div className="integration-scene" ref={container} aria-hidden="true">
      {near && (
        <Canvas
          camera={{ position: [0, 0.4, 5.6], fov: 44 }}
          dpr={[1, 1.5]}
          gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        >
          <Lights />
          <Hub />
          <Network />
          <Frame />
          <Sparkles
            count={50}
            scale={[6, 6, 6]}
            size={1.2}
            speed={0.25}
            opacity={0.3}
            color="#bffff2"
            noise={0.4}
          />
        </Canvas>
      )}
    </div>
  );
}
