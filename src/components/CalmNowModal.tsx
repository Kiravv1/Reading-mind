import React, { useEffect, useState } from 'react';
import { soundEngine } from '../utils/soundEngine';
import { CloseIcon, VolumeIcon, WindIcon } from './Icons';

interface CalmNowModalProps {
  open: boolean;
  onClose: () => void;
  onOpenSoundStudio?: () => void;
}

const GROUNDING_LINES = [
  'قدماك ثابتتان على الأرض، ونفَسك بيدك الآن. أنت لست مضطراً للرد في هذه اللحظة.',
  'الغضب موجة قصيرة ترتفع ثم تنكسر؛ هدوؤك الآن هو أقوى إثبات لسيطرتك على نفسك.',
  'بين المثير والاستجابة توجد مساحة صغيرة — وهذه المساحة هي حريتك وكرامتك.',
  'تذكّر: يمكنك دائماً أن تتكلم لاحقاً بحكمة، لكن يصعب سحب كلمة قيلت في لحظة اشتعال.',
];

export const CalmNowModal: React.FC<CalmNowModalProps> = ({
  open,
  onClose,
  onOpenSoundStudio,
}) => {
  const [phase, setPhase] = useState<'breathing' | 'grounding'>('breathing');
  const [secondsLeft, setSecondsLeft] = useState(60);
  const [soundOn, setSoundOn] = useState(false);
  const [groundingIdx, setGroundingIdx] = useState(0);
  const [decisionNote, setDecisionNote] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      if (soundOn) {
        soundEngine.stop();
        setSoundOn(false);
      }
      return;
    }
    setPhase('breathing');
    setSecondsLeft(60);
    setDecisionNote(null);
    setGroundingIdx(Math.floor(Math.random() * GROUNDING_LINES.length));
  }, [open]);

  useEffect(() => {
    if (!open || phase !== 'breathing') return;
    if (secondsLeft <= 0) {
      if (soundOn) soundEngine.playChime();
      setPhase('grounding');
      return;
    }
    const id = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(id);
          setPhase('grounding');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [open, phase, secondsLeft, soundOn]);

  if (!open) return null;

  const elapsed = 60 - secondsLeft;
  // 12-second cycle: 4s inhale, 2s hold, 6s exhale
  const cyclePos = elapsed % 12;
  const breathStage =
    cyclePos < 4
      ? { label: 'شهيق بطيء من الأنف', sub: 'املأ بطنك بهدوء', scale: 'scale-115', glow: 'shadow-[0_0_50px_rgba(212,163,115,0.45)]' }
      : cyclePos < 6
      ? { label: 'توقف هادئ', sub: 'أرخِ كتفيك وفكّك', scale: 'scale-115', glow: 'shadow-[0_0_60px_rgba(212,163,115,0.55)]' }
      : { label: 'زفير طويل وبطيء', sub: 'أخرج التوتر مع النفس', scale: 'scale-90', glow: 'shadow-[0_0_24px_rgba(212,163,115,0.2)]' };

  const toggleSound = () => {
    if (soundOn) {
      soundEngine.stop();
      setSoundOn(false);
    } else {
      soundEngine.start('ocean_waves');
      setSoundOn(true);
    }
  };

  const handleClose = () => {
    if (soundOn) {
      soundEngine.stop();
      setSoundOn(false);
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-[#07090D]/95 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="وضع اهدأ الآن"
    >
      <div className="w-full max-w-md bg-[#12151E] border border-[#D4A373]/30 rounded-3xl p-6 shadow-2xl space-y-6 my-auto">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#D4A373]/15 border border-[#D4A373]/30 flex items-center justify-center text-[#D4A373]">
              <WindIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#F3EFE6]">اهدأ الآن — وضع الطوارئ</h2>
              <p className="text-[11px] text-[#9A9589]">60 ثانية لاستعادة السيطرة والاتزان</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="w-9 h-9 rounded-xl bg-[#1A1E2A] border border-white/10 text-[#9A9589] hover:text-[#F3EFE6] flex items-center justify-center"
            aria-label="إغلاق"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>

        {phase === 'breathing' ? (
          <div className="space-y-6 text-center">
            {/* Breathing orb */}
            <div className="relative h-56 flex items-center justify-center">
              <div
                className={`w-40 h-40 rounded-full border-2 border-[#D4A373]/50 bg-radial from-[#D4A373]/25 via-[#D4A373]/10 to-transparent flex flex-col items-center justify-center transition-all duration-[2000ms] ease-in-out ${breathStage.scale} ${breathStage.glow}`}
              >
                <span className="text-4xl font-extrabold text-[#F3EFE6] tabular-nums">
                  {secondsLeft}
                </span>
                <span className="text-[11px] text-[#D4A373] mt-1">ثانية متبقية</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="text-xl font-bold text-[#D4A373]">{breathStage.label}</div>
              <p className="text-sm text-[#B7B2A6]">{breathStage.sub}</p>
            </div>

            {/* Progress bar */}
            <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full bg-[#D4A373] transition-all duration-1000"
                style={{ width: `${(elapsed / 60) * 100}%` }}
              />
            </div>

            <div className="flex items-center justify-center gap-2.5 flex-wrap">
              <button
                type="button"
                onClick={toggleSound}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-semibold transition ${
                  soundOn
                    ? 'bg-[#D4A373]/20 border-[#D4A373]/50 text-[#D4A373]'
                    : 'bg-[#1A1E2A] border-white/10 text-[#B7B2A6] hover:text-[#F3EFE6]'
                }`}
              >
                <VolumeIcon className="w-4 h-4" />
                {soundOn ? 'إيقاف صوت الأمواج' : 'تشغيل صوت أمواج مهدّئ'}
              </button>
              <button
                type="button"
                onClick={() => setPhase('grounding')}
                className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-[#9A9589] hover:text-[#F3EFE6]"
              >
                الانتقال للتأريض الآن
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-5 animate-fade-in">
            {/* Grounding statement */}
            <div className="p-4 rounded-2xl bg-[#181C27] border border-[#D4A373]/25 space-y-2">
              <div className="text-[11px] font-bold text-[#D4A373]">جملة التأريض</div>
              <p className="text-base leading-relaxed text-[#F3EFE6] font-medium">
                «{GROUNDING_LINES[groundingIdx]}»
              </p>
              <div className="text-[11px] text-[#9A9589] pt-1">
                سمِّ بصمت: 3 أشياء تراها الآن • شيئين تلمسهما • صوتاً واحداً تسمعه.
              </div>
            </div>

            {/* The decisive question */}
            <div className="p-5 rounded-2xl bg-[#D4A373]/10 border border-[#D4A373]/35 text-center space-y-3">
              <h3 className="text-lg font-extrabold text-[#F3EFE6]">
                هل هذا يستحق ردة فعلي؟
              </h3>
              <p className="text-xs text-[#B7B2A6] leading-relaxed">
                هل سيظل هذا الموقف مهماً بعد أسبوع؟ وهل الرد الآن سيصلح شيئاً أم سيؤذي سلامي وعلاقتي؟
              </p>
            </div>

            {/* 3 calm choices */}
            <div className="grid grid-cols-1 gap-2.5">
              <button
                type="button"
                onClick={() =>
                  setDecisionNote('قرار حكيم: الصمت أو التأجيل لساعة واحدة يحفظ كرامتك ويبرد الموقف تلقائياً.')
                }
                className="w-full text-right px-4 py-3 rounded-xl bg-[#1A1E2A] border border-white/10 hover:border-[#D4A373]/50 text-sm text-[#F3EFE6] transition"
              >
                لا يستحق — سأؤجّل الرد أو أتركه يمضي بسلام
              </button>
              <button
                type="button"
                onClick={() =>
                  setDecisionNote('ممتاز: اختر جملة واحدة قصيرة بصيغة «أنا»، بنبرة أبطأ وأخفض درجتين من المعتاد.')
                }
                className="w-full text-right px-4 py-3 rounded-xl bg-[#1A1E2A] border border-white/10 hover:border-[#D4A373]/50 text-sm text-[#F3EFE6] transition"
              >
                يستحق حداً هادئاً — سأرد بجملة قصيرة محترمة لاحقاً
              </button>
              <button
                type="button"
                onClick={() => {
                  setPhase('breathing');
                  setSecondsLeft(60);
                  setDecisionNote(null);
                }}
                className="w-full text-right px-4 py-3 rounded-xl bg-[#1A1E2A] border border-white/10 hover:border-[#D4A373]/50 text-sm text-[#B7B2A6] transition"
              >
                ما زلت متوتراً — أحتاج 60 ثانية تنفس إضافية
              </button>
            </div>

            {decisionNote && (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-200 leading-relaxed">
                {decisionNote}
              </div>
            )}

            <div className="flex items-center justify-between gap-2 pt-1">
              {onOpenSoundStudio && (
                <button
                  type="button"
                  onClick={() => {
                    handleClose();
                    onOpenSoundStudio();
                  }}
                  className="px-4 py-2.5 rounded-xl bg-[#D4A373]/15 border border-[#D4A373]/30 text-xs font-semibold text-[#D4A373]"
                >
                  افتح استوديو الصوتيات والهدوء
                </button>
              )}
              <button
                type="button"
                onClick={handleClose}
                className="mr-auto px-5 py-2.5 rounded-xl bg-[#D4A373] text-[#0B0D12] text-xs font-bold"
              >
                أنا أهدأ الآن ✓
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
