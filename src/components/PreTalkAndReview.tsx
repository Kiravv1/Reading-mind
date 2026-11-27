import React, { useEffect, useMemo, useState } from 'react';
import {
  generatePreTalkCard,
  PRE_TALK_GOALS,
  PreTalkGoal,
  REVIEW_APPROACHES,
} from '../data/trainerExtras';
import { analyzeDeepSelf, analyzePairCompatibility } from '../engine/personalization';
import { BiasQuizState, PersonProfile, SelfProfileData, SituationReview } from '../types';
import { copyToClipboard, formatArabicDate, generateId, getTodayIso } from '../utils/storage';
import { CheckIcon, CopyIcon, PlusIcon, ShieldIcon, SparklesIcon, TrashIcon } from './Icons';

// =====================================================================
// 1. PRE-TALK 3-STEP CARD (قبل الحوار المهم — مربوط بملفك وملف الشخص وتجاربك السابقة)
// =====================================================================
interface PreTalkCardPanelProps {
  people: PersonProfile[];
  selfProfile: SelfProfileData;
  biasQuiz: BiasQuizState;
  reviews: SituationReview[];
  initialPersonId?: string | null;
}

export const PreTalkCardPanel: React.FC<PreTalkCardPanelProps> = ({
  people,
  selfProfile,
  biasQuiz,
  reviews,
  initialPersonId,
}) => {
  const [selectedPersonId, setSelectedPersonId] = useState<string>(
    initialPersonId || people[0]?.id || 'general'
  );
  const [goal, setGoal] = useState<PreTalkGoal>(PRE_TALK_GOALS[0]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (initialPersonId) {
      setSelectedPersonId(initialPersonId);
    }
  }, [initialPersonId]);

  const selectedPerson = people.find((p) => p.id === selectedPersonId) || null;
  const card = useMemo(
    () => generatePreTalkCard(selectedPerson, goal),
    [selectedPerson, goal]
  );

  const selfSynth = useMemo(() => analyzeDeepSelf(selfProfile, biasQuiz), [selfProfile, biasQuiz]);

  const pairInsight = useMemo(() => {
    if (!selectedPerson) return null;
    const personReviews = reviews.filter((r) => r.personId === selectedPerson.id);
    return analyzePairCompatibility(selfSynth, selectedPerson, personReviews);
  }, [selfSynth, selectedPerson, reviews]);

  const handleCopyCard = async () => {
    const text = [
      `بطاقة قبل الحوار المهم — ${card.personLabel}`,
      `الهدف: ${card.goal}`,
      '',
      '1) كيف أبدأ:',
      ...card.howToStart.map((x) => `- ${x}`),
      '',
      '2) ما الذي أتجنبه:',
      ...card.whatToAvoid.map((x) => `- ${x}`),
      '',
      '3) ماذا أفعل إن غضب:',
      ...card.ifTheyGetAngry.map((x) => `- ${x}`),
      '',
      `جملة افتتاح مقترحة: ${card.goldenOpeningLine}`,
    ].join('\n');
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-bold text-[#F3EFE6] flex items-center gap-2">
          <ShieldIcon className="w-5 h-5 text-[#D4A373]" />
          قبل الحوار المهم — بطاقة الـ3 خطوات
        </h3>
        <p className="text-xs text-[#9A9589] mt-1">
          اختر الشخص من دائرتك وحدد هدفك من الحوار، ليجهّز لك المحرك الداخلي بطاقة مركّزة من 3 خطوات قبل أن تبدأ الكلام.
        </p>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl bg-[#141722] border border-white/10">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[#D4A373] block">اختر الشخص</label>
          <select
            value={selectedPersonId}
            onChange={(e) => setSelectedPersonId(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-[#0F121B] border border-white/10 text-sm text-[#F3EFE6] focus:outline-none focus:border-[#D4A373]"
          >
            <option value="general">حوار عام (بدون ملف محدد)</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — {p.relationship}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[#D4A373] block">الهدف من الحوار</label>
          <select
            value={goal}
            onChange={(e) => setGoal(e.target.value as PreTalkGoal)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-[#0F121B] border border-white/10 text-sm text-[#F3EFE6] focus:outline-none focus:border-[#D4A373]"
          >
            {PRE_TALK_GOALS.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Generated 3-Step Card */}
      <div className="p-5 rounded-3xl bg-gradient-to-b from-[#171B27] to-[#12151E] border border-[#D4A373]/35 space-y-4 shadow-xl">
        <div className="flex flex-wrap items-start justify-between gap-2 pb-3 border-b border-white/10">
          <div>
            <div className="text-base font-extrabold text-[#F3EFE6]">
              {card.personLabel} • {card.goal}
            </div>
            <div className="text-[11px] text-[#D4A373] mt-0.5">{card.profileSummary}</div>
          </div>
          <button
            type="button"
            onClick={handleCopyCard}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-[#F3EFE6] hover:border-[#D4A373]/50"
          >
            {copied ? <CheckIcon className="w-3.5 h-3.5 text-emerald-400" /> : <CopyIcon className="w-3.5 h-3.5" />}
            {copied ? 'تم النسخ' : 'نسخ البطاقة'}
          </button>
        </div>

        {/* Step 1 */}
        <div className="p-4 rounded-2xl bg-[#0F121B]/80 border border-emerald-500/25 space-y-2">
          <div className="text-xs font-extrabold text-emerald-300">الخطوة 1: كيف أبدأ؟</div>
          <ul className="space-y-1.5 text-xs text-[#E8E2D6] leading-relaxed">
            {card.howToStart.map((line, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-emerald-400 font-bold">•</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Step 2 */}
        <div className="p-4 rounded-2xl bg-[#0F121B]/80 border border-amber-500/25 space-y-2">
          <div className="text-xs font-extrabold text-amber-300">الخطوة 2: ما الذي أتجنبه تماماً؟</div>
          <ul className="space-y-1.5 text-xs text-[#E8E2D6] leading-relaxed">
            {card.whatToAvoid.map((line, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-amber-400 font-bold">•</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Step 3 */}
        <div className="p-4 rounded-2xl bg-[#0F121B]/80 border border-rose-500/25 space-y-2">
          <div className="text-xs font-extrabold text-rose-300">الخطوة 3: ماذا أفعل إن غضب أو توتر؟</div>
          <ul className="space-y-1.5 text-xs text-[#E8E2D6] leading-relaxed">
            {card.ifTheyGetAngry.map((line, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-rose-400 font-bold">•</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Personal Self-Link Box (Your own personality + proven history with this person) */}
        <div className="p-4 rounded-2xl bg-[#141824] border border-sky-400/30 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs font-extrabold text-sky-300 flex items-center gap-1.5">
              <SparklesIcon className="w-3.5 h-3.5" />
              <span>تنبيه مخصص لنمطك أنت ({selfSynth.archetype.title})</span>
            </div>
            {pairInsight && (
              <span className="text-[11px] font-bold text-[#D4A853] tabular-nums">
                تناغمكما: {pairInsight.harmonyPct}% ({pairInsight.dynamicTitle})
              </span>
            )}
          </div>
          <p className="text-xs text-[#E8E2D6] leading-relaxed">
            {pairInsight ? pairInsight.yourWatchOut : selfSynth.communicationBlueprint.whenStressed}
          </p>
          {pairInsight?.provenBestApproach && (
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-xs text-emerald-200">
              ✓ من تجاربك السابقة معه: أنجح أسلوب مجرّب هو{' '}
              <strong>«{pairInsight.provenBestApproach.name}»</strong> (نسبة نجاح{' '}
              {pairInsight.provenBestApproach.rate}% عبر {pairInsight.provenBestApproach.count} موقف).
            </div>
          )}
          {selfSynth.topBiases[0] && (
            <div className="text-[11px] text-[#B7B2A6]">
              • احذر من انحيازك الأبرز («{selfSynth.topBiases[0].name}»): {selfSynth.topBiases[0].howToOvercome}
            </div>
          )}
        </div>

        {/* Golden Opening Phrase */}
        <div className="p-4 rounded-2xl bg-[#D4A373]/12 border border-[#D4A373]/35 space-y-1">
          <div className="text-[11px] font-bold text-[#D4A373]">جملة افتتاح مقترحة بصوت هادئ:</div>
          <p className="text-sm font-semibold text-[#F3EFE6] leading-relaxed">
            {card.goldenOpeningLine}
          </p>
        </div>
      </div>
    </div>
  );
};

// =====================================================================
// 2. POST-SITUATION REVIEW (مراجعة بعد الموقف + أي أساليبي تنجح مع كل شخص)
// =====================================================================
interface PostReviewPanelProps {
  people: PersonProfile[];
  reviews: SituationReview[];
  onAddReview: (review: SituationReview) => void;
  onDeleteReview: (id: string) => void;
}

export const PostReviewPanel: React.FC<PostReviewPanelProps> = ({
  people,
  reviews,
  onAddReview,
  onDeleteReview,
}) => {
  const [personId, setPersonId] = useState<string>(people[0]?.id || 'general');
  const [whatHappened, setWhatHappened] = useState('');
  const [whatISaid, setWhatISaid] = useState('');
  const [approachUsed, setApproachUsed] = useState(REVIEW_APPROACHES[0]);
  const [theirReaction, setTheirReaction] = useState('');
  const [outcome, setOutcome] = useState<SituationReview['outcome']>('نجح');
  const [whatWorked, setWhatWorked] = useState('');
  const [whatAngered, setWhatAngered] = useState('');
  const [whatToChange, setWhatToChange] = useState('');
  const [filterPersonId, setFilterPersonId] = useState<string>('all');

  // Compute which approaches work best per person
  const perPersonInsights = useMemo(() => {
    const map = new Map<
      string,
      {
        personName: string;
        total: number;
        approaches: Map<string, { total: number; score: number }>;
      }
    >();

    for (const r of reviews) {
      const key = r.personId || 'general';
      const entry = map.get(key) || {
        personName: r.personName,
        total: 0,
        approaches: new Map(),
      };
      entry.total += 1;
      const app = entry.approaches.get(r.approachUsed) || { total: 0, score: 0 };
      app.total += 1;
      app.score += r.outcome === 'نجح' ? 1 : r.outcome === 'جزئي' ? 0.5 : 0;
      entry.approaches.set(r.approachUsed, app);
      map.set(key, entry);
    }

    return Array.from(map.entries()).map(([id, data]) => {
      const ranked = Array.from(data.approaches.entries())
        .map(([name, v]) => ({
          name,
          total: v.total,
          rate: Math.round((v.score / v.total) * 100),
        }))
        .sort((a, b) => b.rate - a.rate || b.total - a.total);
      return {
        id,
        personName: data.personName,
        total: data.total,
        bestApproach: ranked[0] || null,
        worstApproach: ranked.length > 1 ? ranked[ranked.length - 1] : null,
      };
    });
  }, [reviews]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!whatHappened.trim()) return;
    const person = people.find((p) => p.id === personId);
    onAddReview({
      id: generateId('rev'),
      date: getTodayIso(),
      personId,
      personName: person ? person.name : 'شخص عام',
      whatHappened: whatHappened.trim(),
      whatISaid: whatISaid.trim(),
      approachUsed,
      theirReaction: theirReaction.trim(),
      outcome,
      whatWorked: whatWorked.trim(),
      whatAngered: whatAngered.trim(),
      whatToChange: whatToChange.trim(),
    });
    setWhatHappened('');
    setWhatISaid('');
    setTheirReaction('');
    setWhatWorked('');
    setWhatAngered('');
    setWhatToChange('');
  };

  const filteredReviews =
    filterPersonId === 'all'
      ? reviews
      : reviews.filter((r) => r.personId === filterPersonId);

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-bold text-[#F3EFE6]">مراجعة بعد الموقف</h3>
        <p className="text-xs text-[#9A9589] mt-1">
          سجّل ما حدث وماذا قلت وكيف كان الرد؛ ومع الوقت سيكشف لك التطبيق بدقة أي أساليبك تنجح أكثر مع كل شخص.
        </p>
      </div>

      {/* Per-person learned effectiveness */}
      {perPersonInsights.length > 0 && (
        <div className="p-4 rounded-2xl bg-[#181C27] border border-[#D4A373]/30 space-y-3">
          <div className="text-xs font-bold text-[#D4A373]">
            ما تعلّمه التطبيق من تجاربك مع كل شخص:
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {perPersonInsights.map((ins) => (
              <div
                key={ins.id}
                className="p-3.5 rounded-xl bg-[#12151E] border border-white/8 space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-[#F3EFE6]">{ins.personName}</span>
                  <span className="text-[11px] text-[#9A9589]">{ins.total} موقف</span>
                </div>
                {ins.bestApproach && (
                  <div className="text-xs text-emerald-300">
                    ✓ الأنجح: <span className="font-semibold">{ins.bestApproach.name}</span> ({ins.bestApproach.rate}%)
                  </div>
                )}
                {ins.worstApproach && ins.worstApproach.rate < 60 && (
                  <div className="text-[11px] text-rose-300">
                    ✕ أقل فاعلية: {ins.worstApproach.name} ({ins.worstApproach.rate}%)
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add review form */}
      <form
        onSubmit={handleSubmit}
        className="p-4 sm:p-5 rounded-2xl bg-[#141722] border border-white/10 space-y-3"
      >
        <div className="text-xs font-bold text-[#D4A373]">تسجيل مراجعة موقف جديد</div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <select
            value={personId}
            onChange={(e) => setPersonId(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-[#0F121B] border border-white/10 text-xs text-[#F3EFE6]"
          >
            <option value="general">شخص عام (خارج القائمة)</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.relationship})
              </option>
            ))}
          </select>

          <select
            value={approachUsed}
            onChange={(e) => setApproachUsed(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-[#0F121B] border border-white/10 text-xs text-[#F3EFE6]"
          >
            {REVIEW_APPROACHES.map((a) => (
              <option key={a} value={a}>
                الأسلوب: {a}
              </option>
            ))}
          </select>
        </div>

        <textarea
          rows={2}
          required
          value={whatHappened}
          onChange={(e) => setWhatHappened(e.target.value)}
          placeholder="ماذا حدث في الموقف باختصار؟"
          className="w-full px-3.5 py-2.5 rounded-xl bg-[#0F121B] border border-white/10 text-xs text-[#F3EFE6] placeholder-[#767268]"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <textarea
            rows={2}
            value={whatISaid}
            onChange={(e) => setWhatISaid(e.target.value)}
            placeholder="ماذا قلت أو كيف تصرفت؟"
            className="w-full px-3.5 py-2.5 rounded-xl bg-[#0F121B] border border-white/10 text-xs text-[#F3EFE6] placeholder-[#767268]"
          />
          <textarea
            rows={2}
            value={theirReaction}
            onChange={(e) => setTheirReaction(e.target.value)}
            placeholder="كيف كان رد فعله؟"
            className="w-full px-3.5 py-2.5 rounded-xl bg-[#0F121B] border border-white/10 text-xs text-[#F3EFE6] placeholder-[#767268]"
          />
        </div>

        {/* Outcome selector */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-[#9A9589]">النتيجة العامة:</span>
          {(['نجح', 'جزئي', 'لم ينجح'] as const).map((o) => (
            <button
              key={o}
              type="button"
              onClick={() => setOutcome(o)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition ${
                outcome === o
                  ? o === 'نجح'
                    ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                    : o === 'جزئي'
                    ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                    : 'bg-rose-500/20 border-rose-400 text-rose-300'
                  : 'bg-[#0F121B] border-white/10 text-[#9A9589]'
              }`}
            >
              {o}
            </button>
          ))}
        </div>

        {/* 3 Reflection questions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
          <input
            type="text"
            value={whatWorked}
            onChange={(e) => setWhatWorked(e.target.value)}
            placeholder="ماذا نجح في الموقف؟"
            className="px-3 py-2 rounded-xl bg-[#0F121B] border border-white/10 text-xs text-[#F3EFE6] placeholder-[#767268]"
          />
          <input
            type="text"
            value={whatAngered}
            onChange={(e) => setWhatAngered(e.target.value)}
            placeholder="ما الذي أغضبه أو وتّره؟"
            className="px-3 py-2 rounded-xl bg-[#0F121B] border border-white/10 text-xs text-[#F3EFE6] placeholder-[#767268]"
          />
          <input
            type="text"
            value={whatToChange}
            onChange={(e) => setWhatToChange(e.target.value)}
            placeholder="ماذا سأغير المرة القادمة؟"
            className="px-3 py-2 rounded-xl bg-[#0F121B] border border-white/10 text-xs text-[#F3EFE6] placeholder-[#767268]"
          />
        </div>

        <button
          type="submit"
          className="w-full py-3 rounded-xl bg-[#D4A373] text-[#0B0D12] text-sm font-bold flex items-center justify-center gap-2"
        >
          <PlusIcon className="w-4 h-4" />
          حفظ المراجعة وتحديث تحليل الأساليب
        </button>
      </form>

      {/* Filter + History */}
      {reviews.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="text-xs font-bold text-[#9A9589]">
              سجل مراجعات المواقف ({filteredReviews.length})
            </div>
            <select
              value={filterPersonId}
              onChange={(e) => setFilterPersonId(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-[#141722] border border-white/10 text-xs text-[#F3EFE6]"
            >
              <option value="all">جميع الأشخاص</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {filteredReviews.map((r) => (
            <div
              key={r.id}
              className="p-4 rounded-2xl bg-[#141722] border border-white/10 space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-bold text-[#F3EFE6]">{r.personName}</span>
                  <span className="px-2 py-0.5 rounded-md bg-white/5 text-[11px] text-[#D4A373]">
                    {r.approachUsed}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                      r.outcome === 'نجح'
                        ? 'bg-emerald-500/15 text-emerald-300'
                        : r.outcome === 'جزئي'
                        ? 'bg-amber-500/15 text-amber-300'
                        : 'bg-rose-500/15 text-rose-300'
                    }`}
                  >
                    {r.outcome}
                  </span>
                  <span className="text-[10px] text-[#9A9589]">{formatArabicDate(r.date)}</span>
                </div>
                <button
                  type="button"
                  onClick={() => onDeleteReview(r.id)}
                  className="p-1 text-[#9A9589] hover:text-rose-400"
                  aria-label="حذف المراجعة"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-[#E8E2D6] leading-relaxed">{r.whatHappened}</p>
              {(r.whatISaid || r.theirReaction) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-[#B7B2A6]">
                  {r.whatISaid && <div>• ماذا قلت: {r.whatISaid}</div>}
                  {r.theirReaction && <div>• رده: {r.theirReaction}</div>}
                </div>
              )}
              {(r.whatWorked || r.whatAngered || r.whatToChange) && (
                <div className="p-3 rounded-xl bg-[#0F121B] border border-white/6 space-y-1 text-[11px]">
                  {r.whatWorked && <div className="text-emerald-300">✓ ماذا نجح: {r.whatWorked}</div>}
                  {r.whatAngered && <div className="text-rose-300">✕ ما أغضبه: {r.whatAngered}</div>}
                  {r.whatToChange && <div className="text-[#D4A373]">↻ ما سأغيره: {r.whatToChange}</div>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
