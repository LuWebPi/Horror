// Procedural horror audio engine using Web Audio API.
// Generates CONTINUOUS evolving ambient music (chord progression), heartbeat,
// footsteps, jump-scare stingers, plus many SFX (door creak, floorboard,
// breathing, granny growl/footstep, cupboard, glass, drip, wind).
// Plays TTS voice files from /audio/*.mp3 via HTMLAudioElement.
// Must be initialised after a user gesture (the Start button).

export class AudioEngine {
  ctx: AudioContext | null = null
  master: GainNode | null = null
  musicGain: GainNode | null = null
  sfxGain: GainNode | null = null

  // Music: pad chord oscillators + sub bass + arpeggio
  private padOscs: OscillatorNode[] = []
  private padGain: GainNode | null = null
  private padFilter: BiquadFilterNode | null = null
  private subOsc: OscillatorNode | null = null
  private subGain: GainNode | null = null
  private arpeggioTimer: ReturnType<typeof setInterval> | null = null
  private musicLfo: OscillatorNode | null = null
  private musicLfoGain: GainNode | null = null
  private chordIndex = 0
  // Dark minor progression (Hz): Am - F - C - G  (low octaves)
  private chords: number[][] = [
    [110, 164.81, 220, 261.63],   // Am: A2, E3, A3, C4
    [87.31, 130.81, 174.61, 261.63], // F: F2, C3, F3, C4
    [130.81, 196, 261.63, 329.63],   // C: C3, G3, C4, E4
    [98, 146.83, 196, 246.94],       // G: G2, D3, G3, B3
  ]

  // Ambient drone (carries under the music)
  private droneGain: GainNode | null = null
  private droneOscs: OscillatorNode[] = []
  private droneFilter: BiquadFilterNode | null = null
  private noiseSource: AudioBufferSourceNode | null = null
  private noiseGain: GainNode | null = null
  private lfo: OscillatorNode | null = null
  private lfoGain: GainNode | null = null

  // Heartbeat
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null
  private heartbeatRate = 1400

  // Footsteps (player)
  private footstepTimer: ReturnType<typeof setInterval> | null = null

  // Granny footsteps
  private grannyStepTimer: ReturnType<typeof setInterval> | null = null
  private grannyStepRate = 700

