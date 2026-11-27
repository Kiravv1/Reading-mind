import React, { useEffect, useMemo, useState } from 'react';
import {
  ACHIEVEMENT_BADGES,
  COGNITIVE_DISTORTIONS,
  CONFIDENCE_CARDS,
  EMOTION_OPTIONS,
  MINI_SPEECH_PROMPTS,
  PRESENCE_CARDS,
  THIRTY_DAY_PROGRAM,
} from '../data/trainingData';
import {
  AppNavigateTarget,
  AppState,
  BiasQuizState,
  CbtEntry,
  DecisionEntry,
  MoodEntry,
  SelfProfileData,
  StoicEntry,
  VoiceEvalEntry,
  WeeklyEvaluation,
} from '../types';
import { getUserLevel } from '../data/selfAndBiasData';
import {
  buildAdaptiveTrainingPlan,
  getPersonalizedTodayChallenge,
} from '../engine/personalization';
import { formatArabicDate, generateId, getTodayIso } from '../utils/storage';
import { MoodLineChart, WeeklyProgressChart } from './Charts';
import {
  DecisionsJournalPanel,
  HabitsMoodPanel,
  PersonalStatsPanel,
} from './DecisionsHabitsStats';
import { MyBiasesQuizView, SelfProfileView } from './SelfProfilePanel';
import { SoundVisualStudio } from './SoundVisualStudio';
import { VoiceTrainerPanel } from './VoiceTrainerPanel';
import {
  AwardIcon,
  CheckIcon,
  ChevronLeftIcon,
  ClockIcon,
  HeartSupportIcon,
  RefreshIcon,
  SparklesIcon,
  TrashIcon,
} from './Icons';

export type TrainingSubTab =
  | 'program'
  | 'self'
  | 'biases'
  | 'sounds'
  | 'voice'
  | 'decisions'
  | 'habits'
  | 'emotional'
  | 'presence'
  | 'confidence'
  | 'stats'
  | 'weekly';

interface TrainingSectionProps {
  state: AppState;
  initialSubTab?: TrainingSubTab;
  onCompleteDay: (day: number) => void;
  onCompleteDailyChallenge: (dateIso: string, xpReward: number) => void;
  onAddMood: (entry: MoodEntry) => void;
  onAddCbt: (entry: CbtEntry) => void;
  onDeleteCbt: (id: string) => void;
  onAddStoic: (entry: StoicEntry) => void;
  onTogglePresence: (itemId: string) => void;
  onToggleConfidence: (itemId: string) => void;
  onAddWeekly: (entry: WeeklyEvaluation) => void;
  onUpdateSelfProfile: (next: SelfProfileData) => void;
  onUpdateBiasQuiz: (next: BiasQuizState) => void;
  onAddDecision: (entry: DecisionEntry) => void;
  onUpdateDecision: (entry: DecisionEntry) => void;
  onDeleteDecision: (id: string) => void;
  onToggleHabit: (habitId: string, dateIso: string) => void;
  onAddVoiceEval: (entry: VoiceEvalEntry) => void;
  onDeleteVoiceEval: (id: string) => void;
  onNavigateTo: (target: AppNavigateTarget) => void;
}

const BREATH_MODES = {
  box: {
    name: 'تنفس الصندوق (4-4-4-4)',
    desc: 'يُستخدم لتهدئة الجهاز العصبي سريعاً واستعادة التركيز تحت الضغط.',
    phases: [
      { label: 'شهيق هادئ من الأنف', seconds: 4, scale: 1.18 },
      { label: 'ثبات وهدوء', seconds: 4, scale: 1.18 },
      { label: 'زفير بطيء ومستمر', seconds: 4, scale: 0.85 },
      { label: 'راحة قبل الدورة التالية', seconds: 4, scale: 0.85 },
    ],
  },
  calm478: {
    name: 'تنفس التهدئة العميقة (4-7-8)',
    desc: 'الزفير الطويل ينشّط العصب الحائر ويخفض استجابة التوتر والقلق.',
    phases: [
      { label: 'شهيق هادئ من الأنف', seconds: 4, scale: 1.18 },
      { label: 'حبس النفس بلطف', seconds: 7, scale: 1.18 },
      { label: 'زفير طويل وبطيء', seconds: 8, scale: 0.82 },
    ],
  },
};

const GROUNDING_STEPS = [
  { count: 5, title: 'خمسة أشياء تراها حولك الآن', hint: 'تأمل تفاصيلها وألوانها بهدوء.' },
  { count: 4, title: 'أربعة أشياء تلمسها بيديك أو قدميك', hint: 'ملمس الكرسي، الملابس، الأرض تحت قدميك.' },
  { count: 3, title: 'ثلاثة أصوات تسمعها الآن', hint: 'صوت بعيد، صوت مكيف، أو صوت تنفسك.' },
  { count: 2, title: 'رائحتان تميزهما أو تتذكرهما بلطف', hint: 'هواء الغرفة، قهوة، أو عطر هادئ.' },
  { count: 1, title: 'حقيقة واحدة آمنة في هذه اللحظة', hint: 'ذكّر نفسك: أنا هنا الآن وفي أمان.' },
];

