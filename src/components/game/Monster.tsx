'use client'

import { useRef, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useTexture, Billboard } from '@react-three/drei'
import {
  MONSTER_SPAWN_CELL,
  PATROL_WAYPOINTS,
  cellToWorld,
  isBlocked,
  hasLineOfSight,
} from '@/lib/maze'
import { entities, scare } from '@/lib/entities'
import { useGameStore } from '@/lib/game-store'
import { getAudio } from '@/lib/audio'
import { asset } from '@/lib/asset'

const CATCH_DISTANCE = 1.3
const SIGHT_RANGE = 11
const SIGHT_CONE = 0.45          // cos half-angle
const FLASHLIGHT_STUN_TIME = 1.0 // seconds of continuous light to stun
const STUN_DURATION = 2.5

// Hearing radius per player noise level
const HEAR_RADIUS = [0, 6, 14, 18]

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
    activatedAt: 0,
    litAccum: 0,        // accumulated time being flashlight-lit
    lastWhisper: 0,
    lastGrowl: 0,
    lastSting: 0,
    stepDist: 0,        // distance accumulator for footsteps
    searchWanderT: 0,
    searchDir: 0,
    caughtHandled: false,
    spawnX: 0,
    spawnZ: 0,
  })

  useMemo(() => {
    const [sx, , sz] = cellToWorld(MONSTER_SPAWN_CELL[0], MONSTER_SPAWN_CELL[1])
    st.current.spawnX = sx
    st.current.spawnZ = sz
    entities.monster.x = sx
    entities.monster.z = sz
    entities.monster.targetX = sx
    entities.monster.targetZ = sz
  }, [])

  // Reset monster when a new day starts (called via phase effect in Player, but also keep local)
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

    // Activation: immediately on day 1 (Granny is always home), but give 3s grace
    if (!s.active) {
      if (t > 3) {
        s.active = true
        s.activatedAt = t
        entities.monster.active = true
        g.visible = true
      } else {
        g.visible = false
        return
      }
    }

    const m = entities.monster
    const player = entities.player

    // ---- SENSE: sight ----
    const dx = player.x - m.x
    const dz = player.z - m.z
    const dist = Math.hypot(dx, dz)
    m.distanceToPlayer = dist
    const canSee =
      !player.hidden &&
      dist < SIGHT_RANGE &&
      hasLineOfSight(m.x, m.z, player.x, player.z) &&
      (() => {
        // monster facing toward player?
        const fx = -Math.sin(m.yaw)
        const fz = -Math.cos(m.yaw)
        const dot = (fx * dx + fz * dz) / (dist || 1)
        return dot > SIGHT_CONE
      })()
    m.canSeePlayer = canSee

    // ---- SENSE: hearing ----
    // one-shot noise events (creaky floors, bumps)
    let heard = false
    if (scare.noiseEvent) {
      const ev = scare.noiseEvent
      const nd = Math.hypot(ev.x - m.x, ev.z - m.z)
      if (nd < HEAR_RADIUS[ev.level] && ev.t > t - 0.5) {
        m.targetX = ev.x
        m.targetZ = ev.z
        m.lastSeenX = ev.x
        m.lastSeenZ = ev.z
        if (m.state !== 'chase') {
          m.state = 'investigate'
          m.stateTimer = 0
        }
        heard = true
      }
      scare.noiseEvent = null
    }
    // continuous noise from player movement
    if (!heard && player.noiseLevel > 0 && !player.hidden) {
      const hr = HEAR_RADIUS[player.noiseLevel]
      if (dist < hr && m.state === 'patrol') {
        m.targetX = player.x
        m.targetZ = player.z
        m.lastSeenX = player.x
        m.lastSeenZ = player.z
        m.state = 'investigate'
        m.stateTimer = 0
      }
    }

    // ---- Flashlight stun (only when NOT chasing — light dazes her) ----
    const flashlightOn = game.flashlightOn && game.battery > 0
    const toMx = (m.x - player.x) / (dist || 1)
    const toMz = (m.z - player.z) / (dist || 1)
    const beamDot = player.fx * toMx + player.fz * toMz
    const inBeam =
      flashlightOn && dist < 9 && beamDot > 0.5 && hasLineOfSight(player.x, player.z, m.x, m.z)
    if (inBeam && m.state !== 'chase') {
      s.litAccum += delta
      if (s.litAccum > FLASHLIGHT_STUN_TIME) {
        m.state = 'stunned'
        m.stunTimer = STUN_DURATION
        s.litAccum = 0
        getAudio().playGrannyGrowl()
      }
    } else {
      s.litAccum = Math.max(0, s.litAccum - delta * 0.5)
    }

    // ---- STATE MACHINE ----
    m.stateTimer += delta

    // stunned: freeze, count down
    if (m.state === 'stunned') {
      m.stunTimer -= delta
      if (m.stunTimer <= 0) {
        m.state = canSee ? 'chase' : 'search'
        m.stateTimer = 0
        m.lastSeenX = player.x
        m.lastSeenZ = player.z
      }
    } else if (canSee) {
      // spotted!
      if (m.state !== 'chase') {
        if (t - s.lastSting > 4) {
          s.lastSting = t
          getAudio().playTensionSting()
        }
      }
      m.state = 'chase'
      m.stateTimer = 0
      m.lastSeenX = player.x
      m.lastSeenZ = player.z
      m.targetX = player.x
      m.targetZ = player.z
    } else if (m.state === 'chase') {
      // lost sight
      if (m.stateTimer > 3) {
        m.state = 'search'
        m.stateTimer = 0
        m.targetX = m.lastSeenX
        m.targetZ = m.lastSeenZ
      } else {
        // keep going to last known
        m.targetX = m.lastSeenX
        m.targetZ = m.lastSeenZ
      }
    } else if (m.state === 'investigate') {
      // reached target?
      const td = Math.hypot(m.targetX - m.x, m.targetZ - m.z)
      if (td < 0.8 || m.stateTimer > 8) {
        m.state = 'search'
        m.stateTimer = 0
        s.searchWanderT = 0
      }
    } else if (m.state === 'search') {
      // wander near lastSeen for a while, then resume patrol
      s.searchWanderT -= delta
      const td = Math.hypot(m.targetX - m.x, m.targetZ - m.z)
      if (td < 0.8 || s.searchWanderT <= 0) {
        // pick a new nearby wander target
        s.searchWanderT = 2 + Math.random() * 2
        const ang = Math.random() * Math.PI * 2
        const r = 2 + Math.random() * 3
        m.targetX = m.lastSeenX + Math.cos(ang) * r
        m.targetZ = m.lastSeenZ + Math.sin(ang) * r
      }
      if (m.stateTimer > 12) {
        m.state = 'patrol'
        m.stateTimer = 0
      }
    } else {
      // patrol: move to current waypoint
      const wp = PATROL_WAYPOINTS[m.waypoint]
      const [wx, , wz] = cellToWorld(wp[0], wp[1])
      m.targetX = wx
      m.targetZ = wz
      const wd = Math.hypot(wx - m.x, wz - m.z)
      if (wd < 0.8) {
        m.waypoint = (m.waypoint + 1) % PATROL_WAYPOINTS.length
      }
    }

    setAIState(m.state)

    // ---- MOVEMENT ----
    let speed = 0
    switch (m.state) {
      case 'patrol': speed = 1.1; break
      case 'investigate': speed = 1.8; break
      case 'search': speed = 1.4; break
      case 'chase': speed = 2.5 + (game.day - 1) * 0.25; break // gets faster each day
      case 'stunned': speed = 0; break
    }
    // sanity-based slight speedup when player is breaking
    speed *= 1 + (1 - game.sanity / 100) * 0.15

    if (speed > 0) {
      const tdx = m.targetX - m.x
      const tdz = m.targetZ - m.z
      const tlen = Math.hypot(tdx, tdz)
      if (tlen > 0.05) {
        const nx = tdx / tlen
        const nz = tdz / tlen
        // facing
        m.yaw = Math.atan2(tdx, tdz)
        const moveX = nx * speed * delta
        const moveZ = nz * speed * delta
        if (!isBlocked(m.x + moveX, m.z, 0.5)) m.x += moveX
        if (!isBlocked(m.x, m.z + moveZ, 0.5)) m.z += moveZ
        // footsteps based on distance traveled
        s.stepDist += speed * delta
        const stepInterval = m.state === 'chase' ? 1.1 : 1.5
        if (s.stepDist > stepInterval) {
          s.stepDist = 0
          getAudio().grannyStep()
        }
      }
    }

    // face the player when chasing (for the billboard face)
    if (bodyRef.current) {
      const fy = m.state === 'chase' ? Math.atan2(dx, dz) : m.yaw
      bodyRef.current.rotation.y = fy
    }

    // ---- visuals ----
    g.position.x = m.x
    g.position.z = m.z
    // bobbing while moving
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

    // ---- proximity / tension / audio cues ----
    setMonsterProximity(THREE.MathUtils.clamp((dist - 1.5) / 12, 0, 1))
    const tension = THREE.MathUtils.clamp(1 - (dist - 1.5) / 10, 0, 1)
    setTension(Math.max(tension, game.tension * 0.97))

    // growl periodically when chasing or close
    if (dist < 8 && (m.state === 'chase' || m.state === 'investigate') && t - s.lastGrowl > 3.5 + Math.random() * 3) {
      s.lastGrowl = t
      getAudio().playGrannyGrowl()
    }
    // whispers when close
    if (dist < 6 && t - s.lastWhisper > 4 + Math.random() * 4) {
      s.lastWhisper = t
      getAudio().playRandomWhisper()
    }

    // ---- CATCH ----
    if (dist < CATCH_DISTANCE && !player.hidden && !s.caughtHandled && m.state !== 'stunned') {
      s.caughtHandled = true
      scare.caught = true
    }
  })

  // reset caughtHandled when scare.caught cleared (new day)
  const phase = useGameStore((s) => s.phase)
  const day = useGameStore((s) => s.day)
  useMemo(() => {
    st.current.caughtHandled = false
    // reset monster position on day change
    const [sx, , sz] = cellToWorld(MONSTER_SPAWN_CELL[0], MONSTER_SPAWN_CELL[1])
    entities.monster.x = sx
    entities.monster.z = sz
    entities.monster.targetX = sx
    entities.monster.targetZ = sz
    entities.monster.waypoint = 0
    entities.monster.state = 'patrol'
    entities.monster.stateTimer = 0
    entities.monster.stunTimer = 0
    st.current.active = false
    st.current.litAccum = 0
  }, [day])

  // Show/hide based on phase
  useMemo(() => {
    if (phase !== 'playing') {
      st.current.active = false
      if (groupRef.current) groupRef.current.visible = false
    }
  }, [phase])

  return (
    <group ref={groupRef} position={[st.current.spawnX, 0, st.current.spawnZ]} visible={false}>
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
      {/* Tattered skirt (Granny-ish) */}
      <mesh position={[0, 0.4, 0]}>
        <coneGeometry args={[0.6, 1.0, 8]} />
        <meshStandardMaterial color="#1a0a0a" roughness={1} />
      </mesh>
      {/* Face billboard */}
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
