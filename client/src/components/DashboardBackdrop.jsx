import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

function DustField({ count = 900 }) {
  const ref = useRef(null);

  const positions = useMemo(() => {
    const array = new Float32Array(count * 3);
    for (let index = 0; index < count; index += 1) {
      const radius = 5 + Math.random() * 17;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      array[index * 3] = Math.sin(phi) * Math.cos(theta) * radius;
      array[index * 3 + 1] = Math.cos(phi) * radius * 0.56;
      array[index * 3 + 2] = Math.sin(phi) * Math.sin(theta) * radius - 4;
    }
    return array;
  }, [count]);

  useFrame((state, delta) => {
    if (!ref.current) return;
    ref.current.rotation.y += delta * 0.012;
    ref.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.08) * 0.03;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.055}
        sizeAttenuation
        transparent
        opacity={0.34}
        color="#8fe9c0"
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </points>
  );
}

function WireCore() {
  const group = useRef(null);
  const inner = useRef(null);

  useFrame((state, delta) => {
    if (group.current) {
      group.current.rotation.y += delta * 0.075;
      group.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.16) * 0.14;
    }
    if (inner.current) {
      inner.current.rotation.y -= delta * 0.12;
      inner.current.rotation.z += delta * 0.05;
    }
  });

  return (
    <group ref={group} position={[8.6, 1.4, -7]} scale={2.3}>
      <mesh>
        <icosahedronGeometry args={[1, 1]} />
        <meshBasicMaterial color="#c8ff3d" wireframe transparent opacity={0.14} />
      </mesh>
      <mesh ref={inner} scale={0.62}>
        <octahedronGeometry args={[1, 0]} />
        <meshBasicMaterial color="#7fffd9" wireframe transparent opacity={0.2} />
      </mesh>
      <mesh scale={0.24}>
        <icosahedronGeometry args={[1, 0]} />
        <meshBasicMaterial color="#c8ff3d" transparent opacity={0.7} />
      </mesh>
    </group>
  );
}

function HaloRing() {
  const ref = useRef(null);
  useFrame((state, delta) => {
    if (!ref.current) return;
    ref.current.rotation.z += delta * 0.04;
    ref.current.rotation.x = Math.PI / 2.3 + Math.sin(state.clock.elapsedTime * 0.12) * 0.08;
  });
  return (
    <mesh ref={ref} position={[-10.5, -2.2, -10]} rotation={[Math.PI / 2.3, 0, 0]}>
      <torusGeometry args={[4.6, 0.012, 6, 128]} />
      <meshBasicMaterial color="#7fffd9" transparent opacity={0.24} toneMapped={false} />
    </mesh>
  );
}

function CircuitFloor() {
  const ref = useRef(null);
  useFrame((state) => {
    if (!ref.current) return;
    ref.current.position.z = -9 + ((state.clock.elapsedTime * 0.22) % 2);
  });

  return (
    <group ref={ref} position={[0, -5.6, -9]} rotation={[0, 0, 0]}>
      <gridHelper args={[46, 46, "#23361f", "#111a10"]} />
    </group>
  );
}

function Scene() {
  const group = useRef(null);

  useFrame((state) => {
    if (!group.current) return;
    group.current.rotation.y += (state.pointer.x * 0.035 - group.current.rotation.y) * 0.02;
    group.current.position.x += (state.pointer.x * 0.45 - group.current.position.x) * 0.02;
    group.current.position.y += (-state.pointer.y * 0.28 - group.current.position.y) * 0.02;
  });

  return (
    <group ref={group}>
      <DustField />
      <WireCore />
      <HaloRing />
      <CircuitFloor />
    </group>
  );
}

export default function DashboardBackdrop() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const check = () => setEnabled(!reduced && window.innerWidth > 900);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  if (!enabled) return null;

  return (
    <div className="dashboard-atmosphere" aria-hidden="true">
      <Canvas
        camera={{ position: [0, 0, 15], fov: 52 }}
        dpr={[1, 1.35]}
        gl={{ antialias: false, alpha: true, powerPreference: "high-performance" }}
      >
        <Scene />
      </Canvas>
      <span className="dashboard-atmosphere__vignette" />
      <span className="dashboard-atmosphere__grain" />
    </div>
  );
}
