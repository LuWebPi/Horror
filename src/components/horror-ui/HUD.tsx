'use client'

import { useEffect, useState } from 'react'
import { useGameStore } from '@/lib/game-store'
import { Brain, Battery, KeyRound, DoorOpen, Volume2, Eye, EyeOff, Footprints } from 'lucide-react'

function useTick(ms = 100) {
  const [, setT] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setT((x) => x + 1), ms)
    return () => clearInterval(id)
  }, [ms])
}

export function HUD() {
  const sanity = useGameStore((s) => Math.round(s.sanity))
  const battery = useGameStore((s) => Math.round(s.battery))
  const keysCollected = useGameStore((s) => s.keysCollected)
  const totalKeys = useGameStore((s) => s.totalKeys)
  const exitUnlocked = useGameStore((s) => s.exitUnlocked)
  const message = useGameStore((s) => s.message)
  const messageUntil = useGameStore((s) => s.messageUntil)
  const day = useGameStore((s) => s.day)
  const maxDays = useGameStore((s) => s.maxDays)
  const noiseLevel = useGameStore((s) => s.noiseLevel)
  const hidden = useGameStore((s) => s.hidden)
  const aiState = useGameStore((s) => s.aiState)
  const timeOfDay = useGameStore((s) => s.timeOfDay)
  const dayProgress = useGameStore((s) => s.dayProgress)
  useTick(150)

  const showMsg = Date.now() < messageUntil
  const lowSanity = sanity < 40

  const noiseLabel = noiseLevel === 0 ? 'SILENT' : noiseLevel === 1 ? 'WALKING' : noiseLevel === 2 ? 'RUNNING!' : 'CREAK!'
  const noiseColor = noiseLevel === 0 ? 'text-emerald-400/70' : noiseLevel >= 2 ? 'text-rose-400' : 'text-amber-300'
  const aiLabel: Record<string, string> = {
    patrol: 'WANDERING',
    investigate: 'INVESTIGATING',
    chase: 'HUNTING YOU',
    search: 'SEARCHING',
    stunned: 'DAZED',
  }
  const aiColor: Record<string, string> = {
    patrol: 'text-white/40',
    investigate: 'text-amber-300',
    chase: 'text-rose-500',
    search: 'text-amber-300',
    stunned: 'text-sky-300',
  }

  return (
    <div className="absolute inset-0 z-10 pointer-events-none text-white font-sans">
      {/* Crosshair */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="w-1.5 h-1.5 rounded-full bg-white/40" />
      </div>

      {/* Top-left stats */}
      <div className="absolute top-3 left-3 flex flex-col gap-2 w-48">
        <div className="flex items-center gap-1.5 bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded-md border border-rose-900/40">
          <span className="text-[10px] tracking-widest text-rose-300/80">DAY</span>
          <span className="text-sm font-bold text-rose-200">{day}</span>
          <span className="text-[10px] text-white/40">/ {maxDays}</span>
          {/* day/night icon */}
          <span className={`ml-1 text-xs ${timeOfDay === 'day' ? 'text-amber-300' : 'text-indigo-300'}`}>
            {timeOfDay === 'day' ? '☀' : '☾'}
          </span>
          {/* progress bar for current phase */}
          <div className="ml-auto w-10 h-1.5 bg-black/50 rounded-full overflow-hidden">
            <div
              className={`h-full ${timeOfDay === 'day' ? 'bg-amber-400' : 'bg-indigo-400'}`}
              style={{ width: `${Math.round(dayProgress * 100)}%` }}
            />
          </div>
        </div>
        <StatBar icon={<Brain className="w-4 h-4" />} label="SANITY" value={sanity} color="from-rose-900 to-rose-500" pulse={lowSanity} />
        <StatBar icon={<Battery className="w-4 h-4" />} label="BATTERY" value={battery} color="from-amber-900 to-amber-400" />
      </div>

      {/* Top-right objective & keys */}
      <div className="absolute top-3 right-3 flex flex-col items-end gap-2">
        <div className="flex items-center gap-1.5 bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded-md border border-white/10">
          {Array.from({ length: totalKeys }).map((_, i) => (
            <KeyRound key={i} className={`w-4 h-4 ${i < keysCollected ? 'text-amber-300 fill-amber-400/40' : 'text-white/25'}`} />
          ))}
          <span className="text-xs ml-1 text-white/70">{keysCollected}/{totalKeys}</span>
        </div>
        <div className="flex items-center gap-1.5 bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded-md border border-white/10 text-xs">
          <DoorOpen className={`w-4 h-4 ${exitUnlocked ? 'text-emerald-400' : 'text-rose-500'}`} />
          <span className={exitUnlocked ? 'text-emerald-300' : 'text-rose-300'}>
            {exitUnlocked ? 'Exit Unlocked' : 'Find 3 Keys'}
          </span>
        </div>
      </div>

      {/* Bottom-left: noise + granny state */}
      <div className="absolute bottom-3 left-3 flex flex-col gap-1.5">
        <div className="flex items-center gap-1.5 bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded-md border border-white/10 text-xs">
          <Footprints className={`w-4 h-4 ${noiseColor}`} />
          <span className={`${noiseColor} tracking-wider`}>NOISE: {noiseLabel}</span>
        </div>
        <div className="flex items-center gap-1.5 bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded-md border border-white/10 text-xs">
          <Eye className={`w-4 h-4 ${aiColor[aiState] || 'text-white/40'}`} />
          <span className={`${aiColor[aiState] || 'text-white/40'} tracking-wider`}>GRANNY: {aiLabel[aiState] || aiState}</span>
        </div>
      </div>

      {/* Bottom-right: hidden indicator */}
      {hidden && (
        <div className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-emerald-950/60 backdrop-blur-sm px-3 py-1.5 rounded-md border border-emerald-700/40 text-xs">
          <EyeOff className="w-4 h-4 text-emerald-300" />
          <span className="text-emerald-200 tracking-wider">HIDDEN — press E to exit</span>
        </div>
      )}

      {/* Bottom-center transient message */}
      {showMsg && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 px-5 py-2.5 bg-black/60 backdrop-blur rounded-md border border-white/10 text-center">
          <p className="text-sm tracking-wide text-white/90 animate-pulse">{message}</p>
        </div>
      )}

      {/* Low sanity red vignette */}
      {lowSanity && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at center, transparent 35%, rgba(120,0,0,0.55) 100%)',
            opacity: 0.4 + (1 - sanity / 40) * 0.5,
            mixBlendMode: 'multiply',
          }}
        />
      )}

      {/* Hidden overlay: dark slat view */}
      {hidden && (
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.2) 40%, rgba(0,0,0,0.2) 60%, rgba(0,0,0,0.7) 100%)' }} />
      )}

      {/* Volume hint (unused import guard) */}
      <span className="sr-only"><Volume2 /></span>
    </div>
  )
}

function StatBar({
  icon, label, value, color, pulse,
}: {
  icon: React.ReactNode; label: string; value: number; color: string; pulse?: boolean
}) {
  return (
    <div className={`bg-black/50 backdrop-blur-sm px-3 py-2 rounded-md border border-white/10 ${pulse ? 'animate-pulse' : ''}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="flex items-center gap-1.5 text-[10px] tracking-widest text-white/60">{icon} {label}</span>
        <span className="text-[10px] text-white/50">{value}%</span>
      </div>
      <div className="h-1.5 w-full bg-black/50 rounded-full overflow-hidden">
        <div className={`h-full bg-gradient-to-r ${color} transition-all duration-300`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
    </div>
  )
}
