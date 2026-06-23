'use client'

import { useState } from 'react'
import { useGameStore, ControlMode } from '@/lib/game-store'
import { getAudio } from '@/lib/audio'
import { resetInput } from '@/lib/input'
import { Skull, Mouse, Smartphone, Volume2, Gauge, Play, RotateCcw, Home, AlertTriangle } from 'lucide-react'

export function MainMenu() {
  const controlMode = useGameStore((s) => s.controlMode)
  const setControlMode = useGameStore((s) => s.setControlMode)
  const startGame = useGameStore((s) => s.startGame)
  const masterVolume = useGameStore((s) => s.masterVolume)
  const setMasterVolume = useGameStore((s) => s.setMasterVolume)
  const sensitivity = useGameStore((s) => s.sensitivity)
  const setSensitivityStore = useGameStore((s) => s.setSensitivity)
  const [showSettings, setShowSettings] = useState(false)

  const handleStart = () => {
    const audio = getAudio()
    audio.init()
    audio.setVolume(masterVolume)
    audio.startHeartbeat()
    resetInput()
    startGame()
    // narrate
    setTimeout(() => audio.playVoice('/audio/intro.mp3', 1), 600)
    setTimeout(() => audio.playVoice('/audio/objective.mp3', 1), 7000)
  }

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black overflow-hidden">
      {/* Atmospheric backdrop */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          background:
            'radial-gradient(ellipse at 50% 30%, rgba(60,0,0,0.5), transparent 60%), radial-gradient(ellipse at 50% 100%, rgba(0,0,0,0.9), transparent 70%)',
        }}
      />
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: 'url(/textures/wall.png)',
          backgroundSize: 'cover',
          filter: 'brightness(0.3) contrast(1.2)',
        }}
      />
      {/* flicker overlay */}
      <div className="absolute inset-0 bg-black/40 animate-flicker pointer-events-none" />

      <div className="relative z-10 w-full max-w-lg px-6 py-8 text-center">
        {/* Title */}
        <div className="mb-2 flex items-center justify-center gap-3">
          <Skull className="w-10 h-10 text-rose-600 animate-pulse" />
        </div>
        <h1
          className="text-6xl sm:text-7xl font-black tracking-[0.2em] text-white mb-2"
          style={{
            textShadow: '0 0 30px rgba(180,0,0,0.6), 0 4px 12px rgba(0,0,0,0.9)',
            fontFamily: 'Georgia, serif',
          }}
        >
          ASYLUM
        </h1>
        <p className="text-rose-300/70 tracking-[0.4em] text-xs mb-1">THE LAST WARD</p>
        <p className="text-white/40 text-sm mb-8 italic">
          A psychological descent into the dark.
        </p>

        {/* Warning */}
        <div className="mb-6 px-4 py-2 rounded border border-rose-900/40 bg-rose-950/20 flex items-center justify-center gap-2 text-rose-300/70 text-xs">
          <AlertTriangle className="w-4 h-4" />
          Contains sudden scares, flashing lights & disturbing imagery.
        </div>

        {/* Control selection */}
        <p className="text-white/50 text-xs tracking-widest mb-3">CHOOSE YOUR CONTROLS</p>
        <div className="grid grid-cols-2 gap-3 mb-6">
          <ControlOption
            active={controlMode === 'keyboard'}
            onClick={() => setControlMode('keyboard')}
            icon={<Mouse className="w-6 h-6" />}
            title="Keyboard"
            sub="WASD + Mouse"
          />
          <ControlOption
            active={controlMode === 'touch'}
            onClick={() => setControlMode('touch')}
            icon={<Smartphone className="w-6 h-6" />}
            title="Touch"
            sub="Joystick + Drag"
          />
        </div>

        {/* Controls hint */}
        <div className="text-white/40 text-xs mb-6 leading-relaxed">
          {controlMode === 'keyboard' ? (
            <>
              <b className="text-white/60">WASD</b> move · <b className="text-white/60">Mouse</b> look ·{' '}
              <b className="text-white/60">Shift</b> run · <b className="text-white/60">F</b> flashlight ·{' '}
              <b className="text-white/60">E</b> interact
              <div className="mt-1 text-white/30">Click the screen to lock the mouse. ESC to release.</div>
            </>
          ) : (
            <>
              <b className="text-white/60">Left stick</b> move · <b className="text-white/60">Right drag</b> look ·{' '}
              <b className="text-white/60">RUN/LIGHT/USE</b> buttons
              <div className="mt-1 text-white/30">Shine your flashlight at the monster to push it back.</div>
            </>
          )}
        </div>

        {/* Start */}
        <button
          onClick={handleStart}
          className="group w-full py-4 rounded-md bg-gradient-to-r from-rose-800 to-rose-950 border border-rose-600/40 hover:from-rose-700 hover:to-rose-900 transition-all flex items-center justify-center gap-2 text-white font-bold tracking-widest shadow-lg shadow-rose-900/40"
        >
          <Play className="w-5 h-5 group-hover:scale-110 transition-transform" />
          ENTER THE ASYLUM
        </button>

        <button
          onClick={() => setShowSettings((v) => !v)}
          className="mt-4 text-white/40 hover:text-white/70 text-xs tracking-widest transition-colors"
        >
          {showSettings ? 'HIDE SETTINGS' : 'SETTINGS'}
        </button>

        {showSettings && (
          <div className="mt-4 p-4 rounded-md bg-black/50 border border-white/10 text-left space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="flex items-center gap-2 text-xs text-white/60">
                  <Volume2 className="w-4 h-4" /> Volume
                </span>
                <span className="text-xs text-white/40">{Math.round(masterVolume * 100)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={masterVolume}
                onChange={(e) => {
                  const v = parseFloat(e.target.value)
                  setMasterVolume(v)
                  getAudio().setVolume(v)
                }}
                className="w-full accent-rose-600"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="flex items-center gap-2 text-xs text-white/60">
                  <Gauge className="w-4 h-4" /> Look Sensitivity
                </span>
                <span className="text-xs text-white/40">{sensitivity.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min={0.3}
                max={2.5}
                step={0.1}
                value={sensitivity}
                onChange={(e) => setSensitivityStore(parseFloat(e.target.value))}
                className="w-full accent-rose-600"
              />
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes flicker {
          0%, 100% { opacity: 0.35; }
          10% { opacity: 0.6; }
          12% { opacity: 0.3; }
          50% { opacity: 0.4; }
          52% { opacity: 0.2; }
          54% { opacity: 0.45; }
        }
        .animate-flicker { animation: flicker 4s infinite; }
      `}</style>
    </div>
  )
}

function ControlOption({
  active,
  onClick,
  icon,
  title,
  sub,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  title: string
  sub: string
}) {
  return (
    <button
      onClick={onClick}
      className={`py-4 rounded-md border transition-all flex flex-col items-center gap-1 ${
        active
          ? 'bg-rose-900/40 border-rose-500/60 text-white shadow-lg shadow-rose-900/30'
          : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10'
      }`}
    >
      {icon}
      <span className="text-sm font-semibold">{title}</span>
      <span className="text-[10px] opacity-70">{sub}</span>
    </button>
  )
}

export function GameOverScreen() {
  const resetGame = useGameStore((s) => s.resetGame)
  const startGame = useGameStore((s) => s.startGame)

  const handleRetry = () => {
    const audio = getAudio()
    audio.init()
    audio.setVolume(useGameStore.getState().masterVolume)
    audio.startHeartbeat()
    resetInput()
    startGame()
  }
  const handleMenu = () => {
    resetInput()
    resetGame()
  }

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/95">
      <div
        className="absolute inset-0 opacity-25"
        style={{
          backgroundImage: 'url(/textures/monster_face.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'brightness(0.4) contrast(1.3)',
        }}
      />
      <div className="relative z-10 text-center px-6">
        <h1
          className="text-7xl font-black tracking-widest text-rose-700 mb-4"
          style={{ textShadow: '0 0 40px rgba(150,0,0,0.8)', fontFamily: 'Georgia, serif' }}
        >
          YOU DIED
        </h1>
        <p className="text-white/50 italic mb-10 max-w-md mx-auto">
          The dark swallowed you whole. Your screams echo through the empty corridors,
          joining the others who never left.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={handleRetry}
            className="px-8 py-3 rounded-md bg-rose-800 hover:bg-rose-700 border border-rose-500/40 text-white font-semibold tracking-wider flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" /> TRY AGAIN
          </button>
          <button
            onClick={handleMenu}
            className="px-8 py-3 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 font-semibold tracking-wider flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" /> MAIN MENU
          </button>
        </div>
      </div>
    </div>
  )
}

export function VictoryScreen() {
  const resetGame = useGameStore((s) => s.resetGame)
  const startGame = useGameStore((s) => s.startGame)

  const handleRetry = () => {
    const audio = getAudio()
    audio.init()
    audio.setVolume(useGameStore.getState().masterVolume)
    audio.startHeartbeat()
    resetInput()
    startGame()
  }
  const handleMenu = () => {
    resetInput()
    resetGame()
  }

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/95">
      <div
        className="absolute inset-0 opacity-30"
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(40,80,40,0.4), transparent 70%)',
        }}
      />
      <div className="relative z-10 text-center px-6">
        <h1
          className="text-7xl font-black tracking-widest text-emerald-400 mb-4"
          style={{ textShadow: '0 0 40px rgba(0,150,80,0.6)', fontFamily: 'Georgia, serif' }}
        >
          YOU ESCAPED
        </h1>
        <p className="text-white/50 italic mb-10 max-w-md mx-auto">
          Cold air fills your lungs as you burst through the door. You survived the ward...
          but something tells you it will be waiting, should you ever return.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={handleRetry}
            className="px-8 py-3 rounded-md bg-emerald-800 hover:bg-emerald-700 border border-emerald-500/40 text-white font-semibold tracking-wider flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" /> PLAY AGAIN
          </button>
          <button
            onClick={handleMenu}
            className="px-8 py-3 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 font-semibold tracking-wider flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" /> MAIN MENU
          </button>
        </div>
      </div>
    </div>
  )
}
