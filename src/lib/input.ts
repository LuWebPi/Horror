// Shared mutable input state read every frame by the Player controller.
// Both keyboard/mouse listeners and touch controls write into this object.
// Using a plain object + refs avoids React re-renders during gameplay.

import { useGameStore } from './game-store'

export interface InputState {
  // Movement axis: x = strafe (-1 left .. 1 right), z = forward (-1 .. 1)
  moveX: number
  moveZ: number
  // Look delta accumulated since last frame consumption (yaw, pitch in radians)
  lookDeltaX: number
  lookDeltaY: number
  sprint: boolean
  // Edge-triggered flags, consumed each frame
  interactPressed: boolean
  flashlightToggled: boolean
}

export const input: InputState = {
  moveX: 0,
  moveZ: 0,
  lookDeltaX: 0,
  lookDeltaY: 0,
  sprint: false,
  interactPressed: false,
  flashlightToggled: false,
}

// Reset for switches between control modes
export function resetInput() {
  input.moveX = 0
  input.moveZ = 0
  input.lookDeltaX = 0
  input.lookDeltaY = 0
  input.sprint = false
  input.interactPressed = false
  input.flashlightToggled = false
}

// ---- Keyboard / mouse (pointer lock) ----
const keys: Record<string, boolean> = {}
let pointerLocked = false
let sensitivity = 1

export function setSensitivity(s: number) {
  sensitivity = s
}

export function isPointerLocked() {
  return pointerLocked
}

export function requestPointerLock(el: HTMLElement) {
  el.requestPointerLock?.()
}

export function exitPointerLock() {
  if (document.pointerLockElement) document.exitPointerLock?.()
}

function updateMoveFromKeys() {
  let x = 0
  let z = 0
  if (keys['KeyW'] || keys['ArrowUp']) z -= 1
  if (keys['KeyS'] || keys['ArrowDown']) z += 1
  if (keys['KeyA'] || keys['ArrowLeft']) x -= 1
  if (keys['KeyD'] || keys['ArrowRight']) x += 1
  // normalize
  const len = Math.hypot(x, z)
  if (len > 0) {
    x /= len
    z /= len
  }
  input.moveX = x
  input.moveZ = z
  input.sprint = !!(keys['ShiftLeft'] || keys['ShiftRight'])
}

export function attachKeyboardControls() {
  const onKeyDown = (e: KeyboardEvent) => {
    keys[e.code] = true
    if (e.code === 'KeyF') input.flashlightToggled = true
    if (e.code === 'KeyE' || e.code === 'Space') input.interactPressed = true
    if (e.code === 'KeyF' || e.code === 'KeyE' || e.code.startsWith('Arrow')) {
      e.preventDefault()
    }
    updateMoveFromKeys()
  }
  const onKeyUp = (e: KeyboardEvent) => {
    keys[e.code] = false
    updateMoveFromKeys()
  }
  const onMouseMove = (e: MouseEvent) => {
    if (!pointerLocked) return
    input.lookDeltaX += e.movementX * 0.0022 * sensitivity
    input.lookDeltaY += e.movementY * 0.0022 * sensitivity
  }
  const onPointerLockChange = () => {
    pointerLocked = document.pointerLockElement === document.body
  }
  const onPointerLockError = () => {
    pointerLocked = false
  }

  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
  window.addEventListener('mousemove', onMouseMove)
  document.addEventListener('pointerlockchange', onPointerLockChange)
  document.addEventListener('pointerlockerror', onPointerLockError)

  // Lock pointer to body when clicking the canvas (desktop mode only)
  const onClick = () => {
    // Only lock pointer in keyboard mode; touch mode uses on-screen controls
    if (useGameStore.getState().controlMode === 'touch') return
    if (!pointerLocked) {
      document.body.requestPointerLock?.()
    }
  }
  window.addEventListener('click', onClick)

  return () => {
    window.removeEventListener('keydown', onKeyDown)
    window.removeEventListener('keyup', onKeyUp)
    window.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('pointerlockchange', onPointerLockChange)
    document.removeEventListener('pointerlockerror', onPointerLockError)
    window.removeEventListener('click', onClick)
  }
}

// ---- Touch controls API (called by the TouchControls component) ----
export const touch = {
  joystickActive: false,
  joystickX: 0,
  joystickY: 0,
  lookActive: false,
  lookId: -1,
  lookLastX: 0,
  lookLastY: 0,
}

export function setTouchJoystick(x: number, y: number) {
  touch.joystickX = x
  touch.joystickY = y
  // commit to input move
  input.moveX = x
  input.moveZ = y
}

export function setTouchLookDelta(dx: number, dy: number) {
  input.lookDeltaX += dx * 0.005 * sensitivity
  input.lookDeltaY += dy * 0.005 * sensitivity
}

export function touchInteract() {
  input.interactPressed = true
}
export function touchFlashlight() {
  input.flashlightToggled = true
}
export function touchSprint(v: boolean) {
  input.sprint = v
}

// Consume edge-triggered flags (called by Player each frame)
export function consumeInteract(): boolean {
  const v = input.interactPressed
  input.interactPressed = false
  return v
}
export function consumeFlashlightToggle(): boolean {
  const v = input.flashlightToggled
  input.flashlightToggled = false
  return v
}
