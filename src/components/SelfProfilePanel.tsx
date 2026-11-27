import React, { useMemo, useState } from 'react';
import {
  analyzeBiasQuiz,
  BIAS_META,
  MY_BIAS_QUIZ_QUESTIONS,
  PERSONAL_GOALS,
  SELF_ATTACHMENT_QS,
  SELF_BIG_FIVE_QS,
  SELF_CONFIDENCE_QS,
  SELF_DISC_CONFLICT_QS,
  SELF_EQ_QS,
  SELF_VALUES_STRESS_QS,
  SelfQuestion,
} from '../data/selfAndBiasData';
import { analyzeDeepSelf, buildAdaptiveTrainingPlan } from '../engine/personalization';
import {
  AppNavigateTarget,
  AppState,
  BiasQuizState,
  PersonalGoalKey,
  SelfProfileData,
} from '../types';
import { getTodayIso } from '../utils/storage';
import { RadarChart } from './Charts';
import {
  AwardIcon,
  CheckIcon,
  ChevronLeftIcon,
  RefreshIcon,
  ShieldIcon,
  SparklesIcon,
  TargetIcon,
} from './Icons';

interface SelfProfileViewProps {
  state: AppState;
  onUpdateSelfProfile: (next: SelfProfileData) => void;
  onNavigateTo: (target: AppNavigateTarget) => void;
}

type SelfSubTab =
  | 'report'
  | 'big5'
  | 'attachment'
  | 'eq'
  | 'confidence'
  | 'discConflict'
  | 'valuesStress';

type AnswerBucket =
  | 'bigFiveAnswers'
  | 'attachmentAnswers'
  | 'eqAnswers'
  | 'confidenceAnswers'
  | 'discConflictAnswers'
  | 'valuesAnswers';

const SCALE_LABELS = [
  { v: 1, label: 'نادراً' },
  { v: 2, label: 'قليلاً' },
  { v: 3, label: 'أحياناً' },
  { v: 4, label: 'غالباً' },
  { v: 5, label: 'دائماً' },
];

const QUIZ_SEQUENCE: SelfSubTab[] = [
  'big5',
  'attachment',
  'eq',
  'confidence',
  'discConflict',
  'valuesStress',
];

