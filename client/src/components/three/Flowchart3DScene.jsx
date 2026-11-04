import { useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Html, OrbitControls, Sparkles, Stars } from "@react-three/drei";
import * as THREE from "three";
import { GRAPH_GROUP_COLORS as GROUP_COLORS } from "../flowchart/graphParser";

const MAX_NODES = 34;
const MAX_EDGES = 64;
const MAX_PULSES = 20;

function colorForGroup(group, groups) {
  const index = Math.max(0, groups.indexOf(group));
  return GROUP_COLORS[index % GROUP_COLORS.length];
}

function buildPositions(nodes) {
  const limited = nodes.slice(0, MAX_NODES);
  const total = limited.length;
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));

  return limited.map((node, index) => {
    const y = total <= 1 ? 0 : 1 - (index / (total - 1)) * 2;
    const radius = Math.sqrt(Math.max(0, 1 - y * y)) * 5.4 + 0.4;
    const theta = goldenAngle * index;

    return {
      ...node,
      position: [
        Math.cos(theta) * radius,
        y * 3.1,
        Math.sin(theta) * radius
      ]
    };
  });
}

function GraphNode({ node, color, index, selected, connected, dimmed, onSelect }) {
  const groupRef = useRef(null);
  const [hovered, setHovered] = useState(false);

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y += delta * (hovered || selected ? 0.95 : 0.32);
    groupRef.current.position.y =
      node.position[1] + Math.sin(state.clock.elapsedTime * 0.55 + index * 0.7) * 0.14;
  });

  const glow = selected ? 2.8 : hovered ? 1.9 : connected ? 1.15 : 0.55;

  return (
    <group ref={groupRef} position={node.position}>
      <mesh
        onClick={(event) => {
          event.stopPropagation();
          onSelect(node.id);
        }}
        onPointerOver={(event) => {
          event.stopPropagation();
          setHovered(true);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = "";
        }}
      >
        <icosahedronGeometry args={[dimmed ? 0.22 : 0.34, 1]} />
        <meshStandardMaterial
          color={dimmed ? "#243026" : color}
          emissive={color}
          emissiveIntensity={dimmed ? 0.08 : glow}
          metalness={0.72}
          roughness={0.18}
          toneMapped={false}
        />
      </mesh>

      <mesh rotation={[Math.PI / 2, 0, 0]} scale={selected ? 1.9 : 1.5}>
        <torusGeometry args={[0.42, 0.012, 8, 64]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={dimmed ? 0.08 : selected ? 0.92 : 0.36}
          toneMapped={false}
        />
      </mesh>

      <Html position={[0, 0.7, 0]} center zIndexRange={[30, 0]}>
        <button
          type="button"
          className={`fc3d-label ${selected ? "is-selected" : ""} ${dimmed ? "is-dimmed" : ""}`}
          onClick={(event) => {
            event.stopPropagation();
            onSelect(node.id);
          }}
          title={node.label}
        >
          <span className="fc3d-label-dot" style={{ background: color }} />
          <span className="fc3d-label-text">{node.label}</span>
        </button>
      </Html>

      {(selected || hovered) && (
        <pointLight color={color} intensity={3.2} distance={4.5} />
      )}
    </group>
  );
}

function EdgePulse({ from, to, color, offset }) {
  const ref = useRef(null);
  const points = useMemo(() => [from, to], [from, to]);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = (clock.elapsedTime * 0.16 + offset) % 1;
    ref.current.position.lerpVectors(points[0], points[1], t);
    const pulse = 0.45 + Math.sin(t * Math.PI) * 0.75;
    ref.current.scale.setScalar(pulse);
  });

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.06, 10, 10]} />
      <meshBasicMaterial color={color} transparent opacity={0.9} toneMapped={false} />
    </mesh>
  );
}

