import React, { useEffect, useRef, useState } from 'react';
import { SOUND_PRESETS, SoundPresetId, soundEngine } from '../utils/soundEngine';
import { ClockIcon, PauseIcon, PlayIcon, SparklesIcon, VolumeIcon } from './Icons';

type VisualMode = 'waves' | 'mandala' | 'rain' | 'aurora';

const VISUAL_MODES: { id: VisualMode; label: string }[] = [
  { id: 'waves', label: 'أمواج البحر' },
  { id: 'aurora', label: 'شفق التفكير الهادئ' },
  { id: 'mandala', label: 'ماندالا التنفس' },
  { id: 'rain', label: 'مطر الليل الهادئ' },
];

const TIMER_OPTIONS = [
  { min: 0, label: 'مستمر' },
  { min: 5, label: '5 د' },
  { min: 10, label: '10 د' },
  { min: 15, label: '15 د' },
  { min: 30, label: '30 د' },
];

interface SoundVisualStudioProps {
  recommendedSoundId?: string;
  recommendedSoundReason?: string;
}

export const SoundVisualStudio: React.FC<SoundVisualStudioProps> = ({
  recommendedSoundId,
  recommendedSoundReason,
}) => {
  const [selectedPreset, setSelectedPreset] = useState<SoundPresetId>(() => {
    const match = SOUND_PRESETS.find((p) => p.id === recommendedSoundId);
    return match ? match.id : 'stop_overthinking';
  });
  const [isPlaying, setIsPlaying] = useState<boolean>(() => soundEngine.getCurrentPreset() !== null);
  const [visualMode, setVisualMode] = useState<VisualMode>(() => {
    const match = SOUND_PRESETS.find((p) => p.id === recommendedSoundId);
    return match ? match.recommendedVisual : 'aurora';
  });
  const [volume, setVolume] = useState<number>(0.6);
  const [timerMin, setTimerMin] = useState<number>(10);
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);
  const [zenMode, setZenMode] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const activePresetInfo =
    SOUND_PRESETS.find((p) => p.id === selectedPreset) || SOUND_PRESETS[0];

  useEffect(() => {
    const running = soundEngine.getCurrentPreset();
    if (running) {
      setSelectedPreset(running);
      setIsPlaying(true);
    }
    return () => {
      // Cleanly stop audio when leaving the studio
      soundEngine.stop();
    };
  }, []);

  // Countdown auto-stop timer
  useEffect(() => {
    if (!isPlaying || timerMin === 0) {
      setSecondsRemaining(null);
      return;
    }
    setSecondsRemaining(timerMin * 60);
    const iv = window.setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          soundEngine.playChime();
          soundEngine.stop();
          setIsPlaying(false);
          window.clearInterval(iv);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(iv);
  }, [isPlaying, timerMin, selectedPreset]);

  // Synchronized offline Canvas visuals
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let rafId = 0;
    let startTime = performance.now();

    const drops = Array.from({ length: 70 }, () => ({
      x: Math.random(),
      y: Math.random(),
      len: 8 + Math.random() * 14,
      speed: 0.25 + Math.random() * 0.45,
      alpha: 0.12 + Math.random() * 0.3,
    }));

    const render = (now: number) => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      const w = Math.max(260, Math.floor(rect.width));
      const h = Math.max(180, Math.floor(rect.height));
      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const elapsed = prefersReduced ? 0 : (now - startTime) / 1000;
      const speedMult = isPlaying ? 1 : 0.28;
      const t = elapsed * speedMult;

      // Deep luxury dark base
      const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
      bgGrad.addColorStop(0, '#0B0E16');
      bgGrad.addColorStop(1, '#141925');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      if (visualMode === 'waves') {
        // Rhythmic breathing ocean waves (~8s cycle)
        const breath = Math.sin(t * 0.78);
        for (let layer = 0; layer < 4; layer++) {
          ctx.beginPath();
          const baseY = h * (0.48 + layer * 0.12) + breath * (6 - layer);
          ctx.moveTo(0, h);
          for (let x = 0; x <= w; x += 6) {
            const wave1 = Math.sin(x * 0.012 + t * (0.7 + layer * 0.18) + layer) * (14 - layer * 2);
            const wave2 = Math.cos(x * 0.025 - t * 0.45 + layer * 2) * 5;
            ctx.lineTo(x, baseY + wave1 + wave2);
          }
          ctx.lineTo(w, h);
          ctx.closePath();
          const alpha = 0.09 + layer * 0.055;
          ctx.fillStyle =
            layer % 2 === 0
              ? `rgba(212, 163, 115, ${alpha})`
              : `rgba(116, 168, 196, ${alpha * 0.9})`;
          ctx.fill();
        }
      } else if (visualMode === 'mandala') {
        // Expanding/contracting golden breathing mandala
        const cx = w / 2;
        const cy = h / 2;
        const baseR = Math.min(w, h) * 0.28;
        const pulse = 0.82 + 0.22 * Math.sin(t * 0.78);

        for (let ring = 0; ring < 4; ring++) {
          const r = baseR * pulse * (0.45 + ring * 0.26);
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(212, 163, 115, ${0.42 - ring * 0.08})`;
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }

        const petals = 12;
        for (let i = 0; i < petals; i++) {
          const angle = (i / petals) * Math.PI * 2 + t * 0.18;
          const px = cx + Math.cos(angle) * baseR * 0.65 * pulse;
          const py = cy + Math.sin(angle) * baseR * 0.65 * pulse;
          ctx.beginPath();
          ctx.arc(px, py, baseR * 0.24 * pulse, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(212, 163, 115, 0.22)';
          ctx.lineWidth = 1.1;
          ctx.stroke();
        }

        const coreGrad = ctx.createRadialGradient(cx, cy, 4, cx, cy, baseR * pulse);
        coreGrad.addColorStop(0, 'rgba(212, 163, 115, 0.32)');
        coreGrad.addColorStop(1, 'rgba(212, 163, 115, 0)');
        ctx.fillStyle = coreGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, baseR * pulse, 0, Math.PI * 2);
        ctx.fill();
      } else if (visualMode === 'rain') {
        // Gentle night rain + subtle water ripples
        ctx.strokeStyle = 'rgba(186, 212, 232, 0.25)';
        ctx.lineWidth = 1.2;
        for (const d of drops) {
          const dy = ((d.y + t * d.speed) % 1.15) - 0.1;
          const dx = d.x * w - dy * 18;
          const py = dy * h;
          ctx.beginPath();
          ctx.strokeStyle = `rgba(186, 212, 232, ${d.alpha})`;
          ctx.moveTo(dx, py);
          ctx.lineTo(dx - 3, py + d.len);
          ctx.stroke();
        }
        // Soft surface ripples at bottom
        for (let r = 0; r < 3; r++) {
          const prog = (t * 0.45 + r * 0.33) % 1;
          const rx = w * (0.25 + r * 0.25);
          const ry = h * 0.84;
          ctx.beginPath();
          ctx.ellipse(rx, ry, prog * 55, prog * 12, 0, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(212, 163, 115, ${(1 - prog) * 0.35})`;
          ctx.lineWidth = 1.2;
          ctx.stroke();
        }
      } else {
        // Aurora flow for stopping overthinking
        for (let i = 0; i < 3; i++) {
          const cx = w * (0.28 + i * 0.24) + Math.sin(t * 0.35 + i * 2.1) * 45;
          const cy = h * (0.42 + (i % 2) * 0.18) + Math.cos(t * 0.28 + i) * 28;
          const radius = Math.min(w, h) * (0.52 + 0.08 * Math.sin(t * 0.5 + i));
          const grad = ctx.createRadialGradient(cx, cy, 10, cx, cy, radius);
          if (i === 0) {
            grad.addColorStop(0, 'rgba(212, 163, 115, 0.28)');
          } else if (i === 1) {
            grad.addColorStop(0, 'rgba(94, 152, 184, 0.24)');
          } else {
            grad.addColorStop(0, 'rgba(138, 120, 186, 0.2)');
          }
          grad.addColorStop(1, 'rgba(11, 14, 22, 0)');
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, w, h);
        }
      }

      rafId = requestAnimationFrame(render);
    };

    rafId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafId);
  }, [visualMode, isPlaying]);

  const handleSelectPreset = (id: SoundPresetId) => {
    setSelectedPreset(id);
    const info = SOUND_PRESETS.find((p) => p.id === id);
    if (info) setVisualMode(info.recommendedVisual);
    if (isPlaying) {
      soundEngine.setVolume(volume);
      soundEngine.start(id);
    }
  };

  const handleTogglePlay = () => {
    if (isPlaying) {
      soundEngine.stop();
      setIsPlaying(false);
    } else {
      soundEngine.setVolume(volume);
      soundEngine.start(selectedPreset);
      setIsPlaying(true);
    }
  };

  const handleVolumeChange = (val: number) => {
    setVolume(val);
    soundEngine.setVolume(val);
  };

  const formatRemaining = (secs: number | null) => {
    if (secs === null) return 'مستمر';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className={zenMode ? 'fixed inset-0 z-50 bg-[#07090D] p-4 sm:p-6 overflow-y-auto flex flex-col justify-center' : 'space-y-5'}>
      <div className={zenMode ? 'max-w-2xl w-full mx-auto space-y-5' : 'space-y-5'}>
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-[#F3EFE6] flex items-center gap-2">
              <SparklesIcon className="w-5 h-5 text-[#D4A373]" />
              استوديو الصوتيات والمؤثرات البصرية
            </h3>
            <p className="text-xs text-[#9A9589] mt-1">
              مؤثرات صوتية وبصرية مولّدة محلياً 100% أوفلاين بوظائف نفسية محددة لتهدئة العقل وإيقاف التفكير المفرط.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setZenMode((z) => !z)}
            className="shrink-0 px-3 py-2 rounded-xl bg-[#1A1E2A] border border-white/10 text-xs text-[#D4A373] hover:border-[#D4A373]/40 cursor-pointer"
          >
            {zenMode ? 'خروج من وضع التركيز' : 'وضع تركيز كامل'}
          </button>
        </div>

        {/* Personalized Sound Recommendation Banner */}
        {recommendedSoundId && recommendedSoundReason && (() => {
          const recPreset = SOUND_PRESETS.find((p) => p.id === recommendedSoundId);
          if (!recPreset) return null;
          const isActiveRec = selectedPreset === recPreset.id;
          return (
            <div className="rounded-2xl bg-gradient-to-l from-[#1C2130] to-[#141720] border border-[#D4A853]/35 p-3.5 sm:p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1 min-w-0 flex-1">
                <div className="text-xs font-bold text-[#D4A853] flex items-center gap-1.5">
                  <SparklesIcon className="w-3.5 h-3.5 shrink-0" />
                  <span>المشهد الصوتي المقترح لشخصيتك: {recPreset.name}</span>
                </div>
                <p className="text-xs text-[#D6D2C9] leading-relaxed">
                  {recommendedSoundReason}
                </p>
              </div>
              {!isActiveRec && (
                <button
                  type="button"
                  onClick={() => handleSelectPreset(recPreset.id)}
                  className="min-h-[38px] px-3.5 rounded-xl bg-[#D4A853] hover:bg-[#E2BA6B] text-[#0B0D12] text-xs font-bold shrink-0 cursor-pointer"
                >
                  تفعيل المشهد المقترح
                </button>
              )}
            </div>
          );
        })()}

        {/* Live Visual Canvas Card */}
        <div className="relative rounded-3xl overflow-hidden border border-[#D4A373]/25 bg-[#0B0E16] shadow-2xl">
          <canvas
            ref={canvasRef}
            className={`w-full block ${zenMode ? 'h-72 sm:h-80' : 'h-56 sm:h-64'}`}
          />
          <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 sm:p-5 bg-gradient-to-t from-[#0B0E16]/85 via-transparent to-[#0B0E16]/40">
            <div className="flex items-center justify-between gap-2">
              <span className="px-2.5 py-1 rounded-lg bg-[#0B0E16]/75 border border-[#D4A373]/30 text-[11px] font-semibold text-[#D4A373]">
                {activePresetInfo.functionTag}
              </span>
              {secondsRemaining !== null && isPlaying && (
                <span className="px-2.5 py-1 rounded-lg bg-[#0B0E16]/75 border border-white/15 text-[11px] text-[#F3EFE6] tabular-nums flex items-center gap-1.5">
                  <ClockIcon className="w-3.5 h-3.5 text-[#D4A373]" />
                  {formatRemaining(secondsRemaining)}
                </span>
              )}
            </div>

            <div className="pointer-events-auto flex flex-wrap items-end justify-between gap-3">
              <div>
                <h4 className="text-base sm:text-lg font-bold text-[#F3EFE6]">
                  {activePresetInfo.name}
                </h4>
                <p className="text-xs text-[#B7B2A6] mt-0.5 max-w-md">
                  {activePresetInfo.bestFor}
                </p>
              </div>
              <button
                type="button"
                onClick={handleTogglePlay}
                className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-bold shadow-lg transition active:scale-95 ${
                  isPlaying
                    ? 'bg-[#1D2230] text-[#D4A373] border border-[#D4A373]/50'
                    : 'bg-[#D4A373] text-[#0B0D12]'
                }`}
              >
                {isPlaying ? <PauseIcon className="w-4 h-4" /> : <PlayIcon className="w-4 h-4" />}
                {isPlaying ? 'إيقاف الجلسة' : 'تشغيل الجلسة'}
              </button>
            </div>
          </div>
        </div>

        {/* Controls Bar: Visual Mode, Volume, Timer */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Visual Theme */}
          <div className="p-3.5 rounded-2xl bg-[#141722] border border-white/10 space-y-2">
            <div className="text-[11px] font-semibold text-[#9A9589]">المؤثر البصري المرافق</div>
            <div className="grid grid-cols-2 gap-1.5">
              {VISUAL_MODES.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setVisualMode(v.id)}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition ${
                    visualMode === v.id
                      ? 'bg-[#D4A373]/20 text-[#D4A373] border border-[#D4A373]/40'
                      : 'bg-white/5 text-[#9A9589] border border-transparent hover:text-[#F3EFE6]'
                  }`}
                >
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          {/* Volume */}
          <div className="p-3.5 rounded-2xl bg-[#141722] border border-white/10 flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-[#9A9589] flex items-center gap-1.5">
                <VolumeIcon className="w-3.5 h-3.5 text-[#D4A373]" />
                مستوى الصوت
              </span>
              <span className="text-[#F3EFE6] font-bold tabular-nums">{Math.round(volume * 100)}%</span>
            </div>
            <input
              type="range"
              min={0.05}
              max={1}
              step={0.05}
              value={volume}
              onChange={(e) => handleVolumeChange(Number(e.target.value))}
              className="w-full accent-[#D4A373] cursor-pointer"
              aria-label="مستوى الصوت"
            />
            <div className="text-[10px] text-[#9A9589]">يُنصح بسماعات مريحة وصوت منخفض وهادئ</div>
          </div>

          {/* Timer */}
          <div className="p-3.5 rounded-2xl bg-[#141722] border border-white/10 space-y-2">
            <div className="text-[11px] font-semibold text-[#9A9589] flex items-center gap-1.5">
              <ClockIcon className="w-3.5 h-3.5 text-[#D4A373]" />
              مؤقت الإيقاف التلقائي
            </div>
            <div className="flex flex-wrap gap-1.5">
              {TIMER_OPTIONS.map((t) => (
                <button
                  key={t.min}
                  type="button"
                  onClick={() => setTimerMin(t.min)}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition ${
                    timerMin === t.min
                      ? 'bg-[#D4A373] text-[#0B0D12]'
                      : 'bg-white/5 text-[#9A9589] hover:text-[#F3EFE6]'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 6 Functional Sound Presets Grid */}
        {!zenMode && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {SOUND_PRESETS.map((preset) => {
              const active = preset.id === selectedPreset;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleSelectPreset(preset.id)}
                  className={`text-right p-4 rounded-2xl border transition space-y-2 ${
                    active
                      ? 'bg-[#1A1E2C] border-[#D4A373]/55 shadow-lg'
                      : 'bg-[#141722] border-white/8 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-sm text-[#F3EFE6]">{preset.name}</span>
                    {active && isPlaying && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#D4A373]/20 text-[#D4A373]">
                        قيد التشغيل
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-[#D4A373] font-medium">{preset.functionTag}</div>
                  <p className="text-xs text-[#9A9589] leading-relaxed">{preset.description}</p>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
