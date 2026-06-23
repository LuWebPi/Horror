'use client'

import { useRef, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useTexture, Billboard } from '@react-three/drei'
import {
  MONSTER_SPAWN_CELL,
  MONSTER_SPAWN_FLOOR,
  PATROL_WAYPOINTS,
  cellToWorld,
  isBlocked,
  hasLineOfSight,
  stairsTarget,
  CELL_SIZE,
  MAZE_WIDTH,
  MAZE_DEPTH,
  FLOOR_HEIGHT,
} from '@/lib/maze'
import { entities, scare } from '@/lib/entities'
import { useGameStore } from '@/lib/game-store'
import { getAudio } from '@/lib/audio'
import { asset } from '@/lib/asset'

const CATCH_DISTANCE = 1.4
const SIGHT_RANGE = 12
const SIGHT_CONE = 0.4
const FLASHLIGHT_STUN_TIME = 1.2
const STUN_DURATION = 2.5
const HEAR_RADIUS = [0, 7, 15, 20]

export function Monster() {
  const faceTex = useTexture(asset('/textures/monster_face.png'))
  const face2Tex = useTexture(asset('/textures/monster_face2.png'))
  const texConfigured = useRef(false)
  if (!texConfigured.current) {
    faceTex.colorSpace = THREE.SRGBColorSpace
    face2Tex.colorSpace = THREE.SRGBColorSpace
    texConfigured.current = true
  }

  const groupRef = useRef<THREE.Group>(null)
  const bodyRef = useRef<THREE.Mesh>(null)
  const eyeLightRef = useRef<THREE.PointLight>(null)
  const faceMatRef = useRef<THREE.MeshBasicMaterial>(null)
  const { camera } = useThree()

  const st = useRef({
    active: false,
    litAccum: 0,
    lastWhisper: 0,
    lastGrowl: 0,
    lastSting: 0,
    stepDist: 0,
    searchWanderT: 0,
    caughtHandled: false,
    spawnX: 0, spawnY: 0, spawnZ: 0,
    waypointFloor: 0,
    usingStairs: false,
    stairsTarget: -1,
    stairsCooldown: 0,
  })

  useMemo(() => {
    const [sx, sy, sz] = cellToWorld(MONSTER_SPAWN_CELL[0], MONSTER_SPAWN_CELL[1], MONSTER_SPAWN_FLOOR)
    st.current.spawnX = sx
    st.current.spawnY = sy
    st.current.spawnZ = sz
    entities.monster.x = sx
    entities.monster.y = sy
    entities.monster.z = sz
    entities.monster.floor = MONSTER_SPAWN_FLOOR
    entities.monster.targetX = sx
    entities.monster.targetY = sy
    entities.monster.targetZ = sz
  }, [])

  const setMonsterProximity = useGameStore((s) => s.setMonsterProximity)
  const setTension = useGameStore((s) => s.setTension)
  const setAIState = useGameStore((s) => s.setAIState)

  useFrame((frametime, delta) => {
    const g = groupRef.current
    if (!g) return
    const s = st.current
    const game = useGameStore.getState()
    if (game.phase !== 'playing') return
    const t = frametime.clock.elapsedTime

    // Activation: at night she's immediately active & aggressive; during day she's slower to react
    const isNight = game.timeOfDay === 'night'
    if (!s.active) {
      const gracePeriod = isNight ? 2 : 6
      if (t > gracePeriod) {
        s.active = true
        entities.monster.active = true
        g.visible = true
      } else {
        g.visible = false
        return
      }
    }

    s.stairsCooldown = Math.max(0, s.stairsCooldown - delta)
    const m = entities.monster
    const player = entities.player

    // ---- SENSE: sight (same floor only) ----
    const dx = player.x - m.x
    const dz = player.z - m.z
    const dy = player.y - m.y
    const dist = Math.hypot(dx, dz)
    m.distanceToPlayer = dist
    const sameFloor = player.floor === m.floor
    const canSee =
      !player.hidden &&
      sameFloor &&
      dist < SIGHT_RANGE &&
      hasLineOfSight(m.x, m.y, m.z, player.x, player.y, player.z) &&
      (() => {
        const fx = -Math.sin(m.yaw)
        const fz = -Math.cos(m.yaw)
        const dot = (fx * dx + fz * dz) / (dist || 1)
        return dot > SIGHT_CONE
      })()
    m.canSeePlayer = canSee

    // ---- SENSE: hearing (same floor only) ----
    let heard = false
    if (scare.noiseEvent) {
      const ev = scare.noiseEvent
      const nd = Math.hypot(ev.x - m.x, ev.z - m.z)
      const sameFloorNoise = Math.round(ev.y / FLOOR_HEIGHT) === m.floor
      if (sameFloorNoise && nd < HEAR_RADIUS[ev.level] && ev.t > t - 0.5) {
        m.targetX = ev.x
        m.targetY = ev.y
        m.targetZ = ev.z
        m.lastSeenX = ev.x; m.lastSeenY = ev.y; m.lastSeenZ = ev.z
        if (m.state !== 'chase') { m.state = 'investigate'; m.stateTimer = 0 }
        heard = true
      }
      scare.noiseEvent = null
    }
    if (!heard && player.noiseLevel > 0 && !player.hidden && sameFloor) {
      const hr = HEAR_RADIUS[player.noiseLevel]
      if (dist < hr && m.state === 'patrol') {
        m.targetX = player.x; m.targetY = player.y; m.targetZ = player.z
        m.lastSeenX = player.x; m.lastSeenY = player.y; m.lastSeenZ = player.z
        m.state = 'investigate'; m.stateTimer = 0
      }
    }

    // ---- Flashlight stun (only when NOT chasing) ----
    const flashlightOn = game.flashlightOn && game.battery > 0
    const toMx = (m.x - player.x) / (dist || 1)
    const toMz = (m.z - player.z) / (dist || 1)
    const beamDot = player.fx * toMx + player.fz * toMz
    const inBeam = flashlightOn && sameFloor && dist < 9 && beamDot > 0.5 && hasLineOfSight(player.x, player.y, player.z, m.x, m.y, m.z)
    if (inBeam && m.state !== 'chase') {
      s.litAccum += delta
      if (s.litAccum > FLASHLIGHT_STUN_TIME) {
        m.state = 'stunned'; m.stunTimer = STUN_DURATION; s.litAccum = 0
        getAudio().playGrannyGrowl()
      }
    } else {
      s.litAccum = Math.max(0, s.litAccum - delta * 0.5)
    }

    // ---- STATE MACHINE ----
    m.stateTimer += delta

    if (m.state === 'stunned') {
      m.stunTimer -= delta
      if (m.stunTimer <= 0) {
        m.state = canSee ? 'chase' : 'search'
        m.stateTimer = 0
        m.lastSeenX = player.x; m.lastSeenY = player.y; m.lastSeenZ = player.z
      }
    } else if (canSee) {
      if (m.state !== 'chase' && t - s.lastSting > 4) {
        s.lastSting = t
        getAudio().playTensionSting()
      }
      m.state = 'chase'; m.stateTimer = 0
      m.lastSeenX = player.x; m.lastSeenY = player.y; m.lastSeenZ = player.z
      m.targetX = player.x; m.targetY = player.y; m.targetZ = player.z
    } else if (m.state === 'chase') {
      if (m.stateTimer > 3) {
        m.state = 'search'; m.stateTimer = 0
        m.targetX = m.lastSeenX; m.targetY = m.lastSeenY; m.targetZ = m.lastSeenZ
      } else {
        m.targetX = m.lastSeenX; m.targetY = m.lastSeenY; m.targetZ = m.lastSeenZ
      }
    } else if (m.state === 'investigate') {
      const td = Math.hypot(m.targetX - m.x, m.targetZ - m.z)
      if (td < 0.8 || m.stateTimer > 8) {
        m.state = 'search'; m.stateTimer = 0; s.searchWanderT = 0
      }
    } else if (m.state === 'search') {
      s.searchWanderT -= delta
      const td = Math.hypot(m.targetX - m.x, m.targetZ - m.z)
      if (td < 0.8 || s.searchWanderT <= 0) {
        s.searchWanderT = 2 + Math.random() * 2
        const ang = Math.random() * Math.PI * 2
        const r = 2 + Math.random() * 3
        m.targetX = m.lastSeenX + Math.cos(ang) * r
        m.targetZ = m.lastSeenZ + Math.sin(ang) * r
        m.targetY = m.lastSeenY
      }
      if (m.stateTimer > 12) { m.state = 'patrol'; m.stateTimer = 0 }
    } else {
      // patrol
      const wp = PATROL_WAYPOINTS[m.waypoint]
      const [wx, wy, wz] = cellToWorld(wp.cell[0], wp.cell[1], wp.floor)
      m.targetX = wx; m.targetY = wy; m.targetZ = wz
      const wd = Math.hypot(wx - m.x, wz - m.z)
      if (wd < 0.8 && Math.abs(wy - m.y) < 0.5) {
        m.waypoint = (m.waypoint + 1) % PATROL_WAYPOINTS.length
      }
    }

    setAIState(m.state)

    // ---- MOVEMENT (with floor transitions via stairs) ----
    let speed = 0
    switch (m.state) {
      case 'patrol': speed = isNight ? 1.3 : 0.9; break
      case 'investigate': speed = 1.9; break
      case 'search': speed = 1.5; break
      case 'chase': speed = (isNight ? 2.7 : 2.2) + (game.day - 1) * 0.2; break
      case 'stunned': speed = 0; break
    }
    speed *= 1 + (1 - game.sanity / 100) * 0.12

    if (speed > 0) {
      // Check if we need to change floors to reach target
      const targetFloor = Math.round(m.targetY / FLOOR_HEIGHT)
      if (targetFloor !== m.floor && s.stairsCooldown <= 0) {
        // find a stairs cell on current floor
        const col = Math.round(m.x / CELL_SIZE + MAZE_WIDTH / 2)
        const row = Math.round(m.z / CELL_SIZE + MAZE_DEPTH / 2)
        const tf = stairsTarget(m.floor, col, row)
        if (tf === targetFloor || tf >= 0) {
          // step onto stairs -> change floor
          m.floor = tf
          m.y = tf * FLOOR_HEIGHT
          s.stairsCooldown = 1.0
        } else {
          // head toward nearest stairs waypoint (simplified: go to [8,6] on this floor if it has stairs)
          const tryStairs = stairsTarget(m.floor, 8, 6)
          if (tryStairs >= 0) {
            const [sx, , sz] = cellToWorld(8, 6, m.floor)
            m.targetX = sx; m.targetZ = sz
          } else {
            const tryStairs2 = stairsTarget(m.floor, 1, 6)
            if (tryStairs2 >= 0) {
              const [sx, , sz] = cellToWorld(1, 6, m.floor)
              m.targetX = sx; m.targetZ = sz
            }
          }
        }
      }

      const tdx = m.targetX - m.x
      const tdz = m.targetZ - m.z
      const tlen = Math.hypot(tdx, tdz)
      if (tlen > 0.05) {
        const nx = tdx / tlen
        const nz = tdz / tlen
        m.yaw = Math.atan2(tdx, tdz)
        const moveX = nx * speed * delta
        const moveZ = nz * speed * delta
        if (!isBlocked(m.x + moveX, m.y, m.z, 0.5)) m.x += moveX
        if (!isBlocked(m.x, m.y, m.z + moveZ, 0.5)) m.z += moveZ
        s.stepDist += speed * delta
        const stepInterval = m.state === 'chase' ? 1.0 : 1.5
        if (s.stepDist > stepInterval) {
          s.stepDist = 0
          getAudio().grannyStep()
        }
      }
    }

    // face player when chasing
    if (bodyRef.current) {
      const fy = m.state === 'chase' ? Math.atan2(dx, dz) : m.yaw
      bodyRef.current.rotation.y = fy
    }

    // ---- visuals ----
    g.position.x = m.x
    g.position.y = m.y
    g.position.z = m.z
    const bob = speed > 0 ? Math.sin(t * (m.state === 'chase' ? 9 : 5)) * 0.06 : 0
    if (bodyRef.current) bodyRef.current.position.y = 1.2 + bob

    if (eyeLightRef.current) {
      const aggro = m.state === 'chase' ? 4 : m.state === 'stunned' ? 0.5 : 2
      eyeLightRef.current.intensity = aggro
    }
    if (faceMatRef.current) {
      const swapTarget = Math.floor(t / 0.4) % 2 === 0 ? faceTex : face2Tex
      if (faceMatRef.current.map !== swapTarget) {
        faceMatRef.current.map = swapTarget
        faceMatRef.current.needsUpdate = true
      }
      faceMatRef.current.color.set(m.state === 'stunned' ? '#447' : m.state === 'chase' ? '#ffffff' : '#7a2020')
    }

    // ---- proximity / tension / audio ----
    const proxDist = sameFloor ? dist : 999
    setMonsterProximity(THREE.MathUtils.clamp((proxDist - 1.5) / 12, 0, 1))
    const tension = sameFloor ? THREE.MathUtils.clamp(1 - (dist - 1.5) / 10, 0, 1) : 0
    setTension(Math.max(tension, game.tension * 0.97))

    if (sameFloor && dist < 8 && (m.state === 'chase' || m.state === 'investigate') && t - s.lastGrowl > 3.5 + Math.random() * 3) {
      s.lastGrowl = t
      getAudio().playGrannyGrowl()
    }
    if (sameFloor && dist < 6 && t - s.lastWhisper > 4 + Math.random() * 4) {
      s.lastWhisper = t
      getAudio().playRandomWhisper()
    }

    // ---- CATCH (same floor, close, not hidden, not stunned) ----
    if (sameFloor && dist < CATCH_DISTANCE && !player.hidden && !s.caughtHandled && m.state !== 'stunned') {
      s.caughtHandled = true
      scare.caught = true
    }
  })

  // Reset on day change
  const day = useGameStore((s) => s.day)
  const phase = useGameStore((s) => s.phase)
  useMemo(() => {
    st.current.caughtHandled = false
    const [sx, sy, sz] = cellToWorld(MONSTER_SPAWN_CELL[0], MONSTER_SPAWN_CELL[1], MONSTER_SPAWN_FLOOR)
    entities.monster.x = sx; entities.monster.y = sy; entities.monster.z = sz
    entities.monster.floor = MONSTER_SPAWN_FLOOR
    entities.monster.targetX = sx; entities.monster.targetY = sy; entities.monster.targetZ = sz
    entities.monster.waypoint = 0
    entities.monster.state = 'patrol'
    entities.monster.stateTimer = 0
    entities.monster.stunTimer = 0
    st.current.active = false
    st.current.litAccum = 0
  }, [day])

  useMemo(() => {
    if (phase !== 'playing') {
      st.current.active = false
      if (groupRef.current) groupRef.current.visible = false
    }
  }, [phase])

  return (
    <group ref={groupRef} position={[st.current.spawnX, st.current.spawnY, st.current.spawnZ]} visible={false}>
      <mesh ref={bodyRef} position={[0, 1.2, 0]} castShadow>
        <capsuleGeometry args={[0.35, 1.4, 6, 12]} />
        <meshStandardMaterial color="#0a0a0a" roughness={1} metalness={0} />
      </mesh>
      <mesh position={[-0.45, 1.1, 0]} rotation={[0, 0, 0.2]}>
        <capsuleGeometry args={[0.1, 1.3, 4, 8]} />
        <meshStandardMaterial color="#0c0c0c" roughness={1} />
      </mesh>
      <mesh position={[0.45, 1.1, 0]} rotation={[0, 0, -0.2]}>
        <capsuleGeometry args={[0.1, 1.3, 4, 8]} />
        <meshStandardMaterial color="#0c0c0c" roughness={1} />
      </mesh>
      <mesh position={[0, 0.4, 0]}>
        <coneGeometry args={[0.6, 1.0, 8]} />
        <meshStandardMaterial color="#1a0a0a" roughness={1} />
      </mesh>
      <Billboard position={[0, 1.85, 0]}>
        <mesh>
          <planeGeometry args={[0.95, 0.95]} />
          <meshBasicMaterial ref={faceMatRef} map={faceTex} transparent toneMapped={false} />
        </mesh>
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
