'use client'

import { Component, ReactNode } from 'react'

interface State {
  hasError: boolean
  error: Error | null
}

export class GameErrorBoundary extends Component<{ children: ReactNode }, State> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: unknown) {
    console.error('[GameErrorBoundary]', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black p-6">
          <div className="max-w-lg w-full p-6 rounded-lg border border-rose-900/50 bg-rose-950/20">
            <h2 className="text-rose-400 text-xl font-bold mb-3">Render Error</h2>
            <p className="text-white/70 text-sm mb-4">
              The 3D engine hit an error. Your browser may not support all features.
            </p>
            <pre className="text-xs text-rose-300/80 bg-black/50 p-3 rounded overflow-auto max-h-48 mb-4">
              {this.state.error?.message || 'Unknown error'}
              {'\n'}
              {this.state.error?.stack?.slice(0, 600)}
            </pre>
            <button
              className="px-4 py-2 rounded bg-rose-800 hover:bg-rose-700 text-white text-sm"
              onClick={() => this.setState({ hasError: false, error: null })}
            >
              Retry
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
