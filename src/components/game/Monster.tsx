'use client'

import { useRef, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useTexture, Billboard } from '@react-three/drei'
import { MONSTER_SPAWN_CELL, cellToWorld, isWallAt } from '@/lib/maze'
import { entities, scare } from '@/lib/entities'
import { useGameStore } from '@/lib/game-store'
import { getAudio } from '@/lib/audio'

const MONSTER_SPEED = 1.7
const CATCH_DISTANCE = 1.3
const FLASHLIGHT_RANGE = 9
const FLASHLIGHT_CONE = 0.5 // cos of half-angle (smaller = narrower)

export function Monster() {
  const faceTex = useTexture('/textures/monster_face.png')
  const face2Tex = useTexture('/textures/monster_face2.png')
  const faceTexConfigured = useRef(false)
  if (!faceTexConfigured.current) {
    faceTex.colorSpace = THREE.SRGBColorSpace
    face2Tex.colorSpace = THREE.SRGBColorSpace
    faceTexConfigured.current = true
  }

  const groupRef = useRef<THREE.Group>(null)
  const bodyRef = useRef<THREE.Mesh>(null)
  const eyeLightRef = useRef<THREE.PointLight>(null)
  const faceMatRef = useRef<THREE.MeshBasicMaterial>(null)
  const { camera } = useThree()

  // Internal state
  const state = useRef({
    active: false,
    activatedAt: 0,
    lit: false,         // currently in flashlight beam
    litCooldown: 0,
    visible: false,
    lastWhisper: 0,
    faceSwap: 0,
    recoil: 0,
    caughtTriggered: false,
    spawnX: 0,
    spawnZ: 0,
  })

  // Init spawn position once
  useMemo(() => {
    const [sx, , sz] = cellToWorld(MONSTER_SPAWN_CELL[0], MONSTER_SPAWN_CELL[1])
    state.current.spawnX = sx
    state.current.spawnZ = sz
    entities.monster.x = sx
    entities.monster.z = sz
  }, [])

  // Read frequently-changing values via getState in the frame loop (avoids 60fps re-renders)
  const setMonsterProximity = useGameStore((s) => s.setMonsterProximity)
  const setTension = useGameStore((s) => s.setTension)

  useFrame((frametime, delta) => {
    const g = groupRef.current
    if (!g) return
    const st = state.current
    const t = frametime.clock.elapsedTime

    // Activation: after first key collected OR after 40s
    if (!st.active) {
      const keys = useGameStore.getState().keysCollected
      if (keys >= 1 || t > 40) {
        st.active = true
        st.activatedAt = t
        entities.monster.active = true
        g.visible = true
        getAudio().playVoice('/audio/laugh.mp3', 0.8)
        useGameStore.getState().showMessage('Something is awake...', 3500)
      } else {
        g.visible = false
        return
      }
    }

    // Position group
    g.position.x = entities.monster.x
    g.position.z = entities.monster.z

    // Compute distance to player
    const dx = entities.player.x - entities.monster.x
    const dz = entities.player.z - entities.monster.z
    const dist = Math.hypot(dx, dz)
    entities.monster.distanceToPlayer = dist

    // Determine if monster is in the flashlight beam
    // direction from player to monster
    const toMx = dx / (dist || 1)
    const toMz = dz / (dist || 1)
    // dot with player forward
    const dot = entities.player.fx * toMx + entities.player.fz * toMz
    const flashlightOn = useGameStore.getState().flashlightOn && useGameStore.getState().battery > 0
    const inBeam =
      flashlightOn &&
      dist < FLASHLIGHT_RANGE &&
      dot > FLASHLIGHT_CONE

    // smooth lit state
    st.lit = inBeam
    if (st.lit) {
      st.litCooldown = 0.6
    } else {
      st.litCooldown = Math.max(0, st.litCooldown - delta)
    }
    const effectivelyLit = st.lit || st.litCooldown > 0

    // Movement: chase player, but recoil when lit
    let speed = MONSTER_SPEED * (0.6 + (1 - useGameStore.getState().sanity / 100) * 0.8)
    if (effectivelyLit) {
      // push back (recoil) and slow
      speed = -MONSTER_SPEED * 0.8
      st.recoil = THREE.MathUtils.lerp(st.recoil, 1, delta * 4)
    } else {
      st.recoil = THREE.MathUtils.lerp(st.recoil, 0, delta * 2)
    }

    if (dist > 0.01) {
      const nx = dx / dist
      const nz = dz / dist
      const moveX = nx * speed * delta
      const moveZ = nz * speed * delta
      // attempt move with wall sliding
      const newX = entities.monster.x + moveX
      const newZ = entities.monster.z + moveZ
      if (!isWallAt(newX, entities.monster.z, 0.5)) {
        entities.monster.x = newX
      }
      if (!isWallAt(entities.monster.x, newZ, 0.5)) {
        entities.monster.z = newZ
      }
    }

    // Make body/face always face player (billboard handles face)
    if (bodyRef.current) {
      bodyRef.current.rotation.y = Math.atan2(dx, dz)
    }

    // Visibility for proximity/sound
    const camPos = camera.position
    const camToMonster = new THREE.Vector3(entities.monster.x - camPos.x, 0, entities.monster.z - camPos.z)
    const camDist = camToMonster.length()
    // is monster in view frustum-ish: check dot with camera forward
    const camForward = new THREE.Vector3()
    camera.getWorldDirection(camForward)
    camForward.y = 0
    camForward.normalize()
    camToMonster.normalize()
    const viewDot = camForward.dot(camToMonster)
    st.visible = camDist < 14 && viewDot > 0.2

    // Update eye glow intensity based on lit state
    if (eyeLightRef.current) {
      eyeLightRef.current.intensity = effectivelyLit ? 0.4 : 2.5
    }

    // Face material: swap textures occasionally for unsettling effect
    if (faceMatRef.current) {
      const swapTarget = Math.floor(t / 0.5) % 2 === 0 ? faceTex : face2Tex
      if (faceMatRef.current.map !== swapTarget) {
        faceMatRef.current.map = swapTarget
        faceMatRef.current.needsUpdate = true
      }
      // brighter (visible) when lit, dim red glow otherwise
      faceMatRef.current.color.set(effectivelyLit ? '#ffffff' : '#7a2020')
    }

    // Proximity & tension for audio
    setMonsterProximity(THREE.MathUtils.clamp((dist - 1.5) / 12, 0, 1))
    const tension = THREE.MathUtils.clamp(1 - (dist - 1.5) / 10, 0, 1)
    setTension(Math.max(tension, useGameStore.getState().tension * 0.98))

    // Random whispers when close
    if (dist < 7 && t - st.lastWhisper > 4 + Math.random() * 4) {
      st.lastWhisper = t
      getAudio().playRandomWhisper()
    }

    // Catch -> trigger jump scare
    if (dist < CATCH_DISTANCE && !st.caughtTriggered) {
      st.caughtTriggered = true
      scare.caught = true
    }
  })

  return (
    <group ref={groupRef} position={[state.current.spawnX, 0, state.current.spawnZ]} visible={false}>
      {/* Dark tall body */}
      <mesh ref={bodyRef} position={[0, 1.2, 0]} castShadow>
        <capsuleGeometry args={[0.35, 1.4, 6, 12]} />
        <meshStandardMaterial color="#0a0a0a" roughness={1} metalness={0} />
      </mesh>
      {/* Long arms */}
      <mesh position={[-0.45, 1.1, 0]} rotation={[0, 0, 0.2]}>
        <capsuleGeometry args={[0.1, 1.3, 4, 8]} />
        <meshStandardMaterial color="#0c0c0c" roughness={1} />
      </mesh>
      <mesh position={[0.45, 1.1, 0]} rotation={[0, 0, -0.2]}>
        <capsuleGeometry args={[0.1, 1.3, 4, 8]} />
        <meshStandardMaterial color="#0c0c0c" roughness={1} />
      </mesh>
      {/* Face billboard - always faces camera */}
      <Billboard position={[0, 1.85, 0]}>
        <mesh>
          <planeGeometry args={[0.95, 0.95]} />
          <meshBasicMaterial
            ref={faceMatRef}
            map={faceTex}
            transparent
            toneMapped={false}
          />
        </mesh>
        {/* glowing eyes */}
        <mesh position={[-0.16, 0.08, 0.01]}>
          <sphereGeometry args={[0.045, 8, 8]} />
          <meshBasicMaterial color="#ff2200" toneMapped={false} />
        </mesh>
        <mesh position={[0.16, 0.08, 0.01]}>
          <sphereGeometry args={[0.045, 8, 8]} />
          <meshBasicMaterial color="#ff2200" toneMapped={false} />
        </mesh>
        <pointLight ref={eyeLightRef} position={[0, 0.05, 0.5]} color="#ff3300" intensity={2} distance={4} decay={2} />
      </Billboard>
    </group>
  )
}
