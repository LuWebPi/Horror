'use client'

import { Suspense, useEffect } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import {
  EffectComposer,
  ChromaticAberration,
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
    scene.background = new THREE.Color('#a09080')
    scene.fog = new THREE.FogExp2('#a09080', 0.012)
    gl.toneMapping = THREE.ACESFilmicToneMapping
    gl.toneMappingExposure = 2.2
  }, [scene, gl])
  return null
}

// Minimal postprocessing for performance — no dark vignette/noise (house is bright now)
function HorrorEffects() {
  const sanity = useGameStore((s) => Math.round(s.sanity))
  const lowSanity = (100 - sanity) / 100
  const caAmount = 0.0006 + lowSanity * 0.004

  return (
    <EffectComposer>
      <ChromaticAberration blendFunction={BlendFunction.NORMAL} offset={[caAmount, caAmount]} />
    </EffectComposer>
  )
}

export function GameCanvas() {
  return (
    <Canvas
      shadows={false}
      dpr={[0.8, 1]}          // lower DPR for performance
      camera={{ fov: 72, near: 0.1, far: 40, position: [0, 1.7, 0] }}
      gl={{ antialias: false, powerPreference: 'high-performance' }}  // no AA = faster
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
