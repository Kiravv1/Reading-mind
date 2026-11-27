import React, { useEffect, useRef, useState } from 'react';
import { VOICE_PROMPTS } from '../data/trainerExtras';
import { VoiceEvalEntry } from '../types';
import { formatArabicDate, generateId, getTodayIso } from '../utils/storage';
import { CheckIcon, MicIcon, TrashIcon } from './Icons';

interface VoiceTrainerPanelProps {
  voiceEvals: VoiceEvalEntry[];
  onAddVoiceEval: (entry: VoiceEvalEntry) => void;
  onDeleteVoiceEval: (id: string) => void;
}

const SCORE_METRICS: { key: keyof VoiceEvalEntry['scores']; label: string; hint: string }[] = [
  { key: 'pace', label: 'السرعة والاتزان', hint: 'هل كانت سرعتك مريحة غير متعجلة؟' },
  { key: 'pauses', label: 'التوقفات الواثقة', hint: 'هل استخدمت وقفات قصيرة بدل «آآ» و«يعني»؟' },
  { key: 'clarity', label: 'وضوح المخارج', hint: 'هل كانت الكلمات واضحة ومسموعة بنبرة ثابتة؟' },
  { key: 'confidence', label: 'الثقة والهدوء', hint: 'هل بدت نبرتك هادئة ومتماسكة بلا تبرير؟' },
];

