import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

function GlowSprite({ position, scale, color, opacity }) {
  const texture = useMemo(() => {
    const size = 256;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext("2d");
    const gradient = context.createRadialGradient(
      size / 2,
      size / 2,
      0,
      size / 2,
      size / 2,
      size / 2,
    );
    gradient.addColorStop(0, "rgba(226,255,246,0.9)");
    gradient.addColorStop(0.16, "rgba(127,255,217,0.5)");
    gradient.addColorStop(0.45, "rgba(95,180,255,0.12)");
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);

  const ref = useRef(null);

  useFrame((state) => {
    if (!ref.current) return;
    const pulse = 0.88 + Math.sin(state.clock.elapsedTime * 0.32) * 0.12;
    ref.current.scale.setScalar(scale * pulse);
  });

  return (
    <sprite ref={ref} position={position} scale={scale}>
      <spriteMaterial
        map={texture}
        color={color}
        transparent
        opacity={opacity}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </sprite>
  );
}

function Starfield({ count = 1800 }) {
  const positions = useMemo(() => {
    const array = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      const radius = 16 + Math.random() * 46;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      array[i * 3] = Math.sin(phi) * Math.cos(theta) * radius;
      array[i * 3 + 1] = Math.cos(phi) * radius * 0.58;
      array[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * radius - 24;
    }
    return array;
  }, [count]);

  const ref = useRef(null);

  useFrame((state, delta) => {
    if (!ref.current) return;
    ref.current.rotation.y += delta * 0.005;
    ref.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.05) * 0.04;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.065}
        sizeAttenuation
        transparent
        opacity={0.48}
        color="#c4e9ff"
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </points>
  );
}

function Aurora() {
  const ref = useRef(null);
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uDeep: { value: new THREE.Color("#03100d") },
      uMid: { value: new THREE.Color("#0a2418") },
      uMint: { value: new THREE.Color("#7fffd9") },
      uLime: { value: new THREE.Color("#c8ff3d") },
    }),
    [],
  );

  useFrame((state) => {
    if (ref.current) ref.current.uniforms.uTime.value = state.clock.elapsedTime;
  });

  return (
    <mesh position={[0, 7, -58]}>
      <planeGeometry args={[150, 86]} />
      <shaderMaterial
        ref={ref}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        vertexShader={`
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragmentShader={`
          uniform float uTime;
          uniform vec3 uDeep;
          uniform vec3 uMid;
          uniform vec3 uMint;
          uniform vec3 uLime;
          varying vec2 vUv;

          float hash(vec2 p) {
            return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
          }

          float noise(vec2 p) {
            vec2 i = floor(p);
            vec2 f = fract(p);
            f = f * f * (3.0 - 2.0 * f);
            float a = hash(i);
            float b = hash(i + vec2(1.0, 0.0));
            float c = hash(i + vec2(0.0, 1.0));
            float d = hash(i + vec2(1.0, 1.0));
            return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
          }

          void main() {
            vec2 uv = vUv;
            float t = uTime * 0.018;

            float n = noise(uv * 3.2 + vec2(t, -t * 0.7)) * 0.62
              + noise(uv * 6.4 - vec2(t * 1.4, t * 0.9)) * 0.38;

            float ribbon = smoothstep(0.38, 0.86, n)
              * smoothstep(1.0, 0.18, abs(uv.y - 0.56));
            float glow = smoothstep(0.62, 0.0, length((uv - 0.5) * vec2(1.0, 1.35)));

            vec3 color = mix(uDeep, uMid, uv.x);
            color += uMint * ribbon * 0.4;
            color += uLime * pow(ribbon, 2.0) * 0.22;

            gl_FragColor = vec4(color, ribbon * glow * 0.26);
          }
        `}
      />
    </mesh>
  );
}

function GridFloor() {
  const ref = useRef(null);
  const uniforms = useMemo(
    () => ({
      uColor: { value: new THREE.Color("#7fffd9") },
      uTime: { value: 0 },
    }),
    [],
  );

  useFrame((state) => {
    if (ref.current) ref.current.uniforms.uTime.value = state.clock.elapsedTime;
  });

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -10, -24]}>
      <planeGeometry args={[160, 160]} />
      <shaderMaterial
        ref={ref}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        vertexShader={`
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragmentShader={`
          uniform vec3 uColor;
          uniform float uTime;
          varying vec2 vUv;

          void main() {
            vec2 coord = vUv * 64.0;
            vec2 grid = abs(fract(coord - 0.5) - 0.5) / fwidth(coord);
            float line = 1.0 - min(min(grid.x, grid.y), 1.0);
            float fade = smoothstep(0.5, 0.04, length(vUv - 0.5));
            float pulse = 0.65 + 0.35 * sin(uTime * 0.7 + vUv.y * 24.0);
            gl_FragColor = vec4(uColor, line * fade * 0.2 * pulse);
          }
        `}
      />
    </mesh>
  );
}

function World() {
  const group = useRef(null);
  const { camera } = useThree();

  useFrame((state) => {
    const scroll =
      window.scrollY /
      Math.max(1, document.documentElement.scrollHeight - window.innerHeight);

    if (group.current) {
      group.current.rotation.y = scroll * 0.7 + state.clock.elapsedTime * 0.004;
      group.current.rotation.x = scroll * 0.14;
      group.current.position.y = scroll * 2.2;
    }

    camera.position.x += (state.pointer.x * 1.4 - camera.position.x) * 0.02;
    camera.position.y += (-state.pointer.y * 0.9 - scroll * 2.0 - camera.position.y) * 0.02;
    camera.lookAt(0, -scroll * 1.4, -14);
  });

  return (
    <group ref={group}>
      <Starfield />
      <Aurora />
      <GridFloor />
      <GlowSprite position={[10, 8, -34]} scale={34} color="#7fffd9" opacity={0.16} />
      <GlowSprite position={[-13, -6, -30]} scale={28} color="#9aa8ff" opacity={0.13} />
      <GlowSprite position={[16, -8, -24]} scale={20} color="#c8ff3d" opacity={0.07} />
    </group>
  );
}

export default function Atmosphere() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(pointer: fine)");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const check = () => {
      setEnabled(media.matches && !reduced && window.innerWidth > 820);
    };
    check();
    media.addEventListener?.("change", check);
    window.addEventListener("resize", check);
    return () => {
      media.removeEventListener?.("change", check);
      window.removeEventListener("resize", check);
    };
  }, []);

  if (!enabled) return null;

  return (
    <div className="atmosphere" aria-hidden="true">
      <Canvas
        camera={{ position: [0, 0, 16], fov: 55 }}
        dpr={[1, 1.5]}
        gl={{ antialias: false, alpha: true, powerPreference: "high-performance" }}
      >
        <World />
      </Canvas>
    </div>
  );
}
