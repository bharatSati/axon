import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Edges, Sparkles } from "@react-three/drei";
import * as THREE from "three";
import { useNearViewport } from "../../hooks/useNearViewport";

const BARS = [
  { angle: 0, height: 1.5, color: "#7fffd9" },
  { angle: Math.PI / 4, height: 2.6, color: "#c8ff3d" },
  { angle: Math.PI / 2, height: 2.0, color: "#9aa8ff" },
  { angle: (Math.PI * 3) / 4, height: 3.4, color: "#c8ff3d" },
  { angle: Math.PI, height: 2.2, color: "#7fffd9" },
  { angle: (Math.PI * 5) / 4, height: 2.9, color: "#9aa8ff" },
  { angle: (Math.PI * 3) / 2, height: 1.8, color: "#7fffd9" },
  { angle: (Math.PI * 7) / 4, height: 3.9, color: "#c8ff3d" },
];

function Ring({ radius, tilt, color, opacity, speed }) {
  const ref = useRef(null);

  useFrame((state, delta) => {
    if (ref.current) ref.current.rotation.z += delta * speed;
  });

  return (
    <group rotation={tilt}>
      <mesh ref={ref}>
        <torusGeometry args={[radius, 0.006, 8, 160]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={opacity}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

function Sculpture() {
  const group = useRef(null);
  const bars = useMemo(() => BARS, []);

  useFrame((state, delta) => {
    if (!group.current) return;
    group.current.rotation.y += delta * 0.13;
    group.current.rotation.x = -0.08 + Math.sin(state.clock.elapsedTime * 0.24) * 0.05;
    group.current.position.y = -1.65 + Math.sin(state.clock.elapsedTime * 0.5) * 0.08;
  });

  return (
    <group ref={group} scale={0.82}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <circleGeometry args={[2.9, 96]} />
        <meshBasicMaterial
          color="#7fffd9"
          transparent
          opacity={0.045}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[1.35, 2.65, 96]} />
        <meshBasicMaterial
          color="#c8ff3d"
          transparent
          opacity={0.1}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {bars.map((bar, index) => {
        const x = Math.cos(bar.angle) * 1.95;
        const z = Math.sin(bar.angle) * 1.95;

        return (
          <group key={index} position={[x, 0, z]} rotation={[0, -bar.angle, 0]}>
            <mesh position={[0, bar.height / 2, 0]}>
              <boxGeometry args={[0.3, bar.height, 0.3]} />
              <meshStandardMaterial
                color="#081006"
                emissive={bar.color}
                emissiveIntensity={0.5}
                metalness={0.75}
                roughness={0.26}
              />
              <Edges color={bar.color} threshold={12} />
            </mesh>
            <mesh position={[0, bar.height + 0.04, 0]}>
              <sphereGeometry args={[0.045, 10, 10]} />
              <meshBasicMaterial color={bar.color} toneMapped={false} />
            </mesh>
          </group>
        );
      })}

      <Ring radius={3.15} tilt={[1.28, 0.18, 0.2]} color="#7fffd9" opacity={0.22} speed={0.12} />
      <Ring radius={3.5} tilt={[0.7, 1.02, 0.4]} color="#9aa8ff" opacity={0.14} speed={-0.09} />
      <Ring radius={3.85} tilt={[1.5, 0.15, 1.0]} color="#c8ff3d" opacity={0.12} speed={0.06} />

      <Sparkles
        count={80}
        scale={[9, 6, 9]}
        size={2}
        speed={0.28}
        opacity={0.45}
        color="#bffff2"
        noise={0.4}
      />
    </group>
  );
}

function CameraRig() {
  const { camera } = useThree();

  useEffect(() => {
    camera.position.set(0, 2.6, 8.2);
    camera.lookAt(0, 1.1, 0);
  }, [camera]);

  return null;
}

function Lights() {
  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[4, 5, 4]} intensity={26} color="#c8ff3d" />
      <pointLight position={[-4, 2, 3]} intensity={18} color="#7fffd9" />
      <pointLight position={[0, -2, 2]} intensity={10} color="#9aa8ff" />
    </>
  );
}

export default function MetricsScene() {
  const container = useRef(null);
  const near = useNearViewport(container);

  return (
    <div className="metrics-scene" ref={container} aria-hidden="true">
      {near && (
        <Canvas
          camera={{ position: [0, 2.6, 8.2], fov: 42 }}
          dpr={[1, 1.5]}
          gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        >
          <CameraRig />
          <Lights />
          <Sculpture />
        </Canvas>
      )}
    </div>
  );
}