function GraphScene({ nodes, edges, groups, selectedId, onSelect }) {
  const positioned = useMemo(() => buildPositions(nodes), [nodes]);
  const groupList = useMemo(
    () => (groups?.length ? groups : ["Core"]),
    [groups]
  );

  const positionMap = useMemo(() => {
    const map = new Map();
    positioned.forEach((node) => {
      map.set(node.id, new THREE.Vector3(...node.position));
    });
    return map;
  }, [positioned]);

  const connectedIds = useMemo(() => {
    if (!selectedId) return null;
    const ids = new Set([selectedId]);
    for (const edge of edges) {
      if (edge.from === selectedId) ids.add(edge.to);
      if (edge.to === selectedId) ids.add(edge.from);
    }
    return ids;
  }, [edges, selectedId]);

  const visibleEdges = useMemo(
    () =>
      edges
        .filter((edge) => positionMap.has(edge.from) && positionMap.has(edge.to))
        .slice(0, MAX_EDGES),
    [edges, positionMap]
  );

  const pulses = useMemo(
    () =>
      visibleEdges.slice(0, MAX_PULSES).map((edge, index) => ({
        ...edge,
        from: positionMap.get(edge.from),
        to: positionMap.get(edge.to),
        color: colorForGroup(
          positioned.find((node) => node.id === edge.from)?.group || "Core",
          groupList
        ),
        offset: (index * 0.137) % 1
      })),
    [visibleEdges, positionMap, positioned, groupList]
  );

  const edgeGeometry = useMemo(() => {
    const active = [];
    const inactive = [];

    for (const edge of visibleEdges) {
      const from = positionMap.get(edge.from);
      const to = positionMap.get(edge.to);
      if (!from || !to) continue;

      const isActive =
        selectedId &&
        (edge.from === selectedId || edge.to === selectedId);
      const target = isActive ? active : inactive;
      target.push(from.x, from.y, from.z, to.x, to.y, to.z);
    }

    return {
      active: new Float32Array(active),
      inactive: new Float32Array(inactive)
    };
  }, [visibleEdges, positionMap, selectedId]);

  return (
    <>
      <color attach="background" args={["#040604"]} />
      <fog attach="fog" args={["#040604", 11, 25]} />

      <ambientLight intensity={0.55} />
      <directionalLight position={[7, 10, 8]} intensity={1.4} color="#e9ffe8" />
      <pointLight position={[-8, -5, -7]} intensity={26} color="#38bdf8" />
      <pointLight position={[8, 6, -6]} intensity={20} color="#c8ff3d" />

      <group>
        {edgeGeometry.inactive.length > 0 && (
          <lineSegments>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                args={[edgeGeometry.inactive, 3]}
              />
            </bufferGeometry>
            <lineBasicMaterial
              color="#40524a"
              transparent
              opacity={selectedId ? 0.16 : 0.3}
              toneMapped={false}
            />
          </lineSegments>
        )}

        {edgeGeometry.active.length > 0 && (
          <lineSegments>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                args={[edgeGeometry.active, 3]}
              />
            </bufferGeometry>
            <lineBasicMaterial color="#c8ff3d" transparent opacity={0.9} toneMapped={false} />
          </lineSegments>
        )}

        {pulses.map((pulse, index) => (
          <EdgePulse
            key={`pulse-${pulse.from?.x}-${pulse.to?.x}-${index}`}
            from={pulse.from}
            to={pulse.to}
            color={pulse.color}
            offset={pulse.offset}
          />
        ))}

        {positioned.map((node, index) => (
          <GraphNode
            key={node.id}
            node={node}
            index={index}
            color={colorForGroup(node.group, groupList)}
            selected={selectedId === node.id}
            connected={connectedIds ? connectedIds.has(node.id) : false}
            dimmed={Boolean(connectedIds && !connectedIds.has(node.id))}
            onSelect={onSelect}
          />
        ))}
      </group>

      <Sparkles
        count={90}
        scale={17}
        size={1.3}
        speed={0.26}
        color="#c8ff3d"
        opacity={0.3}
      />
      <Stars radius={42} depth={30} count={1100} factor={2.4} saturation={0} fade speed={0.3} />

      <OrbitControls
        makeDefault
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        minDistance={6}
        maxDistance={19}
        autoRotate
        autoRotateSpeed={0.32}
      />
    </>
  );
}

export default function Flowchart3DScene({
  nodes = [],
  edges = [],
  groups = [],
  selectedId,
  onSelect
}) {
  const hasNodes = nodes.length > 0;

  return (
    <div className="fc3d-scene">
      {hasNodes ? (
        <Canvas
          style={{ width: "100%", height: "100%" }}
          camera={{ position: [0, 2.4, 14], fov: 48 }}
          dpr={[1, 1.6]}
          gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
          onPointerMissed={() => onSelect?.(null)}
        >
          <GraphScene
            nodes={nodes}
            edges={edges}
            groups={groups}
            selectedId={selectedId}
            onSelect={onSelect}
          />
        </Canvas>
      ) : (
        <div className="fc3d-empty">
          <p>No graph data yet.</p>
          <span>Generate a flowchart to explore it as a 3D architecture constellation.</span>
        </div>
      )}

      <div className="fc3d-hint">
        <span>Drag to orbit</span>
        <span>·</span>
        <span>Scroll to zoom</span>
        <span>·</span>
        <span>Click a node to inspect</span>
      </div>

      <div className="fc3d-legend">
        {groups.slice(0, 6).map((group, index) => (
          <span key={group} className="fc3d-legend-item">
            <i style={{ background: GROUP_COLORS[index % GROUP_COLORS.length] }} />
            {group}
          </span>
        ))}
      </div>
    </div>
  );
}
