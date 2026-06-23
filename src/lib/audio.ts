// Procedural horror audio engine using Web Audio API.
// Generates ambient drone, heartbeat, jump-scare stingers, footsteps in real time,
// and plays TTS voice files from /audio/*.mp3 via HTMLAudioElement.
// Must be initialised after a user gesture (the Start button).

export class AudioEngine {
  ctx: AudioContext | null = null
  master: GainNode | null = null

  // Ambient drone nodes
  private droneGain: GainNode | null = null
  private droneOscs: OscillatorNode[] = []
  private droneFilter: BiquadFilterNode | null = null
  private noiseSource: AudioBufferSourceNode | null = null
  private noiseGain: GainNode | null = null
  private lfo: OscillatorNode | null = null
  private lfoGain: GainNode | null = null

  // Heartbeat
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null
  private heartbeatRate = 1400 // ms between beats

  // Footsteps
  private footstepTimer: ReturnType<typeof setInterval> | null = null

  private tension = 0
  private volume = 0.8
  private started = false
  private voices: Map<string, HTMLAudioElement> = new Map()

  init() {
    if (this.started) {
      this.ctx?.resume()
      return
    }
    try {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      this.ctx = new Ctx()
      this.master = this.ctx.createGain()
      this.master.gain.value = this.volume
      this.master.connect(this.ctx.destination)
      this.started = true
      this.startAmbient()
    } catch (e) {
      console.warn('AudioContext init failed', e)
    }
  }

