import React, { useEffect, useMemo, useState } from 'react';
import { SIMULATOR_SCENARIOS } from '../data/simulatorScenarios';
import {
  BOUNDARY_SCENARIOS,
  OBJECTION_SCENARIOS,
  QUESTION_BANK,
  QuestionCategory,
  REFLECTION_EXERCISES,
} from '../data/trainerExtras';
import { buildAdaptiveTrainingPlan } from '../engine/personalization';
import { AppState, SimChoice, SimResultRecord, SimulatorScenario } from '../types';
import { copyToClipboard, getTodayIso } from '../utils/storage';
import {
  ChatBranchIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CopyIcon,
  RefreshIcon,
  SparklesIcon,
} from './Icons';

export type SimSubTab = 'scenarios' | 'boundaries' | 'listening' | 'objections';

interface SimulatorSectionProps {
  state: AppState;
  simResults: Record<string, SimResultRecord>;
  initialSubTab?: SimSubTab;
  initialPersonalityId?: string | null;
  onClearInitialPersonality: () => void;
  onSaveResult: (scenarioId: string, score: number) => void;
}

interface TurnHistoryItem {
  nodeId: string;
  speakerLine: string;
  chosen: SimChoice;
  optimalChoice: SimChoice;
}

export const SimulatorSection: React.FC<SimulatorSectionProps> = ({
  state,
  simResults,
  initialSubTab,
  initialPersonalityId,
  onClearInitialPersonality,
  onSaveResult,
}) => {
  const [simTab, setSimTab] = useState<SimSubTab>(initialSubTab ?? 'scenarios');
  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(null);
  const [currentNodeId, setCurrentNodeId] = useState<string | null>(null);
  const [history, setHistory] = useState<TurnHistoryItem[]>([]);
  const [finished, setFinished] = useState(false);

  const adaptivePlan = useMemo(() => buildAdaptiveTrainingPlan(state), [state]);

  useEffect(() => {
    if (initialSubTab) {
      setSimTab(initialSubTab);
      setActiveScenarioId(null);
      setCurrentNodeId(null);
      setFinished(false);
    }
  }, [initialSubTab]);

  // Boundaries & Listening copy feedback
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [qCategory, setQCategory] = useState<QuestionCategory>('معايِرة');

  // Reflect what you heard exercise state
  const [refIdx, setRefIdx] = useState(0);
  const [userReflection, setUserReflection] = useState('');
  const [showRefModel, setShowRefModel] = useState(false);

  // Objection simulator selections: scenarioId -> optionId
  const [objectionPicks, setObjectionPicks] = useState<Record<string, string>>({});

  const handleCopyText = async (id: string, text: string) => {
    await copyToClipboard(text);
    setCopiedId(id);
    window.setTimeout(() => setCopiedId((prev) => (prev === id ? null : prev)), 1800);
  };

  const startScenario = (scenario: SimulatorScenario) => {
    setSimTab('scenarios');
    setActiveScenarioId(scenario.id);
    setCurrentNodeId(scenario.startNodeId);
    setHistory([]);
    setFinished(false);
  };

  useEffect(() => {
    if (initialPersonalityId) {
      const match = SIMULATOR_SCENARIOS.find(
        (s) => s.personalityId === initialPersonalityId
      );
      if (match) {
        startScenario(match);
      }
      onClearInitialPersonality();
    }
  }, [initialPersonalityId, onClearInitialPersonality]);

  const activeScenario = useMemo(
    () => SIMULATOR_SCENARIOS.find((s) => s.id === activeScenarioId) ?? null,
    [activeScenarioId]
  );

  const currentNode =
    activeScenario && currentNodeId ? activeScenario.nodes[currentNodeId] : null;

  const totalScore = useMemo(() => {
    const sum = history.reduce((acc, h) => acc + h.chosen.scoreDelta, 0);
    return Math.min(100, Math.max(0, sum));
  }, [history]);

  const handleChoose = (choice: SimChoice) => {
    if (!activeScenario || !currentNode) return;
    const optimal =
      [...currentNode.choices].sort((a, b) => b.scoreDelta - a.scoreDelta)[0] ??
      choice;

    const nextHistory: TurnHistoryItem[] = [
      ...history,
      {
        nodeId: currentNode.id,
        speakerLine: currentNode.speakerLine,
        chosen: choice,
        optimalChoice: optimal,
      },
    ];
    setHistory(nextHistory);

    if (choice.nextNodeId && activeScenario.nodes[choice.nextNodeId]) {
      setCurrentNodeId(choice.nextNodeId);
    } else {
      const finalScore = Math.min(
        100,
        nextHistory.reduce((acc, h) => acc + h.chosen.scoreDelta, 0)
      );
      setCurrentNodeId(null);
      setFinished(true);
      onSaveResult(activeScenario.id, finalScore);
    }
  };

  if (activeScenario) {
    return (
      <div className="space-y-5 animate-view">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              setActiveScenarioId(null);
              setCurrentNodeId(null);
              setFinished(false);
            }}
            className="min-h-[44px] px-3.5 rounded-xl bg-[#141720] hover:bg-[#1B1F2B] border border-white/[0.08] text-sm text-[#F2EFE9] flex items-center gap-1.5 cursor-pointer"
          >
            <ChevronRightIcon className="w-4 h-4" />
            <span>جميع السيناريوهات</span>
          </button>

          <button
            type="button"
            onClick={() => startScenario(activeScenario)}
            className="min-h-[44px] px-3.5 rounded-xl bg-[#141720] hover:bg-[#1B1F2B] border border-white/[0.08] text-xs font-medium text-[#D6D2C9] flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshIcon className="w-4 h-4" />
            <span>إعادة السيناريو</span>
          </button>
        </div>

        {/* Scenario Context Header */}
        <section className="rounded-3xl bg-[#141720] border border-white/[0.08] p-5">
          <div className="text-xs text-[#D4A853] font-semibold">
            محاكي الحوار · {activeScenario.personalityName} · الجولة{' '}
            <span className="tabular-nums">{finished ? history.length : history.length + 1}</span>
          </div>
          <h1 className="text-lg font-bold text-[#F2EFE9] mt-1">{activeScenario.title}</h1>
          <p className="text-xs sm:text-sm text-[#B8B4AA] mt-1.5 leading-relaxed">
            {activeScenario.context}
          </p>
          <p className="text-xs text-[#D6D2C9] mt-2 pt-2 border-t border-white/[0.06]">
            <strong className="text-[#D4A853]">هدفك: </strong>
            {activeScenario.goal}
          </p>
        </section>

        {/* Conversation Transcript so far */}
        {history.length > 0 && !finished && (
          <div className="space-y-2.5">
            {history.map((turn, i) => (
              <div key={i} className="space-y-2 opacity-80">
                <div className="max-w-[90%] rounded-2xl rounded-tr-sm bg-[#141720] border border-white/[0.07] p-3.5 text-xs text-[#C8C3B9]">
                  <span className="text-[#9CA3AF] block mb-1">{activeScenario.personalityName}:</span>
                  «{turn.speakerLine}»
                </div>
                <div className="max-w-[90%] mr-auto rounded-2xl rounded-tl-sm bg-[#D4A853]/12 border border-[#D4A853]/25 p-3.5 text-xs text-[#F2EFE9]">
                  <span className="text-[#D4A853] block mb-1">ردّك ({turn.chosen.style}):</span>
                  «{turn.chosen.text}»
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Active Turn */}
        {!finished && currentNode && (
          <div className="space-y-4">
            <div className="rounded-3xl bg-[#141720] border border-[#D4A853]/35 p-5 sm:p-6">
              <div className="text-xs text-[#9CA3AF] mb-2">
                {activeScenario.personalityName} يقول لك:
              </div>
              <p className="text-base sm:text-lg font-semibold text-[#F2EFE9] leading-relaxed">
                «{currentNode.speakerLine}»
              </p>
              <p className="mt-3 pt-3 border-t border-white/[0.07] text-xs text-[#D4A853]">
                إشارة سلوكية: {currentNode.cue}
              </p>
            </div>

            <div className="space-y-2.5">
              <div className="text-xs font-semibold text-[#9CA3AF] px-1">
                اختر ردّك (يتغير مسار الحوار حسب اختيارك):
              </div>
              {currentNode.choices.map((choice, idx) => (
                <button
                  key={choice.id}
                  type="button"
                  onClick={() => handleChoose(choice)}
                  className="w-full min-h-[58px] p-4 rounded-2xl bg-[#141720] hover:bg-[#1C212E] border border-white/[0.09] hover:border-[#D4A853]/50 text-right transition-all active:scale-[0.99] cursor-pointer"
                >
                  <span className="text-xs text-[#D4A853] font-bold tabular-nums ml-2">
                    0{idx + 1}.
                  </span>
                  <span className="text-sm text-[#F2EFE9] leading-relaxed">{choice.text}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Debrief / Final Analysis */}
        {finished && (
          <div className="space-y-5 animate-view">
            <section className="rounded-3xl bg-[#141720] border border-[#D4A853]/35 p-6 text-center space-y-2">
              <div className="text-xs text-[#9CA3AF]">النتيجة النهائية في المحاكاة</div>
              <div className="text-4xl font-bold text-[#D4A853] tabular-nums">
                {totalScore}%
              </div>
              <div className="text-sm font-semibold text-[#F2EFE9]">
                {totalScore >= 85
                  ? 'إتقان عالٍ — إدارة هادئة وحازمة للموقف'
                  : totalScore >= 60
                  ? 'أداء جيد — مع بعض النقاط القابلة للتحسين'
                  : 'فرصة تعلّم — راجع الفخاخ والردود المثلى أدناه ثم أعد المحاولة'}
              </div>
              <p className="text-xs text-[#9CA3AF] tabular-nums">
                تم حفظ أفضل درجة بتاريخ {getTodayIso()}
              </p>
            </section>

            {/* Turn-by-turn breakdown */}
            <div className="space-y-4">
              <h2 className="text-base font-bold text-[#F2EFE9]">
                تحليل كل اختيار (لماذا نجح أو فشل) والرد الأمثل
              </h2>

              {history.map((turn, idx) => {
                const isOptimal = turn.chosen.id === turn.optimalChoice.id;
                return (
                  <div
                    key={idx}
                    className="rounded-3xl bg-[#141720] border border-white/[0.08] p-5 space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="text-[#9CA3AF] tabular-nums">الجولة {idx + 1}</span>
                      <span
                        className={`font-bold ${
                          turn.chosen.quality === 'optimal'
                            ? 'text-emerald-400'
                            : turn.chosen.quality === 'good'
                            ? 'text-amber-300'
                            : 'text-rose-400'
                        }`}
                      >
                        {turn.chosen.style} · +{turn.chosen.scoreDelta} نقطة
                      </span>
                    </div>

                    <p className="text-xs text-[#9CA3AF]">
                      <strong>قول الطرف الآخر:</strong> «{turn.speakerLine}»
                    </p>

                    <div className="p-3.5 rounded-2xl bg-[#1B1F2B] border border-white/[0.06]">
                      <div className="text-xs text-[#9CA3AF] mb-1">اختيارك:</div>
                      <p className="text-sm text-[#F2EFE9]">«{turn.chosen.text}»</p>
                      <p className="text-xs text-[#C8C3B9] mt-2 pt-2 border-t border-white/[0.06] leading-relaxed">
                        <strong className="text-[#D4A853]">التحليل النفسي: </strong>
                        {turn.chosen.feedback}
                      </p>
                    </div>

                    {!isOptimal && (
                      <div className="p-3.5 rounded-2xl bg-emerald-500/8 border border-emerald-500/25">
                        <div className="text-xs font-bold text-emerald-300 mb-1">
                          الرد الأمثل في هذه الجولة ({turn.optimalChoice.style}):
                        </div>
                        <p className="text-sm text-[#F2EFE9] leading-relaxed">
                          «{turn.optimalChoice.text}»
                        </p>
                        <p className="text-xs text-emerald-200/80 mt-1.5">
                          {turn.optimalChoice.feedback}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => startScenario(activeScenario)}
                className="flex-1 min-h-[48px] rounded-2xl bg-[#D4A853] text-[#0B0D12] text-sm font-bold hover:bg-[#E2BA6B] cursor-pointer"
              >
                إعادة التجربة لمسار آخر
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveScenarioId(null);
                  setFinished(false);
                }}
                className="flex-1 min-h-[48px] rounded-2xl bg-[#141720] border border-white/[0.1] text-[#F2EFE9] text-sm font-semibold cursor-pointer"
              >
                اختيار شخصية أخرى
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  const completedCount = Object.values(simResults).filter((r) => r.bestScore >= 75).length;
  const activeRef = REFLECTION_EXERCISES[refIdx];
  const filteredQuestions = QUESTION_BANK.filter((q) => q.category === qCategory);
  const objectionOptimalCount = OBJECTION_SCENARIOS.filter((sc) => {
    const picked = objectionPicks[sc.id];
    const opt = sc.options.find((o) => o.id === picked);
    return opt?.quality === 'optimal';
  }).length;

  return (
    <div className="space-y-5 animate-view">
      {/* 4 Sub-tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
        {(
          [
            { id: 'scenarios', label: `محاكي الحوارات (${SIMULATOR_SCENARIOS.length})` },
            { id: 'boundaries', label: 'تدريب الحدود (كيف أقول لا)' },
            { id: 'listening', label: 'مدرب الاستماع والأسئلة' },
            { id: 'objections', label: `محاكي الاعتراضات (${OBJECTION_SCENARIOS.length})` },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setSimTab(t.id)}
            className={`min-h-[44px] px-4 rounded-2xl text-xs sm:text-sm font-bold border whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
              simTab === t.id
                ? 'bg-[#D4A853] border-[#D4A853] text-[#0B0D12]'
                : 'bg-[#141720] border-white/[0.08] text-[#9CA3AF] hover:text-[#F2EFE9]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Adaptive Personalization Banner */}
      {adaptivePlan.isPersonalized && (
        <section className="rounded-3xl bg-gradient-to-l from-[#1C2130] to-[#141720] border border-[#D4A853]/30 p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1 min-w-0 flex-1">
            <div className="text-xs font-bold text-[#D4A853] flex items-center gap-1.5">
              <SparklesIcon className="w-4 h-4 shrink-0" />
              <span>مسار المحاكاة الموصى به لشخصيتك</span>
            </div>
            <p className="text-xs text-[#D6D2C9] leading-relaxed">
              {adaptivePlan.recommendedSimReason}
            </p>
          </div>
          {simTab !== adaptivePlan.recommendedSimTab && (
            <button
              type="button"
              onClick={() => setSimTab(adaptivePlan.recommendedSimTab)}
              className="min-h-[40px] px-4 rounded-xl bg-[#D4A853] hover:bg-[#E2BA6B] text-[#0B0D12] text-xs font-bold shrink-0 cursor-pointer"
            >
              انتقل للمسار الموصى به
            </button>
          )}
        </section>
      )}

      {/* TAB 1: BRANCHING DIALOGUE SCENARIOS */}
      {simTab === 'scenarios' && (
        <>
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h1 className="text-xl font-bold text-[#F2EFE9]">محاكي الحوارات الصعبة</h1>
              <p className="text-xs text-[#9CA3AF] mt-1">
                {SIMULATOR_SCENARIOS.length} مواقف حوارية متفرعة من العائلة والصحبة (بدون AI) · تتغير الردود حسب اختيارك مع تحليل نفسي كامل
              </p>
            </div>
            <span className="text-xs text-[#D4A853] font-semibold tabular-nums">
              مُتقَن: {completedCount} / {SIMULATOR_SCENARIOS.length}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...SIMULATOR_SCENARIOS]
              .sort((a, b) => {
                if (!adaptivePlan.isPersonalized) return 0;
                const aRec = adaptivePlan.recommendedSimScenarioIds.includes(a.id) ? 0 : 1;
                const bRec = adaptivePlan.recommendedSimScenarioIds.includes(b.id) ? 0 : 1;
                return aRec - bRec;
              })
              .map((sc) => {
                const rec = simResults[sc.id];
                const isRecommended =
                  adaptivePlan.isPersonalized &&
                  adaptivePlan.recommendedSimScenarioIds.includes(sc.id);
                return (
                  <button
                    key={sc.id}
                    type="button"
                    onClick={() => startScenario(sc)}
                    className={`p-5 rounded-3xl bg-[#141720] hover:bg-[#191D29] border text-right flex flex-col justify-between gap-4 transition-colors cursor-pointer ${
                      isRecommended
                        ? 'border-[#D4A853]/45 shadow-[0_0_24px_-12px_rgba(212,168,83,0.45)]'
                        : 'border-white/[0.08]'
                    }`}
                  >
                    <div>
                      {isRecommended && (
                        <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#D4A853]/15 border border-[#D4A853]/35 text-[11px] font-bold text-[#D4A853] mb-2.5">
                          <SparklesIcon className="w-3 h-3" />
                          <span>موصى به لشخصيتك</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between gap-2 text-xs mb-2">
                        <span className="text-[#D4A853] font-semibold">
                          {sc.relationTag} · {sc.personalityName}
                        </span>
                        {rec ? (
                          <span
                            className={`font-bold tabular-nums flex items-center gap-1 ${
                              rec.bestScore >= 75 ? 'text-emerald-400' : 'text-amber-300'
                            }`}
                          >
                            {rec.bestScore >= 75 && <CheckIcon className="w-3.5 h-3.5" />}
                            أفضل درجة {rec.bestScore}%
                          </span>
                        ) : (
                          <span className="text-[#9CA3AF]">جديد</span>
                        )}
                      </div>
                      <h2 className="text-base font-bold text-[#F2EFE9]">{sc.title}</h2>
                      <p className="text-xs text-[#9CA3AF] mt-1.5 leading-relaxed line-clamp-2">
                        {sc.context}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs text-[#D6D2C9]">
                      <span className="flex items-center gap-1.5">
                        <ChatBranchIcon className="w-3.5 h-3.5 text-[#D4A853]" />
                        <span>ابدأ المحاكاة</span>
                      </span>
                      <ChevronLeftIcon className="w-4 h-4 text-[#9CA3AF]" />
                    </div>
                  </button>
                );
              })}
          </div>
        </>
      )}

      {/* TAB 2: BOUNDARIES TRAINER (كيف أقول لا — 3 صياغات لكل موقف) */}
      {simTab === 'boundaries' && (
        <div className="space-y-4">
          <div>
            <h1 className="text-xl font-bold text-[#F2EFE9]">تدريب الحدود: كيف أقول «لا» دون جرح العلاقة</h1>
            <p className="text-xs text-[#9CA3AF] mt-1">
              10 مواقف واقعية مع العائلة والأصحاب؛ لكل موقف 3 صياغات متدرجة (لطيفة، حازمة، قاطعة) — اضغط على أي صياغة لنسخها أو التدرّب عليها.
            </p>
          </div>

          <div className="space-y-4">
            {BOUNDARY_SCENARIOS.map((sc, idx) => (
              <article
                key={sc.id}
                className="p-5 rounded-3xl bg-[#141720] border border-white/[0.08] space-y-3.5"
              >
                <div>
                  <div className="text-xs font-bold text-[#D4A853]">موقف #{idx + 1}</div>
                  <h2 className="text-sm sm:text-base font-bold text-[#F2EFE9] mt-0.5">{sc.context}</h2>
                  <p className="text-xs text-[#B8B4AA] mt-1">{sc.requestQuote}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                  {(
                    [
                      { key: 'gentle', label: 'صياغة لطيفة', color: 'text-emerald-300 border-emerald-500/25', text: sc.gentle },
                      { key: 'firm', label: 'صياغة حازمة', color: 'text-[#D4A853] border-[#D4A853]/30', text: sc.firm },
                      { key: 'decisive', label: 'صياغة قاطعة', color: 'text-rose-300 border-rose-500/25', text: sc.decisive },
                    ] as const
                  ).map((variant) => {
                    const copyKey = `${sc.id}_${variant.key}`;
                    return (
                      <button
                        key={variant.key}
                        type="button"
                        onClick={() => void handleCopyText(copyKey, variant.text)}
                        className={`p-3.5 rounded-2xl bg-[#1B1F2B] hover:bg-[#232838] border text-right flex flex-col justify-between gap-2 transition cursor-pointer ${variant.color}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-bold">{variant.label}</span>
                          {copiedId === copyKey ? (
                            <CheckIcon className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <CopyIcon className="w-3.5 h-3.5 opacity-75" />
                          )}
                        </div>
                        <p className="text-xs text-[#F2EFE9] leading-relaxed">«{variant.text}»</p>
                      </button>
                    );
                  })}
                </div>

                <div className="text-xs text-[#9CA3AF] pt-1">
                  <strong className="text-[#D4A853]">قاعدة مهمة: </strong>
                  {sc.tip}
                </div>
              </article>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: LISTENING & QUESTIONS TRAINER */}
      {simTab === 'listening' && (
        <div className="space-y-6">
          {/* Interactive Exercise: Reflect what you heard */}
          <section className="p-5 rounded-3xl bg-gradient-to-l from-[#1C2130] to-[#141720] border border-[#D4A853]/35 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-[#F2EFE9]">تمرين «اعكس ما سمعت» (تسمية المشاعر)</h2>
                <p className="text-xs text-[#9CA3AF] mt-0.5">
                  اقرأ كلام المتحدث، ثم اكتب جملة واحدة تعكس شعوره الحقيقي دون دفاع أو نصيحة، وقارنها بالنموذج.
                </p>
              </div>
              <span className="text-xs font-bold text-[#D4A853] tabular-nums">
                تمرين {refIdx + 1} / {REFLECTION_EXERCISES.length}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-[#10131B] border border-white/[0.08] space-y-1">
              <div className="text-[11px] font-bold text-[#D4A853]">{activeRef.speaker} يقول:</div>
              <p className="text-sm sm:text-base font-semibold text-[#F2EFE9] leading-relaxed">
                {activeRef.statement}
              </p>
            </div>

            <textarea
              rows={2}
              value={userReflection}
              onChange={(e) => setUserReflection(e.target.value)}
              placeholder="اكتب جملة العكس هنا (مثلاً: يبدو أنك تشعر بـ... لأن...)"
              className="w-full p-3.5 rounded-2xl bg-[#10131B] border border-white/10 text-sm text-[#F2EFE9] placeholder-[#6B7280] focus:outline-none focus:border-[#D4A853]"
            />

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setShowRefModel(true)}
                className="min-h-[42px] px-4 rounded-xl bg-[#D4A853] text-[#0B0D12] text-xs font-bold cursor-pointer"
              >
                اعرض الجملة النموذجية والشعور الخفي
              </button>
              <button
                type="button"
                onClick={() => {
                  setRefIdx((i) => (i + 1) % REFLECTION_EXERCISES.length);
                  setUserReflection('');
                  setShowRefModel(false);
                }}
                className="min-h-[42px] px-4 rounded-xl bg-[#1B1F2B] border border-white/10 text-xs font-semibold text-[#F2EFE9] cursor-pointer"
              >
                الموقف التالي
              </button>
            </div>

            {showRefModel && (
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-2 text-xs leading-relaxed animate-view">
                <div className="text-emerald-200">
                  <strong className="text-emerald-300">الشعور الخفي: </strong>
                  {activeRef.hiddenEmotion}
                </div>
                <div className="text-[#F2EFE9]">
                  <strong className="text-[#D4A853]">جملة عكس نموذجية: </strong>
                  «{activeRef.modelReflection}»
                </div>
                <div className="text-rose-200">
                  <strong className="text-rose-300">فخ تجنّبه: </strong>
                  {activeRef.avoidTrap}
                </div>
              </div>
            )}
          </section>

          {/* Question Bank */}
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-bold text-[#F2EFE9]">بنك الأسئلة التي تفتح قلوب الناس</h2>
                <p className="text-xs text-[#9CA3AF]">
                  اضغط على أي سؤال لنسخه واستخدامه في حواراتك اليومية
                </p>
              </div>
              <div className="flex gap-1.5">
                {(['معايِرة', 'عاطفية', 'تهدئة'] as QuestionCategory[]).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setQCategory(cat)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold border cursor-pointer ${
                      qCategory === cat
                        ? 'bg-[#D4A853] border-[#D4A853] text-[#0B0D12]'
                        : 'bg-[#141720] border-white/10 text-[#9CA3AF]'
                    }`}
                  >
                    أسئلة {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredQuestions.map((q) => (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => void handleCopyText(q.id, q.question)}
                  className="p-4 rounded-2xl bg-[#141720] hover:bg-[#191D29] border border-white/[0.08] text-right space-y-2 transition cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-bold text-[#F2EFE9] leading-relaxed">«{q.question}»</p>
                    {copiedId === q.id ? (
                      <CheckIcon className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <CopyIcon className="w-4 h-4 text-[#D4A853] shrink-0 mt-0.5" />
                    )}
                  </div>
                  <p className="text-xs text-[#9CA3AF]">{q.whenToUse}</p>
                </button>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* TAB 4: OBJECTION SIMULATOR (محاكي الاعتراضات — 10 مواقف) */}
      {simTab === 'objections' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h1 className="text-xl font-bold text-[#F2EFE9]">محاكي الاعتراضات اليومية</h1>
              <p className="text-xs text-[#9CA3AF] mt-1">
                تدرّب على أشهر الاعتراضات («لا أريد»، «ليس الآن»، «أنت مخطئ»...) وجرّب 3 أساليب رد لترى النتيجة الفورية.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#D4A853] tabular-nums">
                ردود مثالية: {objectionOptimalCount} / {OBJECTION_SCENARIOS.length}
              </span>
              {Object.keys(objectionPicks).length > 0 && (
                <button
                  type="button"
                  onClick={() => setObjectionPicks({})}
                  className="p-2 rounded-xl bg-[#141720] border border-white/10 text-[#9CA3AF] hover:text-[#F2EFE9] cursor-pointer"
                  aria-label="إعادة التدريب"
                >
                  <RefreshIcon className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <div className="space-y-4">
            {OBJECTION_SCENARIOS.map((sc, idx) => {
              const pickedId = objectionPicks[sc.id];
              const pickedOpt = sc.options.find((o) => o.id === pickedId);
              return (
                <article
                  key={sc.id}
                  className="p-5 rounded-3xl bg-[#141720] border border-white/[0.08] space-y-3.5"
                >
                  <div>
                    <div className="text-xs font-bold text-[#D4A853]">اعتراض #{idx + 1}</div>
                    <h2 className="text-base sm:text-lg font-extrabold text-[#F2EFE9] mt-0.5">
                      {sc.objection}
                    </h2>
                    <p className="text-xs text-[#9CA3AF] mt-1">{sc.context}</p>
                  </div>

                  <div className="space-y-2">
                    {sc.options.map((opt) => {
                      const active = pickedId === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() =>
                            setObjectionPicks((prev) => ({ ...prev, [sc.id]: opt.id }))
                          }
                          className={`w-full text-right p-3.5 rounded-2xl border transition cursor-pointer ${
                            active
                              ? opt.quality === 'optimal'
                                ? 'bg-emerald-500/15 border-emerald-400 text-[#F2EFE9]'
                                : opt.quality === 'good'
                                ? 'bg-amber-500/15 border-amber-400 text-[#F2EFE9]'
                                : 'bg-rose-500/15 border-rose-400 text-[#F2EFE9]'
                              : 'bg-[#1B1F2B] border-white/[0.07] text-[#D6D2C9] hover:border-[#D4A853]/40'
                          }`}
                        >
                          <div className="text-[11px] font-bold text-[#D4A853] mb-1">{opt.style}</div>
                          <div className="text-xs sm:text-sm leading-relaxed">«{opt.text}»</div>
                        </button>
                      );
                    })}
                  </div>

                  {pickedOpt && (
                    <div
                      className={`p-4 rounded-2xl border text-xs leading-relaxed space-y-1.5 animate-view ${
                        pickedOpt.quality === 'optimal'
                          ? 'bg-emerald-500/10 border-emerald-500/30'
                          : pickedOpt.quality === 'good'
                          ? 'bg-amber-500/10 border-amber-500/30'
                          : 'bg-rose-500/10 border-rose-500/30'
                      }`}
                    >
                      <div className="font-bold text-[#F2EFE9]">
                        ردة فعل الطرف الآخر: <span className="font-normal">{pickedOpt.reaction}</span>
                      </div>
                      <div className="text-[#D6D2C9]">
                        <strong className="text-[#D4A853]">لماذا حدث ذلك؟ </strong>
                        {pickedOpt.explanation}
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
