import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useNearViewport } from "../../hooks/useNearViewport";

function Tunnel() {
  const count = 1500;
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uPixelRatio: { value: 1 },
      uColorA: { value: new THREE.Color("#7fffd9") },
      uColorB: { value: new THREE.Color("#c8ff3d") },
    }),
    [],
  );

  const geometry = useMemo(() => {
    const buffer = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count);

    for (let i = 0; i < count; i += 1) {
      const radius = 2.1 + Math.pow(Math.random(), 0.65) * 7.2;
      const angle = Math.random() * Math.PI * 2;
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = Math.sin(angle) * radius;
      positions[i * 3 + 2] = -46 + Math.random() * 50;
      seeds[i] = Math.random();
    }

    buffer.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    buffer.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
    return buffer;
  }, []);

  const ref = useRef(null);

  useFrame((state) => {
    uniforms.uTime.value = state.clock.elapsedTime;
    uniforms.uPixelRatio.value = state.gl.getPixelRatio();
    if (ref.current) {
      ref.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.12) * 0.18;
    }
  });

  return (
    <points ref={ref} geometry={geometry}>
      <shaderMaterial
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        vertexShader={`
          uniform float uTime;
          uniform float uPixelRatio;
          attribute float aSeed;
          varying float vAlpha;
          varying float vMix;

          void main() {
            vec3 p = position;
            float speed = 2.2 + aSeed * 3.4;
            p.z = mod(p.z + uTime * speed, 50.0) - 46.0;

            float angle = uTime * 0.055 + aSeed * 6.2831;
            float c = cos(angle);
            float s = sin(angle);
            p.xy = mat2(c, -s, s, c) * p.xy;

            vec4 mv = modelViewMatrix * vec4(p, 1.0);
            gl_Position = projectionMatrix * mv;
            gl_PointSize = (2.0 + aSeed * 3.4) * (18.0 / max(0.001, -mv.z)) * uPixelRatio;

            vAlpha = smoothstep(-46.0, -26.0, p.z) * (1.0 - smoothstep(0.0, 4.0, p.z));
            vMix = aSeed;
          }
        `}
        fragmentShader={`
          uniform vec3 uColorA;
          uniform vec3 uColorB;
          varying float vAlpha;
          varying float vMix;

          void main() {
            vec2 uv = gl_PointCoord - 0.5;
            float dist = length(uv);
            if (dist > 0.5) discard;
            float alpha = smoothstep(0.5, 0.0, dist);
            vec3 color = mix(uColorA, uColorB, vMix);
            gl_FragColor = vec4(color, alpha * alpha * vAlpha);
          }
        `}
      />
    </points>
  );
}

function VortexRings() {
  const group = useRef(null);

  useFrame((state, delta) => {
    if (!group.current) return;
    group.current.rotation.z += delta * 0.06;
    group.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.18) * 0.1;
  });

  return (
    <group ref={group}>
      {[
        { z: -6, r: 3.1, color: "#7fffd9", opacity: 0.16 },
        { z: -14, r: 5.0, color: "#c8ff3d", opacity: 0.1 },
        { z: -24, r: 6.8, color: "#9aa8ff", opacity: 0.08 },
      ].map((ring) => (
        <mesh key={ring.z} position={[0, 0, ring.z]}>
          <torusGeometry args={[ring.r, 0.012, 8, 160]} />
          <meshBasicMaterial
            color={ring.color}
            transparent
            opacity={ring.opacity}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
}

function Portal() {
  const ref = useRef(null);

  const bars = [
    { position: [0, 0.85, 0], size: [1.75, 0.05, 0.05] },
    { position: [0, -0.85, 0], size: [1.75, 0.05, 0.05] },
    { position: [0.85, 0, 0], size: [0.05, 1.75, 0.05] },
    { position: [-0.85, 0, 0], size: [0.05, 1.75, 0.05] },
  ];

  useFrame((state, delta) => {
    if (!ref.current) return;
    ref.current.rotation.z += delta * 0.08;
    ref.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.2) * 0.14;
    const pulse = 1 + Math.sin(state.clock.elapsedTime * 1.4) * 0.04;
    ref.current.scale.setScalar(pulse);
  });

  return (
    <group ref={ref} position={[0, 0, -9]}>
      {bars.map((bar, index) => (
        <mesh key={index} position={bar.position}>
          <boxGeometry args={bar.size} />
          <meshBasicMaterial
            color="#c8ff3d"
            transparent
            opacity={0.55}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
      ))}

      <mesh position={[0, 0, -0.03]}>
        <planeGeometry args={[1.6, 1.6]} />
        <meshBasicMaterial
          color="#7fffd9"
          transparent
          opacity={0.05}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

export default function CTAScene() {
  const container = useRef(null);
  const near = useNearViewport(container, "300px");

  return (
    <div className="cta-scene" ref={container} aria-hidden="true">
      {near && (
        <Canvas
          camera={{ position: [0, 0, 9], fov: 58 }}
          dpr={[1, 1.5]}
          gl={{ antialias: false, alpha: true, powerPreference: "high-performance" }}
        >
          <Tunnel />
          <VortexRings />
          <Portal />
        </Canvas>
      )}
    </div>
  );
}
