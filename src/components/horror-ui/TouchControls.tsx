'use client'

import { useRef, useState, useCallback } from 'react'
import {
  setTouchJoystick,
  setTouchLookDelta,
  touchInteract,
  touchFlashlight,
  touchSprint,
  touchCrouch,
  resetInput,
} from '@/lib/input'
import { useGameStore } from '@/lib/game-store'
import { Flashlight, Hand, Zap, MoveRight, Eye, Footprints } from 'lucide-react'

const JOY_RADIUS = 55

export function TouchControls() {
  const flashlightOn = useGameStore((s) => s.flashlightOn)
  const toggleFlashlight = useGameStore((s) => s.toggleFlashlight)
  const hidden = useGameStore((s) => s.hidden)
  const [crouching, setCrouching] = useState(false)

  // Joystick state
  const [joyActive, setJoyActive] = useState(false)
  const [joyBase, setJoyBase] = useState({ x: 0, y: 0 })
  const joyKnobRef = useRef<HTMLDivElement>(null)
  const joyPointerId = useRef<number | null>(null)

  // Look pad state
  const lookPointerId = useRef<number | null>(null)
  const lookLast = useRef({ x: 0, y: 0 })

  const onJoyDown = useCallback((e: React.PointerEvent) => {
    if (joyPointerId.current !== null) return
    joyPointerId.current = e.pointerId
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    setJoyBase({ x: e.clientX, y: e.clientY })
    setJoyActive(true)
    if (joyKnobRef.current) {
      joyKnobRef.current.style.transform = 'translate(0px, 0px)'
    }
  }, [])

  const onJoyMove = useCallback((e: React.PointerEvent) => {
    if (joyPointerId.current !== e.pointerId) return
    let dx = e.clientX - joyBase.x
    let dy = e.clientY - joyBase.y
    const len = Math.hypot(dx, dy)
    if (len > JOY_RADIUS) {
      dx = (dx / len) * JOY_RADIUS
      dy = (dy / len) * JOY_RADIUS
    }
    if (joyKnobRef.current) {
      joyKnobRef.current.style.transform = `translate(${dx}px, ${dy}px)`
    }
    // normalized: up = forward (moveZ -1)
    setTouchJoystick(dx / JOY_RADIUS, dy / JOY_RADIUS)
  }, [joyBase])

  const onJoyUp = useCallback((e: React.PointerEvent) => {
    if (joyPointerId.current !== e.pointerId) return
    joyPointerId.current = null
    setJoyActive(false)
    setTouchJoystick(0, 0)
    if (joyKnobRef.current) {
      joyKnobRef.current.style.transform = 'translate(0px, 0px)'
    }
  }, [])

  const onLookDown = useCallback((e: React.PointerEvent) => {
    if (lookPointerId.current !== null) return
    lookPointerId.current = e.pointerId
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    lookLast.current = { x: e.clientX, y: e.clientY }
  }, [])

  const onLookMove = useCallback((e: React.PointerEvent) => {
    if (lookPointerId.current !== e.pointerId) return
    const dx = e.clientX - lookLast.current.x
    const dy = e.clientY - lookLast.current.y
    lookLast.current = { x: e.clientX, y: e.clientY }
    setTouchLookDelta(dx, dy)
  }, [])

  const onLookUp = useCallback((e: React.PointerEvent) => {
    if (lookPointerId.current !== e.pointerId) return
    lookPointerId.current = null
  }, [])

  return (
    <div className="absolute inset-0 z-20 select-none touch-none">
      {/* Left joystick zone */}
      <div
        className="absolute left-0 bottom-0 w-1/2 h-3/5"
        onPointerDown={onJoyDown}
        onPointerMove={onJoyMove}
        onPointerUp={onJoyUp}
        onPointerCancel={onJoyUp}
      >
        {joyActive && (
          <div
            className="absolute pointer-events-none"
            style={{
              left: joyBase.x - 70,
              top: joyBase.y - 70,
              width: 140,
              height: 140,
            }}
          >
            <div className="w-full h-full rounded-full border-2 border-white/20 bg-black/30 backdrop-blur-sm" />
            <div
              ref={joyKnobRef}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-white/30 border border-white/40 backdrop-blur"
              style={{ transform: 'translate(0px, 0px)' }}
            />
          </div>
        )}
        {!joyActive && (
          <div className="absolute left-10 bottom-16 text-white/25 text-xs flex items-center gap-1">
            <MoveRight className="w-4 h-4 rotate-90" /> Move
          </div>
        )}
      </div>

      {/* Right look zone */}
      <div
        className="absolute right-0 top-0 w-1/2 h-3/5"
        onPointerDown={onLookDown}
        onPointerMove={onLookMove}
        onPointerUp={onLookUp}
        onPointerCancel={onLookUp}
      >
        <div className="absolute right-10 top-6 text-white/25 text-xs flex items-center gap-1">
          <Eye className="w-4 h-4" /> Look
        </div>
      </div>

      {/* Action buttons (bottom right) */}
      <div className="absolute right-6 bottom-8 flex flex-col items-end gap-4">
        <div className="flex gap-4">
          {/* Crouch (toggle) */}
          <button
            className={`w-16 h-16 rounded-full border-2 backdrop-blur flex flex-col items-center justify-center ${
              crouching ? 'bg-emerald-600/40 border-emerald-400/60 text-emerald-100' : 'bg-white/10 border-white/20 text-white/80'
            }`}
            onPointerDown={(e) => { e.preventDefault(); const v = !crouching; setCrouching(v); touchCrouch(v) }}
          >
            <Footprints className="w-6 h-6" />
            <span className="text-[10px] mt-0.5">CROUCH</span>
          </button>

          {/* Sprint */}
          <button
            className="w-16 h-16 rounded-full bg-white/10 border border-white/20 backdrop-blur flex flex-col items-center justify-center text-white/80 active:bg-amber-500/40"
            onPointerDown={(e) => { e.preventDefault(); touchSprint(true) }}
            onPointerUp={(e) => { e.preventDefault(); touchSprint(false) }}
            onPointerCancel={() => touchSprint(false)}
            onPointerLeave={() => touchSprint(false)}
          >
            <Zap className="w-6 h-6" />
            <span className="text-[10px] mt-0.5">RUN</span>
          </button>

          {/* Flashlight indicator (always on — just shows status) */}
          <div className="w-20 h-20 rounded-full border-2 backdrop-blur flex flex-col items-center justify-center bg-amber-400/20 border-amber-300/40 text-amber-100">
            <Flashlight className="w-7 h-7" />
            <span className="text-[10px] mt-0.5">ON</span>
          </div>
        </div>

        {/* Interact / Hide */}
        <button
          className={`w-20 h-20 rounded-full border-2 backdrop-blur flex flex-col items-center justify-center ${
            hidden ? 'bg-emerald-600/40 border-emerald-400/60 text-emerald-100' : 'bg-white/10 border-white/20 text-white/80 active:bg-emerald-500/40'
          }`}
          onPointerDown={(e) => { e.preventDefault(); touchInteract() }}
        >
          <Hand className="w-7 h-7" />
          <span className="text-[10px] mt-0.5">{hidden ? 'EXIT' : 'HIDE'}</span>
        </button>
      </div>
    </div>
  )
}

export function clearTouchInput() {
  resetInput()
}
