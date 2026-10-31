import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, extend, useFrame, useThree } from "@react-three/fiber";
import { MeshDistortMaterial, Sparkles, shaderMaterial } from "@react-three/drei";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import * as THREE from "three";

const ORB_RADIUS = 1.2;

const RimMaterial = shaderMaterial(
  {
    uColorA: new THREE.Color("#7fffd9"),
    uColorB: new THREE.Color("#7fffd9"),
    uPower: 2.6,
  },
  `
    varying vec3 vNormal;
    varying vec3 vView;

    void main() {
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      vNormal = normalize(normalMatrix * normal);
      vView = normalize(-mv.xyz);
      gl_Position = projectionMatrix * mv;
    }
  `,
  `
    uniform vec3 uColorA;
    uniform vec3 uColorB;
    uniform float uPower;
    varying vec3 vNormal;
    varying vec3 vView;

    void main() {
      float fresnel = pow(1.0 - clamp(dot(normalize(vNormal), normalize(vView)), 0.0, 1.0), uPower);
      vec3 color = mix(uColorA, uColorB, fresnel);
      gl_FragColor = vec4(color, fresnel * 0.85);
    }
  `,
);

extend({ RimMaterial });

function makeGlowTexture() {
  const size = 128;
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
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.3, "rgba(255,255,255,0.45)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

function StudioEnvironment() {
  const { gl, scene } = useThree();

  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = environment;

    return () => {
      scene.environment = null;
      environment.dispose();
      pmrem.dispose();
    };
  }, [gl, scene]);

  return null;
}

function Halo() {
  const ref = useRef(null);

  const geometry = useMemo(() => {
    const count = 900;
    const positions = new Float32Array(count * 3);

    for (let i = 0; i < count; i += 1) {
      const radius = 1.55 + Math.random() * 1.5;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta) * 0.78;
      positions[i * 3 + 2] = radius * Math.cos(phi);
    }

    const buffer = new THREE.BufferGeometry();
    buffer.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return buffer;
  }, []);

  useFrame((state, delta) => {
    if (!ref.current) return;
    ref.current.rotation.y += delta * 0.05;
    ref.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.2) * 0.12;
  });

  return (
    <points ref={ref} geometry={geometry}>
      <pointsMaterial
        color="#7fffd9"
        size={0.022}
        sizeAttenuation
        transparent
        opacity={0.55}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </points>
  );
}