export const VoiceTrainerPanel: React.FC<VoiceTrainerPanelProps> = ({
  voiceEvals,
  onAddVoiceEval,
  onDeleteVoiceEval,
}) => {
  const [selectedPromptId, setSelectedPromptId] = useState(VOICE_PROMPTS[0].id);
  const [recording, setRecording] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [levelPct, setLevelPct] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [scores, setScores] = useState<VoiceEvalEntry['scores']>({
    pace: 3,
    pauses: 3,
    clarity: 3,
    confidence: 3,
  });
  const [note, setNote] = useState('');
  const [savedNotice, setSavedNotice] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const selectedPrompt =
    VOICE_PROMPTS.find((p) => p.id === selectedPromptId) || VOICE_PROMPTS[0];

  const cleanupRecordingResources = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (audioCtxRef.current) {
      void audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
    setLevelPct(0);
  };

  useEffect(() => {
    return () => {
      cleanupRecordingResources();
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  const startRecording = async () => {
    setErrorMsg(null);
    setSavedNotice(false);
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setErrorMsg('المتصفح الحالي لا يدعم تسجيل الصوت مباشرة، يمكنك التدرّب بصوتك وتسجيل تقييمك أدناه.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
        setAudioUrl(null);
      }

      // Live volume bar
      try {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          const actx = new AudioCtx();
          audioCtxRef.current = actx;
          const src = actx.createMediaStreamSource(stream);
          const analyser = actx.createAnalyser();
          analyser.fftSize = 256;
          src.connect(analyser);
          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          const tickLevel = () => {
            analyser.getByteTimeDomainData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
              const v = (dataArray[i] - 128) / 128;
              sum += v * v;
            }
            const rms = Math.sqrt(sum / dataArray.length);
            setLevelPct(Math.min(100, Math.round(rms * 280)));
            rafRef.current = requestAnimationFrame(tickLevel);
          };
          rafRef.current = requestAnimationFrame(tickLevel);
        }
      } catch {
        // ignore visualizer failure
      }

      chunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) chunksRef.current.push(ev.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        cleanupRecordingResources();
      };

      recorder.start();
      setElapsedSec(0);
      setRecording(true);
      timerRef.current = window.setInterval(() => {
        setElapsedSec((s) => s + 1);
      }, 1000);
    } catch {
      setErrorMsg('لم يتم منح إذن الميكروفون أو أن الجهاز لا يتيح التسجيل هنا. تأكد من السماح بالميكروفون وجرّب مجدداً.');
      cleanupRecordingResources();
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
  };

  const handleSaveEvaluation = () => {
    const entry: VoiceEvalEntry = {
      id: generateId('voice'),
      date: getTodayIso(),
      promptTitle: selectedPrompt.title,
      durationSec: elapsedSec,
      scores: { ...scores },
      note: note.trim(),
    };
    onAddVoiceEval(entry);
    setNote('');
    setSavedNotice(true);
    window.setTimeout(() => setSavedNotice(false), 2500);
  };

  const avgScore = (s: VoiceEvalEntry['scores']) =>
    ((s.pace + s.pauses + s.clarity + s.confidence) / 4).toFixed(1);

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-bold text-[#F3EFE6] flex items-center gap-2">
          <MicIcon className="w-5 h-5 text-[#D4A373]" />
          مدرب الصوت والنبرة (محلي 100%)
        </h3>
        <p className="text-xs text-[#9A9589] mt-1">
          سجّل صوتك محلياً على جهازك، استمع إليه بوعي، وقيّم سرعتك وتوقفاتك ووضوحك وثقتك. التسجيل لا يغادر جهازك أبداً.
        </p>
      </div>

      {/* Prompt selector */}
      <div className="p-4 rounded-2xl bg-[#141722] border border-white/10 space-y-3">
        <div className="text-xs font-semibold text-[#D4A373]">1. اختر نص التدريب</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {VOICE_PROMPTS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setSelectedPromptId(p.id)}
              className={`text-right px-3.5 py-2.5 rounded-xl border text-xs font-semibold transition ${
                selectedPromptId === p.id
                  ? 'bg-[#D4A373]/15 border-[#D4A373]/50 text-[#F3EFE6]'
                  : 'bg-[#1A1E2A] border-white/8 text-[#9A9589] hover:text-[#F3EFE6]'
              }`}
            >
              {p.title}
            </button>
          ))}
        </div>
        <div className="p-3.5 rounded-xl bg-[#0F121B] border border-white/8 text-sm text-[#F3EFE6] leading-relaxed">
          {selectedPrompt.script}
        </div>
      </div>

      {/* Recorder Box */}
      <div className="p-5 rounded-2xl bg-[#141722] border border-[#D4A373]/25 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs font-semibold text-[#D4A373]">2. التسجيل والاستماع</div>
            <div className="text-2xl font-extrabold text-[#F3EFE6] tabular-nums mt-1">
              {String(Math.floor(elapsedSec / 60)).padStart(2, '0')}:
              {String(elapsedSec % 60).padStart(2, '0')}
            </div>
          </div>

          <button
            type="button"
            onClick={recording ? stopRecording : startRecording}
            className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-bold transition active:scale-95 ${
              recording
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/50'
                : 'bg-[#D4A373] text-[#0B0D12]'
            }`}
          >
            <MicIcon className="w-4 h-4" />
            {recording ? 'إيقاف التسجيل' : 'ابدأ تسجيل صوتي'}
          </button>
        </div>

        {/* Live Microphone Level Bar */}
        {recording && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-[#9A9589]">
              <span>مستوى الصوت المباشر</span>
              <span className="text-rose-300 font-semibold">● جارٍ التسجيل...</span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full bg-[#D4A373] transition-all duration-75"
                style={{ width: `${Math.max(4, levelPct)}%` }}
              />
            </div>
          </div>
        )}

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-200 leading-relaxed">
            {errorMsg}
          </div>
        )}

        {audioUrl && !recording && (
          <div className="p-3.5 rounded-xl bg-[#0F121B] border border-[#D4A373]/25 space-y-2">
            <div className="text-xs font-semibold text-[#D4A373]">استمع لتسجيلك الآن:</div>
            <audio controls src={audioUrl} className="w-full h-10" />
          </div>
        )}
      </div>

      {/* Self-evaluation rubric */}
      <div className="p-5 rounded-2xl bg-[#141722] border border-white/10 space-y-4">
        <div className="text-xs font-semibold text-[#D4A373]">3. قائمة التقييم الذاتي (من 1 إلى 5)</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {SCORE_METRICS.map((m) => (
            <div key={m.key} className="p-3 rounded-xl bg-[#1A1E2A] border border-white/8 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#F3EFE6]">{m.label}</span>
                <span className="text-xs font-bold text-[#D4A373]">{scores[m.key]} / 5</span>
              </div>
              <p className="text-[11px] text-[#9A9589]">{m.hint}</p>
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setScores((prev) => ({ ...prev, [m.key]: n }))}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition ${
                      scores[m.key] === n
                        ? 'bg-[#D4A373] text-[#0B0D12]'
                        : 'bg-white/5 text-[#9A9589] hover:text-[#F3EFE6]'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <textarea
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="ملاحظة لنفسك (مثلاً: أبطأت في النهاية فبدا صوتي أكثر هدوءاً وثقة)..."
          className="w-full px-3.5 py-2.5 rounded-xl bg-[#0F121B] border border-white/10 text-sm text-[#F3EFE6] placeholder-[#767268] focus:outline-none focus:border-[#D4A373]/60"
        />

        <div className="flex items-center justify-between gap-3">
          {savedNotice ? (
            <span className="text-xs text-emerald-300 flex items-center gap-1.5">
              <CheckIcon className="w-4 h-4" />
              تم حفظ تقييمك الصوتي بنجاح
            </span>
          ) : (
            <span className="text-[11px] text-[#9A9589]">المتوسط الحالي: {avgScore(scores)} / 5</span>
          )}
          <button
            type="button"
            onClick={handleSaveEvaluation}
            className="px-5 py-2.5 rounded-xl bg-[#D4A373] text-[#0B0D12] text-xs font-bold"
          >
            حفظ التقييم في السجل
          </button>
        </div>
      </div>

      {/* History */}
      {voiceEvals.length > 0 && (
        <div className="space-y-2.5">
          <div className="text-xs font-semibold text-[#9A9589]">سجل تدريبات الصوت ({voiceEvals.length})</div>
          {voiceEvals.slice(0, 8).map((ev) => (
            <div
              key={ev.id}
              className="p-3.5 rounded-2xl bg-[#141722] border border-white/8 flex items-start justify-between gap-3"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-[#F3EFE6]">{ev.promptTitle}</span>
                  <span className="text-[11px] text-[#D4A373] font-semibold">
                    المتوسط {avgScore(ev.scores)}/5
                  </span>
                  <span className="text-[10px] text-[#9A9589]">{formatArabicDate(ev.date)}</span>
                </div>
                <div className="text-[11px] text-[#B7B2A6]">
                  السرعة {ev.scores.pace} • التوقفات {ev.scores.pauses} • الوضوح {ev.scores.clarity} • الثقة {ev.scores.confidence}
                </div>
                {ev.note && <p className="text-xs text-[#9A9589]">{ev.note}</p>}
              </div>
              <button
                type="button"
                onClick={() => onDeleteVoiceEval(ev.id)}
                className="p-1.5 rounded-lg text-[#9A9589] hover:text-rose-400"
                aria-label="حذف التقييم"
              >
                <TrashIcon className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