export const SelfProfileView: React.FC<SelfProfileViewProps> = ({
  state,
  onUpdateSelfProfile,
  onNavigateTo,
}) => {
  const { selfProfile, biasQuiz } = state;
  const [subTab, setSubTab] = useState<SelfSubTab>('report');

  const synth = useMemo(() => analyzeDeepSelf(selfProfile, biasQuiz), [selfProfile, biasQuiz]);
  const adaptivePlan = useMemo(() => buildAdaptiveTrainingPlan(state), [state]);

  const handleAnswer = (bucket: AnswerBucket, qId: number, value: number) => {
    onUpdateSelfProfile({
      ...selfProfile,
      [bucket]: {
        ...(selfProfile[bucket] || {}),
        [qId]: value,
      },
      updatedAt: getTodayIso(),
    });
  };

  const handleSetGoal = (goalKey: PersonalGoalKey) => {
    onUpdateSelfProfile({
      ...selfProfile,
      personalGoal: goalKey,
      updatedAt: getTodayIso(),
    });
  };

  const handleSetName = (val: string) => {
    onUpdateSelfProfile({
      ...selfProfile,
      displayName: val,
      updatedAt: selfProfile.updatedAt || getTodayIso(),
    });
  };

  const renderQuiz = (
    tabKey: SelfSubTab,
    title: string,
    subtitle: string,
    qs: SelfQuestion[],
    bucket: AnswerBucket
  ) => {
    const answers = selfProfile[bucket] || {};
    const doneCount = Object.keys(answers).length;
    const seqIdx = QUIZ_SEQUENCE.indexOf(tabKey);
    const nextQuiz = seqIdx >= 0 && seqIdx < QUIZ_SEQUENCE.length - 1 ? QUIZ_SEQUENCE[seqIdx + 1] : null;

    return (
      <div className="space-y-4">
        <div className="p-4 rounded-2xl bg-[#141722] border border-[#D4A853]/30 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="text-sm sm:text-base font-bold text-[#F3EFE6]">{title}</h4>
            <p className="text-xs text-[#9A9589] mt-0.5">{subtitle}</p>
          </div>
          <span className="px-3 py-1 rounded-xl bg-[#D4A853]/15 text-[#D4A853] text-xs font-bold shrink-0 tabular-nums">
            {doneCount} / {qs.length}
          </span>
        </div>

        <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full bg-[#D4A853] transition-all"
            style={{ width: `${Math.round((doneCount / qs.length) * 100)}%` }}
          />
        </div>

        <div className="space-y-3">
          {qs.map((q, idx) => (
            <div key={q.id} className="p-4 rounded-2xl bg-[#141722] border border-white/8 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="text-sm text-[#F3EFE6] leading-relaxed">
                  <span className="text-[#D4A853] font-bold ml-1.5">{idx + 1}.</span>
                  {q.text}
                </div>
                {typeof answers[q.id] === 'number' && (
                  <CheckIcon className="w-4 h-4 text-emerald-400 shrink-0 mt-1" />
                )}
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {SCALE_LABELS.map((s) => {
                  const selected = answers[q.id] === s.v;
                  return (
                    <button
                      key={s.v}
                      type="button"
                      onClick={() => handleAnswer(bucket, q.id, s.v)}
                      className={`min-h-[40px] py-2 px-1 rounded-xl text-[11px] font-semibold border transition cursor-pointer ${
                        selected
                          ? 'bg-[#D4A853] text-[#0B0D12] border-[#D4A853]'
                          : 'bg-[#1A1E2A] text-[#9A9589] border-white/8 hover:text-[#F3EFE6]'
                      }`}
                    >
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
          <button
            type="button"
            onClick={() => {
              setSubTab('report');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="min-h-[48px] py-3 rounded-2xl bg-[#D4A853] text-[#0B0D12] text-sm font-bold cursor-pointer"
          >
            عرض تقرير شخصيتي المحدّث ({synth.completionPct}%)
          </button>
          {nextQuiz && (
            <button
              type="button"
              onClick={() => {
                setSubTab(nextQuiz);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="min-h-[48px] py-3 rounded-2xl bg-[#1A1E2A] border border-[#D4A853]/35 text-[#D4A853] text-sm font-bold cursor-pointer"
            >
              الانتقال للاختبار التالي ←
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg sm:text-xl font-bold text-[#F3EFE6] flex items-center gap-2">
            <AwardIcon className="w-5 h-5 text-[#D4A853]" />
            ملفي أنا — التحليل العميق لشخصيتي وربطه بالتدريب
          </h3>
          <p className="text-xs text-[#9A9589] mt-1 leading-relaxed">
            6 مقاييس علمية (76 عبارة) ترسم خريطة شخصيتك الحقيقية، وتُخصّص تلقائياً خطتك التدريبية، وتحدي اليوم، ودرع الحماية، وتوافقك مع كل شخص في دائرتك.
          </p>
        </div>
        <div className="px-3.5 py-2 rounded-2xl bg-[#141722] border border-[#D4A853]/30 text-center shrink-0">
          <div className="text-lg font-extrabold text-[#D4A853] tabular-nums leading-none">
            {synth.completionPct}%
          </div>
          <div className="text-[10px] text-[#9A9589] mt-0.5 tabular-nums">
            {synth.answeredCount} / {synth.totalQuestions} عبارة
          </div>
        </div>
      </div>

      {/* Sub-tabs (Report + 6 Scientific Tests) */}
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {[
          { id: 'report', label: `ملفي الشامل (${synth.completionPct}%)` },
          { id: 'big5', label: `1. السمات الخمس (${synth.moduleProgress.big5.done}/${synth.moduleProgress.big5.total})` },
          { id: 'attachment', label: `2. التعلق (${synth.moduleProgress.attachment.done}/${synth.moduleProgress.attachment.total})` },
          { id: 'eq', label: `3. الذكاء العاطفي (${synth.moduleProgress.eq.done}/${synth.moduleProgress.eq.total})` },
          { id: 'confidence', label: `4. الثقة والحدود (${synth.moduleProgress.confidence.done}/${synth.moduleProgress.confidence.total})` },
          { id: 'discConflict', label: `5. DISC والصراع والقرار (${synth.moduleProgress.discConflict.done}/${synth.moduleProgress.discConflict.total})` },
          { id: 'valuesStress', label: `6. القيم والضغط (${synth.moduleProgress.valuesStress.done}/${synth.moduleProgress.valuesStress.total})` },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setSubTab(t.id as SelfSubTab)}
            className={`shrink-0 min-h-[42px] px-3.5 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
              subTab === t.id
                ? 'bg-[#D4A853] text-[#0B0D12] border-[#D4A853]'
                : 'bg-[#141722] text-[#B7B2A6] border-white/10 hover:border-[#D4A853]/40'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 6 QUIZ MODULES */}
      {subTab === 'big5' &&
        renderQuiz(
          'big5',
          '1) اختبار السمات الخمس الكبرى الموسّع (Big Five — 20 عبارة)',
          'يقيس بدقة أعمق: الانفتاح، الانضباط، الاجتماعية، التعاطف، والحساسية الانفعالية.',
          SELF_BIG_FIVE_QS,
          'bigFiveAnswers'
        )}

      {subTab === 'attachment' &&
        renderQuiz(
          'attachment',
          '2) اختبار نمط التعلق العاطفي (12 عبارة)',
          'يكشف كيف يتصرف عقلك العاطفي في القرب والأمان والغياب والخلاف مع أهلك وأصدقائك.',
          SELF_ATTACHMENT_QS,
          'attachmentAnswers'
        )}

      {subTab === 'eq' &&
        renderQuiz(
          'eq',
          '3) اختبار الذكاء العاطفي بأركانه الأربعة (12 عبارة)',
          'يقيس: الوعي بالذات، التنظيم الذاتي، التعاطف وقراءة الآخرين، وإدارة العلاقات.',
          SELF_EQ_QS,
          'eqAnswers'
        )}

      {subTab === 'confidence' &&
        renderQuiz(
          'confidence',
          '4) اختبار الثقة بالنفس والحدود الشخصية (10 عبارات)',
          'يقيس ثباتك الداخلي، قدرتك على قول «لا»، والتعبير عن احتياجاتك دون خوف أو اعتذار مفرط.',
          SELF_CONFIDENCE_QS,
          'confidenceAnswers'
        )}

      {subTab === 'discConflict' &&
        renderQuiz(
          'discConflict',
          '5) اختبار أسلوب DISC والصراع واتخاذ القرار (12 عبارة)',
          'يحدد طبعك التفاعلي (حاسم / مؤثر / هادئ / تحليلي) وكيف تتصرف في الخلافات والقرارات المهمة.',
          SELF_DISC_CONFLICT_QS,
          'discConflictAnswers'
        )}

      {subTab === 'valuesStress' &&
        renderQuiz(
          'valuesStress',
          '6) اختبار القيم الأساسية واستجابة الضغط (4F — 10 عبارات)',
          'يكشف استجابتك اللاواعية تحت التوتر (قتال / هروب / تجمّد / إرضاء) وما القيم التي تحرّك حياتك.',
          SELF_VALUES_STRESS_QS,
          'valuesAnswers'
        )}

      {/* COMPREHENSIVE PERSONAL DOSSIER REPORT */}
      {subTab === 'report' && (
        <div className="space-y-5">
          {/* Identity & Current Personal Goal Customizer */}
          <section className="p-4 sm:p-5 rounded-3xl bg-[#141722] border border-white/10 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#D4A853] block">اسمك (اختياري للتخصيص)</label>
                <input
                  type="text"
                  value={selfProfile.displayName || ''}
                  onChange={(e) => handleSetName(e.target.value)}
                  placeholder="مثال: عبدالله / سارة"
                  className="w-full min-h-[42px] px-3.5 rounded-xl bg-[#0F121B] border border-white/10 text-sm text-[#F3EFE6] focus:outline-none focus:border-[#D4A853]"
                />
              </div>
              <div className="md:col-span-2 space-y-1.5">
                <div className="text-xs font-bold text-[#D4A853]">
                  هدفي الشخصي الأهم حالياً (يوجّه خطة التدريب فوراً):
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {PERSONAL_GOALS.map((g) => {
                    const active = selfProfile.personalGoal === g.key;
                    return (
                      <button
                        key={g.key}
                        type="button"
                        onClick={() => handleSetGoal(g.key)}
                        className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border transition cursor-pointer ${
                          active
                            ? 'bg-[#D4A853] border-[#D4A853] text-[#0B0D12]'
                            : 'bg-[#0F121B] border-white/10 text-[#C5C0B5] hover:border-[#D4A853]/40'
                        }`}
                      >
                        {g.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          {/* Prompt to complete more if < 35% */}
          {synth.completionPct < 35 && (
            <div className="p-4 rounded-2xl bg-[#D4A853]/12 border border-[#D4A853]/35 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-[#F3EFE6] leading-relaxed">
                أكملت <strong className="text-[#D4A853]">{synth.completionPct}%</strong> من مقاييس شخصيتك. كلما أكملت الاختبارات الستة أصبحت قراءة شخصيتك وخطة تدريبك وتوافقك مع دائرتك أدق بكثير.
              </p>
              <button
                type="button"
                onClick={() => setSubTab('big5')}
                className="min-h-[40px] px-4 rounded-xl bg-[#D4A853] text-[#0B0D12] text-xs font-bold cursor-pointer"
              >
                ابدأ / أكمل الاختبارات الآن
              </button>
            </div>
          )}

          {/* HERO ARCHETYPE CARD */}
          <section className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-[#1A1F2E] via-[#141722] to-[#11141C] border border-[#D4A853]/40 space-y-4 shadow-xl">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-[11px] font-bold text-[#D4A853]">
                  {synth.displayName ? `البصمة النفسية لـ ${synth.displayName}` : 'بصمتك النفسية الجامعة'}
                </div>
                <h4 className="text-xl sm:text-2xl font-extrabold text-[#F3EFE6] mt-1">
                  {synth.archetype.title}
                </h4>
                <p className="text-xs sm:text-sm text-[#D4A853]/90 mt-1">{synth.archetype.tagline}</p>
              </div>
              <div className="px-3.5 py-2 rounded-2xl bg-[#0F121B] border border-white/10 text-xs">
                <div className="text-[10px] text-[#9A9589]">النمط التفاعلي الغالب</div>
                <div className="font-bold text-[#F3EFE6] mt-0.5">{synth.dominantDiscLabel}</div>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-[#E5E0D5] leading-relaxed">
              {synth.archetype.summary}
            </p>

            {/* Inner vs Outer Mirror */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
              <div className="p-3.5 rounded-2xl bg-[#0F121B]/85 border border-white/8 space-y-1">
                <div className="text-[11px] font-bold text-sky-300">كيف يراك الآخرون من الخارج</div>
                <p className="text-xs text-[#D6D2C9] leading-relaxed">{synth.archetype.howOthersSeeYou}</p>
              </div>
              <div className="p-3.5 rounded-2xl bg-[#0F121B]/85 border border-white/8 space-y-1">
                <div className="text-[11px] font-bold text-[#D4A853]">ما تشعر به في داخلك</div>
                <p className="text-xs text-[#D6D2C9] leading-relaxed">{synth.archetype.whatYouFeelInside}</p>
              </div>
              <div className="p-3.5 rounded-2xl bg-[#0F121B]/85 border border-white/8 space-y-1">
                <div className="text-[11px] font-bold text-emerald-300">كيف تُشحن طاقتك وتُستنزف</div>
                <p className="text-xs text-[#D6D2C9] leading-relaxed">{synth.archetype.energyStyle}</p>
              </div>
            </div>

            {/* 4 Key Behavioral Signatures */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1">
              <div className="p-3 rounded-2xl bg-[#10131C] border border-white/8">
                <div className="text-[10px] text-[#9A9589]">نمط التعلق</div>
                <div className="text-xs font-bold text-[#F3EFE6] mt-0.5">{synth.attachment.name}</div>
              </div>
              <div className="p-3 rounded-2xl bg-[#10131C] border border-white/8">
                <div className="text-[10px] text-[#9A9589]">استجابتك للضغط (4F)</div>
                <div className="text-xs font-bold text-amber-300 mt-0.5">{synth.stressResponse.name}</div>
              </div>
              <div className="p-3 rounded-2xl bg-[#10131C] border border-white/8">
                <div className="text-[10px] text-[#9A9589]">أسلوبك في الصراع</div>
                <div className="text-xs font-bold text-[#F3EFE6] mt-0.5">{synth.conflictStyle.name}</div>
              </div>
              <div className="p-3 rounded-2xl bg-[#10131C] border border-white/8">
                <div className="text-[10px] text-[#9A9589]">أسلوبك في القرار</div>
                <div className="text-xs font-bold text-[#F3EFE6] mt-0.5">{synth.decisionStyle.name}</div>
              </div>
            </div>
          </section>

          {/* VISUAL ANALYTICS: RADAR + EQ 4 PILLARS + DISC + VALUES & STRESS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Radar Chart */}
            <section className="p-5 rounded-3xl bg-[#141722] border border-white/10 space-y-2">
              <div className="text-xs font-bold text-[#D4A853] text-center">
                خريطة سماتك الشخصية (Big Five + الذكاء العاطفي والثقة)
              </div>
              <RadarChart
                axes={[
                  { label: 'الانفتاح', value: synth.bigFive.openness },
                  { label: 'الانضباط', value: synth.bigFive.conscientiousness },
                  { label: 'الاجتماعية', value: synth.bigFive.extraversion },
                  { label: 'التعاطف', value: synth.bigFive.agreeableness },
                  { label: 'الثبات', value: 100 - synth.bigFive.neuroticism },
                  { label: 'الذكاء العاطفي', value: synth.eq.overall },
                  { label: 'الثقة', value: synth.confidenceScore },
                ]}
              />
            </section>

            {/* EQ 4 Pillars + DISC Breakdown */}
            <section className="p-5 rounded-3xl bg-[#141722] border border-white/10 space-y-5">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-[#F3EFE6]">أركان ذكائك العاطفي الأربعة</h4>
                  <span className="text-xs font-extrabold text-[#D4A853] tabular-nums">{synth.eq.overall}%</span>
                </div>
                {[
                  { label: 'الوعي بالذات وتسمية المشاعر', val: synth.eq.selfAwareness, color: 'bg-[#D4A853]' },
                  { label: 'التنظيم الذاتي وضبط ردة الفعل', val: synth.eq.selfRegulation, color: 'bg-emerald-400' },
                  { label: 'التعاطف وقراءة ما وراء الكلمات', val: synth.eq.empathy, color: 'bg-sky-400' },
                  { label: 'إدارة العلاقات وتهدئة الخلافات', val: synth.eq.socialSkill, color: 'bg-amber-300' },
                ].map((bar) => (
                  <div key={bar.label} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-[#D6D2C9]">{bar.label}</span>
                      <span className="font-bold text-[#F3EFE6] tabular-nums">{bar.val}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                      <div className={`h-full rounded-full ${bar.color}`} style={{ width: `${bar.val}%` }} />
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-white/8 space-y-2.5">
                <h4 className="text-sm font-bold text-[#F3EFE6]">توزيع أسلوبك التفاعلي (DISC)</h4>
                <div className="grid grid-cols-2 gap-2.5">
                  {(
                    [
                      { k: 'D', label: 'حاسم (D)', val: synth.disc.D },
                      { k: 'I', label: 'مؤثر (I)', val: synth.disc.I },
                      { k: 'S', label: 'هادئ داعم (S)', val: synth.disc.S },
                      { k: 'C', label: 'تحليلي (C)', val: synth.disc.C },
                    ] as const
                  ).map((d) => (
                    <div
                      key={d.k}
                      className={`p-2.5 rounded-xl border ${
                        synth.dominantDisc === d.k
                          ? 'bg-[#D4A853]/12 border-[#D4A853]/45'
                          : 'bg-[#0F121B] border-white/8'
                      }`}
                    >
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold text-[#F3EFE6]">{d.label}</span>
                        <span className="font-bold text-[#D4A853] tabular-nums">{d.val}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-white/10 mt-1.5 overflow-hidden">
                        <div className="h-full bg-[#D4A853]" style={{ width: `${d.val}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>

          {/* CORE VALUES & STRESS RESPONSE (4F) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <section className="p-5 rounded-3xl bg-[#141722] border border-white/10 space-y-3">
              <h4 className="text-sm font-bold text-[#D4A853]">بوصلة قيمك الأساسية (ما يحرّكك حقاً)</h4>
              <div className="space-y-2.5">
                {synth.coreValues.map((v, idx) => (
                  <div key={v.key} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className={idx < 2 ? 'text-[#F3EFE6] font-bold' : 'text-[#B7B2A6]'}>
                        {idx + 1}. {v.label}
                      </span>
                      <span className="tabular-nums text-[#D4A853] font-bold">{v.score}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${idx < 2 ? 'bg-[#D4A853]' : 'bg-white/35'}`}
                        style={{ width: `${v.score}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="p-5 rounded-3xl bg-[#141722] border border-white/10 space-y-3">
              <h4 className="text-sm font-bold text-amber-300">استجابتك اللاواعية تحت الضغط (4F)</h4>
              <div className="p-3.5 rounded-2xl bg-[#0F121B] border border-amber-400/25 space-y-1.5">
                <div className="text-xs font-extrabold text-[#F3EFE6]">{synth.stressResponse.name}</div>
                <p className="text-xs text-[#C8C3B9] leading-relaxed">{synth.stressResponse.description}</p>
                <div className="text-xs text-emerald-300 pt-1">
                  <strong>ترياقك السريع: </strong>
                  {synth.stressResponse.antidote}
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2 text-center">
                {(
                  [
                    { k: 'fight', label: 'قتال' },
                    { k: 'flight', label: 'هروب' },
                    { k: 'freeze', label: 'تجمّد' },
                    { k: 'fawn', label: 'إرضاء' },
                  ] as const
                ).map((item) => (
                  <div
                    key={item.k}
                    className={`p-2 rounded-xl border ${
                      synth.stressResponse.key === item.k
                        ? 'bg-amber-500/15 border-amber-400/45 text-amber-200'
                        : 'bg-[#0F121B] border-white/8 text-[#9A9589]'
                    }`}
                  >
                    <div className="text-[11px] font-bold">{item.label}</div>
                    <div className="text-sm font-extrabold tabular-nums mt-0.5">
                      {synth.stressResponse.scores[item.k]}%
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* PERSONAL COMMUNICATION BLUEPRINT */}
          <section className="p-5 rounded-3xl bg-[#141722] border border-[#D4A853]/25 space-y-3">
            <h4 className="text-sm font-bold text-[#D4A853]">دليل تشغيلك الشخصي في الحوارات</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-[#0F121B] border border-white/8 space-y-1">
                <div className="font-bold text-emerald-300">عند الاستماع للآخرين</div>
                <p className="text-[#D6D2C9] leading-relaxed">{synth.communicationBlueprint.whenListening}</p>
              </div>
              <div className="p-3.5 rounded-2xl bg-[#0F121B] border border-white/8 space-y-1">
                <div className="font-bold text-sky-300">عند الاختلاف في الرأي</div>
                <p className="text-[#D6D2C9] leading-relaxed">{synth.communicationBlueprint.whenDisagreeing}</p>
              </div>
              <div className="p-3.5 rounded-2xl bg-[#0F121B] border border-white/8 space-y-1">
                <div className="font-bold text-[#D4A853]">عند وضع حدودك</div>
                <p className="text-[#D6D2C9] leading-relaxed">{synth.communicationBlueprint.whenSettingBoundaries}</p>
              </div>
              <div className="p-3.5 rounded-2xl bg-[#0F121B] border border-white/8 space-y-1">
                <div className="font-bold text-amber-300">لحظة التوتر والضغط</div>
                <p className="text-[#D6D2C9] leading-relaxed">{synth.communicationBlueprint.whenStressed}</p>
              </div>
            </div>
          </section>

          {/* STRENGTHS / BLIND SPOTS / TRIGGERS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            <div className="p-4 rounded-2xl bg-[#141722] border border-emerald-500/25 space-y-2.5">
              <h4 className="text-sm font-bold text-emerald-300">نقاط قوتي</h4>
              <ul className="space-y-2 text-xs text-[#E4DFD3] leading-relaxed">
                {synth.strengths.map((s, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-emerald-400 font-bold">•</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-4 rounded-2xl bg-[#141722] border border-amber-500/25 space-y-2.5">
              <h4 className="text-sm font-bold text-amber-300">نقاطي العمياء</h4>
              <ul className="space-y-2 text-xs text-[#E4DFD3] leading-relaxed">
                {synth.blindSpots.map((s, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-amber-400 font-bold">•</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-4 rounded-2xl bg-[#141722] border border-rose-500/25 space-y-2.5">
              <h4 className="text-sm font-bold text-rose-300">محفزاتي (ما يخرجني عن هدوئي)</h4>
              <ul className="space-y-2 text-xs text-[#E4DFD3] leading-relaxed">
                {synth.triggers.map((s, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-rose-400 font-bold">•</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* INTERCONNECTED: MANIPULATION VULNERABILITIES + TOP BIASES */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <section className="p-5 rounded-3xl bg-[#141722] border border-rose-500/25 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-sm font-bold text-rose-300 flex items-center gap-1.5">
                  <ShieldIcon className="w-4 h-4" />
                  <span>أساليب تلاعب تحتاج معها حذراً مضاعفاً</span>
                </h4>
                <button
                  type="button"
                  onClick={() => onNavigateTo({ tab: 'knowledge', knowledgeSubTab: 'shield' })}
                  className="text-[11px] font-bold text-[#D4A853] hover:underline cursor-pointer shrink-0"
                >
                  افتح درع الحماية ←
                </button>
              </div>
              <div className="space-y-2">
                {synth.manipulationVulnerabilities.map((v) => (
                  <div key={v.tacticId} className="p-3 rounded-xl bg-[#0F121B] border border-white/8">
                    <div className="text-xs font-bold text-[#F3EFE6]">{v.tacticName}</div>
                    <p className="text-[11px] text-[#C5C0B5] mt-0.5 leading-relaxed">{v.reason}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="p-5 rounded-3xl bg-[#141722] border border-[#D4A853]/25 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-sm font-bold text-[#D4A853] flex items-center gap-1.5">
                  <TargetIcon className="w-4 h-4" />
                  <span>انحيازاتك المعرفية الظاهرة</span>
                </h4>
                <button
                  type="button"
                  onClick={() => onNavigateTo({ tab: 'training', trainingSubTab: 'biases' })}
                  className="text-[11px] font-bold text-[#D4A853] hover:underline cursor-pointer shrink-0"
                >
                  اختبار انحيازاتي ←
                </button>
              </div>
              {synth.topBiases.length > 0 ? (
                <div className="space-y-2">
                  {synth.topBiases.map((b) => (
                    <div key={b.key} className="p-3 rounded-xl bg-[#0F121B] border border-white/8">
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-[#F3EFE6]">{b.name}</span>
                        <span className="text-amber-300 tabular-nums">{b.pct}%</span>
                      </div>
                      <p className="text-[11px] text-[#C5C0B5] mt-1 leading-relaxed">{b.howToOvercome}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-[#0F121B] border border-white/8 text-center space-y-2">
                  <p className="text-xs text-[#9A9589]">
                    لم تكمل «اختبار انحيازاتي» بعد. إتمامه يربط أخطاء التفكير الخفية مباشرة بملفك وخطة تدريبك.
                  </p>
                  <button
                    type="button"
                    onClick={() => onNavigateTo({ tab: 'training', trainingSubTab: 'biases' })}
                    className="px-4 py-2 rounded-xl bg-[#D4A853]/15 border border-[#D4A853]/35 text-xs font-bold text-[#D4A853] cursor-pointer"
                  >
                    ابدأ اختبار انحيازاتي (15 موقفاً)
                  </button>
                </div>
              )}
            </section>
          </div>

          {/* AUTO-GENERATED ADAPTIVE TRAINING ROADMAP LINKED DIRECTLY TO YOUR PERSONALITY */}
          <section className="p-5 sm:p-6 rounded-3xl bg-gradient-to-l from-[#1C2131] to-[#141722] border border-[#D4A853]/40 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-[11px] font-bold text-[#D4A853] flex items-center gap-1.5">
                  <SparklesIcon className="w-4 h-4" />
                  <span>خطة التدريب المحدَّدة تلقائياً حسب شخصيتك</span>
                </div>
                <h4 className="text-base font-extrabold text-[#F3EFE6] mt-0.5">
                  {adaptivePlan.headline}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTo({ tab: 'training', trainingSubTab: 'program' })}
                className="min-h-[40px] px-4 rounded-xl bg-[#D4A853] text-[#0B0D12] text-xs font-bold cursor-pointer"
              >
                اذهب إلى برنامجك المخصص
              </button>
            </div>

            <p className="text-xs text-[#D6D2C9] leading-relaxed">{adaptivePlan.rationaleSummary}</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {adaptivePlan.tracks.slice(0, 4).map((track, idx) => (
                <div
                  key={track.id}
                  className={`p-4 rounded-2xl border space-y-2.5 ${
                    idx < 2
                      ? 'bg-[#0F121B] border-[#D4A853]/40'
                      : 'bg-[#0F121B]/70 border-white/8'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-extrabold text-[#F3EFE6]">
                      {idx + 1}. {track.title}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-lg tabular-nums shrink-0 ${
                        idx < 2
                          ? 'bg-[#D4A853]/20 text-[#D4A853]'
                          : 'bg-white/10 text-[#9A9589]'
                      }`}
                    >
                      {track.urgencyLabel} · {track.priority}%
                    </span>
                  </div>
                  <p className="text-[11px] text-[#C5C0B5] leading-relaxed">{track.reason}</p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => onNavigateTo(track.primaryTarget)}
                      className="px-3 py-1.5 rounded-xl bg-[#D4A853] text-[#0B0D12] text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <span>{track.primaryActionLabel}</span>
                      <ChevronLeftIcon className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onNavigateTo(track.secondaryTarget)}
                      className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-[#E5E0D5] text-[11px] font-semibold cursor-pointer"
                    >
                      {track.secondaryActionLabel}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
};

// =====================================================================
// MY BIASES QUIZ VIEW (اختبار انحيازاتي — 15 موقفاً)
// =====================================================================
interface MyBiasesQuizViewProps {
  biasQuiz: BiasQuizState;
  onUpdateBiasQuiz: (next: BiasQuizState) => void;
}

export const MyBiasesQuizView: React.FC<MyBiasesQuizViewProps> = ({
  biasQuiz,
  onUpdateBiasQuiz,
}) => {
  const [showResults, setShowResults] = useState(
    Object.keys(biasQuiz.answers).length >= MY_BIAS_QUIZ_QUESTIONS.length
  );

  const result = useMemo(() => analyzeBiasQuiz(biasQuiz.answers), [biasQuiz.answers]);

  const handlePick = (qId: number, optionId: string) => {
    const nextAnswers = { ...biasQuiz.answers, [qId]: optionId };
    const isComplete = Object.keys(nextAnswers).length >= MY_BIAS_QUIZ_QUESTIONS.length;
    onUpdateBiasQuiz({
      answers: nextAnswers,
      completedAt: isComplete ? getTodayIso() : biasQuiz.completedAt,
    });
  };

  const handleReset = () => {
    onUpdateBiasQuiz({ answers: {}, completedAt: null });
    setShowResults(false);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-[#F3EFE6] flex items-center gap-2">
            <TargetIcon className="w-5 h-5 text-[#D4A853]" />
            اختبار انحيازاتي المعرفية (15 موقفاً قصيراً)
          </h3>
          <p className="text-xs text-[#9A9589] mt-1">
            اختر ردة فعلك الأقرب للواقع في المواقف اليومية لتكتشف أقوى الانحيازات التي تؤثر على قراراتك وأحكامك — وتُربط نتائجك تلقائياً بملفك وخطة تدريبك.
          </p>
        </div>
        {result.answeredCount > 0 && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowResults((v) => !v)}
              className="px-3.5 py-2 rounded-xl bg-[#D4A853]/15 border border-[#D4A853]/35 text-xs font-bold text-[#D4A853] cursor-pointer"
            >
              {showResults ? 'العودة للأسئلة' : `عرض النتيجة (${result.answeredCount}/15)`}
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="p-2 rounded-xl bg-[#1A1E2A] border border-white/10 text-[#9A9589] hover:text-[#F3EFE6] cursor-pointer"
              title="إعادة الاختبار"
              aria-label="إعادة الاختبار"
            >
              <RefreshIcon className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Progress */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-[11px] text-[#9A9589]">
          <span>التقدم في الاختبار</span>
          <span className="text-[#D4A853] font-bold">
            {result.answeredCount} / {MY_BIAS_QUIZ_QUESTIONS.length}
          </span>
        </div>
        <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full bg-[#D4A853] transition-all"
            style={{ width: `${(result.answeredCount / MY_BIAS_QUIZ_QUESTIONS.length) * 100}%` }}
          />
        </div>
      </div>

      {showResults ? (
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-[#141722] border border-[#D4A853]/30 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-xs text-[#D4A853] font-bold">ملخص وعيك المعرفي</div>
              <div className="text-xl font-extrabold text-[#F3EFE6] mt-1">
                {result.balancedCount} استجابة متزنة من أصل {result.answeredCount}
              </div>
              <p className="text-xs text-[#9A9589] mt-1">
                تم ربط هذه النتيجة تلقائياً بملفك الشخصي وبمسار «وضوح القرار» في خطة تدريبك.
              </p>
            </div>
            <div className="px-4 py-2.5 rounded-2xl bg-[#D4A853]/15 border border-[#D4A853]/35 text-center">
              <div className="text-2xl font-extrabold text-[#D4A853] tabular-nums">
                {result.answeredCount > 0
                  ? Math.round((result.balancedCount / result.answeredCount) * 100)
                  : 0}
                %
              </div>
              <div className="text-[10px] text-[#B7B2A6]">مؤشر التفكير المتزن</div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="text-xs font-bold text-[#F3EFE6]">أقوى الانحيازات الظاهرة في إجاباتك:</div>
            {result.rankedBiases.map((b) => {
              const meta = BIAS_META[b.key];
              return (
                <div
                  key={b.key}
                  className="p-4 rounded-2xl bg-[#141722] border border-white/10 space-y-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-[#F3EFE6]">{meta.name}</span>
                    <span
                      className={`text-xs font-bold px-2.5 py-0.5 rounded-lg ${
                        b.pct >= 50
                          ? 'bg-rose-500/15 text-rose-300'
                          : b.pct > 0
                          ? 'bg-amber-500/15 text-amber-300'
                          : 'bg-emerald-500/15 text-emerald-300'
                      }`}
                    >
                      {b.pct >= 50 ? 'مرتفع' : b.pct > 0 ? 'متوسط' : 'منخفض'} ({b.pct}%)
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className={`h-full ${
                        b.pct >= 50 ? 'bg-rose-400' : b.pct > 0 ? 'bg-[#D4A853]' : 'bg-emerald-400'
                      }`}
                      style={{ width: `${Math.max(5, b.pct)}%` }}
                    />
                  </div>
                  <p className="text-xs text-[#9A9589] leading-relaxed">{meta.summary}</p>
                  <div className="p-3 rounded-xl bg-[#1A1E2A] border border-[#D4A853]/20 text-xs text-[#E8E2D6] leading-relaxed">
                    <span className="text-[#D4A853] font-bold">كيف تتغلب عليه: </span>
                    {meta.howToOvercome}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="space-y-3.5">
          {MY_BIAS_QUIZ_QUESTIONS.map((q) => {
            const chosen = biasQuiz.answers[q.id];
            return (
              <div
                key={q.id}
                className="p-4 rounded-2xl bg-[#141722] border border-white/10 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-[#F3EFE6] leading-relaxed">
                    <span className="text-[#D4A853] font-bold ml-1.5">{q.id}.</span>
                    {q.scenario}
                  </p>
                  {chosen && <CheckIcon className="w-4 h-4 text-emerald-400 shrink-0 mt-1" />}
                </div>
                <div className="space-y-2">
                  {q.options.map((opt) => {
                    const active = chosen === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => handlePick(q.id, opt.id)}
                        className={`w-full text-right p-3 rounded-xl border text-xs leading-relaxed transition cursor-pointer ${
                          active
                            ? 'bg-[#D4A853]/18 border-[#D4A853] text-[#F3EFE6] font-semibold'
                            : 'bg-[#1A1E2A] border-white/8 text-[#B7B2A6] hover:border-white/25'
                        }`}
                      >
                        {opt.text}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          <button
            type="button"
            onClick={() => setShowResults(true)}
            disabled={result.answeredCount < 5}
            className="w-full py-3.5 rounded-2xl bg-[#D4A853] text-[#0B0D12] text-sm font-bold disabled:opacity-40 cursor-pointer"
          >
            {result.answeredCount < 5
              ? `أجب عن 5 مواقف على الأقل لعرض التحليل (${result.answeredCount}/15)`
              : 'كشف خريطة انحيازاتي وربطها بملفي'}
          </button>
        </div>
      )}
    </div>
  );
};
