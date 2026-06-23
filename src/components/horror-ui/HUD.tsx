'use client'

import { useEffect, useState } from 'react'
import { useGameStore } from '@/lib/game-store'
import { Brain, Battery, KeyRound, DoorOpen } from 'lucide-react'

function useTick(ms = 100) {
  const [, setT] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setT((x) => x + 1), ms)
    return () => clearInterval(id)
  }, [ms])
}

export function HUD() {
  // Round frequently-changing values so we only re-render when the displayed value changes
  const sanity = useGameStore((s) => Math.round(s.sanity))
  const battery = useGameStore((s) => Math.round(s.battery))
  const keysCollected = useGameStore((s) => s.keysCollected)
  const totalKeys = useGameStore((s) => s.totalKeys)
  const exitUnlocked = useGameStore((s) => s.exitUnlocked)
  const message = useGameStore((s) => s.message)
  const messageUntil = useGameStore((s) => s.messageUntil)
  useTick(120)

  const showMsg = Date.now() < messageUntil
  const lowSanity = sanity < 40

  return (
    <div className="absolute inset-0 z-10 pointer-events-none text-white font-sans">
      {/* Crosshair */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="w-1.5 h-1.5 rounded-full bg-white/40" />
      </div>

      {/* Top-left stats */}
      <div className="absolute top-4 left-4 flex flex-col gap-2 w-48">
        <StatBar
          icon={<Brain className="w-4 h-4" />}
          label="SANITY"
          value={sanity}
          color="from-rose-900 to-rose-500"
          pulse={lowSanity}
        />
        <StatBar
          icon={<Battery className="w-4 h-4" />}
          label="BATTERY"
          value={battery}
          color="from-amber-900 to-amber-400"
        />
      </div>

      {/* Top-right objective & keys */}
      <div className="absolute top-4 right-4 flex flex-col items-end gap-2">
        <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-sm px-3 py-1.5 rounded-md border border-white/10">
          {Array.from({ length: totalKeys }).map((_, i) => (
            <KeyRound
              key={i}
              className={`w-4 h-4 ${
                i < keysCollected ? 'text-amber-300 fill-amber-400/40' : 'text-white/25'
              }`}
            />
          ))}
          <span className="text-xs ml-1 text-white/70">
            {keysCollected}/{totalKeys}
          </span>
        </div>
        <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-sm px-3 py-1.5 rounded-md border border-white/10 text-xs">
          <DoorOpen className={`w-4 h-4 ${exitUnlocked ? 'text-emerald-400' : 'text-rose-500'}`} />
          <span className={exitUnlocked ? 'text-emerald-300' : 'text-rose-300'}>
            {exitUnlocked ? 'Exit Unlocked' : 'Find 3 Keys'}
          </span>
        </div>
      </div>

      {/* Bottom-center transient message */}
      {showMsg && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 px-5 py-2.5 bg-black/60 backdrop-blur rounded-md border border-white/10 text-center">
          <p className="text-sm tracking-wide text-white/90 animate-pulse">{message}</p>
        </div>
      )}

      {/* Low sanity red vignette */}
      {lowSanity && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse at center, transparent 35%, rgba(120,0,0,0.55) 100%)',
            opacity: 0.4 + (1 - sanity / 40) * 0.5,
            mixBlendMode: 'multiply',
          }}
        />
      )}
    </div>
  )
}

function StatBar({
  icon,
  label,
  value,
  color,
  pulse,
}: {
  icon: React.ReactNode
  label: string
  value: number
  color: string
  pulse?: boolean
}) {
  return (
    <div className={`bg-black/40 backdrop-blur-sm px-3 py-2 rounded-md border border-white/10 ${pulse ? 'animate-pulse' : ''}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="flex items-center gap-1.5 text-[10px] tracking-widest text-white/60">
          {icon} {label}
        </span>
        <span className="text-[10px] text-white/50">{Math.round(value)}%</span>
      </div>
      <div className="h-1.5 w-full bg-black/50 rounded-full overflow-hidden">
        <div
          className={`h-full bg-gradient-to-r ${color} transition-all duration-300`}
          style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        />
      </div>
    </div>
  )
}
