import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import * as THREE from "three";
import gsap from "gsap";

const PARTICLE_COUNT = 2800;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

const particleVertex = `
  uniform float uTime;
  uniform float uProgress;
  uniform float uExplode;
  uniform float uFade;
  uniform float uPixelRatio;
  attribute vec3 aTarget;
  attribute float aSeed;
  attribute float aSize;
  varying float vAlpha;
  varying float vMix;

  void main() {
    float local = clamp((uProgress - aSeed * 0.28) / 0.72, 0.0, 1.0);
    local = local * local * (3.0 - 2.0 * local);

    vec3 pos = mix(position, aTarget, local);

    float drift = (1.0 - local) * 0.62;
    pos.x += sin(uTime * 0.42 + aSeed * 13.0) * drift;
    pos.y += cos(uTime * 0.36 + aSeed * 9.0) * drift;
    pos.z += sin(uTime * 0.31 + aSeed * 7.0) * drift;

    vec3 dir = normalize(pos + vec3(0.0001));
    pos += dir * uExplode * (2.4 + aSeed * 6.5);

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = aSize * (13.0 / max(0.001, -mv.z)) * uPixelRatio * (1.0 + uExplode * 0.9);

    float twinkle = 0.62 + 0.38 * sin(uTime * 2.3 + aSeed * 34.0);
    vAlpha = mix(0.16, 0.95, local) * twinkle * (1.0 - uFade);
    vMix = aSeed;
  }
`;

const particleFragment = `
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  varying float vAlpha;
  varying float vMix;

  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float dist = length(uv);
    if (dist > 0.5) discard;
    float alpha = smoothstep(0.5, 0.02, dist);
    vec3 color = mix(uColorA, uColorB, vMix);
    gl_FragColor = vec4(color, alpha * alpha * vAlpha);
  }
`;

function targetOnSphere(index) {
  const y = 1 - (index / (PARTICLE_COUNT - 1)) * 2;
  const ring = Math.sqrt(Math.max(0, 1 - y * y));
  const theta = GOLDEN_ANGLE * index;
  const radius = 2.02 + (Math.random() - 0.5) * 0.1;

  return new THREE.Vector3(
    Math.cos(theta) * ring * radius,
    y * radius,
    Math.sin(theta) * ring * radius,
  );
}

function disposeMaterial(material) {
  if (!material) return;
  if (material.map) material.map.dispose();
  material.dispose();
}