export const TrainingSection: React.FC<TrainingSectionProps> = ({
  state,
  initialSubTab = 'program',
  onCompleteDay,
  onCompleteDailyChallenge,
  onAddMood,
  onAddCbt,
  onDeleteCbt,
  onAddStoic,
  onTogglePresence,
  onToggleConfidence,
  onAddWeekly,
  onUpdateSelfProfile,
  onUpdateBiasQuiz,
  onAddDecision,
  onUpdateDecision,
  onDeleteDecision,
  onToggleHabit,
  onAddVoiceEval,
  onDeleteVoiceEval,
  onNavigateTo,
}) => {
  const [subTab, setSubTab] = useState<TrainingSubTab>(initialSubTab);
  const [daysFilter, setDaysFilter] = useState<'recommended' | 'all'>('recommended');

  useEffect(() => {
    setSubTab(initialSubTab);
  }, [initialSubTab]);

  // Breathing & Grounding Timer State
  const [breathType, setBreathType] = useState<'box' | 'calm478' | 'grounding'>('box');
  const [breathRunning, setBreathRunning] = useState(false);
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [phaseSecLeft, setPhaseSecLeft] = useState(4);
  const [cyclesDone, setCyclesDone] = useState(0);
  const [groundingIdx, setGroundingIdx] = useState(0);

  // Mood Form State
  const [moodLevel, setMoodLevel] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [moodEmotions, setMoodEmotions] = useState<string[]>([]);
  const [moodNote, setMoodNote] = useState('');
  const [moodSavedFlag, setMoodSavedFlag] = useState(false);

  // CBT Form State
  const [cbtSit, setCbtSit] = useState('');
  const [cbtThought, setCbtThought] = useState('');
  const [cbtDistortion, setCbtDistortion] = useState(COGNITIVE_DISTORTIONS[0]);
  const [cbtEmotion, setCbtEmotion] = useState('قلق');
  const [cbtBefore, setCbtBefore] = useState(70);
  const [cbtAlt, setCbtAlt] = useState('');
  const [cbtAfter, setCbtAfter] = useState(35);

  // Stoic Form State
  const [stoicSit, setStoicSit] = useState('');
  const [stoicIn, setStoicIn] = useState('');
  const [stoicOut, setStoicOut] = useState('');
  const [stoicAct, setStoicAct] = useState('');

  // 60s Mini-Speech Timer
  const [speechPromptIdx, setSpeechPromptIdx] = useState(0);
  const [speechSec, setSpeechSec] = useState(60);
  const [speechRunning, setSpeechRunning] = useState(false);

  // Weekly Evaluation State
  const [wEmotional, setWEmotional] = useState(7);
  const [wBoundaries, setWBoundaries] = useState(7);
  const [wPresence, setWPresence] = useState(7);
  const [wPersuasion, setWPersuasion] = useState(7);
  const [wDiscipline, setWDiscipline] = useState(7);
  const [wNote, setWNote] = useState('');

  // Expanded day in 30-day program
  const [expandedDay, setExpandedDay] = useState<number>(() => {
    const firstOpen = THIRTY_DAY_PROGRAM.find(
      (m) => !state.completedDays.includes(m.day)
    );
    return firstOpen ? firstOpen.day : 1;
  });

  // Breathing interval
  useEffect(() => {
    if (!breathRunning || breathType === 'grounding') return;
    const mode = BREATH_MODES[breathType];
    const timer = window.setInterval(() => {
      setPhaseSecLeft((prev) => {
        if (prev > 1) return prev - 1;
        setPhaseIdx((currIdx) => {
          const nextIdx = (currIdx + 1) % mode.phases.length;
          if (nextIdx === 0) setCyclesDone((c) => c + 1);
          setPhaseSecLeft(mode.phases[nextIdx].seconds);
          return nextIdx;
        });
        return mode.phases[0].seconds;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [breathRunning, breathType]);

  // Mini-speech 60s timer
  useEffect(() => {
    if (!speechRunning) return;
    const timer = window.setInterval(() => {
      setSpeechSec((prev) => {
        if (prev <= 1) {
          setSpeechRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [speechRunning]);

  const unlockedBadges = useMemo(() => {
    const set = new Set<string>();
    const done = state.completedDays.length;
    if (done >= 1) set.add('first_day');
    if (state.streakDays >= 3) set.add('streak_3');
    if (done >= 7) set.add('week_one');
    if (done >= 15) set.add('half_way');
    if (done >= 30) set.add('master_30');
    if (state.people.some((p) => Object.keys(p.answers || {}).length >= 20)) {
      set.add('analyst');
    }
    if (state.cbtLogs.length + state.stoicLogs.length >= 3) {
      set.add('cbt_master');
    }
    const simPassed = Object.values(state.simResults).filter((r) => r.bestScore >= 75).length;
    if (simPassed >= 3) set.add('sim_pro');
    return set;
  }, [state]);

  const handleSelectBreathMode = (m: 'box' | 'calm478' | 'grounding') => {
    setBreathRunning(false);
    setBreathType(m);
    setPhaseIdx(0);
    setCyclesDone(0);
    setGroundingIdx(0);
    if (m !== 'grounding') {
      setPhaseSecLeft(BREATH_MODES[m].phases[0].seconds);
    }
  };

  const handleSaveMood = (e: React.FormEvent) => {
    e.preventDefault();
    onAddMood({
      id: generateId('mood'),
      date: getTodayIso(),
      timestamp: new Date().toISOString(),
      level: moodLevel,
      emotions: moodEmotions,
      note: moodNote.trim(),
    });
    setMoodNote('');
    setMoodSavedFlag(true);
    setTimeout(() => setMoodSavedFlag(false), 2000);
  };

  const handleSaveCbt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cbtSit.trim() || !cbtThought.trim() || !cbtAlt.trim()) return;
    onAddCbt({
      id: generateId('cbt'),
      date: getTodayIso(),
      situation: cbtSit.trim(),
      automaticThought: cbtThought.trim(),
      distortion: cbtDistortion,
      emotion: cbtEmotion,
      intensityBefore: cbtBefore,
      alternativeThought: cbtAlt.trim(),
      intensityAfter: cbtAfter,
    });
    setCbtSit('');
    setCbtThought('');
    setCbtAlt('');
  };

  const handleSaveStoic = (e: React.FormEvent) => {
    e.preventDefault();
    if (!stoicSit.trim() || !stoicIn.trim()) return;
    onAddStoic({
      id: generateId('stoic'),
      date: getTodayIso(),
      situation: stoicSit.trim(),
      inMyControl: stoicIn.trim(),
      outOfControl: stoicOut.trim(),
      virtuousAction: stoicAct.trim(),
    });
    setStoicSit('');
    setStoicIn('');
    setStoicOut('');
    setStoicAct('');
  };

  const handleSaveWeekly = (e: React.FormEvent) => {
    e.preventDefault();
    const num = state.weeklyEvaluations.length + 1;
    onAddWeekly({
      id: generateId('week'),
      date: getTodayIso(),
      weekLabel: `أسبوع ${num}`,
      scores: {
        emotionalBalance: wEmotional,
        boundaries: wBoundaries,
        presence: wPresence,
        persuasion: wPersuasion,
        discipline: wDiscipline,
      },
      note: wNote.trim(),
    });
    setWNote('');
  };

  const latestWeeklyInsight = useMemo(() => {
    const last = state.weeklyEvaluations[0];
    if (!last) return null;
    const entries: { label: string; val: number }[] = [
      { label: 'الاتزان العاطفي', val: last.scores.emotionalBalance },
      { label: 'الحزم والحدود', val: last.scores.boundaries },
      { label: 'الحضور ولغة الجسد', val: last.scores.presence },
      { label: 'الاستماع والإقناع', val: last.scores.persuasion },
      { label: 'الانضباط الذاتي', val: last.scores.discipline },
    ];
    entries.sort((a, b) => b.val - a.val);
    return {
      strongest: entries[0],
      growth: entries[entries.length - 1],
      avg: (
        entries.reduce((a, b) => a + b.val, 0) / entries.length
      ).toFixed(1),
    };
  }, [state.weeklyEvaluations]);

  const progressPct = Math.round((state.completedDays.length / 30) * 100);
  const todayIso = getTodayIso();
  const adaptivePlan = useMemo(() => buildAdaptiveTrainingPlan(state), [state]);
  const { challenge: todayChallenge, matchReason: challengeMatchReason } = useMemo(
    () => getPersonalizedTodayChallenge(todayIso, adaptivePlan),
    [todayIso, adaptivePlan]
  );
  const isChallengeDone = state.completedChallengeDates.includes(todayIso);
  const levelInfo = useMemo(() => getUserLevel(state.xpPoints), [state.xpPoints]);

  const priorityDayMap = useMemo(() => {
    const map = new Map<number, string>();
    adaptivePlan.priorityDays.forEach((d) => map.set(d.day, d.reason));
    return map;
  }, [adaptivePlan.priorityDays]);

  const visibleDays = useMemo(() => {
    if (daysFilter === 'recommended' && adaptivePlan.isPersonalized) {
      const order = new Map(adaptivePlan.priorityDays.map((d, idx) => [d.day, idx]));
      return THIRTY_DAY_PROGRAM.filter((m) => order.has(m.day)).sort(
        (a, b) => (order.get(a.day) ?? 99) - (order.get(b.day) ?? 99)
      );
    }
    return THIRTY_DAY_PROGRAM;
  }, [daysFilter, adaptivePlan]);

  return (
    <div className="space-y-6 animate-view">
      {/* Sub-navigation bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
        {(
          [
            { id: 'program', label: 'خطتي و30 يوماً' },
            { id: 'self', label: 'ملفي أنا' },
            { id: 'biases', label: 'اختبار انحيازاتي' },
            { id: 'sounds', label: 'الصوتيات والهدوء' },
            { id: 'voice', label: 'مدرب الصوت' },
            { id: 'decisions', label: 'مفكرة القرارات' },
            { id: 'habits', label: 'العادات والمزاج' },
            { id: 'emotional', label: 'الاتزان العاطفي' },
            { id: 'presence', label: 'الحضور والهيبة' },
            { id: 'confidence', label: 'الثقة والإقناع' },
            { id: 'stats', label: 'إحصائياتي' },
            { id: 'weekly', label: 'التقييم الأسبوعي' },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setSubTab(t.id)}
            className={`min-h-[44px] px-4 rounded-2xl text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0 border transition-colors cursor-pointer ${
              subTab === t.id
                ? 'bg-[#D4A853] border-[#D4A853] text-[#0B0D12]'
                : 'bg-[#141720] border-white/[0.08] text-[#9CA3AF] hover:text-[#F2EFE9]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* NEW SUB-TABS */}
      {subTab === 'self' && (
        <SelfProfileView
          state={state}
          onUpdateSelfProfile={onUpdateSelfProfile}
          onNavigateTo={onNavigateTo}
        />
      )}

      {subTab === 'biases' && (
        <MyBiasesQuizView
          biasQuiz={state.biasQuiz}
          onUpdateBiasQuiz={onUpdateBiasQuiz}
        />
      )}

      {subTab === 'sounds' && (
        <SoundVisualStudio
          recommendedSoundId={adaptivePlan.recommendedSoundId}
          recommendedSoundReason={adaptivePlan.recommendedSoundReason}
        />
      )}

      {subTab === 'voice' && (
        <VoiceTrainerPanel
          voiceEvals={state.voiceEvals}
          onAddVoiceEval={onAddVoiceEval}
          onDeleteVoiceEval={onDeleteVoiceEval}
        />
      )}

      {subTab === 'decisions' && (
        <DecisionsJournalPanel
          decisions={state.decisions}
          onAddDecision={onAddDecision}
          onUpdateDecision={onUpdateDecision}
          onDeleteDecision={onDeleteDecision}
        />
      )}

      {subTab === 'habits' && (
        <HabitsMoodPanel
          habitLogs={state.habitLogs}
          moodLogs={state.moodLogs}
          onToggleHabit={onToggleHabit}
          recommendedHabitId={adaptivePlan.recommendedHabitId}
          recommendedHabitReason={adaptivePlan.recommendedHabitReason}
        />
      )}

      {subTab === 'stats' && <PersonalStatsPanel state={state} />}

      {/* 1. ADAPTIVE PERSONAL PLAN + DAILY CHALLENGE + 30-DAY PROGRAM */}
      {subTab === 'program' && (
        <div className="space-y-6">
          {/* PERSONALIZED ADAPTIVE TRAINING PLAN CARD */}
          <section className="rounded-3xl bg-gradient-to-br from-[#1B2030] via-[#151924] to-[#12151E] border border-[#D4A853]/40 p-5 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-[11px] font-bold text-[#D4A853] flex items-center gap-1.5">
                  <SparklesIcon className="w-4 h-4" />
                  <span>التدريب التكيّفي المرتبط بملفك الشخصي</span>
                </div>
                <h2 className="text-base sm:text-lg font-extrabold text-[#F2EFE9] mt-0.5">
                  {adaptivePlan.headline}
                </h2>
                <p className="text-xs text-[#C8C3B9] mt-1 leading-relaxed">
                  {adaptivePlan.rationaleSummary}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSubTab('self')}
                className="min-h-[38px] px-3.5 rounded-xl bg-[#D4A853]/15 border border-[#D4A853]/35 text-[#D4A853] text-xs font-bold shrink-0 cursor-pointer"
              >
                {adaptivePlan.isPersonalized ? 'تحديث ملفي أنا' : 'ابدأ تحليل شخصيتي ←'}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[adaptivePlan.primaryTrack, adaptivePlan.secondaryTrack].map((track, idx) => (
                <div
                  key={track.id}
                  className="p-4 rounded-2xl bg-[#0F121B]/90 border border-white/10 space-y-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-extrabold text-[#F2EFE9]">
                      {idx === 0 ? 'الأولوية الأولى: ' : 'الأولوية الثانية: '}
                      {track.shortTitle}
                    </span>
                    <span className="text-[10px] font-bold text-[#D4A853] tabular-nums">
                      أولوية {track.priority}%
                    </span>
                  </div>
                  <p className="text-[11px] text-[#B8B4AA] leading-relaxed">{track.reason}</p>
                  <div className="flex flex-wrap gap-2 pt-0.5">
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
                      className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-[#E5E2DC] text-[11px] font-semibold cursor-pointer"
                    >
                      {track.secondaryActionLabel}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* DAILY MICRO-CHALLENGE & XP LEVEL CARD */}
          <section className="rounded-3xl bg-gradient-to-l from-[#1C2130] to-[#141720] border border-[#D4A853]/35 p-5 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-[#D4A853]/15 border border-[#D4A853]/35 text-[#D4A853] flex items-center justify-center shrink-0">
                  <SparklesIcon className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[11px] font-bold text-[#D4A853]">
                    تحدي اليوم · {todayChallenge.category} · +{todayChallenge.xp} XP
                  </div>
                  <div className="text-xs text-[#9CA3AF]">
                    المستوى {levelInfo.level}: {levelInfo.title} ({state.xpPoints} نقطة)
                  </div>
                </div>
              </div>
              <button
                type="button"
                disabled={isChallengeDone}
                onClick={() => onCompleteDailyChallenge(todayIso, todayChallenge.xp)}
                className={`min-h-[42px] px-4 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                  isChallengeDone
                    ? 'bg-emerald-500/15 border border-emerald-500/35 text-emerald-300'
                    : 'bg-[#D4A853] text-[#0B0D12] hover:bg-[#E2BA6B]'
                }`}
              >
                <CheckIcon className="w-4 h-4" />
                <span>{isChallengeDone ? 'تم إنجاز تحدي اليوم ✓' : 'أنجزت التحدي (+25 XP)'}</span>
              </button>
            </div>

            {challengeMatchReason && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#D4A853]/12 border border-[#D4A853]/30 text-[11px] font-bold text-[#D4A853]">
                <SparklesIcon className="w-3.5 h-3.5" />
                <span>{challengeMatchReason}</span>
              </div>
            )}

            <p className="text-sm sm:text-base font-bold text-[#F2EFE9] leading-relaxed">
              {todayChallenge.title}
            </p>
            <p className="text-xs text-[#B8B4AA] leading-relaxed">
              <strong className="text-[#D4A853]">تلميح: </strong>
              {todayChallenge.tip}
            </p>

            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-[#9CA3AF]">
                <span>تقدمك نحو المستوى التالي</span>
                <span className="text-[#D4A853] font-bold tabular-nums">
                  {levelInfo.progressPct}%
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-[#D4A853] transition-all"
                  style={{ width: `${levelInfo.progressPct}%` }}
                />
              </div>
            </div>
          </section>

          {/* Progress Header */}
          <section className="rounded-3xl bg-[#141720] border border-white/[0.08] p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-lg font-bold text-[#F2EFE9]">
                  برنامج بناء الذات (30 يوماً)
                </h1>
                <p className="text-xs text-[#9CA3AF] mt-0.5">
                  مهمة يومية تطبيقية من 5 إلى 10 دقائق لبناء الاتزان، الحضور، والتأثير الأخلاقي
                </p>
              </div>
              <div className="text-left tabular-nums">
                <div className="text-2xl font-bold text-[#D4A853]">
                  {state.completedDays.length} / 30
                </div>
                <div className="text-xs text-[#9CA3AF]">
                  سلسلة متتالية: {state.streakDays} يوم
                </div>
              </div>
            </div>
            <div className="mt-4 h-2 rounded-full bg-white/[0.07] overflow-hidden">
              <div
                className="h-full rounded-full bg-[#D4A853] transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </section>

          {/* Achievement Badges */}
          <section className="rounded-3xl bg-[#141720] border border-white/[0.08] p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-[#F2EFE9]">شارات الإنجاز</h2>
              <span className="text-xs text-[#D4A853] tabular-nums">
                {unlockedBadges.size} / {ACHIEVEMENT_BADGES.length} مكتسبة
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {ACHIEVEMENT_BADGES.map((b) => {
                const earned = unlockedBadges.has(b.id);
                return (
                  <div
                    key={b.id}
                    className={`p-3.5 rounded-2xl border transition-colors ${
                      earned
                        ? 'bg-[#D4A853]/12 border-[#D4A853]/40'
                        : 'bg-[#1B1F2B]/70 border-white/[0.06] opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <AwardIcon
                        className={`w-5 h-5 ${earned ? 'text-[#D4A853]' : 'text-[#6B7280]'}`}
                      />
                      <span className="text-[10px] text-[#9CA3AF]">{b.conditionLabel}</span>
                    </div>
                    <div className="text-xs font-bold text-[#F2EFE9]">{b.title}</div>
                    <p className="text-[11px] text-[#B8B4AA] mt-1 leading-snug">
                      {b.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>

          {/* 30 Days List with Personalized Filter */}
          <section className="space-y-3">
            {adaptivePlan.isPersonalized && (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs font-bold text-[#D4A853]">
                  أيام برنامج الـ30 يوماً (مرتّبة حسب احتياج شخصيتك)
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setDaysFilter('recommended')}
                    className={`min-h-[38px] px-3.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                      daysFilter === 'recommended'
                        ? 'bg-[#D4A853] border-[#D4A853] text-[#0B0D12]'
                        : 'bg-[#141720] border-white/10 text-[#9CA3AF]'
                    }`}
                  >
                    المخصصة لشخصيتي ({adaptivePlan.priorityDays.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setDaysFilter('all')}
                    className={`min-h-[38px] px-3.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                      daysFilter === 'all'
                        ? 'bg-[#D4A853] border-[#D4A853] text-[#0B0D12]'
                        : 'bg-[#141720] border-white/10 text-[#9CA3AF]'
                    }`}
                  >
                    جميع الأيام (30)
                  </button>
                </div>
              </div>
            )}

            {visibleDays.map((m) => {
              const done = state.completedDays.includes(m.day);
              const open = expandedDay === m.day;
              const matchReason = priorityDayMap.get(m.day);
              return (
                <div
                  key={m.day}
                  className={`rounded-2xl border transition-colors ${
                    done
                      ? 'bg-[#141720] border-emerald-500/25'
                      : matchReason && adaptivePlan.isPersonalized
                      ? 'bg-[#141720] border-[#D4A853]/30'
                      : 'bg-[#141720] border-white/[0.08]'
                  }`}
                >
                  <div className="p-4 flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setExpandedDay(open ? -1 : m.day)}
                      className="flex-1 text-right cursor-pointer"
                    >
                      <div className="flex flex-wrap items-center gap-2 text-xs text-[#9CA3AF] tabular-nums">
                        <span>
                          اليوم {m.day} · {m.pillar} · {m.duration}
                        </span>
                        {matchReason && adaptivePlan.isPersonalized && (
                          <span className="text-[10px] font-bold text-[#D4A853]">
                            ★ موصى به لشخصيتك
                          </span>
                        )}
                      </div>
                      <div className="text-sm font-bold text-[#F2EFE9] mt-0.5">
                        {m.title}
                      </div>
                      {matchReason && adaptivePlan.isPersonalized && (
                        <div className="text-[11px] text-[#C8C3B9] mt-1">
                          لماذا لك: {matchReason}
                        </div>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => onCompleteDay(m.day)}
                      aria-label={done ? 'إلغاء الإتمام' : 'تحديد كمكتمل'}
                      className={`min-h-[44px] min-w-[44px] rounded-xl border flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                        done
                          ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300'
                          : 'bg-[#1B1F2B] border-white/[0.1] text-[#9CA3AF] hover:border-[#D4A853] hover:text-[#D4A853]'
                      }`}
                    >
                      <CheckIcon className="w-5 h-5" />
                    </button>
                  </div>

                  {open && (
                    <div className="px-4 pb-4 pt-3 border-t border-white/[0.06] space-y-2.5 text-sm text-[#D6D2C9]">
                      <p>
                        <strong className="text-[#D4A853]">الهدف: </strong>
                        {m.objective}
                      </p>
                      <p className="leading-relaxed">
                        <strong className="text-[#D4A853]">التطبيق العملي: </strong>
                        {m.action}
                      </p>
                      <p className="text-xs text-[#9CA3AF] pt-1">
                        سؤال التأمل: {m.reflectionQuestion}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </section>
        </div>
      )}

      {/* 2. EMOTIONAL BALANCE */}
      {subTab === 'emotional' && (
        <div className="space-y-6">
          {/* Interactive Breathing & Grounding Timer */}
          <section className="rounded-3xl bg-[#141720] border border-white/[0.08] p-5 sm:p-6 space-y-5">
            <div>
              <h2 className="text-base font-bold text-[#F2EFE9]">
                تمارين التنفس والتأريض الحسي بمؤقت
              </h2>
              <p className="text-xs text-[#9CA3AF] mt-0.5">
                أدوات فورية لتهدئة الجهاز العصبي قبل أو بعد المواقف الضاغطة
              </p>
            </div>

            <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-[#0B0D12] border border-white/[0.06]">
              {(
                [
                  { id: 'box', label: 'تنفس الصندوق' },
                  { id: 'calm478', label: 'تهدئة 4-7-8' },
                  { id: 'grounding', label: 'تأريض 5-4-3-2-1' },
                ] as const
              ).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => handleSelectBreathMode(m.id)}
                  className={`min-h-[42px] rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                    breathType === m.id
                      ? 'bg-[#D4A853] text-[#0B0D12]'
                      : 'text-[#9CA3AF] hover:text-[#F2EFE9]'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {breathType !== 'grounding' ? (
              <div className="flex flex-col items-center text-center py-4 space-y-4">
                <p className="text-xs text-[#9CA3AF] max-w-md">
                  {BREATH_MODES[breathType].desc}
                </p>

                <div className="relative w-44 h-44 flex items-center justify-center">
                  <div
                    className="w-32 h-32 rounded-full bg-[#D4A853]/12 border-2 border-[#D4A853] flex flex-col items-center justify-center transition-transform duration-1000 ease-in-out"
                    style={{
                      transform: breathRunning
                        ? `scale(${BREATH_MODES[breathType].phases[phaseIdx].scale})`
                        : 'scale(1)',
                    }}
                  >
                    <span className="text-3xl font-bold text-[#F2EFE9] tabular-nums">
                      {phaseSecLeft}
                    </span>
                    <span className="text-[11px] text-[#D4A853] mt-1 px-2">
                      {breathRunning
                        ? BREATH_MODES[breathType].phases[phaseIdx].label
                        : 'جاهز للبدء'}
                    </span>
                  </div>
                </div>

                <div className="text-xs text-[#9CA3AF] tabular-nums">
                  الدورات المكتملة: {cyclesDone}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (!breathRunning) {
                      setPhaseIdx(0);
                      setPhaseSecLeft(BREATH_MODES[breathType].phases[0].seconds);
                      setBreathRunning(true);
                    } else {
                      setBreathRunning(false);
                    }
                  }}
                  className="min-h-[48px] px-8 rounded-2xl bg-[#D4A853] text-[#0B0D12] text-sm font-bold hover:bg-[#E2BA6B] transition-colors cursor-pointer"
                >
                  {breathRunning ? 'إيقاف المؤقت' : 'ابدأ تمرين التنفس'}
                </button>
              </div>
            ) : (
              <div className="p-5 rounded-2xl bg-[#1B1F2B] border border-white/[0.06] space-y-4">
                <div className="flex items-center justify-between text-xs text-[#D4A853] font-bold tabular-nums">
                  <span>الخطوة {groundingIdx + 1} من 5</span>
                  <span>العدد: {GROUNDING_STEPS[groundingIdx].count}</span>
                </div>
                <h3 className="text-lg font-bold text-[#F2EFE9]">
                  {GROUNDING_STEPS[groundingIdx].title}
                </h3>
                <p className="text-sm text-[#C8C3B9]">
                  {GROUNDING_STEPS[groundingIdx].hint}
                </p>
                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setGroundingIdx((i) => Math.max(0, i - 1))}
                    disabled={groundingIdx === 0}
                    className="min-h-[44px] px-4 rounded-xl bg-[#141720] text-[#F2EFE9] text-xs font-semibold disabled:opacity-40 cursor-pointer"
                  >
                    السابق
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setGroundingIdx((i) =>
                        i < GROUNDING_STEPS.length - 1 ? i + 1 : 0
                      )
                    }
                    className="flex-1 min-h-[44px] rounded-xl bg-[#D4A853] text-[#0B0D12] text-xs font-bold cursor-pointer"
                  >
                    {groundingIdx < GROUNDING_STEPS.length - 1
                      ? 'أتممتها — الخطوة التالية'
                      : 'إعادة التمرين من البداية'}
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* Mood Check-in + Mood Journal Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <form
              onSubmit={handleSaveMood}
              className="rounded-3xl bg-[#141720] border border-white/[0.08] p-5 sm:p-6 space-y-4"
            >
              <h2 className="text-base font-bold text-[#F2EFE9]">فحص الحالة ويوميات المزاج</h2>

              <div className="grid grid-cols-5 gap-2">
                {(
                  [
                    { lvl: 1, label: 'شديد السوء' },
                    { lvl: 2, label: 'منخفض' },
                    { lvl: 3, label: 'متوازن' },
                    { lvl: 4, label: 'جيد' },
                    { lvl: 5, label: 'ممتاز' },
                  ] as const
                ).map((m) => (
                  <button
                    key={m.lvl}
                    type="button"
                    onClick={() => setMoodLevel(m.lvl)}
                    className={`min-h-[56px] rounded-2xl border flex flex-col items-center justify-center p-1.5 transition-colors cursor-pointer ${
                      moodLevel === m.lvl
                        ? m.lvl === 1
                          ? 'bg-rose-500/20 border-rose-400 text-rose-100'
                          : 'bg-[#D4A853]/15 border-[#D4A853] text-[#F2EFE9]'
                        : 'bg-[#1B1F2B] border-white/[0.06] text-[#9CA3AF]'
                    }`}
                  >
                    <span className="text-base font-bold tabular-nums">{m.lvl}</span>
                    <span className="text-[10px]">{m.label}</span>
                  </button>
                ))}
              </div>

              {/* Ethical Safeguard for Severe Low Mood */}
              {moodLevel === 1 && (
                <div className="p-4 rounded-2xl bg-rose-500/12 border border-rose-400/35 space-y-2">
                  <div className="flex items-center gap-2 text-sm font-bold text-rose-200">
                    <HeartSupportIcon className="w-4 h-4 shrink-0" />
                    <span>رسالة دعم مهمة</span>
                  </div>
                  <p className="text-xs text-rose-100/90 leading-relaxed">
                    نقدّر صراحتك مع نفسك. عندما تمرّ بحالة شديدة السوء، لا تحمل هذا الثقل وحدك — ننصحك بالتواصل اليوم مع شخص مقرب تثق به، أو استشارة مختص نفسي مرخّص يقدم لك مساندة حقيقية وآمنة.
                  </p>
                </div>
              )}

              <div>
                <span className="text-xs text-[#9CA3AF] block mb-2">اختر المشاعر الحاضرة:</span>
                <div className="flex flex-wrap gap-1.5">
                  {EMOTION_OPTIONS.map((em) => {
                    const active = moodEmotions.includes(em);
                    return (
                      <button
                        key={em}
                        type="button"
                        onClick={() =>
                          setMoodEmotions((prev) =>
                            prev.includes(em) ? prev.filter((x) => x !== em) : [...prev, em]
                          )
                        }
                        className={`min-h-[36px] px-3 rounded-xl text-xs border transition-colors cursor-pointer ${
                          active
                            ? 'bg-[#D4A853]/20 border-[#D4A853] text-[#F2EFE9]'
                            : 'bg-[#1B1F2B] border-white/[0.06] text-[#9CA3AF]'
                        }`}
                      >
                        {em}
                      </button>
                    );
                  })}
                </div>
              </div>

              <textarea
                rows={2}
                value={moodNote}
                onChange={(e) => setMoodNote(e.target.value)}
                placeholder="ملاحظة قصيرة: ما الذي أثر على حالتك اليوم؟"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#1B1F2B] border border-white/[0.08] text-sm text-[#F2EFE9] placeholder:text-[#6B7280] focus:outline-none focus:border-[#D4A853] resize-none"
              />

              <button
                type="submit"
                className="w-full min-h-[46px] rounded-2xl bg-[#D4A853] text-[#0B0D12] text-sm font-bold hover:bg-[#E2BA6B] cursor-pointer"
              >
                {moodSavedFlag ? 'تم تسجيل الحالة المزاجية' : 'حفظ في يوميات المزاج'}
              </button>
            </form>

            {/* Mood Line Chart + Recent */}
            <section className="rounded-3xl bg-[#141720] border border-white/[0.08] p-5 sm:p-6 flex flex-col justify-between">
              <div>
                <h2 className="text-base font-bold text-[#F2EFE9] mb-1">
                  منحنى المزاج (آخر 14 تسجيلاً)
                </h2>
                <p className="text-xs text-[#9CA3AF] mb-4">
                  مراقبة نمط مزاجك تساعدك على اكتشاف المحفزات والأوقات التي تحتاج فيها لراحة.
                </p>
                <MoodLineChart entries={state.moodLogs} />
              </div>

              {state.moodLogs.length > 0 && (
                <div className="mt-4 pt-4 border-t border-white/[0.07] space-y-2 max-h-40 overflow-y-auto">
                  {state.moodLogs.slice(0, 5).map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center justify-between text-xs text-[#C8C3B9]"
                    >
                      <span className="truncate max-w-[70%]">
                        <strong className="text-[#D4A853] tabular-nums">{m.level}/5</strong>
                        {' · '}
                        {m.emotions.join('، ') || 'مسجل'}
                        {m.note ? ` — ${m.note}` : ''}
                      </span>
                      <span className="text-[#9CA3AF] tabular-nums shrink-0">
                        {formatArabicDate(m.date)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* CBT Thought Record */}
          <section className="rounded-3xl bg-[#141720] border border-white/[0.08] p-5 sm:p-6 space-y-5">
            <div>
              <h2 className="text-base font-bold text-[#F2EFE9]">
                نموذج CBT لإعادة البناء المعرفي
              </h2>
              <p className="text-xs text-[#9CA3AF] mt-0.5">
                الموقف ← الفكرة التلقائية ← التشوه المعرفي ← الشعور ← الفكرة البديلة المتوازنة
              </p>
            </div>

            <form onSubmit={handleSaveCbt} className="space-y-3.5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[#9CA3AF] block mb-1">1. الموقف الموضوعي</label>
                  <textarea
                    rows={2}
                    required
                    value={cbtSit}
                    onChange={(e) => setCbtSit(e.target.value)}
                    placeholder="ماذا حدث بالضبط كما تراه الكاميرا؟"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#1B1F2B] border border-white/[0.08] text-sm text-[#F2EFE9] focus:outline-none focus:border-[#D4A853] resize-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-[#9CA3AF] block mb-1">2. الفكرة التلقائية المزعجة</label>
                  <textarea
                    rows={2}
                    required
                    value={cbtThought}
                    onChange={(e) => setCbtThought(e.target.value)}
                    placeholder="ما الفكرة الفورية التي خطرت ببالك؟"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#1B1F2B] border border-white/[0.08] text-sm text-[#F2EFE9] focus:outline-none focus:border-[#D4A853] resize-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-[#9CA3AF] block mb-1">3. التشوه المعرفي المحتمل</label>
                  <select
                    value={cbtDistortion}
                    onChange={(e) => setCbtDistortion(e.target.value)}
                    className="w-full min-h-[46px] px-3 rounded-xl bg-[#1B1F2B] border border-white/[0.08] text-xs text-[#F2EFE9] focus:outline-none focus:border-[#D4A853]"
                  >
                    {COGNITIVE_DISTORTIONS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-[#9CA3AF] block mb-1">4. الشعور الأساسي</label>
                  <input
                    type="text"
                    value={cbtEmotion}
                    onChange={(e) => setCbtEmotion(e.target.value)}
                    className="w-full min-h-[46px] px-3.5 rounded-xl bg-[#1B1F2B] border border-white/[0.08] text-sm text-[#F2EFE9] focus:outline-none focus:border-[#D4A853]"
                  />
                </div>
                <div>
                  <label className="text-xs text-[#9CA3AF] block mb-1 tabular-nums">
                    شدة الشعور قبل: {cbtBefore}%
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={cbtBefore}
                    onChange={(e) => setCbtBefore(Number(e.target.value))}
                    className="w-full mt-3 accent-[#D4A853]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                <div className="md:col-span-2">
                  <label className="text-xs text-[#9CA3AF] block mb-1">
                    5. الفكرة البديلة الواقعية والمتوازنة
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={cbtAlt}
                    onChange={(e) => setCbtAlt(e.target.value)}
                    placeholder="ما التفسير الأكثر عدلاً وواقعية بناءً على الأدلة؟"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#1B1F2B] border border-white/[0.08] text-sm text-[#F2EFE9] focus:outline-none focus:border-[#D4A853] resize-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-[#9CA3AF] block mb-1 tabular-nums">
                    شدة الشعور بعد: {cbtAfter}%
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={cbtAfter}
                    onChange={(e) => setCbtAfter(Number(e.target.value))}
                    className="w-full mb-3 accent-[#D4A853]"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="min-h-[46px] px-6 rounded-xl bg-[#D4A853] text-[#0B0D12] text-sm font-bold hover:bg-[#E2BA6B] cursor-pointer"
              >
                حفظ جلسة CBT
              </button>
            </form>

            {state.cbtLogs.length > 0 && (
              <div className="pt-4 border-t border-white/[0.07] space-y-3">
                <h3 className="text-xs font-bold text-[#9CA3AF]">سجلاتك المعرفية السابقة</h3>
                {state.cbtLogs.slice(0, 5).map((entry) => (
                  <div
                    key={entry.id}
                    className="p-4 rounded-2xl bg-[#1B1F2B] border border-white/[0.06] space-y-1.5 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[#D4A853] font-semibold tabular-nums">
                        {formatArabicDate(entry.date)} · {entry.emotion} ({entry.intensityBefore}% ← {entry.intensityAfter}%)
                      </span>
                      <button
                        type="button"
                        onClick={() => onDeleteCbt(entry.id)}
                        aria-label="حذف السجل"
                        className="text-[#9CA3AF] hover:text-rose-400 p-1 cursor-pointer"
                      >
                        <TrashIcon className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-[#9CA3AF]">الموقف: {entry.situation}</p>
                    <p className="text-rose-300/90">الفكرة التلقائية: {entry.automaticThought} ({entry.distortion})</p>
                    <p className="text-emerald-300">الفكرة البديلة: {entry.alternativeThought}</p>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Stoic Dichotomy of Control */}
          <section className="rounded-3xl bg-[#141720] border border-white/[0.08] p-5 sm:p-6 space-y-4">
            <div>
              <h2 className="text-base font-bold text-[#F2EFE9]">
                تمرين الرواقية — ثنائية التحكم
              </h2>
              <p className="text-xs text-[#9CA3AF] mt-0.5">
                افصل بين ما يقع تحت إرادتك الكاملة وما لا تملك التحكم فيه لتوجيه طاقتك بذكاء
              </p>
            </div>

            <form onSubmit={handleSaveStoic} className="space-y-3">
              <input
                type="text"
                required
                value={stoicSit}
                onChange={(e) => setStoicSit(e.target.value)}
                placeholder="الموقف الذي يشغل بالك الآن..."
                className="w-full min-h-[46px] px-3.5 rounded-xl bg-[#1B1F2B] border border-white/[0.08] text-sm text-[#F2EFE9] focus:outline-none focus:border-[#D4A853]"
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <textarea
                  rows={2}
                  required
                  value={stoicIn}
                  onChange={(e) => setStoicIn(e.target.value)}
                  placeholder="في يدي وتحت سيطرتي (رد فعلي، تحضيري، حدودي، نبرتي)..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#1B1F2B] border border-emerald-500/20 text-sm text-[#F2EFE9] focus:outline-none focus:border-[#D4A853] resize-none"
                />
                <textarea
                  rows={2}
                  value={stoicOut}
                  onChange={(e) => setStoicOut(e.target.value)}
                  placeholder="خارج سيطرتي وأتركه بسلام (مزاج الآخر، رأيه، الماضي)..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#1B1F2B] border border-white/[0.08] text-sm text-[#F2EFE9] focus:outline-none focus:border-[#D4A853] resize-none"
                />
              </div>
              <input
                type="text"
                value={stoicAct}
                onChange={(e) => setStoicAct(e.target.value)}
                placeholder="الخطوة الحكيمة والرزينة التي سأتخذها الآن..."
                className="w-full min-h-[46px] px-3.5 rounded-xl bg-[#1B1F2B] border border-white/[0.08] text-sm text-[#F2EFE9] focus:outline-none focus:border-[#D4A853]"
              />
              <button
                type="submit"
                className="min-h-[46px] px-6 rounded-xl bg-[#D4A853] text-[#0B0D12] text-sm font-bold hover:bg-[#E2BA6B] cursor-pointer"
              >
                حفظ التمرين الرواقي
              </button>
            </form>

            {state.stoicLogs.length > 0 && (
              <div className="pt-3 border-t border-white/[0.07] space-y-2.5">
                {state.stoicLogs.slice(0, 4).map((s) => (
                  <div
                    key={s.id}
                    className="p-3.5 rounded-2xl bg-[#1B1F2B] border border-white/[0.06] text-xs space-y-1"
                  >
                    <div className="text-[#D4A853] font-semibold">
                      {s.situation} · <span className="tabular-nums">{formatArabicDate(s.date)}</span>
                    </div>
                    <p className="text-emerald-300">في يدي: {s.inMyControl}</p>
                    {s.outOfControl && <p className="text-[#9CA3AF]">خارج سيطرتي: {s.outOfControl}</p>}
                    {s.virtuousAction && <p className="text-[#F2EFE9]">الخطوة الحكيمة: {s.virtuousAction}</p>}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* 3. PRESENCE & BODY LANGUAGE */}
      {subTab === 'presence' && (
        <div className="space-y-5">
          <div>
            <h1 className="text-lg font-bold text-[#F2EFE9]">الحضور والهيبة وتمارين المرآة</h1>
            <p className="text-xs text-[#9CA3AF] mt-0.5">
              تمارين مرآة يومية وبطاقات تدريب لترسيخ الوقفة، التواصل البصري، الإيماءات، ونبرة الصوت الهادئة
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {PRESENCE_CARDS.map((card) => {
              const checkedCount = card.items.filter(
                (it) => state.presenceChecklist[it.id]
              ).length;
              return (
                <section
                  key={card.id}
                  className="rounded-3xl bg-[#141720] border border-white/[0.08] p-5 sm:p-6 space-y-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-xs text-[#D4A853] font-semibold">
                        {card.category}
                      </div>
                      <h2 className="text-base font-bold text-[#F2EFE9] mt-0.5">
                        {card.title}
                      </h2>
                    </div>
                    <span className="text-xs text-[#9CA3AF] tabular-nums shrink-0">
                      {checkedCount}/{card.items.length}
                    </span>
                  </div>

                  <p className="text-xs text-[#B8B4AA] leading-relaxed">
                    {card.scienceNote}
                  </p>

                  <div className="space-y-2">
                    {card.items.map((item) => {
                      const done = Boolean(state.presenceChecklist[item.id]);
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => onTogglePresence(item.id)}
                          className={`w-full min-h-[48px] p-3.5 rounded-2xl border text-right flex items-start gap-3 transition-colors cursor-pointer ${
                            done
                              ? 'bg-[#D4A853]/12 border-[#D4A853]/40 text-[#F2EFE9]'
                              : 'bg-[#1B1F2B] border-white/[0.06] text-[#C8C3B9] hover:border-white/[0.14]'
                          }`}
                        >
                          <span
                            className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 ${
                              done
                                ? 'bg-[#D4A853] border-[#D4A853] text-[#0B0D12]'
                                : 'border-white/25'
                            }`}
                          >
                            {done && <CheckIcon className="w-3.5 h-3.5" />}
                          </span>
                          <span className="text-sm leading-relaxed">{item.text}</span>
                        </button>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. CONFIDENCE & PERSUASION */}
      {subTab === 'confidence' && (
        <div className="space-y-6">
          {/* 60-Second Mini-Speech Trainer */}
          <section className="rounded-3xl bg-[#141720] border border-[#D4A853]/30 p-5 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-xs text-[#D4A853] font-semibold">تمرين الخطابة المصغّرة</div>
                <h2 className="text-base font-bold text-[#F2EFE9] mt-0.5">
                  تحدّي الدقيقة الواحدة (النقطة ← الدليل ← الخلاصة)
                </h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSpeechRunning(false);
                  setSpeechSec(60);
                  setSpeechPromptIdx((i) => (i + 1) % MINI_SPEECH_PROMPTS.length);
                }}
                className="min-h-[40px] px-3.5 rounded-xl bg-[#1B1F2B] text-xs text-[#D6D2C9] flex items-center gap-1.5 border border-white/[0.08] cursor-pointer"
              >
                <RefreshIcon className="w-3.5 h-3.5" />
                <span>موضوع آخر</span>
              </button>
            </div>

            <p className="p-4 rounded-2xl bg-[#1B1F2B] text-sm text-[#F2EFE9] leading-relaxed">
              المهمة: {MINI_SPEECH_PROMPTS[speechPromptIdx]}
            </p>

            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-2xl font-bold text-[#D4A853] tabular-nums">
                <ClockIcon className="w-6 h-6" />
                <span>00:{String(speechSec).padStart(2, '0')}</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (speechSec === 0) setSpeechSec(60);
                    setSpeechRunning((r) => !r);
                  }}
                  className="min-h-[46px] px-6 rounded-2xl bg-[#D4A853] text-[#0B0D12] text-sm font-bold hover:bg-[#E2BA6B] cursor-pointer"
                >
                  {speechRunning ? 'إيقاف مؤقت' : 'ابدأ الحديث (60 ثانية)'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSpeechRunning(false);
                    setSpeechSec(60);
                  }}
                  className="min-h-[46px] px-4 rounded-2xl bg-[#1B1F2B] text-xs text-[#9CA3AF] border border-white/[0.08] cursor-pointer"
                >
                  تصفير
                </button>
              </div>
            </div>
          </section>

          {/* 4 Core Confidence & Persuasion Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {CONFIDENCE_CARDS.map((card) => {
              const checkedCount = card.items.filter(
                (it) => state.confidenceChecklist[it.id]
              ).length;
              return (
                <section
                  key={card.id}
                  className="rounded-3xl bg-[#141720] border border-white/[0.08] p-5 sm:p-6 space-y-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-xs text-[#D4A853] font-semibold">
                        {card.category}
                      </div>
                      <h2 className="text-base font-bold text-[#F2EFE9] mt-0.5">
                        {card.title}
                      </h2>
                    </div>
                    <span className="text-xs text-[#9CA3AF] tabular-nums shrink-0">
                      {checkedCount}/{card.items.length}
                    </span>
                  </div>

                  <p className="text-xs text-[#B8B4AA] leading-relaxed">
                    {card.scienceNote}
                  </p>

                  <div className="space-y-2">
                    {card.items.map((item) => {
                      const done = Boolean(state.confidenceChecklist[item.id]);
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => onToggleConfidence(item.id)}
                          className={`w-full min-h-[48px] p-3.5 rounded-2xl border text-right flex items-start gap-3 transition-colors cursor-pointer ${
                            done
                              ? 'bg-[#D4A853]/12 border-[#D4A853]/40 text-[#F2EFE9]'
                              : 'bg-[#1B1F2B] border-white/[0.06] text-[#C8C3B9] hover:border-white/[0.14]'
                          }`}
                        >
                          <span
                            className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 ${
                              done
                                ? 'bg-[#D4A853] border-[#D4A853] text-[#0B0D12]'
                                : 'border-white/25'
                            }`}
                          >
                            {done && <CheckIcon className="w-3.5 h-3.5" />}
                          </span>
                          <span className="text-sm leading-relaxed">{item.text}</span>
                        </button>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. WEEKLY SELF-EVALUATION */}
      {subTab === 'weekly' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <form
            onSubmit={handleSaveWeekly}
            className="rounded-3xl bg-[#141720] border border-white/[0.08] p-5 sm:p-6 space-y-5"
          >
            <div>
              <h2 className="text-base font-bold text-[#F2EFE9]">التقييم الأسبوعي الذاتي</h2>
              <p className="text-xs text-[#9CA3AF] mt-0.5">
                قيّم أداءك الواقعي خلال الأيام السبعة الماضية من 1 إلى 10
              </p>
            </div>

            {(
              [
                { label: 'الاتزان العاطفي وإدارة التوتر', val: wEmotional, set: setWEmotional },
                { label: 'الحزم وحماية الحدود', val: wBoundaries, set: setWBoundaries },
                { label: 'الحضور ولغة الجسد والصوت', val: wPresence, set: setWPresence },
                { label: 'الاستماع النشط والإقناع الأخلاقي', val: wPersuasion, set: setWPersuasion },
                { label: 'الانضباط اليومي والمتابعة', val: wDiscipline, set: setWDiscipline },
              ] as const
            ).map((axis) => (
              <div key={axis.label} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#F2EFE9] font-medium">{axis.label}</span>
                  <span className="text-[#D4A853] font-bold tabular-nums">{axis.val} / 10</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={axis.val}
                  onChange={(e) => axis.set(Number(e.target.value))}
                  className="w-full accent-[#D4A853]"
                />
              </div>
            ))}

            <textarea
              rows={2}
              value={wNote}
              onChange={(e) => setWNote(e.target.value)}
              placeholder="ما أهم درس تعلمته عن نفسك هذا الأسبوع؟"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#1B1F2B] border border-white/[0.08] text-sm text-[#F2EFE9] placeholder:text-[#6B7280] focus:outline-none focus:border-[#D4A853] resize-none"
            />

            <button
              type="submit"
              className="w-full min-h-[48px] rounded-2xl bg-[#D4A853] text-[#0B0D12] text-sm font-bold hover:bg-[#E2BA6B] cursor-pointer"
            >
              حفظ التقييم الأسبوعي
            </button>
          </form>

          <section className="rounded-3xl bg-[#141720] border border-white/[0.08] p-5 sm:p-6 space-y-5">
            <div>
              <h2 className="text-base font-bold text-[#F2EFE9]">تطورك عبر الأسابيع</h2>
              <p className="text-xs text-[#9CA3AF] mt-0.5">
                المتوسط العام للمحاور الخمسة في كل أسبوع
              </p>
            </div>

            <WeeklyProgressChart evaluations={state.weeklyEvaluations} />

            {latestWeeklyInsight && (
              <div className="p-4 rounded-2xl bg-[#1B1F2B] border border-white/[0.06] space-y-2 text-xs">
                <div className="text-[#D4A853] font-bold tabular-nums">
                  ملخص آخر تقييم · المتوسط {latestWeeklyInsight.avg} / 10
                </div>
                <p className="text-[#F2EFE9]">
                  <strong>أقوى محور لديك:</strong> {latestWeeklyInsight.strongest.label} ({latestWeeklyInsight.strongest.val}/10)
                </p>
                <p className="text-[#C8C3B9]">
                  <strong>محور التركيز للأسبوع القادم:</strong> {latestWeeklyInsight.growth.label} ({latestWeeklyInsight.growth.val}/10) — خصّص له تمريناً واحداً يومياً.
                </p>
              </div>
            )}

            {state.weeklyEvaluations.length > 0 && (
              <div className="space-y-2 max-h-44 overflow-y-auto pt-2 border-t border-white/[0.07]">
                {state.weeklyEvaluations.map((ev) => (
                  <div
                    key={ev.id}
                    className="text-xs text-[#C8C3B9] flex items-start justify-between gap-3"
                  >
                    <div>
                      <strong className="text-[#F2EFE9]">{ev.weekLabel}</strong>
                      {ev.note && <span className="text-[#9CA3AF]"> · {ev.note}</span>}
                    </div>
                    <span className="text-[#9CA3AF] tabular-nums shrink-0">
                      {formatArabicDate(ev.date)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
};