  // Ambient drips/wind scheduler
  private ambientTimer: ReturnType<typeof setInterval> | null = null

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
      // separate buses
      this.musicGain = this.ctx.createGain()
      this.musicGain.gain.value = 0.5
      this.musicGain.connect(this.master)
      this.sfxGain = this.ctx.createGain()
      this.sfxGain.gain.value = 0.9
      this.sfxGain.connect(this.master)
      this.started = true
      this.startMusic()
      this.startAmbient()
      this.startAmbientScheduler()
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
    if (!this.ctx || !this.droneGain || !this.noiseGain || !this.droneFilter || !this.musicGain) return
    const now = this.ctx.currentTime
    // drone grows with tension
    this.droneGain.gain.setTargetAtTime(0.05 + this.tension * 0.1, now, 0.3)
    this.noiseGain.gain.setTargetAtTime(0.012 + this.tension * 0.04, now, 0.3)
    this.droneFilter.frequency.setTargetAtTime(320 - this.tension * 180, now, 0.3)
    // music gets quieter/tenser as she nears (drowned out by heartbeat)
    this.musicGain.gain.setTargetAtTime(0.5 - this.tension * 0.25, now, 0.5)
    // heartbeat faster
    this.heartbeatRate = 1400 - this.tension * 950
    // granny steps faster when chasing
    this.grannyStepRate = 760 - this.tension * 450
  }

  private makeNoiseBuffer(): AudioBuffer {
    const ctx = this.ctx!
    const len = ctx.sampleRate * 2
    const buf = ctx.createBuffer(1, len, ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
    return buf
  }

  // ===== CONTINUOUS MUSIC =====
  private startMusic() {
    if (!this.ctx || !this.musicGain) return
    const ctx = this.ctx

    // Pad: 4 detuned sawtooths through a slowly-swept lowpass
    this.padGain = ctx.createGain()
    this.padGain.gain.value = 0.18
    this.padFilter = ctx.createBiquadFilter()
    this.padFilter.type = 'lowpass'
    this.padFilter.frequency.value = 900
    this.padFilter.Q.value = 3
    this.padGain.connect(this.padFilter)
    this.padFilter.connect(this.musicGain)

    const chord = this.chords[0]
    for (let i = 0; i < chord.length; i++) {
      const osc = ctx.createOscillator()
      osc.type = i === 0 ? 'sawtooth' : 'triangle'
      osc.frequency.value = chord[i]
      osc.detune.value = (i - 1.5) * 6 // slight detune for width
      osc.connect(this.padGain)
      osc.start()
      this.padOscs.push(osc)
    }

    // Slow filter sweep LFO (breathing pad)
    this.musicLfo = ctx.createOscillator()
    this.musicLfo.frequency.value = 0.07
    this.musicLfoGain = ctx.createGain()
    this.musicLfoGain.gain.value = 400
    this.musicLfo.connect(this.musicLfoGain)
    this.musicLfoGain.connect(this.padFilter.frequency)
    this.musicLfo.start()

    // Sub bass drone on root
    this.subOsc = ctx.createOscillator()
    this.subOsc.type = 'sine'
    this.subOsc.frequency.value = chord[0] / 2
    this.subGain = ctx.createGain()
    this.subGain.gain.value = 0.12
    this.subOsc.connect(this.subGain)
    this.subGain.connect(this.musicGain)
    this.subOsc.start()

    // Arpeggio: a quiet bell every ~2.5s cycling chord tones
    this.arpeggioTimer = setInterval(() => this.playArpNote(), 2500)

    // Change chord every 14 seconds
    setInterval(() => this.changeChord(), 14000)
  }

  private changeChord() {
    if (!this.ctx) return
    this.chordIndex = (this.chordIndex + 1) % this.chords.length
    const chord = this.chords[this.chordIndex]
    const now = this.ctx.currentTime
    this.padOscs.forEach((osc, i) => {
      if (chord[i]) osc.frequency.setTargetAtTime(chord[i], now, 1.2)
    })
    if (this.subOsc && chord[0]) {
      this.subOsc.frequency.setTargetAtTime(chord[0] / 2, now, 1.0)
    }
  }

  private playArpNote() {
    if (!this.ctx || !this.musicGain) return
    const chord = this.chords[this.chordIndex]
    const freq = chord[Math.floor(Math.random() * chord.length)] * 2
    const ctx = this.ctx
    const t = ctx.currentTime
    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.value = freq
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(0.05, t + 0.02)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.8)
    osc.connect(g)
    g.connect(this.musicGain)
    osc.start(t)
    osc.stop(t + 2.0)
  }

  // ===== AMBIENT BED (drone + wind) =====
  private startAmbient() {
    if (!this.ctx || !this.sfxGain) return
    const ctx = this.ctx

    this.droneGain = ctx.createGain()
    this.droneGain.gain.value = 0.05
    this.droneFilter = ctx.createBiquadFilter()
    this.droneFilter.type = 'lowpass'
    this.droneFilter.frequency.value = 320
    this.droneFilter.Q.value = 5
    this.droneGain.connect(this.droneFilter)
    this.droneFilter.connect(this.master!)

    const freqs = [55, 55.4, 82.5]
    for (const f of freqs) {
      const osc = ctx.createOscillator()
      osc.type = 'sawtooth'
      osc.frequency.value = f
      osc.connect(this.droneGain)
      osc.start()
      this.droneOscs.push(osc)
    }

    this.noiseSource = ctx.createBufferSource()
    this.noiseSource.buffer = this.makeNoiseBuffer()
    this.noiseSource.loop = true
    const noiseFilter = ctx.createBiquadFilter()
    noiseFilter.type = 'bandpass'
    noiseFilter.frequency.value = 600
    noiseFilter.Q.value = 0.7
    this.noiseGain = ctx.createGain()
    this.noiseGain.gain.value = 0.015
    this.noiseSource.connect(noiseFilter)
    noiseFilter.connect(this.noiseGain)
    this.noiseGain.connect(this.master!)
    this.noiseSource.start()

    this.lfo = ctx.createOscillator()
    this.lfo.frequency.value = 0.1
    this.lfoGain = ctx.createGain()
    this.lfoGain.gain.value = 80
    this.lfo.connect(this.lfoGain)
    this.lfoGain.connect(this.droneFilter.frequency)
    this.lfo.start()
  }

  // ===== HEARTBEAT =====
  startHeartbeat() {
    if (this.heartbeatTimer) return
    const beat = () => {
      this.thump(0)
      setTimeout(() => this.thump(0.6), 180)
    }
    beat()
    const schedule = () => {
      beat()
      this.heartbeatTimer = setInterval(schedule, this.heartbeatRate)
    }
    this.heartbeatTimer = setInterval(schedule, this.heartbeatRate)
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
    const vol = 0.4 + this.tension * 0.5
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(vol, t + 0.02)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25)
    osc.connect(g)
    g.connect(this.master)
    osc.start(t)
    osc.stop(t + 0.3)
  }

  // ===== PLAYER FOOTSTEPS =====
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
    if (!this.ctx || !this.sfxGain) return
    const ctx = this.ctx
    const t = ctx.currentTime
    const src = ctx.createBufferSource()
    src.buffer = this.makeNoiseBuffer()
    const filt = ctx.createBiquadFilter()
    filt.type = 'lowpass'
    filt.frequency.value = 350 + Math.random() * 150
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(0.1, t + 0.01)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.13)
    src.connect(filt)
    filt.connect(g)
    g.connect(this.sfxGain)
    src.start(t)
    src.stop(t + 0.15)
  }

  // ===== GRANNY FOOTSTEPS (heavier, slower, distinct) =====
  startGrannySteps() {
    if (this.grannyStepTimer) return
    const loop = () => {
      this.grannyStep()
      this.grannyStepTimer = setInterval(loop, this.grannyStepRate)
    }
    this.grannyStepTimer = setInterval(loop, this.grannyStepRate)
  }
  stopGrannySteps() {
    if (this.grannyStepTimer) {
      clearInterval(this.grannyStepTimer)
      this.grannyStepTimer = null
    }
  }
  private grannyStep() {
    if (!this.ctx || !this.sfxGain) return
    const ctx = this.ctx
    const t = ctx.currentTime
    // low thud + shuffle
    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(90, t)
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.12)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(0.14, t + 0.02)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2)
    osc.connect(g)
    g.connect(this.sfxGain)
    osc.start(t)
    osc.stop(t + 0.25)
    // shuffle noise
    const src = ctx.createBufferSource()
    src.buffer = this.makeNoiseBuffer()
    const filt = ctx.createBiquadFilter()
    filt.type = 'lowpass'
    filt.frequency.value = 250
    const g2 = ctx.createGain()
    g2.gain.setValueAtTime(0.0001, t)
    g2.gain.exponentialRampToValueAtTime(0.05, t + 0.03)
    g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.18)
    src.connect(filt)
    filt.connect(g2)
    g2.connect(this.sfxGain)
    src.start(t)
    src.stop(t + 0.2)
  }

  // ===== JUMP SCARE STINGER =====
  playJumpScareStinger() {
    if (!this.ctx || !this.master) return
    const ctx = this.ctx
    const t = ctx.currentTime

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

  // ===== VOICE (TTS files) =====
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
      '/audio/whisper1.mp3', '/audio/whisper2.mp3', '/audio/whisper3.mp3',
      '/audio/whisper4.mp3', '/audio/whisper5.mp3', '/audio/whisper6.mp3',
    ]
    this.playVoice(ws[Math.floor(Math.random() * ws.length)], 0.7)
  }

  // ===== KEY / DOOR / FLICKER =====
  playKeyPickup() {
    if (!this.ctx || !this.sfxGain) return
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
      g.connect(this.sfxGain)
      osc.start(start)
      osc.stop(start + 0.55)
    })
  }
  playDoorUnlock() {
    if (!this.ctx || !this.sfxGain) return
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
    g.connect(this.sfxGain)
    osc.start(t)
    osc.stop(t + 0.7)
  }
  playFlicker() {
    if (!this.ctx || !this.sfxGain) return
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
    g.connect(this.sfxGain)
    src.start(t)
    src.stop(t + 0.1)
  }

  // ===== NEW GRANNY-STYLE SFX =====

  // Wooden door creak (slow filtered noise sweep)
  playDoorCreak() {
    if (!this.ctx || !this.sfxGain) return
    const ctx = this.ctx
    const t = ctx.currentTime
    const src = ctx.createBufferSource()
    src.buffer = this.makeNoiseBuffer()
    const filt = ctx.createBiquadFilter()
    filt.type = 'bandpass'
    filt.frequency.setValueAtTime(180, t)
    filt.frequency.linearRampToValueAtTime(420, t + 0.8)
    filt.Q.value = 6
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(0.12, t + 0.08)
    g.gain.linearRampToValueAtTime(0.1, t + 0.6)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9)
    src.connect(filt)
    filt.connect(g)
    g.connect(this.sfxGain)
    src.start(t)
    src.stop(t + 1.0)
  }

  // Floorboard creak (short)
  playFloorCreak() {
    if (!this.ctx || !this.sfxGain) return
    const ctx = this.ctx
    const t = ctx.currentTime
    const src = ctx.createBufferSource()
    src.buffer = this.makeNoiseBuffer()
    const filt = ctx.createBiquadFilter()
    filt.type = 'bandpass'
    filt.frequency.setValueAtTime(900, t)
    filt.frequency.linearRampToValueAtTime(1300, t + 0.2)
    filt.Q.value = 9
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(0.16, t + 0.02)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28)
    src.connect(filt)
    filt.connect(g)
    g.connect(this.sfxGain)
    src.start(t)
    src.stop(t + 0.3)
  }

  // Nervous breathing (in/out)
  playBreath() {
    if (!this.ctx || !this.sfxGain) return
    const ctx = this.ctx
    const t = ctx.currentTime
    const src = ctx.createBufferSource()
    src.buffer = this.makeNoiseBuffer()
    const filt = ctx.createBiquadFilter()
    filt.type = 'bandpass'
    filt.frequency.value = 700
    filt.Q.value = 1.2
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(0.08, t + 0.12)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4)
    src.connect(filt)
    filt.connect(g)
    g.connect(this.sfxGain)
    src.start(t)
    src.stop(t + 0.45)
  }

  // Granny growl / grunt (low + noisy)
  playGrannyGrowl() {
    if (!this.ctx || !this.sfxGain) return
    const ctx = this.ctx
    const t = ctx.currentTime
    const osc = ctx.createOscillator()
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(70, t)
    osc.frequency.linearRampToValueAtTime(95, t + 0.5)
    const filt = ctx.createBiquadFilter()
    filt.type = 'lowpass'
    filt.frequency.value = 400
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(0.2, t + 0.08)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.7)
    osc.connect(filt)
    filt.connect(g)
    g.connect(this.sfxGain)
    osc.start(t)
    osc.stop(t + 0.75)
    // noise growl layer
    const src = ctx.createBufferSource()
    src.buffer = this.makeNoiseBuffer()
    const nf = ctx.createBiquadFilter()
    nf.type = 'bandpass'
    nf.frequency.value = 300
    nf.Q.value = 2
    const ng = ctx.createGain()
    ng.gain.setValueAtTime(0.0001, t)
    ng.gain.exponentialRampToValueAtTime(0.1, t + 0.1)
    ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.6)
    src.connect(nf)
    nf.connect(ng)
    ng.connect(this.sfxGain)
    src.start(t)
    src.stop(t + 0.65)
  }

  // Cupboard open/close (two thuds)
  playCupboard() {
    if (!this.ctx || !this.sfxGain) return
    const ctx = this.ctx
    const t = ctx.currentTime
    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(140, t)
    osc.frequency.exponentialRampToValueAtTime(60, t + 0.12)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(0.22, t + 0.01)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18)
    osc.connect(g)
    g.connect(this.sfxGain)
    osc.start(t)
    osc.stop(t + 0.2)
    // second softer thud
    const t2 = t + 0.18
    const osc2 = ctx.createOscillator()
    osc2.type = 'sine'
    osc2.frequency.setValueAtTime(110, t2)
    osc2.frequency.exponentialRampToValueAtTime(50, t2 + 0.1)
    const g2 = ctx.createGain()
    g2.gain.setValueAtTime(0.0001, t2)
    g2.gain.exponentialRampToValueAtTime(0.14, t2 + 0.01)
    g2.gain.exponentialRampToValueAtTime(0.0001, t2 + 0.15)
    osc2.connect(g2)
    g2.connect(this.sfxGain)
    osc2.start(t2)
    osc2.stop(t2 + 0.17)
  }

  // Glass break (noise burst + high tinks)
  playGlassBreak() {
    if (!this.ctx || !this.sfxGain) return
    const ctx = this.ctx
    const t = ctx.currentTime
    const src = ctx.createBufferSource()
    src.buffer = this.makeNoiseBuffer()
    const filt = ctx.createBiquadFilter()
    filt.type = 'highpass'
    filt.frequency.value = 2000
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(0.3, t + 0.005)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4)
    src.connect(filt)
    filt.connect(g)
    g.connect(this.sfxGain)
    src.start(t)
    src.stop(t + 0.45)
    // a few glass tinks
    for (let i = 0; i < 4; i++) {
      const tt = t + 0.05 + Math.random() * 0.3
      const osc = ctx.createOscillator()
      osc.type = 'sine'
      osc.frequency.value = 2500 + Math.random() * 3000
      const gg = ctx.createGain()
      gg.gain.setValueAtTime(0.0001, tt)
      gg.gain.exponentialRampToValueAtTime(0.08, tt + 0.005)
      gg.gain.exponentialRampToValueAtTime(0.0001, tt + 0.12)
      osc.connect(gg)
      gg.connect(this.sfxGain)
      osc.start(tt)
      osc.stop(tt + 0.13)
    }
  }

  // Water drip (sine ping)
  playDrip() {
    if (!this.ctx || !this.sfxGain) return
    const ctx = this.ctx
    const t = ctx.currentTime
    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(1200, t)
    osc.frequency.exponentialRampToValueAtTime(600, t + 0.1)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(0.1, t + 0.005)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2)
    osc.connect(g)
    g.connect(this.sfxGain)
    osc.start(t)
    osc.stop(t + 0.22)
  }

  // Wind howl (slow filtered noise swell)
  playWindHowl() {
    if (!this.ctx || !this.sfxGain) return
    const ctx = this.ctx
    const t = ctx.currentTime
    const src = ctx.createBufferSource()
    src.buffer = this.makeNoiseBuffer()
    const filt = ctx.createBiquadFilter()
    filt.type = 'bandpass'
    filt.frequency.setValueAtTime(300, t)
    filt.frequency.linearRampToValueAtTime(700, t + 2.0)
    filt.frequency.linearRampToValueAtTime(350, t + 4.0)
    filt.Q.value = 1.5
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.linearRampToValueAtTime(0.08, t + 1.5)
    g.gain.linearRampToValueAtTime(0.0001, t + 4.0)
    src.connect(filt)
    filt.connect(g)
    g.connect(this.sfxGain)
    src.start(t)
    src.stop(t + 4.1)
  }

  // Tension sting (when she spots you)
  playTensionSting() {
    if (!this.ctx || !this.sfxGain) return
    const ctx = this.ctx
    const t = ctx.currentTime
    const osc = ctx.createOscillator()
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(220, t)
    osc.frequency.exponentialRampToValueAtTime(440, t + 0.3)
    const filt = ctx.createBiquadFilter()
    filt.type = 'lowpass'
    filt.frequency.value = 1200
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(0.18, t + 0.02)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6)
    osc.connect(filt)
    filt.connect(g)
    g.connect(this.sfxGain)
    osc.start(t)
    osc.stop(t + 0.65)
  }

  // ===== AMBIENT SCHEDULER (random drips/wind/breaths) =====
  private startAmbientScheduler() {
    this.ambientTimer = setInterval(() => {
      if (!this.started) return
      const r = Math.random()
      if (r < 0.3) this.playDrip()
      else if (r < 0.5) this.playWindHowl()
      else if (r < 0.6) this.playBreath()
    }, 6000)
  }

  stopAll() {
    this.stopFootsteps()
    this.stopGrannySteps()
    if (this.heartbeatTimer) { clearInterval(this.heartbeatTimer); this.heartbeatTimer = null }
    if (this.ambientTimer) { clearInterval(this.ambientTimer); this.ambientTimer = null }
    if (this.arpeggioTimer) { clearInterval(this.arpeggioTimer); this.arpeggioTimer = null }
    this.padOscs.forEach((o) => { try { o.stop() } catch { /* noop */ } })
    this.padOscs = []
    this.droneOscs.forEach((o) => { try { o.stop() } catch { /* noop */ } })
    this.droneOscs = []
    try { this.noiseSource?.stop() } catch { /* noop */ }
    try { this.subOsc?.stop() } catch { /* noop */ }
    try { this.lfo?.stop() } catch { /* noop */ }
    try { this.musicLfo?.stop() } catch { /* noop */ }
    this.voices.forEach((v) => { v.pause(); v.currentTime = 0 })
  }
}

// Singleton
let engine: AudioEngine | null = null
export function getAudio(): AudioEngine {
  if (!engine) engine = new AudioEngine()
  return engine
}