function Rings() {
  const ringA = useRef(null);
  const ringB = useRef(null);
  const ringC = useRef(null);

  const rings = [
    { ref: ringA, radius: 1.62, tube: 0.008, tilt: [1.22, 0.24, 0.3], color: "#7fffd9", opacity: 0.42, speed: 0.16 },
    { ref: ringB, radius: 1.9, tube: 0.006, tilt: [0.62, 1.02, 0.34], color: "#c8ff3d", opacity: 0.26, speed: -0.11 },
    { ref: ringC, radius: 2.16, tube: 0.005, tilt: [1.48, 0.18, 1.02], color: "#9aa8ff", opacity: 0.18, speed: 0.08 },
  ];

  useFrame((state, delta) => {
    rings.forEach(({ ref, speed }) => {
      if (ref.current) ref.current.rotation.z += delta * speed;
    });
  });

  return (
    <group>
      {rings.map((ring, index) => (
        <group key={index} rotation={ring.tilt}>
          <mesh ref={ring.ref}>
            <torusGeometry args={[ring.radius, ring.tube, 8, 220]} />
            <meshBasicMaterial
              color={ring.color}
              transparent
              opacity={ring.opacity}
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

function Satellite({ radius, speed, phase, tilt, size, color }) {
  const ref = useRef(null);

  useFrame((state, delta) => {
    if (!ref.current) return;
    const time = state.clock.elapsedTime * speed + phase;
    ref.current.position.set(
      Math.cos(time) * radius,
      Math.sin(time) * radius * Math.sin(tilt),
      Math.sin(time) * radius * Math.cos(tilt),
    );
    ref.current.rotation.x += delta * 0.7;
    ref.current.rotation.y += delta * 0.9;
  });

  return (
    <mesh ref={ref}>
      <boxGeometry args={[size, size, size]} />
      <meshPhysicalMaterial
        color="#0c1712"
        metalness={1}
        roughness={0.16}
        iridescence={1}
        iridescenceIOR={1.3}
        clearcoat={1}
        clearcoatRoughness={0.1}
        envMapIntensity={1.4}
        emissive={color}
        emissiveIntensity={0.18}
      />
    </mesh>
  );
}

function Orb({ interaction }) {
  const group = useRef(null);
  const material = useRef(null);
  const glow = useMemo(makeGlowTexture, []);

  const satellites = useMemo(
    () => [
      { radius: 2.15, speed: 0.32, phase: 0, tilt: 0.35, size: 0.11, color: "#c8ff3d" },
      { radius: 2.35, speed: -0.24, phase: 1.1, tilt: 0.62, size: 0.085, color: "#7fffd9" },
      { radius: 2.05, speed: 0.38, phase: 2.2, tilt: 0.18, size: 0.07, color: "#9aa8ff" },
      { radius: 2.5, speed: -0.2, phase: 3.3, tilt: 0.78, size: 0.09, color: "#c8ff3d" },
      { radius: 2.25, speed: 0.28, phase: 4.4, tilt: 0.48, size: 0.075, color: "#7fffd9" },
      { radius: 2.4, speed: -0.34, phase: 5.5, tilt: 0.28, size: 0.1, color: "#9aa8ff" },
    ],
    [],
  );

  useFrame((state, delta) => {
    const time = state.clock.elapsedTime;
    const pulse = interaction.current.pulse;

    if (group.current) {
      group.current.rotation.y += delta * 0.14;
      group.current.rotation.x = Math.sin(time * 0.24) * 0.07;
      const scale = 1 + Math.sin(time * 1.2) * 0.014 + pulse * 0.05;
      group.current.scale.setScalar(scale);
    }

    if (material.current) {
      const hover = interaction.current.hovered ? 1 : 0;
      const target = 0.24 + hover * 0.16 + pulse * 0.22;
      material.current.distort = THREE.MathUtils.damp(
        material.current.distort,
        target,
        3.2,
        delta,
      );
    }

    interaction.current.pulse = Math.max(0, pulse - delta * 1.1);
  });

  return (
    <group ref={group}>
      <mesh>
        <sphereGeometry args={[ORB_RADIUS, 96, 96]} />
        <MeshDistortMaterial
          ref={material}
          color="#1d6b52"
          metalness={0.2}
          roughness={0.38}
          distort={0.24}
          speed={1.1}
          emissive="#0a2a20"
          emissiveIntensity={0.45}
          clearcoat={0.5}
          clearcoatRoughness={0.24}
          envMapIntensity={0.5}
        />
      </mesh>

      <mesh scale={1.012}>
        <sphereGeometry args={[ORB_RADIUS, 96, 96]} />
        <rimMaterial
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>

      <sprite scale={[5.4, 5.4, 5.4]} position={[0, 0, -0.6]}>
        <spriteMaterial
          map={glow}
          color="#7fffd9"
          transparent
          opacity={0.16}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </sprite>

      <pointLight position={[2.6, 1.6, 2.4]} intensity={30} color="#c9fff0" distance={12} />
      <pointLight position={[-2.8, -1.2, 2.2]} intensity={24} color="#9fffe0" distance={12} />
      <pointLight position={[0, 2.4, -3]} intensity={18} color="#bfffe9" distance={12} />

      {satellites.map((satellite, index) => (
        <Satellite key={index} {...satellite} />
      ))}
    </group>
  );
}

function Pedestal() {
  const ring = useRef(null);

  useFrame((state, delta) => {
    if (ring.current) {
      ring.current.rotation.z += delta * 0.08;
      ring.current.material.opacity =
        0.2 + Math.sin(state.clock.elapsedTime * 1.4) * 0.06;
    }
  });

  return (
    <group position={[0, -1.7, 0]}>
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
        <ringGeometry args={[1.7, 1.8, 128]} />
        <meshBasicMaterial
          color="#c8ff3d"
          transparent
          opacity={0.18}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.2, 0]}>
        <circleGeometry args={[2.4, 64]} />
        <meshBasicMaterial
          color="#7fffd9"
          transparent
          opacity={0.03}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

function CameraRig() {
  const { camera } = useThree();
  const base = useMemo(() => new THREE.Vector3(0, 0.3, 7.0), []);

  useEffect(() => {
    camera.position.copy(base);
    camera.lookAt(0, 0, 0);
  }, [camera, base]);

  useFrame((state, delta) => {
    const targetX = base.x + state.pointer.x * 0.55;
    const targetY = base.y - state.pointer.y * 0.4;
    camera.position.x = THREE.MathUtils.damp(camera.position.x, targetX, 3, delta);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, targetY, 3, delta);
    camera.lookAt(0, 0, 0);
  });

  return null;
}

function Scene({ interaction }) {
  const group = useRef(null);

  useFrame((state, delta) => {
    if (!group.current) return;
    const spin = interaction.current;

    if (!spin.dragging) {
      spin.spinY += spin.velY;
      spin.velY *= 0.94;
      spin.spinX += spin.velX;
      spin.velX *= 0.92;
      spin.spinX = THREE.MathUtils.clamp(spin.spinX, -0.5, 0.5);
    }

    const targetY = spin.spinY + state.pointer.x * 0.1;
    const targetX = spin.spinX - state.pointer.y * 0.06;

    group.current.rotation.y = THREE.MathUtils.damp(
      group.current.rotation.y,
      targetY,
      3.2,
      delta,
    );
    group.current.rotation.x = THREE.MathUtils.damp(
      group.current.rotation.x,
      targetX,
      3.2,
      delta,
    );
  });

  return (
    <>
      <Pedestal />
      <group ref={group}>
        <Orb interaction={interaction} />
        <Rings />
        <Halo />
        <Sparkles
          count={110}
          scale={[6, 6, 6]}
          size={1.3}
          speed={0.3}
          opacity={0.34}
          color="#bffff2"
          noise={0.4}
        />
      </group>
    </>
  );
}

function Lights() {
  return (
    <>
      <ambientLight intensity={0.35} />
      <directionalLight position={[4, 6, 5]} intensity={1.2} color="#eafff6" />
      <pointLight position={[-5, 2, 4]} intensity={18} color="#9fffe0" />
      <pointLight position={[5, -2, 3]} intensity={14} color="#c9fff0" />
    </>
  );
}

export default function HeroCoreScene() {
  const interaction = useRef({
    spinX: 0,
    spinY: 0,
    velX: 0,
    velY: 0,
    dragging: false,
    hovered: false,
    pulse: 0,
  });
  const container = useRef(null);

  useEffect(() => {
    const element = container.current;
    if (!element) return;

    let lastX = 0;
    let lastY = 0;
    let moved = 0;

    const onPointerDown = (event) => {
      if (event.button !== 0) return;
      interaction.current.dragging = true;
      moved = 0;
      lastX = event.clientX;
      lastY = event.clientY;
      element.classList.add("is-dragging");
    };

    const onPointerMove = (event) => {
      if (!interaction.current.dragging) return;
      const deltaX = event.clientX - lastX;
      const deltaY = event.clientY - lastY;
      lastX = event.clientX;
      lastY = event.clientY;
      moved += Math.abs(deltaX) + Math.abs(deltaY);

      interaction.current.spinY += deltaX * 0.006;
      interaction.current.spinX = THREE.MathUtils.clamp(
        interaction.current.spinX + deltaY * 0.004,
        -0.5,
        0.5,
      );
      interaction.current.velY = deltaX * 0.0012;
      interaction.current.velX = deltaY * 0.0009;
    };

    const onPointerUp = () => {
      interaction.current.dragging = false;
      element.classList.remove("is-dragging");
    };

    const onClick = () => {
      if (moved < 6) interaction.current.pulse = 1;
    };

    element.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    element.addEventListener("click", onClick);

    return () => {
      element.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      element.removeEventListener("click", onClick);
    };
  }, []);

  return (
    <div className="orb-scene" ref={container}>
      <Canvas
        camera={{ position: [0, 0.3, 7.0], fov: 40 }}
        dpr={[1, 1.75]}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        className="orb-canvas"
        onPointerOver={() => {
          interaction.current.hovered = true;
        }}
        onPointerOut={() => {
          interaction.current.hovered = false;
        }}
      >
        <Suspense fallback={null}>
          <StudioEnvironment />
          <CameraRig />
          <Lights />
          <Scene interaction={interaction} />
        </Suspense>
      </Canvas>
    </div>
  );
}
