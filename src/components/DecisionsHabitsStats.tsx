import React, { useMemo, useState } from 'react';
import { DAILY_HABITS, getUserLevel } from '../data/selfAndBiasData';
import { analyzeDeepSelf, buildAdaptiveTrainingPlan } from '../engine/personalization';
import { AppState, DecisionEntry, HabitDailyLog, MoodEntry } from '../types';
import { addDaysIso, formatArabicDate, generateId, getTodayIso } from '../utils/storage';
import { BarChartIcon, CalendarIcon, CheckIcon, PlusIcon, TrashIcon } from './Icons';

// =====================================================================
// 1. DECISION JOURNAL (مفكرة القرارات)
// =====================================================================
interface DecisionsJournalPanelProps {
  decisions: DecisionEntry[];
  onAddDecision: (entry: DecisionEntry) => void;
  onUpdateDecision: (entry: DecisionEntry) => void;
  onDeleteDecision: (id: string) => void;
}

export const DecisionsJournalPanel: React.FC<DecisionsJournalPanelProps> = ({
  decisions,
  onAddDecision,
  onUpdateDecision,
  onDeleteDecision,
}) => {
  const [title, setTitle] = useState('');
  const [reasons, setReasons] = useState('');
  const [expectedOutcome, setExpectedOutcome] = useState('');
  const [confidence, setConfidence] = useState(70);
  const [reviewAfterDays, setReviewAfterDays] = useState<7 | 30>(7);

  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [actualOutcome, setActualOutcome] = useState('');
  const [accuracyRating, setAccuracyRating] = useState(4);
  const [lessonLearned, setLessonLearned] = useState('');

  const today = getTodayIso();

  const stats = useMemo(() => {
    const reviewed = decisions.filter((d) => d.reviewed && typeof d.accuracyRating === 'number');
    const due = decisions.filter((d) => !d.reviewed && d.reviewDate <= today);
    const avgAcc =
      reviewed.length > 0
        ? Math.round(
            (reviewed.reduce((acc, d) => acc + (d.accuracyRating || 0), 0) / (reviewed.length * 5)) *
              100
          )
        : null;
    return { reviewedCount: reviewed.length, dueCount: due.length, avgAcc };
  }, [decisions, today]);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !expectedOutcome.trim()) return;
    onAddDecision({
      id: generateId('dec'),
      date: today,
      title: title.trim(),
      reasons: reasons.trim(),
      expectedOutcome: expectedOutcome.trim(),
      confidence,
      reviewDate: addDaysIso(today, reviewAfterDays),
      reviewed: false,
    });
    setTitle('');
    setReasons('');
    setExpectedOutcome('');
    setConfidence(70);
  };

  const handleSaveReview = (d: DecisionEntry) => {
    if (!actualOutcome.trim()) return;
    onUpdateDecision({
      ...d,
      reviewed: true,
      actualOutcome: actualOutcome.trim(),
      accuracyRating,
      lessonLearned: lessonLearned.trim(),
    });
    setReviewingId(null);
    setActualOutcome('');
    setLessonLearned('');
    setAccuracyRating(4);
  };

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-bold text-[#F3EFE6] flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-[#D4A373]" />
          مفكرة القرارات وقياس دقة الأحكام
        </h3>
        <p className="text-xs text-[#9A9589] mt-1">
          سجّل قرارك المهم وأسبابه وتوقعك اليوم، ثم راجع النتيجة الفعلية بعد أسبوع أو شهر لتعرف مدى دقة أحكامك الحقيقية.
        </p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="p-3.5 rounded-2xl bg-[#141722] border border-white/10 text-center">
          <div className="text-xl font-extrabold text-[#F3EFE6] tabular-nums">{decisions.length}</div>
          <div className="text-[11px] text-[#9A9589] mt-0.5">إجمالي القرارات</div>
        </div>
        <div className="p-3.5 rounded-2xl bg-[#141722] border border-white/10 text-center">
          <div className="text-xl font-extrabold text-amber-300 tabular-nums">{stats.dueCount}</div>
          <div className="text-[11px] text-[#9A9589] mt-0.5">جاهز للمراجعة الآن</div>
        </div>
        <div className="p-3.5 rounded-2xl bg-[#141722] border border-[#D4A373]/25 text-center">
          <div className="text-xl font-extrabold text-[#D4A373] tabular-nums">
            {stats.avgAcc !== null ? `${stats.avgAcc}%` : '—'}
          </div>
          <div className="text-[11px] text-[#9A9589] mt-0.5">متوسط دقة توقعاتك</div>
        </div>
      </div>

      {/* New Decision Form */}
      <form
        onSubmit={handleAdd}
        className="p-4 sm:p-5 rounded-2xl bg-[#141722] border border-white/10 space-y-3"
      >
        <div className="text-xs font-bold text-[#D4A373]">تسجيل قرار شخصي جديد</div>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="عنوان القرار (مثلاً: تقليل السهر، مصارحة صديق، قرار دراسي أو عائلي)..."
          required
          className="w-full px-3.5 py-2.5 rounded-xl bg-[#0F121B] border border-white/10 text-sm text-[#F3EFE6] placeholder-[#767268] focus:outline-none focus:border-[#D4A373]/60"
        />
        <textarea
          rows={2}
          value={reasons}
          onChange={(e) => setReasons(e.target.value)}
          placeholder="أسباب القرار والمعطيات التي اعتمدت عليها..."
          className="w-full px-3.5 py-2.5 rounded-xl bg-[#0F121B] border border-white/10 text-sm text-[#F3EFE6] placeholder-[#767268] focus:outline-none focus:border-[#D4A373]/60"
        />
        <textarea
          rows={2}
          value={expectedOutcome}
          onChange={(e) => setExpectedOutcome(e.target.value)}
          placeholder="ما النتيجة التي تتوقعها بوضوح؟"
          required
          className="w-full px-3.5 py-2.5 rounded-xl bg-[#0F121B] border border-white/10 text-sm text-[#F3EFE6] placeholder-[#767268] focus:outline-none focus:border-[#D4A373]/60"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div className="p-3 rounded-xl bg-[#0F121B] border border-white/8 space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-[#9A9589]">نسبة ثقتك في التوقع</span>
              <span className="text-[#D4A373] font-bold">{confidence}%</span>
            </div>
            <input
              type="range"
              min={10}
              max={100}
              step={5}
              value={confidence}
              onChange={(e) => setConfidence(Number(e.target.value))}
              className="w-full accent-[#D4A373]"
            />
          </div>

          <div className="p-3 rounded-xl bg-[#0F121B] border border-white/8 space-y-1.5">
            <div className="text-xs text-[#9A9589]">موعد مراجعة النتيجة</div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setReviewAfterDays(7)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold ${
                  reviewAfterDays === 7
                    ? 'bg-[#D4A373] text-[#0B0D12]'
                    : 'bg-white/5 text-[#9A9589]'
                }`}
              >
                بعد أسبوع
              </button>
              <button
                type="button"
                onClick={() => setReviewAfterDays(30)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold ${
                  reviewAfterDays === 30
                    ? 'bg-[#D4A373] text-[#0B0D12]'
                    : 'bg-white/5 text-[#9A9589]'
                }`}
              >
                بعد شهر
              </button>
            </div>
          </div>
        </div>

        <button
          type="submit"
          className="w-full py-3 rounded-xl bg-[#D4A373] text-[#0B0D12] text-sm font-bold flex items-center justify-center gap-2"
        >
          <PlusIcon className="w-4 h-4" />
          حفظ القرار في المفكرة
        </button>
      </form>

      {/* Decisions List */}
      <div className="space-y-3">
        {decisions.length === 0 ? (
          <div className="p-6 rounded-2xl bg-[#141722] border border-white/8 text-center text-xs text-[#9A9589]">
            لم تسجّل قرارات بعد. دوّن أول قرار مهم اليوم لتبدأ بقياس دقة أحكامك مع الزمن.
          </div>
        ) : (
          decisions.map((d) => {
            const isDue = !d.reviewed && d.reviewDate <= today;
            const isEditing = reviewingId === d.id;
            return (
              <div
                key={d.id}
                className={`p-4 rounded-2xl bg-[#141722] border space-y-3 ${
                  isDue
                    ? 'border-amber-400/50'
                    : d.reviewed
                    ? 'border-emerald-500/25'
                    : 'border-white/10'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-bold text-[#F3EFE6]">{d.title}</h4>
                      {isDue && (
                        <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                          حان موعد المراجعة
                        </span>
                      )}
                      {d.reviewed && (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                          تمت المراجعة • دقة {d.accuracyRating}/5
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-[#9A9589] mt-0.5">
                      تاريخ القرار: {formatArabicDate(d.date)} • ثقة {d.confidence}% • المراجعة: {formatArabicDate(d.reviewDate)}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onDeleteDecision(d.id)}
                    className="p-1.5 text-[#9A9589] hover:text-rose-400"
                    aria-label="حذف القرار"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>

                {d.reasons && (
                  <div className="text-xs text-[#B7B2A6]">
                    <span className="text-[#9A9589]">الأسباب: </span>
                    {d.reasons}
                  </div>
                )}
                <div className="text-xs text-[#E8E2D6]">
                  <span className="text-[#D4A373] font-semibold">التوقع: </span>
                  {d.expectedOutcome}
                </div>

                {d.reviewed ? (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-1 text-xs">
                    <div className="text-emerald-200">
                      <span className="font-bold">ما حدث فعلاً: </span>
                      {d.actualOutcome}
                    </div>
                    {d.lessonLearned && (
                      <div className="text-[#D5D0C5]">
                        <span className="font-bold text-[#D4A373]">الدرس المستفاد: </span>
                        {d.lessonLearned}
                      </div>
                    )}
                  </div>
                ) : isEditing ? (
                  <div className="p-3.5 rounded-xl bg-[#0F121B] border border-[#D4A373]/30 space-y-2.5">
                    <textarea
                      rows={2}
                      value={actualOutcome}
                      onChange={(e) => setActualOutcome(e.target.value)}
                      placeholder="ماذا حدث فعلاً على أرض الواقع؟"
                      className="w-full px-3 py-2 rounded-lg bg-[#141722] border border-white/10 text-xs text-[#F3EFE6]"
                    />
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-[#9A9589]">دقة توقعك (1 إلى 5):</span>
                      <div className="flex gap-1.5">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <button
                            key={n}
                            type="button"
                            onClick={() => setAccuracyRating(n)}
                            className={`w-8 h-8 rounded-lg text-xs font-bold ${
                              accuracyRating === n
                                ? 'bg-[#D4A373] text-[#0B0D12]'
                                : 'bg-white/5 text-[#9A9589]'
                            }`}
                          >
                            {n}
                          </button>
                        ))}
                      </div>
                    </div>
                    <input
                      type="text"
                      value={lessonLearned}
                      onChange={(e) => setLessonLearned(e.target.value)}
                      placeholder="ما الدرس الذي تعلّمته للقرارات القادمة؟ (اختياري)"
                      className="w-full px-3 py-2 rounded-lg bg-[#141722] border border-white/10 text-xs text-[#F3EFE6]"
                    />
                    <div className="flex gap-2 justify-end">
                      <button
                        type="button"
                        onClick={() => setReviewingId(null)}
                        className="px-3 py-1.5 rounded-lg bg-white/5 text-xs text-[#9A9589]"
                      >
                        إلغاء
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveReview(d)}
                        className="px-4 py-1.5 rounded-lg bg-[#D4A373] text-[#0B0D12] text-xs font-bold"
                      >
                        اعتماد المراجعة
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setReviewingId(d.id)}
                    className="px-3.5 py-2 rounded-xl bg-[#D4A373]/15 border border-[#D4A373]/30 text-xs font-bold text-[#D4A373]"
                  >
                    تسجيل النتيجة الفعلية ومراجعة القرار
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

// =====================================================================
// 2. HABIT TRACKER + MOOD CORRELATION (متتبع العادات وعلاقتها بالمزاج)
// =====================================================================
interface HabitsMoodPanelProps {
  habitLogs: HabitDailyLog[];
  moodLogs: MoodEntry[];
  onToggleHabit: (habitId: string, dateIso: string) => void;
  recommendedHabitId?: string;
  recommendedHabitReason?: string;
}

export const HabitsMoodPanel: React.FC<HabitsMoodPanelProps> = ({
  habitLogs,
  moodLogs,
  onToggleHabit,
  recommendedHabitId,
  recommendedHabitReason,
}) => {
  const today = getTodayIso();
  const todayLog = habitLogs.find((l) => l.date === today);
  const completedToday = todayLog?.completedHabits || [];

  // Build last 14 days series
  const series = useMemo(() => {
    const days: { date: string; short: string; habitsCount: number; avgMood: number | null }[] = [];
    for (let i = 13; i >= 0; i--) {
      const iso = addDaysIso(today, -i);
      const h = habitLogs.find((l) => l.date === iso);
      const moods = moodLogs.filter((m) => m.date === iso);
      const avgMood =
        moods.length > 0
          ? Number((moods.reduce((s, m) => s + m.level, 0) / moods.length).toFixed(1))
          : null;
      days.push({
        date: iso,
        short: iso.slice(8, 10),
        habitsCount: h ? h.completedHabits.length : 0,
        avgMood,
      });
    }
    return days;
  }, [habitLogs, moodLogs, today]);

  // Habit streaks
  const habitStreaks = useMemo(() => {
    const map: Record<string, number> = {};
    for (const habit of DAILY_HABITS) {
      let streak = 0;
      for (let i = 0; i < 60; i++) {
        const iso = addDaysIso(today, -i);
        const log = habitLogs.find((l) => l.date === iso);
        if (log && log.completedHabits.includes(habit.id)) {
          streak++;
        } else if (i === 0) {
          // Today not yet ticked doesn't break yesterday's streak
          continue;
        } else {
          break;
        }
      }
      map[habit.id] = streak;
    }
    return map;
  }, [habitLogs, today]);

  // Mood correlation insight
  const correlation = useMemo(() => {
    const highHabitMoods: number[] = [];
    const lowHabitMoods: number[] = [];
    const byDateMood = new Map<string, number[]>();
    for (const m of moodLogs) {
      const arr = byDateMood.get(m.date) || [];
      arr.push(m.level);
      byDateMood.set(m.date, arr);
    }
    for (const [date, levels] of byDateMood.entries()) {
      const avg = levels.reduce((a, b) => a + b, 0) / levels.length;
      const h = habitLogs.find((l) => l.date === date);
      const count = h ? h.completedHabits.length : 0;
      if (count >= 3) highHabitMoods.push(avg);
      else lowHabitMoods.push(avg);
    }

    const avgHigh =
      highHabitMoods.length > 0
        ? (highHabitMoods.reduce((a, b) => a + b, 0) / highHabitMoods.length).toFixed(1)
        : null;
    const avgLow =
      lowHabitMoods.length > 0
        ? (lowHabitMoods.reduce((a, b) => a + b, 0) / lowHabitMoods.length).toFixed(1)
        : null;

    // Best single habit for mood
    let bestHabitLabel: string | null = null;
    let bestHabitScore = 0;
    for (const habit of DAILY_HABITS) {
      const vals: number[] = [];
      for (const [date, levels] of byDateMood.entries()) {
        const h = habitLogs.find((l) => l.date === date);
        if (h && h.completedHabits.includes(habit.id)) {
          vals.push(levels.reduce((a, b) => a + b, 0) / levels.length);
        }
      }
      if (vals.length >= 2) {
        const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
        if (avg > bestHabitScore) {
          bestHabitScore = avg;
          bestHabitLabel = habit.shortLabel;
        }
      }
    }

    return { avgHigh, avgLow, bestHabitLabel, bestHabitScore: bestHabitScore.toFixed(1) };
  }, [habitLogs, moodLogs]);

  // SVG chart coords
  const chartW = 420;
  const chartH = 165;
  const padL = 24;
  const padR = 14;
  const padT = 16;
  const padB = 26;
  const usableW = chartW - padL - padR;
  const usableH = chartH - padT - padB;
  const stepX = usableW / Math.max(1, series.length - 1);

  const moodPoints = series
    .map((d, idx) => {
      if (d.avgMood === null) return null;
      const x = padL + idx * stepX;
      const y = padT + usableH - ((d.avgMood - 1) / 4) * usableH;
      return { x, y, val: d.avgMood };
    })
    .filter((p): p is { x: number; y: number; val: number } => p !== null);

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-bold text-[#F3EFE6]">متتبع العادات اليومية وتأثيرها على مزاجك</h3>
        <p className="text-xs text-[#9A9589] mt-1">
          علّم عاداتك الخمس يومياً وسجّل مزاجك في «الاتزان العاطفي» ليرسم التطبيق العلاقة الحقيقية بين عاداتك ومزاجك.
        </p>
      </div>

      {/* Today's 5 habits */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-[#D4A373]">عادات اليوم ({formatArabicDate(today)})</span>
          <span className="text-[#F3EFE6] font-bold">{completedToday.length} / 5 مكتملة</span>
        </div>

        {recommendedHabitId && recommendedHabitReason && (
          <div className="p-3.5 rounded-2xl bg-[#D4A853]/10 border border-[#D4A853]/30 text-xs text-[#E8E2D6] leading-relaxed">
            <strong className="text-[#D4A853]">العادة الأعلى أثراً لشخصيتك: </strong>
            {recommendedHabitReason}
          </div>
        )}

        {DAILY_HABITS.map((habit) => {
          const done = completedToday.includes(habit.id);
          const streak = habitStreaks[habit.id] || 0;
          const isRecommended = habit.id === recommendedHabitId;
          return (
            <button
              key={habit.id}
              type="button"
              onClick={() => onToggleHabit(habit.id, today)}
              className={`w-full text-right p-4 rounded-2xl border flex items-center justify-between gap-3 transition cursor-pointer ${
                done
                  ? 'bg-[#D4A373]/14 border-[#D4A373]/55'
                  : isRecommended
                  ? 'bg-[#141722] border-[#D4A853]/40'
                  : 'bg-[#141722] border-white/10 hover:border-white/25'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-6 h-6 rounded-lg flex items-center justify-center border shrink-0 ${
                    done
                      ? 'bg-[#D4A373] border-[#D4A373] text-[#0B0D12]'
                      : 'border-white/25 bg-transparent'
                  }`}
                >
                  {done && <CheckIcon className="w-4 h-4" />}
                </div>
                <div>
                  <div className="text-sm font-bold text-[#F3EFE6] flex items-center gap-2 flex-wrap">
                    <span>{habit.label}</span>
                    {isRecommended && (
                      <span className="text-[10px] font-bold text-[#D4A853]">★ أولوية لشخصيتك</span>
                    )}
                  </div>
                  <div className="text-[11px] text-[#9A9589]">{habit.description}</div>
                </div>
              </div>
              <span className="shrink-0 px-2.5 py-1 rounded-lg bg-[#1A1E2A] text-[11px] font-bold text-[#D4A373] tabular-nums">
                {streak} يوم
              </span>
            </button>
          );
        })}
      </div>

      {/* Correlation SVG Chart */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#141722] border border-white/10 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs font-bold text-[#F3EFE6]">العادات (أعمدة) مقابل المزاج (خط ذهبي) — آخر 14 يوماً</div>
          <div className="flex items-center gap-3 text-[10px] text-[#9A9589]">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#6CA6C1]/50 inline-block" /> العادات (0–5)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-0.5 bg-[#D4A373] inline-block" /> المزاج (1–5)
            </span>
          </div>
        </div>

        <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full h-auto block" role="img" aria-label="رسم علاقة العادات بالمزاج">
          {[1, 2, 3, 4, 5].map((lvl) => {
            const y = padT + usableH - ((lvl - 1) / 4) * usableH;
            return (
              <g key={lvl}>
                <line x1={padL} y1={y} x2={chartW - padR} y2={y} stroke="rgba(255,255,255,0.07)" strokeWidth="1" />
                <text x={8} y={y + 3} fontSize="9" fill="#767268">
                  {lvl}
                </text>
              </g>
            );
          })}

          {/* Habit bars */}
          {series.map((d, idx) => {
            const x = padL + idx * stepX;
            const barH = (d.habitsCount / 5) * usableH;
            return (
              <g key={d.date}>
                <rect
                  x={x - 7}
                  y={padT + usableH - barH}
                  width={14}
                  height={Math.max(2, barH)}
                  rx={3}
                  fill="rgba(108, 166, 193, 0.35)"
                />
                <text x={x} y={chartH - 8} fontSize="8.5" textAnchor="middle" fill="#8A8579">
                  {d.short}
                </text>
              </g>
            );
          })}

          {/* Mood line */}
          {moodPoints.length >= 2 && (
            <polyline
              fill="none"
              stroke="#D4A373"
              strokeWidth="2.2"
              strokeLinejoin="round"
              strokeLinecap="round"
              points={moodPoints.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')}
            />
          )}
          {moodPoints.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r="3.5" fill="#D4A373" stroke="#0B0D12" strokeWidth="1.2" />
          ))}
        </svg>

        {/* Correlation Insight */}
        <div className="p-3.5 rounded-xl bg-[#1A1E2A] border border-[#D4A373]/20 text-xs text-[#E4DFD3] leading-relaxed space-y-1">
          {correlation.avgHigh || correlation.avgLow ? (
            <>
              <div>
                • في الأيام التي أنجزت فيها <strong className="text-[#D4A373]">3 عادات فأكثر</strong>، كان متوسط مزاجك:{' '}
                <strong className="text-emerald-300">{correlation.avgHigh ? `${correlation.avgHigh}/5` : 'بانتظار تسجيل'}</strong>
                {correlation.avgLow && (
                  <>
                    {' '}مقابل <strong className="text-amber-300">{correlation.avgLow}/5</strong> في أيام العادات الأقل.
                  </>
                )}
              </div>
              {correlation.bestHabitLabel && (
                <div>
                  • أكثر عادة مرتبطة بأعلى مزاج لديك حتى الآن هي: <strong className="text-[#D4A373]">{correlation.bestHabitLabel}</strong> (متوسط مزاج {correlation.bestHabitScore}/5).
                </div>
              )}
            </>
          ) : (
            <div>سجّل مزاجك اليومي مع عاداتك لعدة أيام ليظهر لك هنا أكثر عادة ترفع هدوءك ومزاجك بدقة.</div>
          )}
        </div>
      </div>
    </div>
  );
};

// =====================================================================
// 3. PERSONAL STATS DASHBOARD (إحصائياتي)
// =====================================================================
interface PersonalStatsPanelProps {
  state: AppState;
}

export const PersonalStatsPanel: React.FC<PersonalStatsPanelProps> = ({ state }) => {
  const levelInfo = getUserLevel(state.xpPoints);
  const selfSynth = useMemo(
    () => analyzeDeepSelf(state.selfProfile, state.biasQuiz),
    [state.selfProfile, state.biasQuiz]
  );
  const adaptivePlan = useMemo(() => buildAdaptiveTrainingPlan(state), [state]);

  const stats = useMemo(() => {
    // Most interacted person (notes + situationReviews)
    const counts = new Map<string, { name: string; count: number }>();
    for (const p of state.people) {
      counts.set(p.id, { name: p.name, count: p.notes.length });
    }
    for (const r of state.situationReviews) {
      if (r.personId && r.personId !== 'general') {
        const cur = counts.get(r.personId) || { name: r.personName, count: 0 };
        cur.count += 1;
        counts.set(r.personId, cur);
      }
    }
    let topPerson: { name: string; count: number } | null = null;
    for (const v of counts.values()) {
      if (v.count > 0 && (!topPerson || v.count > topPerson.count)) topPerson = v;
    }

    // Most successful approaches
    const approachMap = new Map<string, { total: number; success: number }>();
    for (const r of state.situationReviews) {
      const cur = approachMap.get(r.approachUsed) || { total: 0, success: 0 };
      cur.total += 1;
      if (r.outcome === 'نجح') cur.success += 1;
      else if (r.outcome === 'جزئي') cur.success += 0.5;
      approachMap.set(r.approachUsed, cur);
    }
    const topApproaches = Array.from(approachMap.entries())
      .map(([name, v]) => ({
        name,
        total: v.total,
        rate: Math.round((v.success / v.total) * 100),
      }))
      .sort((a, b) => b.rate - a.rate || b.total - a.total);

    // Decision accuracy
    const reviewedDecs = state.decisions.filter((d) => d.reviewed && d.accuracyRating);
    const decisionAccuracy =
      reviewedDecs.length > 0
        ? Math.round(
            (reviewedDecs.reduce((s, d) => s + (d.accuracyRating || 0), 0) /
              (reviewedDecs.length * 5)) *
              100
          )
        : null;

    // Last 30 days activity count
    const monthCutoff = addDaysIso(getTodayIso(), -30);
    const monthMoods = state.moodLogs.filter((m) => m.date >= monthCutoff);
    const avgMonthMood =
      monthMoods.length > 0
        ? (monthMoods.reduce((s, m) => s + m.level, 0) / monthMoods.length).toFixed(1)
        : null;
    const monthHabitsDays = state.habitLogs.filter(
      (h) => h.date >= monthCutoff && h.completedHabits.length > 0
    ).length;
    const monthReviews = state.situationReviews.filter((r) => r.date >= monthCutoff).length;

    const simCompleted = Object.keys(state.simResults).length;

    return {
      topPerson,
      topApproaches,
      decisionAccuracy,
      avgMonthMood,
      monthHabitsDays,
      monthReviews,
      simCompleted,
    };
  }, [state]);

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-bold text-[#F3EFE6] flex items-center gap-2">
          <BarChartIcon className="w-5 h-5 text-[#D4A373]" />
          إحصائياتي وتطوري الشهري
        </h3>
        <p className="text-xs text-[#9A9589] mt-1">
          ملخص تلقائي يربط شخصيتك وسجلاتك الخاصة ليكشف أنماط تعاملك وأنجح أساليبك وتقدمك الحقيقي.
        </p>
      </div>

      {/* Connected Personality Snapshot Strip */}
      <div className="p-4 rounded-2xl bg-[#141722] border border-[#D4A853]/30 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div>
          <div className="text-[11px] text-[#9A9589]">بصمتك الشخصية ({selfSynth.completionPct}%)</div>
          <div className="text-sm font-extrabold text-[#D4A853] mt-0.5">{selfSynth.archetype.title}</div>
          <div className="text-[11px] text-[#B7B2A6] mt-0.5">{selfSynth.dominantDiscLabel}</div>
        </div>
        <div>
          <div className="text-[11px] text-[#9A9589]">مسار تدريبك الأول حالياً</div>
          <div className="text-sm font-bold text-[#F3EFE6] mt-0.5">{adaptivePlan.primaryTrack.shortTitle}</div>
          <div className="text-[11px] text-emerald-300 mt-0.5">أولوية {adaptivePlan.primaryTrack.priority}%</div>
        </div>
        <div>
          <div className="text-[11px] text-[#9A9589]">أبرز انحياز / استجابة ضغط</div>
          <div className="text-sm font-bold text-[#F3EFE6] mt-0.5">
            {selfSynth.topBiases[0] ? selfSynth.topBiases[0].name : selfSynth.stressResponse.name}
          </div>
          <div className="text-[11px] text-amber-300 mt-0.5">{selfSynth.attachment.name}</div>
        </div>
      </div>

      {/* Level & XP Hero */}
      <div className="p-5 rounded-2xl bg-gradient-to-l from-[#1C2130] to-[#141722] border border-[#D4A373]/30 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[11px] font-semibold text-[#D4A373]">المستوى {levelInfo.level}</div>
            <div className="text-xl font-extrabold text-[#F3EFE6]">{levelInfo.title}</div>
          </div>
          <div className="text-left">
            <div className="text-2xl font-extrabold text-[#D4A373] tabular-nums">{state.xpPoints} XP</div>
            <div className="text-[10px] text-[#9A9589]">
              {levelInfo.nextMin ? `المستوى القادم عند ${levelInfo.nextMin} XP` : 'بلغت أعلى مستوى!'}
            </div>
          </div>
        </div>
        <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
          <div className="h-full bg-[#D4A373]" style={{ width: `${levelInfo.progressPct}%` }} />
        </div>
      </div>

      {/* Core KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl bg-[#141722] border border-white/10">
          <div className="text-[11px] text-[#9A9589]">أكثر شخص تفاعلاً</div>
          <div className="text-base font-bold text-[#F3EFE6] mt-1 truncate">
            {stats.topPerson ? stats.topPerson.name : 'لا يوجد بعد'}
          </div>
          <div className="text-[11px] text-[#D4A373] mt-0.5">
            {stats.topPerson ? `${stats.topPerson.count} ملاحظة ومراجعة` : 'أضف ملاحظات في دائرتي'}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#141722] border border-white/10">
          <div className="text-[11px] text-[#9A9589]">دقة توقعات قراراتك</div>
          <div className="text-base font-bold text-[#F3EFE6] mt-1 tabular-nums">
            {stats.decisionAccuracy !== null ? `${stats.decisionAccuracy}%` : 'بانتظار مراجعة'}
          </div>
          <div className="text-[11px] text-[#9A9589] mt-0.5">{state.decisions.length} قرار مسجّل</div>
        </div>

        <div className="p-4 rounded-2xl bg-[#141722] border border-white/10">
          <div className="text-[11px] text-[#9A9589]">متوسط مزاجك (30 يوماً)</div>
          <div className="text-base font-bold text-emerald-300 mt-1 tabular-nums">
            {stats.avgMonthMood ? `${stats.avgMonthMood} / 5` : '—'}
          </div>
          <div className="text-[11px] text-[#9A9589] mt-0.5">{stats.monthHabitsDays} يوم التزام عادات</div>
        </div>

        <div className="p-4 rounded-2xl bg-[#141722] border border-white/10">
          <div className="text-[11px] text-[#9A9589]">برنامج 30 يوماً</div>
          <div className="text-base font-bold text-[#F3EFE6] mt-1 tabular-nums">
            {state.completedDays.length} / 30 يوماً
          </div>
          <div className="text-[11px] text-[#D4A373] mt-0.5">سلسلة {state.streakDays} يوم</div>
        </div>

        <div className="p-4 rounded-2xl bg-[#141722] border border-white/10">
          <div className="text-[11px] text-[#9A9589]">تحديات يومية مكتملة</div>
          <div className="text-base font-bold text-[#F3EFE6] mt-1 tabular-nums">
            {state.completedChallengeDates.length}
          </div>
          <div className="text-[11px] text-[#9A9589] mt-0.5">{state.voiceEvals.length} تدريب صوتي</div>
        </div>

        <div className="p-4 rounded-2xl bg-[#141722] border border-white/10">
          <div className="text-[11px] text-[#9A9589]">مواقف ومحاكي</div>
          <div className="text-base font-bold text-[#F3EFE6] mt-1 tabular-nums">
            {stats.simCompleted} سيناريو
          </div>
          <div className="text-[11px] text-[#9A9589] mt-0.5">{stats.monthReviews} مراجعة هذا الشهر</div>
        </div>
      </div>

      {/* Most successful approaches */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#141722] border border-white/10 space-y-3">
        <div className="text-xs font-bold text-[#D4A373]">أنجح أساليبك التواصلية (من مراجعة المواقف)</div>
        {stats.topApproaches.length === 0 ? (
          <p className="text-xs text-[#9A9589]">
            سجّل مواقفك بعد الحوارات في «دائرتي ← مراجعة المواقف» ليحسب التطبيق تلقائياً أي أساليب التواصل تحقق أفضل نتيجة مع دائرتك.
          </p>
        ) : (
          <div className="space-y-2.5">
            {stats.topApproaches.map((a) => (
              <div key={a.name} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#F3EFE6] font-semibold">{a.name}</span>
                  <span className="text-[#D4A373] font-bold tabular-nums">
                    {a.rate}% نجاح ({a.total} موقف)
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full bg-[#D4A373]" style={{ width: `${a.rate}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
