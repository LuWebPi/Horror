'use client'

import dynamic from 'next/dynamic'

// Load the game client-side only (uses WebGL + Web Audio)
const HorrorGame = dynamic(() => import('@/components/game/HorrorGame').then(m => m.HorrorGame), {
  ssr: false,
  loading: () => (
    <div className="w-screen h-screen flex items-center justify-center bg-black">
      <div className="text-rose-600/70 tracking-[0.4em] text-sm animate-pulse">LOADING THE DARKNESS...</div>
    </div>
  ),
})

export default function Home() {
  return <HorrorGame />
}
