import { create } from 'zustand'

export type GamePhase = 'menu' | 'loading' | 'playing' | 'gameover' | 'victory'
export type ControlMode = 'keyboard' | 'touch'
export type JumpScareType = 'monster1' | 'monster2' | null

interface GameState {
  // Phase & flow
  phase: GamePhase
  controlMode: ControlMode
  assetsReady: boolean

  // Player stats
  sanity: number       // 0-100, low = hallucinations
  battery: number      // 0-100, flashlight power
  flashlightOn: boolean
  keysCollected: number
  totalKeys: number
  exitUnlocked: boolean

  // Jump scare
  jumpScare: JumpScareType

  // Settings
  masterVolume: number   // 0-1
  sensitivity: number    // 0.5-2

  // Monster distance (for audio tension), 0-1 (1 = far/safe, 0 = right next to you)
  monsterProximity: number
  // heartRate drives heartbeat audio tempo, 0-1
  tension: number

  // Messages (transient HUD text)
  message: string
  messageUntil: number

  // Actions
  setPhase: (p: GamePhase) => void
  setControlMode: (c: ControlMode) => void
  setAssetsReady: (v: boolean) => void
  startGame: () => void
  resetGame: () => void

  setSanity: (v: number) => void
  drainSanity: (amt: number) => void
  restoreSanity: (amt: number) => void
  setBattery: (v: number) => void
  drainBattery: (amt: number) => void
  toggleFlashlight: () => void
  setFlashlight: (v: boolean) => void

  collectKey: () => void
  unlockExit: () => void

  triggerJumpScare: (type: JumpScareType) => void
  clearJumpScare: () => void

  setMonsterProximity: (v: number) => void
  setTension: (v: number) => void

  setMasterVolume: (v: number) => void
  setSensitivity: (v: number) => void

  showMessage: (msg: string, duration?: number) => void
}

const INITIAL = {
  sanity: 100,
  battery: 100,
  flashlightOn: true,
  keysCollected: 0,
  totalKeys: 3,
  exitUnlocked: false,
  jumpScare: null as JumpScareType,
  masterVolume: 0.8,
  sensitivity: 1,
  monsterProximity: 1,
  tension: 0,
  message: '',
  messageUntil: 0,
}

export const useGameStore = create<GameState>((set, get) => ({
  phase: 'menu',
  controlMode: 'keyboard',
  assetsReady: false,
  ...INITIAL,

  setPhase: (p) => set({ phase: p }),
  setControlMode: (c) => set({ controlMode: c }),
  setAssetsReady: (v) => set({ assetsReady: v }),

  startGame: () => set({ phase: 'playing', ...INITIAL }),
  resetGame: () => set({ phase: 'menu', ...INITIAL }),

  setSanity: (v) => set({ sanity: Math.max(0, Math.min(100, v)) }),
  drainSanity: (amt) => set((s) => ({ sanity: Math.max(0, s.sanity - amt) })),
  restoreSanity: (amt) => set((s) => ({ sanity: Math.min(100, s.sanity + amt) })),
  setBattery: (v) => set({ battery: Math.max(0, Math.min(100, v)) }),
  drainBattery: (amt) => set((s) => ({ battery: Math.max(0, s.battery - amt) })),
  toggleFlashlight: () => set((s) => ({ flashlightOn: !s.flashlightOn })),
  setFlashlight: (v) => set({ flashlightOn: v }),

  collectKey: () => {
    const s = get()
    const next = s.keysCollected + 1
    if (next >= s.totalKeys) {
      set({ keysCollected: next, exitUnlocked: true })
    } else {
      set({ keysCollected: next })
    }
  },
  unlockExit: () => set({ exitUnlocked: true }),

  triggerJumpScare: (type) => set({ jumpScare: type }),
  clearJumpScare: () => set({ jumpScare: null }),

  setMonsterProximity: (v) => set({ monsterProximity: Math.max(0, Math.min(1, v)) }),
  setTension: (v) => set({ tension: Math.max(0, Math.min(1, v)) }),

  setMasterVolume: (v) => set({ masterVolume: Math.max(0, Math.min(1, v)) }),
  setSensitivity: (v) => set({ sensitivity: Math.max(0.3, Math.min(2.5, v)) }),

  showMessage: (msg, duration = 3500) =>
    set({ message: msg, messageUntil: Date.now() + duration }),
}))
