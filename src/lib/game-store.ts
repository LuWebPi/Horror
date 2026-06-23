import { create } from 'zustand'

export type GamePhase = 'menu' | 'loading' | 'playing' | 'daytransition' | 'gameover' | 'victory'
export type ControlMode = 'keyboard' | 'touch'
export type JumpScareType = 'monster1' | 'monster2' | null
export type AIState = 'patrol' | 'investigate' | 'chase' | 'search' | 'stunned'

interface GameState {
  // Phase & flow
  phase: GamePhase
  controlMode: ControlMode
  assetsReady: boolean

  // Day system (Granny-style: 5 days, caught -> next day)
  day: number
  maxDays: number

  // Player stats
  sanity: number       // 0-100, low = hallucinations
  battery: number      // 0-100, flashlight power
  flashlightOn: boolean
  keysCollected: number
  totalKeys: number
  exitUnlocked: boolean

  // Stealth (Granny-style)
  noiseLevel: number       // 0=silent, 1=walk, 2=run, 3=creaky/impact (current frame)
  hidden: boolean          // hiding in wardrobe
  hiddenWardrobe: number   // index of wardrobe the player is inside (-1 if none)
  crouching: boolean

  // Monster
  aiState: AIState
  monsterProximity: number  // 1=far/safe, 0=right next to you
  tension: number

  // Jump scare
  jumpScare: JumpScareType

  // Settings
  masterVolume: number   // 0-1
  sensitivity: number    // 0.5-2

  // Messages (transient HUD text)
  message: string
  messageUntil: number

  // Actions
  setPhase: (p: GamePhase) => void
  setControlMode: (c: ControlMode) => void
  setAssetsReady: (v: boolean) => void
  startGame: () => void
  resetGame: () => void

  setDay: (d: number) => void
  advanceDay: () => void  // day++ and return new day; caller checks > maxDays

  setSanity: (v: number) => void
  drainSanity: (amt: number) => void
  restoreSanity: (amt: number) => void
  setBattery: (v: number) => void
  drainBattery: (amt: number) => void
  toggleFlashlight: () => void
  setFlashlight: (v: boolean) => void

  setNoiseLevel: (v: number) => void
  setHidden: (v: boolean, wardrobe?: number) => void
  setCrouching: (v: boolean) => void
  setAIState: (s: AIState) => void

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
  day: 1,
  maxDays: 5,
  sanity: 100,
  battery: 100,
  flashlightOn: true,
  keysCollected: 0,
  totalKeys: 3,
  exitUnlocked: false,
  noiseLevel: 0,
  hidden: false,
  hiddenWardrobe: -1,
  crouching: false,
  aiState: 'patrol' as AIState,
  monsterProximity: 1,
  tension: 0,
  jumpScare: null as JumpScareType,
  masterVolume: 0.8,
  sensitivity: 1,
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

  setDay: (d) => set({ day: d }),
  advanceDay: () => {
    const next = get().day + 1
    set({ day: next })
    return next
  },

  setSanity: (v) => set({ sanity: Math.max(0, Math.min(100, v)) }),
  drainSanity: (amt) => set((s) => ({ sanity: Math.max(0, s.sanity - amt) })),
  restoreSanity: (amt) => set((s) => ({ sanity: Math.min(100, s.sanity + amt) })),
  setBattery: (v) => set({ battery: Math.max(0, Math.min(100, v)) }),
  drainBattery: (amt) => set((s) => ({ battery: Math.max(0, s.battery - amt) })),
  toggleFlashlight: () => set((s) => ({ flashlightOn: !s.flashlightOn })),
  setFlashlight: (v) => set({ flashlightOn: v }),

  setNoiseLevel: (v) => set({ noiseLevel: Math.max(0, Math.min(3, v)) }),
  setHidden: (v, wardrobe = -1) => set({ hidden: v, hiddenWardrobe: v ? wardrobe : -1 }),
  setCrouching: (v) => set({ crouching: v }),
  setAIState: (s) => set({ aiState: s }),

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
