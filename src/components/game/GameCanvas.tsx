'use client'

import { Suspense, useEffect } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import {
  EffectComposer,
  Vignette,
  Noise,
  ChromaticAberration,
  Bloom,
} from '@react-three/postprocessing'
import * as THREE from 'three'
import { BlendFunction } from 'postprocessing'
import { Environment } from './Environment'
import { Lights } from './Lights'
import { Keys } from './Keys'
import { Door } from './Door'
import { Monster } from './Monster'
import { Player } from './Player'
import { Furniture, CreakyFloors } from './Furniture'
import { Wardrobes } from './Wardrobes'
import { useGameStore } from '@/lib/game-store'

function SceneSetup() {
  const { scene, gl } = useThree()
  useEffect(() => {
    scene.background = new THREE.Color('#1a1a22')
    scene.fog = new THREE.FogExp2('#1a1a22', 0.035)
    gl.toneMapping = THREE.ACESFilmicToneMapping
    gl.toneMappingExposure = 1.3
  }, [scene, gl])
  return null
}

// Drives postprocessing intensity from sanity
function HorrorEffects() {
  // Round sanity so we only re-render when the displayed value changes (not every frame)
  const sanity = useGameStore((s) => Math.round(s.sanity))
  const lowSanity = (100 - sanity) / 100 // 0..1
  // chromatic aberration grows as sanity drops
  const caAmount = 0.0006 + lowSanity * 0.004
  const vignetteDarkness = 0.85 + lowSanity * 0.25

  return (
    <EffectComposer>
      <Bloom
        intensity={0.5}
        luminanceThreshold={0.6}
        luminanceSmoothing={0.3}
        mipmapBlur
      />
      <ChromaticAberration
        blendFunction={BlendFunction.NORMAL}
        offset={[caAmount, caAmount]}
      />
      <Vignette
        eskil={false}
        offset={0.1}
        darkness={vignetteDarkness}
      />
      <Noise opacity={0.08} blendFunction={BlendFunction.OVERLAY} />
    </EffectComposer>
  )
}

export function GameCanvas() {
  return (
    <Canvas
      shadows={false}
      dpr={[1, 1.5]}
      camera={{ fov: 72, near: 0.1, far: 60, position: [0, 1.7, 0] }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
    >
      <SceneSetup />
      <Suspense fallback={null}>
        <Environment />
        <CreakyFloors />
        <Furniture />
        <Wardrobes />
        <Lights />
        <Keys />
        <Door />
        <Monster />
        <Player />
        <HorrorEffects />
      </Suspense>
    </Canvas>
  )
}
