"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useMemo, useRef } from "react";
import * as THREE from "three";

type AvatarState = "idle" | "thinking" | "listening" | "speaking";

function Face({ state }: { state: AvatarState }) {
  const root = useRef<THREE.Group>(null);
  const eyes = useRef<THREE.Group[]>([]);
  const mouth = useRef<THREE.Mesh>(null);

  const hairPositions = useMemo(
    () => [
      [-0.7, 0.75, 0.2, 0.48, 0.72, 0.55],
      [-0.42, 1.0, 0.25, 0.52, 0.7, 0.6],
      [0, 1.1, 0.18, 0.6, 0.7, 0.65],
      [0.42, 1.0, 0.25, 0.52, 0.7, 0.6],
      [0.7, 0.75, 0.2, 0.48, 0.72, 0.55]
    ],
    []
  );

  useFrame(({ pointer, clock }) => {
    const t = clock.getElapsedTime();
    if (!root.current) return;

    const idleY = Math.sin(t * 0.7) * 0.025;
    const idleX = Math.sin(t * 0.9) * 0.012;
    root.current.rotation.y = THREE.MathUtils.lerp(root.current.rotation.y, pointer.x * 0.22 + idleY, 0.08);
    root.current.rotation.x = THREE.MathUtils.lerp(root.current.rotation.x, -pointer.y * 0.1 + idleX, 0.08);
    root.current.position.y = Math.sin(t * 1.1) * 0.025;

    const blink = (Math.sin(t * 0.85) > 0.985 ? 0.08 : 1);
    eyes.current.forEach((eye) => {
      if (eye) eye.scale.y = THREE.MathUtils.lerp(eye.scale.y, blink, 0.35);
    });

    if (mouth.current) {
      const openTarget = state === "speaking"
        ? 0.09 + Math.abs(Math.sin(t * 13)) * 0.09
        : state === "listening"
          ? 0.025
          : state === "thinking"
            ? 0.035
            : 0.018;
      mouth.current.scale.y = THREE.MathUtils.lerp(mouth.current.scale.y, openTarget, 0.2);
    }
  });

  return (
    <group ref={root}>
      <mesh castShadow receiveShadow position={[0, 0, 0]}>
        <sphereGeometry args={[1, 64, 64]} />
        <meshStandardMaterial color="#f2c7b9" roughness={0.62} />
      </mesh>

      <mesh position={[0, -0.78, 0.05]} scale={[0.52, 0.52, 0.52]}>
        <sphereGeometry args={[1, 48, 48]} />
        <meshStandardMaterial color="#f2c7b9" roughness={0.7} />
      </mesh>

      {hairPositions.map(([x, y, z, sx, sy, sz], i) => (
        <mesh key={i} position={[x, y, z]} scale={[sx, sy, sz]} castShadow>
          <sphereGeometry args={[1, 40, 40]} />
          <meshStandardMaterial color="#e84b86" roughness={0.55} />
        </mesh>
      ))}

      <mesh position={[-0.84, 0.2, 0.05]} scale={[0.22, 0.44, 0.34]} rotation={[0, 0, -0.28]}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshStandardMaterial color="#e84b86" roughness={0.55} />
      </mesh>
      <mesh position={[0.84, 0.2, 0.05]} scale={[0.22, 0.44, 0.34]} rotation={[0, 0, 0.28]}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshStandardMaterial color="#e84b86" roughness={0.55} />
      </mesh>

      {[[-0.38, 0.18], [0.38, 0.18]].map(([x, y], i) => (
        <group key={i} ref={(el) => { if (el) eyes.current[i] = el; }} position={[x, y, 0.9]}>
          <mesh scale={[0.24, 0.32, 0.16]}>
            <sphereGeometry args={[1, 40, 40]} />
            <meshStandardMaterial color="#fff7fb" roughness={0.35} />
          </mesh>
          <mesh position={[0, -0.01, 0.14]} scale={[0.105, 0.16, 0.07]}>
            <sphereGeometry args={[1, 32, 32]} />
            <meshStandardMaterial color="#39233f" roughness={0.2} />
          </mesh>
          <mesh position={[0.035, 0.07, 0.19]} scale={[0.035, 0.05, 0.025]}>
            <sphereGeometry args={[1, 24, 24]} />
            <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.5} />
          </mesh>
        </group>
      ))}

      <mesh position={[-0.38, 0.5, 0.88]} scale={[0.25, 0.035, 0.04]} rotation={[0, 0, -0.08]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#5a273c" />
      </mesh>
      <mesh position={[0.38, 0.5, 0.88]} scale={[0.25, 0.035, 0.04]} rotation={[0, 0, 0.08]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#5a273c" />
      </mesh>

      <mesh position={[0, -0.02, 0.94]} scale={[0.07, 0.2, 0.055]} rotation={[0.1, 0, 0]}>
        <sphereGeometry args={[1, 24, 24]} />
        <meshStandardMaterial color="#d99788" roughness={0.7} />
      </mesh>

      <mesh ref={mouth} position={[0, -0.38, 0.89]} scale={[0.18, 0.018, 0.045]}>
        <sphereGeometry args={[1, 28, 28]} />
        <meshStandardMaterial color="#7e274d" roughness={0.35} />
      </mesh>

      <mesh position={[-0.74, -0.16, 0.72]} scale={[0.12, 0.06, 0.025]}>
        <sphereGeometry args={[1, 24, 24]} />
        <meshStandardMaterial color="#ef8da9" roughness={0.8} />
      </mesh>
      <mesh position={[0.74, -0.16, 0.72]} scale={[0.12, 0.06, 0.025]}>
        <sphereGeometry args={[1, 24, 24]} />
        <meshStandardMaterial color="#ef8da9" roughness={0.8} />
      </mesh>
    </group>
  );
}

export function Avatar3D({ state = "idle" }: { state?: AvatarState }) {
  return (
    <div className="avatar3d-wrap">
      <Canvas
        className="avatar3d-canvas"
        dpr={[1, 1.6]}
        camera={{ position: [0, 0, 3.7], fov: 34 }}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={1.5} />
        <directionalLight position={[2.5, 3.5, 4]} intensity={2.2} castShadow />
        <pointLight position={[-3, 0, 2]} intensity={2.1} color="#ff75b4" />
        <pointLight position={[3, 0, 1]} intensity={1.3} color="#8f7bff" />

        <Face state={state} />

        <OrbitControls
          enablePan={false}
          enableZoom={false}
          minPolarAngle={Math.PI / 2 - 0.18}
          maxPolarAngle={Math.PI / 2 + 0.18}
          minAzimuthAngle={-0.35}
          maxAzimuthAngle={0.35}
          enableDamping
          dampingFactor={0.08}
        />
      </Canvas>
      <div className="avatar3d-hint">DRAG TO LOOK AROUND</div>
    </div>
  );
}
