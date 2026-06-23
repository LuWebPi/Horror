'use client'

import { useState, useEffect } from 'react'
import { useGameStore } from '@/lib/game-store'
import { getAudio } from '@/lib/audio'
import { GameCanvas } from './GameCanvas'
import { GameErrorBoundary } from './GameErrorBoundary'
import { HUD } from '@/components/horror-ui/HUD'
import { TouchControls } from '@/components/horror-ui/TouchControls'
import { JumpScareOverlay } from '@/components/horror-ui/JumpScareOverlay'
import { MainMenu, GameOverScreen, VictoryScreen } from '@/components/horror-ui/Screens'
import { MousePointerClick } from 'lucide-react'

export function HorrorGame() {
  const phase = useGameStore((s) => s.phase)
  const controlMode = useGameStore((s) => s.controlMode)
  const jumpScare = useGameStore((s) => s.jumpScare)

  // Stop all audio when returning to menu
  useEffect(() => {
    if (phase === 'menu') {
      getAudio().stopAll()
    }
  }, [phase])

  const playing = phase === 'playing'

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black select-none">
      {/* 3D game renders while playing (and briefly during the jump-scare -> gameover transition) */}
      {(playing || jumpScare) && (
        <>
          <GameErrorBoundary>
            <GameCanvas />
          </GameErrorBoundary>
          {playing && <HUD />}
          {playing && controlMode === 'touch' && <TouchControls />}
          <JumpScareOverlay />
          {/* Click-to-look hint for keyboard mode */}
          {playing && controlMode === 'keyboard' && <ClickToLookHint />}
        </>
      )}

      {phase === 'menu' && <MainMenu />}
      {phase === 'gameover' && !jumpScare && <GameOverScreen />}
      {phase === 'victory' && <VictoryScreen />}
    </div>
  )
}

// Subtle hint shown in keyboard mode until the user clicks to lock the pointer
function ClickToLookHint() {
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    if (hidden) return
    const onLockChange = () => {
      if (document.pointerLockElement) setHidden(true)
    }
    document.addEventListener('pointerlockchange', onLockChange)
    const id = setInterval(() => {
      if (document.pointerLockElement) setHidden(true)
    }, 300)
    return () => {
      document.removeEventListener('pointerlockchange', onLockChange)
      clearInterval(id)
    }
  }, [hidden])

  // Hide once the user clicks anywhere
  useEffect(() => {
    const hide = () => setHidden(true)
    window.addEventListener('click', hide, { once: true })
    return () => window.removeEventListener('click', hide)
  }, [])

  if (hidden) return null
  return (
    <div className="absolute inset-x-0 bottom-28 z-30 flex items-center justify-center pointer-events-none">
      <div className="px-5 py-2.5 rounded-md bg-black/60 backdrop-blur border border-white/15 flex items-center gap-2 text-white/80 text-sm animate-pulse">
        <MousePointerClick className="w-4 h-4" />
        Click to look around
      </div>
    </div>
  )
}
