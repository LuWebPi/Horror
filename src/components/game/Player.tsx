'use client'

import { useRef, useEffect, useMemo, useLayoutEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import {
  PLAYER_START_CELL,
  EXIT_CELL,
  WHISPER_ZONES,
  cellToWorld,
  isBlocked,
  isCreakyAt,
  nearestWardrobe,
  WARDROBE_CELLS,
} from '@/lib/maze'
import { entities, scare, emitNoise } from '@/lib/entities'
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
const HIDE_EYE_HEIGHT = 1.4
const MOVE_SPEED = 3.0
const SPRINT_MULT = 1.7
const CROUCH_MULT = 0.5
const PLAYER_RADIUS = 0.5

export function Player() {
  const { camera } = useThree()
  const sensitivity = useGameStore((s) => s.sensitivity)

  const spotRef = useRef<THREE.SpotLight>(null)
  const camLightRef = useRef<THREE.PointLight>(null)
  const spotTarget = useMemo(() => new THREE.Object3D(), [])

  const st = useRef({
    yaw: Math.PI,
    pitch: 0,
    footstepTimer: 0,
    whisperTriggered: new Set<number>(),
    deathTriggered: false,
    winHandled: false,
    flickerAt: 0,
    lastCreakyCell: '',
    hideCooldown: 0,
    dayStarted: 0,
  })

  // Init camera
  useMemo(() => {
    const [x, , z] = cellToWorld(PLAYER_START_CELL[0], PLAYER_START_CELL[1])
    camera.position.set(x, EYE_HEIGHT, z)
    st.current.yaw = Math.PI
    st.current.pitch = 0
    entities.player.x = x
    entities.player.z = z
  }, [camera])

  useEffect(() => {
    setSensitivity(sensitivity)
    const detach = attachKeyboardControls()
    return detach
  }, [])
  useEffect(() => {
    setSensitivity(sensitivity)
  }, [sensitivity])

  // Reset run-specific state when a new game / new day starts
  const phase = useGameStore((s) => s.phase)
  const day = useGameStore((s) => s.day)
  useEffect(() => {
    if (phase === 'playing') {
      st.current.whisperTriggered.clear()
      st.current.deathTriggered = false
      st.current.winHandled = false
      st.current.dayStarted = performance.now()
      entities.monster.active = false
      scare.caught = false
      scare.scriptedScare = null
      // reset player to start
      const [x, , z] = cellToWorld(PLAYER_START_CELL[0], PLAYER_START_CELL[1])
      camera.position.set(x, EYE_HEIGHT, z)
      entities.player.x = x
      entities.player.z = z
      st.current.yaw = Math.PI
      st.current.pitch = 0
      useGameStore.getState().setHidden(false, -1)
    }
  }, [phase, day, camera])

  useLayoutEffect(() => {
    if (spotRef.current) spotRef.current.target = spotTarget
  }, [spotTarget])

  useFrame((frametime, delta) => {
    const game = useGameStore.getState()
    if (game.phase !== 'playing') return
    const t = frametime.clock.elapsedTime
    const s = st.current

    // --- Hiding cooldown ---
    s.hideCooldown = Math.max(0, s.hideCooldown - delta)

    // --- Look (always allowed, even when hidden — peek through slats) ---
    s.yaw -= input.lookDeltaX
    s.pitch -= input.lookDeltaY
    s.pitch = Math.max(-1.0, Math.min(1.0, s.pitch))
    input.lookDeltaX = 0
    input.lookDeltaY = 0
    camera.rotation.order = 'YXZ'
    camera.rotation.y = s.yaw
    camera.rotation.x = s.pitch
    camera.rotation.z = 0

    const fx = -Math.sin(s.yaw)
    const fz = -Math.cos(s.yaw)
    const rx = Math.cos(s.yaw)
    const rz = -Math.sin(s.yaw)
    entities.player.yaw = s.yaw
    entities.player.fx = fx
    entities.player.fz = fz

    // --- Crouch (Ctrl/C) ---
    const crouch = input.crouch
    game.setCrouching(crouch)

    // --- Movement (disabled while hidden) ---
    let noiseLevel = 0
    if (game.hidden) {
      // locked inside wardrobe
      const w = WARDROBE_CELLS[game.hiddenWardrobe]
      if (w) {
        const [wx, , wz] = cellToWorld(w.cell[0], w.cell[1])
        // sit just inside the wardrobe facing out
        camera.position.set(wx, HIDE_EYE_HEIGHT, wz)
      }
      entities.player.x = camera.position.x
      entities.player.z = camera.position.z
      entities.player.moving = false
      entities.player.noiseLevel = 0
      game.setNoiseLevel(0)
      input.moveX = 0
      input.moveZ = 0
    } else {
      const sprint = input.sprint && !crouch
      let speed = MOVE_SPEED * (sprint ? SPRINT_MULT : 1) * (crouch ? CROUCH_MULT : 1)
      const mx = input.moveX
      const mz = input.moveZ
      const dispX = (rx * mx + fx * -mz) * speed * delta
      const dispZ = (rz * mx + fz * -mz) * speed * delta
      const curX = camera.position.x
      const curZ = camera.position.z
      const newX = curX + dispX
      const newZ = curZ + dispZ
      if (!isBlocked(newX, curZ, PLAYER_RADIUS)) camera.position.x = newX
      if (!isBlocked(camera.position.x, newZ, PLAYER_RADIUS)) camera.position.z = newZ
      const moving = Math.abs(mx) > 0.05 || Math.abs(mz) > 0.05
      entities.player.x = camera.position.x
      entities.player.z = camera.position.z
      entities.player.moving = moving
      entities.player.sprinting = sprint

      // Noise level: sprint=2, walk=1, crouch-walk=0 (silent), still=0
      if (moving) {
        if (sprint) noiseLevel = 2
        else if (crouch) noiseLevel = 0
        else noiseLevel = 1
      }
      // Creaky floorboards -> loud one-shot noise
      const cellKey = `${Math.round(camera.position.x / 4 + 8.5)},${Math.round(camera.position.z / 4 + 6.5)}`
      if (moving && isCreakyAt(camera.position.x, camera.position.z) && cellKey !== s.lastCreakyCell) {
        s.lastCreakyCell = cellKey
        emitNoise(camera.position.x, camera.position.z, 3)
        getAudio().playFloorCreak()
        noiseLevel = 3
      } else if (!isCreakyAt(camera.position.x, camera.position.z)) {
        s.lastCreakyCell = ''
      }
      entities.player.noiseLevel = noiseLevel
      game.setNoiseLevel(noiseLevel)

      // Footstep sounds (player)
      if (moving && !crouch) {
        s.footstepTimer += delta
        const interval = sprint ? 0.32 : 0.5
        if (s.footstepTimer >= interval) {
          s.footstepTimer = 0
          getAudio().footstep()
        }
      } else {
        s.footstepTimer = 0
      }

      // Eye height smooth (crouch lowers)
      const targetY = crouch ? EYE_HEIGHT - 0.4 : EYE_HEIGHT
      camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetY, delta * 8)
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
      if (flashlightOn && game.battery < 25) {
        spotRef.current.intensity *= Math.random() > 0.85 ? 0.4 : 1
        if (t - s.flickerAt > 0.5 && Math.random() > 0.9) {
          s.flickerAt = t
          getAudio().playFlicker()
        }
      }
    }
    if (camLightRef.current) {
      camLightRef.current.position.copy(camera.position)
      // dim the camera light while hidden (peeking through slats)
      camLightRef.current.intensity = game.hidden ? 0.3 : 1.2
    }

    // --- Battery & sanity ---
    if (flashlightOn) {
      game.drainBattery(1.0 * delta)
      game.restoreSanity(1.2 * delta)
    } else {
      game.drainSanity(1.8 * delta)
    }
    // monster proximity drains sanity
    const prox = 1 - game.monsterProximity
    if (prox > 0.5) game.drainSanity((prox - 0.5) * 5 * delta)
    // being hidden slowly restores sanity (safe)
    if (game.hidden) game.restoreSanity(2 * delta)
    // low sanity hallucination whispers
    if (game.sanity < 35 && Math.random() < 0.004) getAudio().playRandomWhisper()
    if (game.sanity <= 0) scare.caught = true

    // --- Whisper zones (only when not hidden) ---
    if (!game.hidden) {
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
    }

    // --- Interact (E): hide/unhide in wardrobe OR interact with door ---
    if (consumeInteract() && s.hideCooldown <= 0) {
      if (game.hidden) {
        // exit wardrobe
        const w = WARDROBE_CELLS[game.hiddenWardrobe]
        game.setHidden(false, -1)
        getAudio().playCupboard()
        if (w) {
          const [wx, , wz] = cellToWorld(w.cell[0], w.cell[1])
          // place player just in front of wardrobe
          const exitX = wx + Math.sin(w.rot) * -1.5
          const exitZ = wz + Math.cos(w.rot) * -1.5
          camera.position.set(exitX, EYE_HEIGHT, exitZ)
          entities.player.x = exitX
          entities.player.z = exitZ
        }
        s.hideCooldown = 0.5
      } else {
        // try to hide
        const wi = nearestWardrobe(camera.position.x, camera.position.z, 2.0)
        if (wi >= 0) {
          // if monster is very close, hiding makes noise and she may catch you
          const md = entities.monster.distanceToPlayer
          if (md < 4 && entities.monster.active) {
            emitNoise(camera.position.x, camera.position.z, 3)
          }
          game.setHidden(true, wi)
          getAudio().playCupboard()
          s.hideCooldown = 0.5
        } else {
          // near exit door?
          const [ex, , ez] = cellToWorld(EXIT_CELL[0], EXIT_CELL[1])
          const ddx = camera.position.x - ex
          const ddz = camera.position.z - ez
          if (ddx * ddx + ddz * ddz < 3 * 3 && !game.exitUnlocked) {
            game.showMessage('The door is locked. Find all 3 keys.', 3000)
          }
        }
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
      }
    }

    // --- Caught -> jump scare -> day transition OR game over ---
    if (scare.caught && !s.deathTriggered && game.phase === 'playing') {
      s.deathTriggered = true
      const type = Math.random() > 0.5 ? 'monster1' : 'monster2'
      game.triggerJumpScare(type)
      getAudio().playJumpScareStinger()
      const nextDay = game.day + 1
      setTimeout(() => {
        const g2 = useGameStore.getState()
        g2.clearJumpScare()
        if (nextDay > g2.maxDays) {
          g2.setPhase('gameover')
          getAudio().playVoice('/audio/gameover.mp3', 1)
        } else {
          // advance day -> daytransition overlay, then reset
          g2.advanceDay()
          g2.setPhase('daytransition')
          // after the overlay, return to playing (reset handled by phase effect)
          setTimeout(() => {
            useGameStore.getState().setPhase('playing')
          }, 3200)
        }
        scare.caught = false
      }, 1500)
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
      <pointLight ref={camLightRef} position={[0, 0, 0]} intensity={1.2} distance={5} decay={2} color="#cfd6e6" />
      <primitive object={spotTarget} />
    </>
  )
}
