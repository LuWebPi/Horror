'use client'

import { useGameStore } from '@/lib/game-store'

export function JumpScareOverlay() {
  const jumpScare = useGameStore((s) => s.jumpScare)

  if (!jumpScare) return null

  const face = jumpScare === 'monster1' ? '/textures/monster_face.png' : '/textures/monster_face2.png'

  return (
    <div className="absolute inset-0 z-50 pointer-events-none overflow-hidden">
      {/* Black flash then face */}
      <div
        key={jumpScare + Date.now()}
        className="absolute inset-0 scare-shake"
      >
        <img
          src={face}
          alt=""
          className="w-full h-full object-cover scale-110"
          style={{
            filter: 'contrast(1.4) brightness(1.1) saturate(1.2)',
          }}
        />
      </div>
      {/* Red blood overlay flashes */}
      <div className="absolute inset-0 bg-red-900/30 mix-blend-multiply animate-pulse" />
      <style jsx>{`
        .scare-shake {
          animation: scareShake 0.08s infinite;
        }
        @keyframes scareShake {
          0% { transform: translate(0, 0) scale(1.08); }
          25% { transform: translate(-8px, 5px) scale(1.12); }
          50% { transform: translate(6px, -6px) scale(1.1); }
          75% { transform: translate(-5px, -4px) scale(1.13); }
          100% { transform: translate(4px, 7px) scale(1.09); }
        }
      `}</style>
    </div>
  )
}
