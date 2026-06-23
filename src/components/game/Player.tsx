'use client'

import { useRef, useEffect, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import {
  PLAYER_START_CELL,
  PLAYER_START_FLOOR,
  EXIT_CELL,
  WHISPER_ZONES,
  cellToWorld,
  isBlocked,
  isCreakyAt,
  nearestWardrobe,
  WARDROBE_CELLS,
  stairsTarget,
  FLOOR_HEIGHT,
  CELL_SIZE,
  MAZE_WIDTH,
  MAZE_DEPTH,
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

// Day/night phase durations (seconds). Day = bright & explore; Night = Granny hunts hard.
const DAY_DURATION = 45
const NIGHT_DURATION = 60

export function Player() {
  const { camera } = useThree()
  const sensitivity = useGameStore((s) => s.sensitivity)

  const camLightRef = useRef<THREE.PointLight>(null)

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
    stairsCooldown: 0,
    dayTimer: 0,
    announcedNight: false,
    announcedDay: true,
  })

  useMemo(() => {
    const [x, y, z] = cellToWorld(PLAYER_START_CELL[0], PLAYER_START_CELL[1], PLAYER_START_FLOOR)
    camera.position.set(x, y + EYE_HEIGHT, z)
    st.current.yaw = Math.PI
    st.current.pitch = 0
    entities.player.x = x
    entities.player.y = y
    entities.player.z = z
    entities.player.floor = PLAYER_START_FLOOR
  }, [camera])

  useEffect(() => {
    setSensitivity(sensitivity)
    const detach = attachKeyboardControls()
    return detach
  }, [])
  useEffect(() => {
    setSensitivity(sensitivity)
  }, [sensitivity])

  const phase = useGameStore((s) => s.phase)
  const day = useGameStore((s) => s.day)
  useEffect(() => {
    if (phase === 'playing') {
      st.current.whisperTriggered.clear()
      st.current.deathTriggered = false
      st.current.winHandled = false
      st.current.dayTimer = 0
      st.current.announcedNight = false
      st.current.announcedDay = true
      entities.monster.active = false
      scare.caught = false
      scare.scriptedScare = null
      const [x, y, z] = cellToWorld(PLAYER_START_CELL[0], PLAYER_START_CELL[1], PLAYER_START_FLOOR)
      camera.position.set(x, y + EYE_HEIGHT, z)
      entities.player.x = x; entities.player.y = y; entities.player.z = z
      entities.player.floor = PLAYER_START_FLOOR
      st.current.yaw = Math.PI
      st.current.pitch = 0
      useGameStore.getState().setHidden(false, -1)
      useGameStore.getState().setTimeOfDay('day')
    }
  }, [phase, day, camera])

  useFrame((frametime, delta) => {
    const game = useGameStore.getState()
    if (game.phase !== 'playing') return
    const t = frametime.clock.elapsedTime
    const s = st.current

    // ===== DAY/NIGHT CYCLE =====
    s.dayTimer += delta
    const totalCycle = DAY_DURATION + NIGHT_DURATION
    const cycleTime = s.dayTimer % totalCycle
    const isDay = cycleTime < DAY_DURATION
    const progress = isDay ? cycleTime / DAY_DURATION : (cycleTime - DAY_DURATION) / NIGHT_DURATION
    game.setTimeOfDay(isDay ? 'day' : 'night')
    game.setDayProgress(progress)
    // announce transitions
    if (isDay && !s.announcedDay) {
      s.announcedDay = true
      s.announcedNight = false
      game.showMessage('Morning light fills the house. She is calmer now.', 4000)
    } else if (!isDay && !s.announcedNight) {
      s.announcedNight = true
      s.announcedDay = false
      game.showMessage('Night falls. She is coming for you.', 4000)
      getAudio().playGrannyGrowl()
    }

    s.hideCooldown = Math.max(0, s.hideCooldown - delta)
    s.stairsCooldown = Math.max(0, s.stairsCooldown - delta)

    // ===== LOOK =====
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

    const crouch = input.crouch
    game.setCrouching(crouch)

    // ===== MOVEMENT =====
    let noiseLevel = 0
    if (game.hidden) {
      const w = WARDROBE_CELLS[game.hiddenWardrobe]
      if (w) {
        const [wx, wy, wz] = cellToWorld(w.cell[0], w.cell[1], w.floor)
        camera.position.set(wx, wy + HIDE_EYE_HEIGHT, wz)
        entities.player.x = wx; entities.player.y = wy; entities.player.z = wz; entities.player.floor = w.floor
      }
      entities.player.moving = false
      entities.player.noiseLevel = 0
      game.setNoiseLevel(0)
      input.moveX = 0; input.moveZ = 0
    } else {
      const sprint = input.sprint && !crouch
      let speed = MOVE_SPEED * (sprint ? SPRINT_MULT : 1) * (crouch ? CROUCH_MULT : 1)
      const mx = input.moveX
      const mz = input.moveZ
      const dispX = (rx * mx + fx * -mz) * speed * delta
      const dispZ = (rz * mx + fz * -mz) * speed * delta
      const curX = camera.position.x
      const curY = camera.position.y
      const curZ = camera.position.z
      const newX = curX + dispX
      const newZ = curZ + dispZ
      if (!isBlocked(newX, curY, curZ, PLAYER_RADIUS)) camera.position.x = newX
      if (!isBlocked(camera.position.x, curY, newZ, PLAYER_RADIUS)) camera.position.z = newZ
      const moving = Math.abs(mx) > 0.05 || Math.abs(mz) > 0.05
      entities.player.x = camera.position.x
      entities.player.y = curY - EYE_HEIGHT
      entities.player.z = camera.position.z
      entities.player.floor = Math.round((curY - EYE_HEIGHT) / FLOOR_HEIGHT)
      entities.player.moving = moving
      entities.player.sprinting = sprint

      if (moving) {
        if (sprint) noiseLevel = 2
        else if (crouch) noiseLevel = 0
        else noiseLevel = 1
      }
      const cellKey = `${entities.player.floor},${Math.round(camera.position.x / CELL_SIZE + MAZE_WIDTH / 2)},${Math.round(camera.position.z / CELL_SIZE + MAZE_DEPTH / 2)}`
      if (moving && isCreakyAt(camera.position.x, curY - EYE_HEIGHT, camera.position.z) && cellKey !== s.lastCreakyCell) {
        s.lastCreakyCell = cellKey
        emitNoise(camera.position.x, curY - EYE_HEIGHT, camera.position.z, 3)
        getAudio().playFloorCreak()
        noiseLevel = 3
      } else if (!isCreakyAt(camera.position.x, curY - EYE_HEIGHT, camera.position.z)) {
        s.lastCreakyCell = ''
      }
      entities.player.noiseLevel = noiseLevel
      game.setNoiseLevel(noiseLevel)

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

      // eye height (crouch)
      const targetY = (curY - EYE_HEIGHT) + (crouch ? EYE_HEIGHT - 0.4 : EYE_HEIGHT)
      camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetY, delta * 8)

      // ===== STAIRS (floor transition) =====
      if (s.stairsCooldown <= 0) {
        const col = Math.round(camera.position.x / CELL_SIZE + MAZE_WIDTH / 2)
        const row = Math.round(camera.position.z / CELL_SIZE + MAZE_DEPTH / 2)
        const tf = stairsTarget(entities.player.floor, col, row)
        if (tf >= 0) {
          entities.player.floor = tf
          const newY = tf * FLOOR_HEIGHT + (crouch ? EYE_HEIGHT - 0.4 : EYE_HEIGHT)
          // place at the stairs cell center to avoid clipping
          const [scx, , scz] = cellToWorld(col, row, tf)
          camera.position.set(scx, newY, scz)
          entities.player.x = scx; entities.player.y = tf * FLOOR_HEIGHT; entities.player.z = scz
          s.stairsCooldown = 0.8
          getAudio().playFloorCreak()
        }
      }
    }

    // ===== No flashlight toggle anymore — house is well-lit =====
    if (consumeFlashlightToggle()) {
      getAudio().playFlicker()
    }

    // ===== Camera-follow soft light (no flashlight beam — just fills the room) =====
    if (camLightRef.current) {
      camLightRef.current.position.copy(camera.position)
      // bright fill light so the player always sees the room around them
      camLightRef.current.intensity = game.hidden ? 0.2 : (isDay ? 2.5 : 1.6)
    }

    // ===== Sanity (no battery drain — no flashlight) =====
    game.restoreSanity(0.8 * delta)
    const prox = 1 - game.monsterProximity
    if (prox > 0.5) game.drainSanity((prox - 0.5) * 5 * delta)
    if (game.hidden) game.restoreSanity(2 * delta)
    if (game.sanity < 35 && Math.random() < 0.004) getAudio().playRandomWhisper()
    if (game.sanity <= 0) scare.caught = true

    // ===== Whisper zones =====
    if (!game.hidden) {
      for (let i = 0; i < WHISPER_ZONES.length; i++) {
        if (s.whisperTriggered.has(i)) continue
        const w = WHISPER_ZONES[i]
        if (w.floor !== entities.player.floor) continue
        const [wx, wy, wz] = cellToWorld(w.cell[0], w.cell[1], w.floor)
        const ddx = camera.position.x - wx
        const ddz = camera.position.z - wz
        const dy = (camera.position.y - EYE_HEIGHT) - wy
        if (ddx * ddx + ddz * ddz + dy * dy < 2 * 2) {
          s.whisperTriggered.add(i)
          getAudio().playVoice(w.audio, 0.8)
        }
      }
    }

    // ===== Interact: hide/exit wardrobe =====
    if (consumeInteract() && s.hideCooldown <= 0) {
      if (game.hidden) {
        const w = WARDROBE_CELLS[game.hiddenWardrobe]
        game.setHidden(false, -1)
        getAudio().playCupboard()
        if (w) {
          const [wx, wy, wz] = cellToWorld(w.cell[0], w.cell[1], w.floor)
          const exitX = wx + Math.sin(w.rot) * -1.5
          const exitZ = wz + Math.cos(w.rot) * -1.5
          camera.position.set(exitX, wy + EYE_HEIGHT, exitZ)
          entities.player.x = exitX; entities.player.y = wy; entities.player.z = exitZ
        }
        s.hideCooldown = 0.5
      } else {
        const wi = nearestWardrobe(camera.position.x, camera.position.y - EYE_HEIGHT, camera.position.z, 2.0)
        if (wi >= 0) {
          const md = entities.monster.distanceToPlayer
          if (md < 4 && entities.monster.active && entities.monster.floor === entities.player.floor) {
            emitNoise(camera.position.x, camera.position.y - EYE_HEIGHT, camera.position.z, 3)
          }
          game.setHidden(true, wi)
          getAudio().playCupboard()
          s.hideCooldown = 0.5
        }
      }
    }

    // ===== Win check (reach front door with all keys) =====
    if (game.exitUnlocked && !s.winHandled) {
      const [ex, ey, ez] = cellToWorld(EXIT_CELL[0], EXIT_CELL[1], 0)
      const ddx = camera.position.x - ex
      const ddz = camera.position.z - ez
      const dy = (camera.position.y - EYE_HEIGHT) - ey
      if (ddx * ddx + ddz * ddz + dy * dy < 2.5 * 2.5) {
        s.winHandled = true
        game.setPhase('victory')
        getAudio().playVoice('/audio/victory.mp3', 1)
      }
    }

    // ===== Caught -> day transition or game over =====
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
          g2.advanceDay()
          g2.setPhase('daytransition')
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
      {/* Soft fill light following the camera — no flashlight beam, just room fill */}
      <pointLight ref={camLightRef} position={[0, 0, 0]} intensity={2.0} distance={15} decay={0} color="#fff0d8" />
    </>
  )
}
