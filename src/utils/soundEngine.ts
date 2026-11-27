/**
 * 100% Offline Functional Soundscapes Synthesizer (Web Audio API)
 * Zero external audio files — generated smoothly in real-time.
 */

export type SoundPresetId =
  | 'stop_overthinking'
  | 'ocean_waves'
  | 'night_rain'
  | 'deep_focus'
  | 'tibetan_bowl'
  | 'calm_heartbeat';

export interface SoundPresetInfo {
  id: SoundPresetId;
  name: string;
  functionTag: string;
  description: string;
  recommendedVisual: 'waves' | 'mandala' | 'rain' | 'aurora';
  bestFor: string;
}

export const SOUND_PRESETS: SoundPresetInfo[] = [
  {
    id: 'stop_overthinking',
    name: 'موجات إيقاف التفكير المفرط',
    functionTag: 'ضوضاء بنية دافئة + نبض ثيتا 6Hz',
    description:
      'تمتص الضجيج الذهني وتهدّئ تسارع الأفكار المتكررة عبر ترددات منخفضة دافئة مع إيقاع ثيتا خفيف يساعد الدماغ على التوقف عن الدوران.',
    recommendedVisual: 'aurora',
    bestFor: 'عندما لا يتوقف عقلك عن التفكير والتحليل ليلاً أو بعد خلاف',
  },
  {
    id: 'ocean_waves',
    name: 'أمواج البحر الإيقاعية',
    functionTag: 'تنظيم التنفس وتهدئة الأعصاب',
    description:
      'مدّ وجزر بطيء بمعدل طبيعي (موجة كل 8 ثوانٍ تقريباً) يزامن شهيقك وزفيرك تلقائياً ويخفض توتر الجسد.',
    recommendedVisual: 'waves',
    bestFor: 'قبل حوار مهم أو عند الرغبة في تنفس عميق وهادئ',
  },
  {
    id: 'night_rain',
    name: 'مطر ليلي لطيف',
    functionTag: 'تخفيف القلق والتهيئة للنوم',
    description:
      'صوت هطول متوازن لطيف يخفّف التوتر الحسي ويشكّل ستارة صوتية مريحة تمنح إحساساً بالأمان والسكينة.',
    recommendedVisual: 'rain',
    bestFor: 'قبل النوم أو لتهدئة القلق والضغط النفسي',
  },
  {
    id: 'deep_focus',
    name: 'موجات التركيز والصفاء',
    functionTag: 'موجات ألفا 10Hz + نغمة متزنة',
    description:
      'موجة متناغمة صافية (نغمة دافئة مزدوجة بفارق 10 هرتز) تعزز حالة اليقظة الهادئة والتركيز العميق بلا تشتيت.',
    recommendedVisual: 'mandala',
    bestFor: 'أثناء القراءة، الدراسة، التخطيط، أو كتابة مفكرة القرارات',
  },
  {
    id: 'tibetan_bowl',
    name: 'رنين السكون (وعاء تبتي)',
    functionTag: 'تأريض فوري وإعادة ضبط الذهن',
    description:
      'نغمات توافقية عميقة تتصاعد وتتلاشى بلطف كل عدة ثوانٍ لتعيد وعيك إلى اللحظة الحاضرة وتكسر التوتر المفاجئ.',
    recommendedVisual: 'mandala',
    bestFor: 'في جلسات التأمل الرواقي أو بعد موقف مشحون',
  },
  {
    id: 'calm_heartbeat',
    name: 'نبض السكينة (60 نبضة/دقيقة)',
    functionTag: 'إبطاء التوتر الجسدي ونبض الغضب',
    description:
      'نبض دافئ ومنخفض جداً بإيقاع 60 نبضة في الدقيقة يبعث إشارة فسيولوجية للجهاز العصبي بأنك في أمان تام.',
    recommendedVisual: 'waves',
    bestFor: 'وقت الغضب الشديد أو تسارع دقات القلب من التوتر',
  },
];

class OfflineSoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private activeNodes: AudioNode[] = [];
  private activeIntervals: number[] = [];
  private currentPreset: SoundPresetId | null = null;
  private volume = 0.55;

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;
    if (!this.ctx) {
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0;
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  private createNoiseBuffer(ctx: AudioContext, type: 'pink' | 'brown', seconds = 4): AudioBuffer {
    const sampleRate = ctx.sampleRate;
    const length = sampleRate * seconds;
    const buffer = ctx.createBuffer(2, length, sampleRate);

    for (let ch = 0; ch < 2; ch++) {
      const data = buffer.getChannelData(ch);
      if (type === 'brown') {
        let lastOut = 0;
        for (let i = 0; i < length; i++) {
          const white = Math.random() * 2 - 1;
          data[i] = (lastOut + 0.02 * white) / 1.02;
          lastOut = data[i];
          data[i] *= 3.2;
        }
      } else {
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        for (let i = 0; i < length; i++) {
          const white = Math.random() * 2 - 1;
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.96900 * b2 + white * 0.1538520;
          b3 = 0.86650 * b3 + white * 0.3104856;
          b4 = 0.55000 * b4 + white * 0.5329522;
          b5 = -0.7616 * b5 - white * 0.0168980;
          data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.045;
          b6 = white * 0.115926;
        }
      }
    }
    return buffer;
  }

  public stop(): void {
    this.activeIntervals.forEach((id) => window.clearInterval(id));
    this.activeIntervals = [];

    if (this.ctx && this.masterGain) {
      const now = this.ctx.currentTime;
      try {
        this.masterGain.gain.cancelScheduledValues(now);
        this.masterGain.gain.setTargetAtTime(0, now, 0.08);
      } catch {
        // ignore
      }
    }

    const nodesToClean = [...this.activeNodes];
    this.activeNodes = [];
    this.currentPreset = null;

    window.setTimeout(() => {
      nodesToClean.forEach((n) => {
        try {
          if ('stop' in n && typeof (n as OscillatorNode).stop === 'function') {
            (n as OscillatorNode).stop();
          }
          n.disconnect();
        } catch {
          // ignore
        }
      });
    }, 180);
  }

  public setVolume(val: number): void {
    this.volume = Math.max(0, Math.min(1, val));
    if (this.ctx && this.masterGain && this.currentPreset) {
      this.masterGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.08);
    }
  }

  public getCurrentPreset(): SoundPresetId | null {
    return this.currentPreset;
  }

  public playChime(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(528, now);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.09 * this.volume, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.4);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 1.45);
  }

  public start(preset: SoundPresetId): boolean {
    this.stop();
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return false;

    const now = ctx.currentTime;
    const out = this.masterGain;
    this.currentPreset = preset;

    if (preset === 'stop_overthinking') {
      // Warm deep brown noise + subtle 6Hz Theta binaural/harmonic hum
      const src = ctx.createBufferSource();
      src.buffer = this.createNoiseBuffer(ctx, 'brown', 5);
      src.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 340;

      const noiseGain = ctx.createGain();
      noiseGain.gain.value = 0.55;

      src.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(out);
      src.start(now);

      // Gentle binaural theta pair (174Hz left, 180Hz right -> 6Hz theta beat)
      const oscL = ctx.createOscillator();
      const oscR = ctx.createOscillator();
      const panL = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
      const panR = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
      const toneGain = ctx.createGain();
      oscL.type = 'sine';
      oscR.type = 'sine';
      oscL.frequency.value = 174;
      oscR.frequency.value = 180;
      toneGain.gain.value = 0.11;

      if (panL && panR) {
        panL.pan.value = -0.8;
        panR.pan.value = 0.8;
        oscL.connect(panL).connect(toneGain);
        oscR.connect(panR).connect(toneGain);
        this.activeNodes.push(panL, panR);
      } else {
        oscL.connect(toneGain);
        oscR.connect(toneGain);
      }
      toneGain.connect(out);
      oscL.start(now);
      oscR.start(now);

      this.activeNodes.push(src, filter, noiseGain, oscL, oscR, toneGain);
    } else if (preset === 'ocean_waves') {
      // Pink noise sculpted by slow 0.12Hz breathing ocean LFO
      const src = ctx.createBufferSource();
      src.buffer = this.createNoiseBuffer(ctx, 'pink', 6);
      src.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 520;
      filter.Q.value = 0.7;

      const waveGain = ctx.createGain();
      waveGain.gain.value = 0.45;

      const lfo = ctx.createOscillator();
      const lfoFilterDepth = ctx.createGain();
      const lfoAmpDepth = ctx.createGain();
      lfo.type = 'sine';
      lfo.frequency.value = 0.12; // ~8.3s wave cycle
      lfoFilterDepth.gain.value = 340;
      lfoAmpDepth.gain.value = 0.28;

      lfo.connect(lfoFilterDepth).connect(filter.frequency);
      lfo.connect(lfoAmpDepth).connect(waveGain.gain);

      src.connect(filter).connect(waveGain).connect(out);
      src.start(now);
      lfo.start(now);

      this.activeNodes.push(src, filter, waveGain, lfo, lfoFilterDepth, lfoAmpDepth);
    } else if (preset === 'night_rain') {
      // Gentle rain band-pass + warm low rumble bed
      const rainSrc = ctx.createBufferSource();
      rainSrc.buffer = this.createNoiseBuffer(ctx, 'pink', 5);
      rainSrc.loop = true;

      const highFilter = ctx.createBiquadFilter();
      highFilter.type = 'bandpass';
      highFilter.frequency.value = 1350;
      highFilter.Q.value = 0.55;

      const rainGain = ctx.createGain();
      rainGain.gain.value = 0.55;

      const bedSrc = ctx.createBufferSource();
      bedSrc.buffer = this.createNoiseBuffer(ctx, 'brown', 5);
      bedSrc.loop = true;
      const bedFilter = ctx.createBiquadFilter();
      bedFilter.type = 'lowpass';
      bedFilter.frequency.value = 240;
      const bedGain = ctx.createGain();
      bedGain.gain.value = 0.25;

      rainSrc.connect(highFilter).connect(rainGain).connect(out);
      bedSrc.connect(bedFilter).connect(bedGain).connect(out);

      rainSrc.start(now);
      bedSrc.start(now);
      this.activeNodes.push(rainSrc, highFilter, rainGain, bedSrc, bedFilter, bedGain);
    } else if (preset === 'deep_focus') {
      // Soft Alpha 10Hz binaural + warm harmonic fifth pad
      const oscL = ctx.createOscillator();
      const oscR = ctx.createOscillator();
      const oscPad = ctx.createOscillator();
      const toneGain = ctx.createGain();
      const padGain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 600;

      oscL.type = 'sine';
      oscR.type = 'sine';
      oscPad.type = 'triangle';
      oscL.frequency.value = 216;
      oscR.frequency.value = 226; // 10Hz alpha beat
      oscPad.frequency.value = 324; // warm fifth

      toneGain.gain.value = 0.16;
      padGain.gain.value = 0.05;

      if (ctx.createStereoPanner) {
        const panL = ctx.createStereoPanner();
        const panR = ctx.createStereoPanner();
        panL.pan.value = -0.85;
        panR.pan.value = 0.85;
        oscL.connect(panL).connect(toneGain);
        oscR.connect(panR).connect(toneGain);
        this.activeNodes.push(panL, panR);
      } else {
        oscL.connect(toneGain);
        oscR.connect(toneGain);
      }

      oscPad.connect(filter).connect(padGain).connect(out);
      toneGain.connect(out);

      // Gentle noise air
      const air = ctx.createBufferSource();
      air.buffer = this.createNoiseBuffer(ctx, 'brown', 4);
      air.loop = true;
      const airFilter = ctx.createBiquadFilter();
      airFilter.type = 'lowpass';
      airFilter.frequency.value = 220;
      const airGain = ctx.createGain();
      airGain.gain.value = 0.16;
      air.connect(airFilter).connect(airGain).connect(out);

      oscL.start(now);
      oscR.start(now);
      oscPad.start(now);
      air.start(now);

      this.activeNodes.push(oscL, oscR, oscPad, toneGain, padGain, filter, air, airFilter, airGain);
    } else if (preset === 'tibetan_bowl') {
      const triggerBowl = () => {
        if (!this.ctx || !this.masterGain || this.currentPreset !== 'tibetan_bowl') return;
        const t = this.ctx.currentTime;
        const freqs = [196, 392.8, 588.5, 882];
        const gains = [0.22, 0.11, 0.05, 0.02];
        freqs.forEach((f, idx) => {
          const osc = this.ctx!.createOscillator();
          const g = this.ctx!.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(f, t);
          g.gain.setValueAtTime(0.0001, t);
          g.gain.exponentialRampToValueAtTime(gains[idx], t + 0.12);
          g.gain.exponentialRampToValueAtTime(0.0001, t + 6.2);
          osc.connect(g).connect(this.masterGain!);
          osc.start(t);
          osc.stop(t + 6.4);
        });
      };
      triggerBowl();
      const iv = window.setInterval(triggerBowl, 6500);
      this.activeIntervals.push(iv);
    } else if (preset === 'calm_heartbeat') {
      // Soft warm 60bpm lub-dub calm pulse
      const triggerBeat = () => {
        if (!this.ctx || !this.masterGain || this.currentPreset !== 'calm_heartbeat') return;
        const t = this.ctx.currentTime;
        const makeThump = (offset: number, peak: number, freq: number) => {
          const osc = this.ctx!.createOscillator();
          const g = this.ctx!.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, t + offset);
          osc.frequency.exponentialRampToValueAtTime(38, t + offset + 0.14);
          g.gain.setValueAtTime(0.0001, t + offset);
          g.gain.exponentialRampToValueAtTime(peak, t + offset + 0.025);
          g.gain.exponentialRampToValueAtTime(0.0001, t + offset + 0.22);
          osc.connect(g).connect(this.masterGain!);
          osc.start(t + offset);
          osc.stop(t + offset + 0.25);
        };
        makeThump(0, 0.42, 72);
        makeThump(0.26, 0.26, 62);
      };
      triggerBeat();
      const iv = window.setInterval(triggerBeat, 1000);
      this.activeIntervals.push(iv);
    }

    // Smooth fade-in
    out.gain.cancelScheduledValues(now);
    out.gain.setValueAtTime(0.001, now);
    out.gain.setTargetAtTime(this.volume, now, 0.35);
    return true;
  }
}

export const soundEngine = new OfflineSoundEngine();
