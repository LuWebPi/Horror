'use client'

import { useRef, useEffect, useMemo, useLayoutEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import {
  PLAYER_START_CELL,
  EXIT_CELL,
  WHISPER_ZONES,
  cellToWorld,
  isWallAt,
} from '@/lib/maze'
import { entities, scare } from '@/lib/entities'
import { useGameStore } from '@/lib/game-store'
import { getAudio } from '@/lib/audio'
import {
  input,
  consumeInteract,
  consumeFlashlightToggle,
  attachKeyboardControls,
  setSensitivity,
} from '@/lib/input'

const EYE_HEIGHT = 1.7
const MOVE_SPEED = 3.0
const SPRINT_MULT = 1.7
const PLAYER_RADIUS = 0.55

export function Player() {
  const { camera } = useThree()
  const sensitivity = useGameStore((s) => s.sensitivity)

  // Flashlight
  const spotRef = useRef<THREE.SpotLight>(null)
  const camLightRef = useRef<THREE.PointLight>(null)
  const spotTarget = useMemo(() => new THREE.Object3D(), [])

  // Internal mutable state
  const st = useRef({
    yaw: Math.PI,        // facing into the maze
    pitch: 0,
    footstepTimer: 0,
    whisperTriggered: new Set<number>(),
    deathTriggered: false,
    winHandled: false,
    startedAt: 0,
    flickerAt: 0,
  })

  // Init camera position
  useMemo(() => {
    const [x, , z] = cellToWorld(PLAYER_START_CELL[0], PLAYER_START_CELL[1])
    camera.position.set(x, EYE_HEIGHT, z)
    st.current.yaw = Math.PI
    st.current.pitch = 0
    entities.player.x = x
    entities.player.z = z
  }, [camera])

  // Attach keyboard controls once (works in both modes; touch also writes input)
  useEffect(() => {
    setSensitivity(sensitivity)
    const detach = attachKeyboardControls()
    return detach
  }, [])

  useEffect(() => {
    setSensitivity(sensitivity)
  }, [sensitivity])

  // Reset run-specific state when a new game starts
  const phase = useGameStore((s) => s.phase)
  useEffect(() => {
    if (phase === 'playing') {
      st.current.whisperTriggered.clear()
      st.current.deathTriggered = false
      st.current.winHandled = false
      st.current.startedAt = performance.now()
      entities.monster.active = false
      scare.caught = false
      scare.scriptedScare = null
    }
  }, [phase])

  // Register spotlight target
  useLayoutEffect(() => {
    if (spotRef.current) {
      spotRef.current.target = spotTarget
    }
  }, [spotTarget])

  useFrame((frametime, delta) => {
    const game = useGameStore.getState()
    if (game.phase !== 'playing') return
    const t = frametime.clock.elapsedTime
    const s = st.current

    // --- Look ---
    s.yaw -= input.lookDeltaX
    s.pitch -= input.lookDeltaY
    s.pitch = Math.max(-1.3, Math.min(1.3, s.pitch))
    input.lookDeltaX = 0
    input.lookDeltaY = 0
    camera.rotation.order = 'YXZ'
    camera.rotation.y = s.yaw
    camera.rotation.x = s.pitch
    camera.rotation.z = 0

    // forward & right (XZ plane)
    const fx = -Math.sin(s.yaw)
    const fz = -Math.cos(s.yaw)
    const rx = Math.cos(s.yaw)
    const rz = -Math.sin(s.yaw)
    entities.player.yaw = s.yaw
    entities.player.fx = fx
    entities.player.fz = fz

    // --- Move ---
    const sprint = input.sprint
    const speed = MOVE_SPEED * (sprint ? SPRINT_MULT : 1)
    const mx = input.moveX
    const mz = input.moveZ
    const dispX = (rx * mx + fx * -mz) * speed * delta
    const dispZ = (rz * mx + fz * -mz) * speed * delta
    const curX = camera.position.x
    const curZ = camera.position.z
    const newX = curX + dispX
    const newZ = curZ + dispZ
    // wall sliding
    if (!isWallAt(newX, curZ, PLAYER_RADIUS)) {
      camera.position.x = newX
    }
    if (!isWallAt(camera.position.x, newZ, PLAYER_RADIUS)) {
      camera.position.z = newZ
    }
    const moving = Math.abs(mx) > 0.05 || Math.abs(mz) > 0.05
    entities.player.x = camera.position.x
    entities.player.z = camera.position.z
    entities.player.moving = moving
    entities.player.sprinting = sprint

    // --- Footsteps ---
    if (moving) {
      s.footstepTimer += delta
      const interval = sprint ? 0.32 : 0.5
      if (s.footstepTimer >= interval) {
        s.footstepTimer = 0
        getAudio().footstep()
      }
    } else {
      s.footstepTimer = 0
    }

    // --- Flashlight toggle ---
    if (consumeFlashlightToggle()) {
      if (game.battery > 0) {
        game.toggleFlashlight()
      } else {
        game.setFlashlight(false)
        game.showMessage('The flashlight is dead.', 2000)
      }
    }

    // --- Flashlight spotlight follow camera ---
    const flashlightOn = game.flashlightOn && game.battery > 0
    if (spotRef.current) {
      spotRef.current.position.copy(camera.position)
      spotTarget.position.set(
        camera.position.x + fx * 10,
        camera.position.y + Math.sin(s.pitch) * 4 - 0.2,
        camera.position.z + fz * 10
      )
      spotRef.current.intensity = flashlightOn ? 14 : 0
      // subtle flicker when battery low
      if (flashlightOn && game.battery < 25) {
        spotRef.current.intensity *= Math.random() > 0.85 ? 0.4 : 1
        if (t - s.flickerAt > 0.5 && Math.random() > 0.9) {
          s.flickerAt = t
          getAudio().playFlicker()
        }
      }
    }

    // Camera-attached point light follows the player
    if (camLightRef.current) {
      camLightRef.current.position.copy(camera.position)
    }

    // --- Battery & sanity ---
    if (flashlightOn) {
      game.drainBattery(1.4 * delta)
      game.restoreSanity(1.5 * delta)
    } else {
      game.drainSanity(2.2 * delta)
    }
    // monster proximity drains sanity
    const prox = 1 - game.monsterProximity // 1 = close
    if (prox > 0.5) {
      game.drainSanity((prox - 0.5) * 6 * delta)
    }
    // low sanity hallucination whispers
    if (game.sanity < 35 && Math.random() < 0.004) {
      getAudio().playRandomWhisper()
    }
    if (game.sanity <= 0) {
      scare.caught = true
    }

    // --- Whisper zones ---
    for (let i = 0; i < WHISPER_ZONES.length; i++) {
      if (s.whisperTriggered.has(i)) continue
      const [wx, , wz] = cellToWorld(WHISPER_ZONES[i].cell[0], WHISPER_ZONES[i].cell[1])
      const ddx = camera.position.x - wx
      const ddz = camera.position.z - wz
      if (ddx * ddx + ddz * ddz < 2 * 2) {
        s.whisperTriggered.add(i)
        getAudio().playVoice(WHISPER_ZONES[i].audio, 0.8)
      }
    }

    // --- Interact (E / tap) near exit ---
    if (consumeInteract()) {
      const [ex, , ez] = cellToWorld(EXIT_CELL[0], EXIT_CELL[1])
      const ddx = camera.position.x - ex
      const ddz = camera.position.z - ez
      if (ddx * ddx + ddz * ddz < 3 * 3 && !game.exitUnlocked) {
        game.showMessage('The door is locked. Find all 3 keys.', 3000)
      }
    }

    // --- Win check ---
    if (game.exitUnlocked && !s.winHandled) {
      const [ex, , ez] = cellToWorld(EXIT_CELL[0], EXIT_CELL[1])
      const ddx = camera.position.x - ex
      const ddz = camera.position.z - ez
      if (ddx * ddx + ddz * ddz < 2 * 2) {
        s.winHandled = true
        game.setPhase('victory')
        getAudio().playVoice('/audio/victory.mp3', 1)
        getAudio().stopFootsteps()
      }
    }

    // --- Caught / sanity broken -> jump scare -> game over ---
    if (scare.caught && !s.deathTriggered && game.phase === 'playing') {
      s.deathTriggered = true
      const type = Math.random() > 0.5 ? 'monster1' : 'monster2'
      game.triggerJumpScare(type)
      getAudio().playJumpScareStinger()
      getAudio().stopFootsteps()
      setTimeout(() => {
        useGameStore.getState().setPhase('gameover')
        getAudio().playVoice('/audio/gameover.mp3', 1)
      }, 1400)
    }
  })

  return (
    <>
      <spotLight
        ref={spotRef}
        angle={0.62}
        penumbra={0.45}
        distance={20}
        decay={1.2}
        intensity={14}
        color="#fff2d8"
        castShadow={false}
      />
      {/* Weak ambient point light at camera so the player always sees a little around them */}
      <pointLight
        ref={camLightRef}
        position={[0, 0, 0]}
        intensity={1.2}
        distance={5}
        decay={2}
        color="#cfd6e6"
      />
      <primitive object={spotTarget} />
    </>
  )
}