const PreloaderScene = forwardRef(function PreloaderScene({ progressRef }, ref) {
  const mount = useRef(null);
  const api = useRef(null);

  useImperativeHandle(ref, () => ({
    exit: () => {
      if (!api.current) return;
      const { state, camera } = api.current;
      gsap.to(state, {
        explode: 1,
        fade: 1,
        duration: 1.25,
        ease: "power2.in",
      });
      gsap.to(camera.position, {
        z: 3.4,
        duration: 1.35,
        ease: "power2.in",
      });
      gsap.to(api.current.group.rotation, {
        y: api.current.group.rotation.y + Math.PI * 0.75,
        duration: 1.3,
        ease: "power2.in",
      });
    },
  }));

  useEffect(() => {
    const host = mount.current;
    if (!host) return;

    const prefersReduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      46,
      host.clientWidth / Math.max(1, host.clientHeight),
      0.1,
      100,
    );
    camera.position.set(0, 0, 7.4);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(host.clientWidth, host.clientHeight);
    renderer.setClearColor(0x000000, 0);
    host.appendChild(renderer.domElement);

    const group = new THREE.Group();
    scene.add(group);

    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const targets = new Float32Array(PARTICLE_COUNT * 3);
    const seeds = new Float32Array(PARTICLE_COUNT);
    const sizes = new Float32Array(PARTICLE_COUNT);
    const targetVectors = [];

    for (let i = 0; i < PARTICLE_COUNT; i += 1) {
      const startRadius = 4.2 + Math.random() * 5.8;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i * 3] = startRadius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = startRadius * Math.cos(phi);
      positions[i * 3 + 2] = startRadius * Math.sin(phi) * Math.sin(theta);

      const target = targetOnSphere(i);
      targets[i * 3] = target.x;
      targets[i * 3 + 1] = target.y;
      targets[i * 3 + 2] = target.z;
      targetVectors.push(target);

      seeds[i] = Math.random();
      sizes[i] = 0.8 + Math.random() * 1.7;
    }

    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    particleGeometry.setAttribute("aTarget", new THREE.BufferAttribute(targets, 3));
    particleGeometry.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
    particleGeometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));

    const particleUniforms = {
      uTime: { value: 0 },
      uProgress: { value: 0 },
      uExplode: { value: 0 },
      uFade: { value: 0 },
      uPixelRatio: { value: renderer.getPixelRatio() },
      uColorA: { value: new THREE.Color("#7fffd9") },
      uColorB: { value: new THREE.Color("#d9fff9") },
    };

    const particleMaterial = new THREE.ShaderMaterial({
      uniforms: particleUniforms,
      vertexShader: particleVertex,
      fragmentShader: particleFragment,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const particles = new THREE.Points(particleGeometry, particleMaterial);
    group.add(particles);

    const linePositions = [];
    const networkCount = 160;
    const networkNodes = [];

    for (let i = 0; i < networkCount; i += 1) {
      const index = Math.floor((i / networkCount) * (PARTICLE_COUNT - 1));
      networkNodes.push(targetVectors[index]);
    }

    for (let i = 0; i < networkCount; i += 1) {
      const from = networkNodes[i];
      let nearest = null;
      let nearestDistance = Infinity;

      for (let j = 0; j < 30; j += 1) {
        const candidate = networkNodes[Math.floor(Math.random() * networkCount)];
        const distance = from.distanceTo(candidate);
        if (distance > 0.18 && distance < nearestDistance) {
          nearestDistance = distance;
          nearest = candidate;
        }
      }

      if (nearest) {
        linePositions.push(from.x, from.y, from.z, nearest.x, nearest.y, nearest.z);
      }
    }

    const lineGeometry = new THREE.BufferGeometry();
    lineGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(linePositions), 3),
    );
    const lineMaterial = new THREE.LineBasicMaterial({
      color: new THREE.Color("#7fffd9"),
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const network = new THREE.LineSegments(lineGeometry, lineMaterial);
    group.add(network);

    const rings = [];
    const ringConfigs = [
      { radius: 2.42, tilt: [1.18, 0.24, 0.32], speed: 0.16, color: "#7fffd9" },
      { radius: 2.78, tilt: [0.78, 1.04, 0.38], speed: -0.11, color: "#9aa8ff" },
      { radius: 3.14, tilt: [1.46, 0.2, 1.02], speed: 0.07, color: "#c8ff3d" },
    ];

    ringConfigs.forEach((config) => {
      const pivot = new THREE.Group();
      pivot.rotation.set(...config.tilt);

      const ringMaterial = new THREE.MeshBasicMaterial({
        color: new THREE.Color(config.color),
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });

      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(config.radius, 0.006, 6, 240),
        ringMaterial,
      );

      const satellite = new THREE.Mesh(
        new THREE.SphereGeometry(0.035, 10, 10),
        new THREE.MeshBasicMaterial({
          color: new THREE.Color(config.color),
          transparent: true,
          opacity: 0,
        }),
      );
      satellite.position.set(config.radius, 0, 0);

      pivot.add(ring, satellite);
      group.add(pivot);
      rings.push({ pivot, ring, satellite, config });
    });

    const glowCanvas = document.createElement("canvas");
    glowCanvas.width = 256;
    glowCanvas.height = 256;
    const glowContext = glowCanvas.getContext("2d");
    const glowGradient = glowContext.createRadialGradient(128, 128, 0, 128, 128, 128);
    glowGradient.addColorStop(0, "rgba(220, 255, 250, 0.85)");
    glowGradient.addColorStop(0.22, "rgba(127, 255, 217, 0.38)");
    glowGradient.addColorStop(0.55, "rgba(60, 170, 160, 0.1)");
    glowGradient.addColorStop(1, "rgba(0, 0, 0, 0)");
    glowContext.fillStyle = glowGradient;
    glowContext.fillRect(0, 0, 256, 256);

    const glowTexture = new THREE.CanvasTexture(glowCanvas);
    glowTexture.colorSpace = THREE.SRGBColorSpace;

    const glowMaterial = new THREE.SpriteMaterial({
      map: glowTexture,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const glow = new THREE.Sprite(glowMaterial);
    glow.scale.setScalar(8);
    scene.add(glow);

    const state = { explode: 0, fade: 0 };
    const pointer = { x: 0, y: 0 };
    api.current = { state, camera, group };

    const onPointerMove = (event) => {
      pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
      pointer.y = (event.clientY / window.innerHeight) * 2 - 1;
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });

    const resize = () => {
      const width = host.clientWidth;
      const height = Math.max(1, host.clientHeight);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      camera.position.z = width / height < 0.85 ? 9.4 : 7.4;
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(host);

    const startedAt = performance.now();

    renderer.setAnimationLoop(() => {
      const elapsed = (performance.now() - startedAt) / 1000;
      const progress = THREE.MathUtils.clamp((progressRef.current?.value || 0) / 100, 0, 1);
      const eased = progress * progress * (3 - 2 * progress);

      particleUniforms.uTime.value = elapsed;
      particleUniforms.uProgress.value = prefersReduced ? Math.min(1, progress) : eased;
      particleUniforms.uExplode.value = state.explode;
      particleUniforms.uFade.value = state.fade;
      particleUniforms.uPixelRatio.value = renderer.getPixelRatio();

      const spin = prefersReduced ? 0 : elapsed * (0.12 + progress * 0.28);
      group.rotation.y = spin;
      group.rotation.x = Math.sin(elapsed * 0.22) * 0.14 + progress * 0.18;

      if (!prefersReduced) {
        camera.position.x += (pointer.x * 0.42 - camera.position.x) * 0.045;
        camera.position.y += (-pointer.y * 0.3 - camera.position.y) * 0.045;
        camera.lookAt(0, 0, 0);
      }

      lineMaterial.opacity = Math.max(0, (eased - 0.42) / 0.58) * 0.24 * (1 - state.fade);

      rings.forEach(({ pivot, ring, satellite, config }, index) => {
        if (!prefersReduced) pivot.rotation.z += 0.0035 * config.speed * (1 + progress * 4);
        const reveal = THREE.MathUtils.smoothstep(eased, 0.45 + index * 0.1, 0.9);
        ring.material.opacity = reveal * (0.16 + index * 0.04) * (1 - state.fade);
        satellite.material.opacity = reveal * (1 - state.fade);
        satellite.visible = reveal > 0.05;
        const pulse = 0.8 + Math.sin(elapsed * 2 + index) * 0.2;
        satellite.scale.setScalar(pulse);
      });

      glowMaterial.opacity = (0.1 + eased * 0.42) * (1 - state.fade);
      glow.scale.setScalar(6.4 + eased * 1.8 + Math.sin(elapsed * 0.9) * 0.18);

      renderer.render(scene, camera);
    });

    return () => {
      observer.disconnect();
      window.removeEventListener("pointermove", onPointerMove);
      renderer.setAnimationLoop(null);
      gsap.killTweensOf(state);
      gsap.killTweensOf(camera.position);
      gsap.killTweensOf(group.rotation);

      particleGeometry.dispose();
      disposeMaterial(particleMaterial);
      lineGeometry.dispose();
      disposeMaterial(lineMaterial);
      rings.forEach(({ ring, satellite }) => {
        ring.geometry.dispose();
        disposeMaterial(ring.material);
        satellite.geometry.dispose();
        disposeMaterial(satellite.material);
      });
      disposeMaterial(glowMaterial);

      renderer.dispose();
      if (renderer.domElement.parentNode === host) {
        host.removeChild(renderer.domElement);
      }
      api.current = null;
    };
  }, [progressRef]);

  return <div className="preloader-canvas" ref={mount} aria-hidden="true" />;
});

export default PreloaderScene;