  setVolume(v: number) {
    this.volume = v
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.05)
    }
  }

  setTension(t: number) {
    this.tension = Math.max(0, Math.min(1, t))
    if (!this.ctx || !this.droneGain || !this.noiseGain || !this.droneFilter) return
    const now = this.ctx.currentTime
    // drone gets louder + lower as tension rises
    this.droneGain.gain.setTargetAtTime(0.06 + this.tension * 0.12, now, 0.3)
    this.noiseGain.gain.setTargetAtTime(0.015 + this.tension * 0.05, now, 0.3)
    this.droneFilter.frequency.setTargetAtTime(300 - this.tension * 180, now, 0.3)
    // heartbeat faster
    const rate = 1400 - this.tension * 950 // 1400ms -> 450ms
    this.heartbeatRate = rate
  }

  private makeNoiseBuffer(): AudioBuffer {
    const ctx = this.ctx!
    const len = ctx.sampleRate * 2
    const buf = ctx.createBuffer(1, len, ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
    return buf
  }

  private startAmbient() {
    if (!this.ctx || !this.master) return
    const ctx = this.ctx

    // Low drone: two detuned oscillators through a lowpass filter
    this.droneGain = ctx.createGain()
    this.droneGain.gain.value = 0.06
    this.droneFilter = ctx.createBiquadFilter()
    this.droneFilter.type = 'lowpass'
    this.droneFilter.frequency.value = 300
    this.droneFilter.Q.value = 5
    this.droneGain.connect(this.droneFilter)
    this.droneFilter.connect(this.master)

    const freqs = [55, 55.4, 82.5] // A1 + detune + E2 dissonance
    for (const f of freqs) {
      const osc = ctx.createOscillator()
      osc.type = 'sawtooth'
      osc.frequency.value = f
      osc.connect(this.droneGain)
      osc.start()
      this.droneOscs.push(osc)
    }

    // Wind / hiss noise bed
    this.noiseSource = ctx.createBufferSource()
    this.noiseSource.buffer = this.makeNoiseBuffer()
    this.noiseSource.loop = true
    const noiseFilter = ctx.createBiquadFilter()
    noiseFilter.type = 'bandpass'
    noiseFilter.frequency.value = 600
    noiseFilter.Q.value = 0.7
    this.noiseGain = ctx.createGain()
    this.noiseGain.gain.value = 0.02
    this.noiseSource.connect(noiseFilter)
    noiseFilter.connect(this.noiseGain)
    this.noiseGain.connect(this.master)
    this.noiseSource.start()

    // Slow LFO modulating drone filter for a "breathing" effect
    this.lfo = ctx.createOscillator()
    this.lfo.frequency.value = 0.1
    this.lfoGain = ctx.createGain()
    this.lfoGain.gain.value = 80
    this.lfo.connect(this.lfoGain)
    this.lfoGain.connect(this.droneFilter.frequency)
    this.lfo.start()
  }

  // --- Heartbeat ---
  startHeartbeat() {
    if (this.heartbeatTimer) return
    const beat = () => {
      this.thump(0)
      setTimeout(() => this.thump(0.6), 180)
    }
    beat()
    this.heartbeatTimer = setInterval(() => {
      beat()
      // reschedule with current rate
      if (this.heartbeatTimer) {
        clearInterval(this.heartbeatTimer)
        this.heartbeatTimer = setInterval(beat, this.heartbeatRate)
      }
    }, this.heartbeatRate)
  }

  private thump(offset = 0) {
    if (!this.ctx || !this.master) return
    const ctx = this.ctx
    const t = ctx.currentTime
    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(80, t)
    osc.frequency.exponentialRampToValueAtTime(35, t + 0.18)
    const g = ctx.createGain()
    const vol = 0.5 + this.tension * 0.5
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(vol, t + 0.02)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25)
    osc.connect(g)
    g.connect(this.master)
    osc.start(t)
    osc.stop(t + 0.3)
  }

  // --- Footsteps ---
  startFootsteps(intervalMs = 520) {
    this.stopFootsteps()
    this.footstepTimer = setInterval(() => this.footstep(), intervalMs)
  }

  stopFootsteps() {
    if (this.footstepTimer) {
      clearInterval(this.footstepTimer)
      this.footstepTimer = null
    }
  }

  footstep() {
    if (!this.ctx || !this.master) return
    const ctx = this.ctx
    const t = ctx.currentTime
    // short filtered noise burst
    const src = ctx.createBufferSource()
    src.buffer = this.makeNoiseBuffer()
    const filt = ctx.createBiquadFilter()
    filt.type = 'lowpass'
    filt.frequency.value = 350 + Math.random() * 150
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(0.12, t + 0.01)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.13)
    src.connect(filt)
    filt.connect(g)
    g.connect(this.master)
    src.start(t)
    src.stop(t + 0.15)
  }

  // --- Jump scare stinger (loud dissonant screech + noise hit) ---
  playJumpScareStinger() {
    if (!this.ctx || !this.master) return
    const ctx = this.ctx
    const t = ctx.currentTime

    // Dissonant high cluster
    const freqs = [880, 932, 1397, 1480, 1760]
    for (const f of freqs) {
      const osc = ctx.createOscillator()
      osc.type = 'square'
      osc.frequency.setValueAtTime(f * 2, t)
      osc.frequency.exponentialRampToValueAtTime(f, t + 0.4)
      const g = ctx.createGain()
      g.gain.setValueAtTime(0.0001, t)
      g.gain.exponentialRampToValueAtTime(0.18, t + 0.02)
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.2)
      osc.connect(g)
      g.connect(this.master)
      osc.start(t)
      osc.stop(t + 1.3)
    }

    // Noise hit (loud)
    const src = ctx.createBufferSource()
    src.buffer = this.makeNoiseBuffer()
    const filt = ctx.createBiquadFilter()
    filt.type = 'highpass'
    filt.frequency.value = 1200
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(0.5, t + 0.01)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9)
    src.connect(filt)
    filt.connect(g)
    g.connect(this.master)
    src.start(t)
    src.stop(t + 1.0)

    // Low boom
    const boom = ctx.createOscillator()
    boom.type = 'sine'
    boom.frequency.setValueAtTime(120, t)
    boom.frequency.exponentialRampToValueAtTime(30, t + 0.6)
    const bg = ctx.createGain()
    bg.gain.setValueAtTime(0.0001, t)
    bg.gain.exponentialRampToValueAtTime(0.6, t + 0.02)
    bg.gain.exponentialRampToValueAtTime(0.0001, t + 1.0)
    boom.connect(bg)
    bg.connect(this.master)
    boom.start(t)
    boom.stop(t + 1.1)
  }

  // --- TTS voice playback ---
  playVoice(src: string, volume = 1) {
    if (!this.ctx) return
    let el = this.voices.get(src)
    if (!el) {
      el = new Audio(src)
      el.preload = 'auto'
      this.voices.set(src, el)
    }
    el.currentTime = 0
    el.volume = Math.max(0, Math.min(1, volume * this.volume))
    el.play().catch(() => {})
  }

  playRandomWhisper() {
    const ws = [
      '/audio/whisper1.mp3',
      '/audio/whisper2.mp3',
      '/audio/whisper3.mp3',
      '/audio/whisper4.mp3',
      '/audio/whisper5.mp3',
      '/audio/whisper6.mp3',
    ]
    this.playVoice(ws[Math.floor(Math.random() * ws.length)], 0.7)
  }

  // --- Key pickup chime (eerie) ---
  playKeyPickup() {
    if (!this.ctx || !this.master) return
    const ctx = this.ctx
    const t = ctx.currentTime
    const notes = [523.25, 622.25, 783.99]
    notes.forEach((f, i) => {
      const osc = ctx.createOscillator()
      osc.type = 'triangle'
      osc.frequency.value = f
      const g = ctx.createGain()
      const start = t + i * 0.12
      g.gain.setValueAtTime(0.0001, start)
      g.gain.exponentialRampToValueAtTime(0.2, start + 0.02)
      g.gain.exponentialRampToValueAtTime(0.0001, start + 0.5)
      osc.connect(g)
      g.connect(this.master)
      osc.start(start)
      osc.stop(start + 0.55)
    })
  }

  // --- Door unlock ---
  playDoorUnlock() {
    if (!this.ctx || !this.master) return
    const ctx = this.ctx
    const t = ctx.currentTime
    const osc = ctx.createOscillator()
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(110, t)
    osc.frequency.exponentialRampToValueAtTime(220, t + 0.5)
    const filt = ctx.createBiquadFilter()
    filt.type = 'lowpass'
    filt.frequency.value = 800
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(0.25, t + 0.03)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6)
    osc.connect(filt)
    filt.connect(g)
    g.connect(this.master)
    osc.start(t)
    osc.stop(t + 0.7)
  }

  // --- Light flicker zap ---
  playFlicker() {
    if (!this.ctx || !this.master) return
    const ctx = this.ctx
    const t = ctx.currentTime
    const src = ctx.createBufferSource()
    src.buffer = this.makeNoiseBuffer()
    const filt = ctx.createBiquadFilter()
    filt.type = 'bandpass'
    filt.frequency.value = 3000
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(0.06, t + 0.005)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.08)
    src.connect(filt)
    filt.connect(g)
    g.connect(this.master)
    src.start(t)
    src.stop(t + 0.1)
  }

  stopAll() {
    this.stopFootsteps()
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
    this.droneOscs.forEach((o) => {
      try { o.stop() } catch { /* noop */ }
    })
    this.droneOscs = []
    try { this.noiseSource?.stop() } catch { /* noop */ }
    try { this.lfo?.stop() } catch { /* noop */ }
    this.voices.forEach((v) => { v.pause(); v.currentTime = 0 })
  }
}

// Singleton
let engine: AudioEngine | null = null
export function getAudio(): AudioEngine {
  if (!engine) engine = new AudioEngine()
  return engine
}
