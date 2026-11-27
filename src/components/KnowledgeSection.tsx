import React, { useEffect, useMemo, useState } from 'react';
import { COGNITIVE_BIASES } from '../data/cognitiveBiases';
import { DIFFICULT_PERSONALITIES } from '../data/difficultPersonalities';
import {
  BOOK_SUMMARIES,
  MANIPULATION_QUIZ_ITEMS,
  MANIPULATION_TACTICS,
  PSYCHOLOGY_GLOSSARY,
} from '../data/knowledgeExtras';
import { BODY_LANGUAGE_WARNING, KNOWLEDGE_CARDS } from '../data/knowledgeLibrary';
import { analyzeDeepSelf, buildAdaptiveTrainingPlan } from '../engine/personalization';
import { AppState, DifficultPersonality, KnowledgeSectionKey } from '../types';
import { copyToClipboard } from '../utils/storage';
import {
  BookOpenIcon,
  ChatBranchIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CopyIcon,
  HeartIcon,
  RefreshIcon,
  SearchIcon,
  ShieldIcon,
  SparklesIcon,
} from './Icons';

export type KnowledgeTab =
  | 'difficult'
  | 'shield'
  | 'books'
  | 'glossary'
  | 'biases'
  | KnowledgeSectionKey
  | 'favorites';

interface KnowledgeSectionProps {
  state: AppState;
  initialSubTab?: KnowledgeTab;
  navTick?: number;
  favoriteIds: string[];
  onToggleFavorite: (id: string) => void;
  onPracticeInSimulator: (personalityId: string) => void;
}

export const KnowledgeSection: React.FC<KnowledgeSectionProps> = ({
  state,
  initialSubTab,
  navTick,
  favoriteIds,
  onToggleFavorite,
  onPracticeInSimulator,
}) => {
  const [tab, setTab] = useState<KnowledgeTab>(initialSubTab ?? 'difficult');
  const [search, setSearch] = useState('');
  const [selectedPersonality, setSelectedPersonality] =
    useState<DifficultPersonality | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Manipulation Shield quick quiz state (id -> 0 | 1 | 2)
  const [shieldQuiz, setShieldQuiz] = useState<Record<number, number>>({});
  const [showShieldQuiz, setShowShieldQuiz] = useState(false);

  // Expanded book summary
  const [expandedBookId, setExpandedBookId] = useState<string>(BOOK_SUMMARIES[0].id);

  // Glossary category filter
  const [glossaryCat, setGlossaryCat] = useState<string>('الكل');

  const selfSynth = useMemo(
    () => analyzeDeepSelf(state.selfProfile, state.biasQuiz),
    [state.selfProfile, state.biasQuiz]
  );

  const adaptivePlan = useMemo(() => buildAdaptiveTrainingPlan(state), [state]);

  useEffect(() => {
    if (initialSubTab) {
      setTab(initialSubTab);
      setSelectedPersonality(null);
    }
  }, [initialSubTab, navTick]);

  const handleCopy = async (key: string, text: string) => {
    await copyToClipboard(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey((c) => (c === key ? null : c)), 1800);
  };

  const query = search.trim().toLowerCase();

  const filteredDifficult = useMemo(() => {
    if (!query) return DIFFICULT_PERSONALITIES;
    return DIFFICULT_PERSONALITIES.filter((p) =>
      `${p.name} ${p.subtitle} ${p.howTheyThink} ${p.coreDriver}`.toLowerCase().includes(query)
    );
  }, [query]);

  const filteredBiases = useMemo(() => {
    if (!query) return COGNITIVE_BIASES;
    return COGNITIVE_BIASES.filter((b) =>
      `${b.number} ${b.name} ${b.englishName} ${b.author} ${b.definition} ${b.example}`
        .toLowerCase()
        .includes(query)
    );
  }, [query]);

  const filteredTactics = useMemo(() => {
    if (!query) return MANIPULATION_TACTICS;
    return MANIPULATION_TACTICS.filter((t) =>
      `${t.name} ${t.englishName} ${t.howItWorks} ${t.signs.join(' ')}`
        .toLowerCase()
        .includes(query)
    );
  }, [query]);

  const filteredBooks = useMemo(() => {
    if (!query) return BOOK_SUMMARIES;
    return BOOK_SUMMARIES.filter((b) =>
      `${b.title} ${b.author} ${b.coreIdea} ${b.lessons.join(' ')}`
        .toLowerCase()
        .includes(query)
    );
  }, [query]);

  const filteredGlossary = useMemo(() => {
    return PSYCHOLOGY_GLOSSARY.filter((g) => {
      if (glossaryCat !== 'الكل' && g.category !== glossaryCat) return false;
      if (!query) return true;
      return `${g.term} ${g.english} ${g.category} ${g.definition} ${g.example}`
        .toLowerCase()
        .includes(query);
    });
  }, [query, glossaryCat]);

  const shieldQuizStats = useMemo(() => {
    const answered = Object.keys(shieldQuiz).length;
    const totalScore = Object.values(shieldQuiz).reduce((s, v) => s + v, 0);
    const maxScore = MANIPULATION_QUIZ_ITEMS.length * 2;
    const pct = Math.round((totalScore / maxScore) * 100);
    const flaggedTags = Array.from(
      new Set(
        MANIPULATION_QUIZ_ITEMS.filter((q) => (shieldQuiz[q.id] ?? 0) >= 2).map(
          (q) => q.tacticTag
        )
      )
    );
    return { answered, totalScore, maxScore, pct, flaggedTags };
  }, [shieldQuiz]);

  const filteredSectionCards = useMemo(() => {
    if (
      tab === 'difficult' ||
      tab === 'biases' ||
      tab === 'favorites' ||
      tab === 'shield' ||
      tab === 'books' ||
      tab === 'glossary'
    )
      return [];
    return KNOWLEDGE_CARDS.filter((c) => {
      if (c.section !== tab) return false;
      if (!query) return true;
      return `${c.title} ${c.author} ${c.subGroup} ${c.idea} ${c.example} ${c.exercise}`
        .toLowerCase()
        .includes(query);
    });
  }, [tab, query]);

  const favoriteItems = useMemo(() => {
    const diff = DIFFICULT_PERSONALITIES.filter((p) => favoriteIds.includes(`diff_${p.id}`));
    const biases = COGNITIVE_BIASES.filter((b) => favoriteIds.includes(b.id));
    const cards = KNOWLEDGE_CARDS.filter((c) => favoriteIds.includes(c.id));
    return { diff, biases, cards, total: diff.length + biases.length + cards.length };
  }, [favoriteIds]);

  // DETAILED DIFFICULT PERSONALITY VIEW
  if (selectedPersonality) {
    const favId = `diff_${selectedPersonality.id}`;
    const isFav = favoriteIds.includes(favId);

    return (
      <div className="space-y-5 animate-view">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setSelectedPersonality(null)}
            className="min-h-[44px] px-3.5 rounded-xl bg-[#141720] hover:bg-[#1B1F2B] border border-white/[0.08] text-sm text-[#F2EFE9] flex items-center gap-1.5 cursor-pointer"
          >
            <ChevronRightIcon className="w-4 h-4" />
            <span>الشخصيات الصعبة</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onToggleFavorite(favId)}
              className={`min-h-[44px] px-3.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
                isFav
                  ? 'bg-rose-500/15 border-rose-400/40 text-rose-300'
                  : 'bg-[#141720] border-white/[0.08] text-[#D6D2C9]'
              }`}
            >
              <HeartIcon className="w-4 h-4" filled={isFav} />
              <span>{isFav ? 'محفوظ' : 'مفضلة'}</span>
            </button>
            <button
              type="button"
              onClick={() => onPracticeInSimulator(selectedPersonality.id)}
              className="min-h-[44px] px-4 rounded-xl bg-[#D4A853] text-[#0B0D12] text-xs font-bold flex items-center gap-1.5 hover:bg-[#E2BA6B] cursor-pointer"
            >
              <ChatBranchIcon className="w-4 h-4" />
              <span>تدرّب في المحاكي</span>
            </button>
          </div>
        </div>

        <section className="rounded-3xl bg-[#141720] border border-[#D4A853]/30 p-6 space-y-2">
          <div className="text-xs font-semibold text-[#D4A853]">
            نمط صعب · الشدة: {selectedPersonality.intensity}
          </div>
          <h1 className="text-2xl font-bold text-[#F2EFE9]">{selectedPersonality.name}</h1>
          <p className="text-sm text-[#B8B4AA]">{selectedPersonality.subtitle}</p>
          <p className="text-xs sm:text-sm text-[#E5E2DC] pt-3 border-t border-white/[0.07] leading-relaxed">
            <strong className="text-[#D4A853]">الدافع الخفي: </strong>
            {selectedPersonality.coreDriver}
          </p>
        </section>

        <section className="rounded-3xl bg-[#141720] border border-white/[0.08] p-5 space-y-2">
          <h2 className="text-sm font-bold text-[#D4A853]">كيف يفكر ولماذا يتصرف هكذا؟</h2>
          <p className="text-sm text-[#E5E2DC] leading-relaxed">{selectedPersonality.howTheyThink}</p>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <section className="rounded-3xl bg-[#141720] border border-white/[0.08] p-5 space-y-2.5">
            <h2 className="text-sm font-bold text-amber-300">علامات التعرف المبكر</h2>
            <ul className="space-y-2">
              {selectedPersonality.earlySigns.map((s, idx) => (
                <li key={idx} className="text-xs sm:text-sm text-[#E5E2DC] leading-relaxed flex gap-2">
                  <span className="text-[#D4A853]">•</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-3xl bg-[#141720] border border-white/[0.08] p-5 space-y-2.5">
            <h2 className="text-sm font-bold text-rose-300">أساليبه المعتادة</h2>
            <div className="space-y-2.5">
              {selectedPersonality.typicalTactics.map((t, idx) => (
                <div key={idx} className="p-3 rounded-2xl bg-[#1B1F2B]">
                  <div className="text-xs sm:text-sm font-bold text-[#F2EFE9]">{t.name}</div>
                  <p className="text-xs text-[#C8C3B9] mt-0.5 leading-relaxed">{t.explanation}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        <section className="rounded-3xl bg-[#141720] border border-white/[0.08] p-5 space-y-3">
          <h2 className="text-sm font-bold text-emerald-300">خطة التعامل خطوة بخطوة</h2>
          <div className="space-y-2.5">
            {selectedPersonality.stepByStepPlan.map((st, idx) => (
              <div key={idx} className="p-3.5 rounded-2xl bg-[#1B1F2B]">
                <div className="text-sm font-bold text-[#D4A853]">{st.step}</div>
                <p className="text-xs sm:text-sm text-[#E5E2DC] mt-1 leading-relaxed">{st.detail}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl bg-[#141720] border border-white/[0.08] p-5 space-y-3">
          <h2 className="text-sm font-bold text-[#D4A853]">
            10 جمل جاهزة أقولها (اضغط لنسخ أي جملة)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {selectedPersonality.readyPhrases.map((phrase, idx) => {
              const key = `${selectedPersonality.id}_p_${idx}`;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    void handleCopy(key, phrase);
                  }}
                  className="p-3.5 rounded-2xl bg-[#1B1F2B] hover:bg-[#232838] border border-white/[0.06] flex items-start justify-between gap-2.5 text-right cursor-pointer"
                >
                  <span className="text-xs sm:text-sm text-[#F2EFE9] leading-relaxed">
                    <span className="text-[#D4A853] font-bold tabular-nums ml-1">
                      {idx + 1}.
                    </span>
                    «{phrase}»
                  </span>
                  {copiedKey === key ? (
                    <CheckIcon className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <CopyIcon className="w-4 h-4 text-[#D4A853] shrink-0 mt-0.5" />
                  )}
                </button>
              );
            })}
          </div>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <section className="rounded-3xl bg-[#141720] border border-white/[0.08] p-5 space-y-2.5">
            <h2 className="text-sm font-bold text-amber-300">أخطاء شائعة تجنّبها</h2>
            <ul className="space-y-2">
              {selectedPersonality.commonMistakes.map((m, idx) => (
                <li key={idx} className="text-xs sm:text-sm text-[#E5E2DC] leading-relaxed flex gap-2">
                  <span className="text-rose-400">×</span>
                  <span>{m}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-3xl bg-rose-500/8 border border-rose-500/25 p-5 space-y-2.5">
            <h2 className="text-sm font-bold text-rose-300">متى يكون الابتعاد أو المسافة هو القرار الصحيح؟</h2>
            <ul className="space-y-2">
              {selectedPersonality.whenToWalkAway.map((w, idx) => (
                <li key={idx} className="text-xs sm:text-sm text-[#F2EFE9] leading-relaxed flex gap-2">
                  <span className="text-rose-400">•</span>
                  <span>{w}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-view">
      <div>
        <h1 className="text-xl font-bold text-[#F2EFE9]">مكتبة المعرفة النفسية والتأثير</h1>
        <p className="text-xs text-[#9CA3AF] mt-1">
          موسوعة كاملة تعمل أوفلاين: الشخصيات الصعبة، 60 انحيازاً معرفياً، آليات الدفاع، التأثير، النظريات، ولغة الجسد
        </p>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
        {(
          [
            { id: 'difficult', label: 'الشخصيات الصعبة (9)' },
            { id: 'shield', label: 'درع الحماية من التلاعب' },
            { id: 'books', label: 'ملخصات الكتب (6)' },
            { id: 'glossary', label: 'القاموس النفسي (32)' },
            { id: 'biases', label: 'الانحيازات المعرفية (60)' },
            { id: 'defenses', label: 'آليات الدفاع (15)' },
            { id: 'influence', label: 'التأثير والتواصل' },
            { id: 'theories', label: 'النظريات الكبرى (8)' },
            { id: 'bodyLanguage', label: 'لغة الجسد' },
            { id: 'favorites', label: `المفضلة ♥ (${favoriteItems.total})` },
          ] as { id: KnowledgeTab; label: string }[]
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`min-h-[44px] px-4 rounded-2xl text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0 border transition-colors cursor-pointer ${
              tab === t.id
                ? 'bg-[#D4A853] border-[#D4A853] text-[#0B0D12]'
                : 'bg-[#141720] border-white/[0.08] text-[#9CA3AF] hover:text-[#F2EFE9]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Search Bar */}
      {tab !== 'favorites' && (
        <div className="relative">
          <SearchIcon className="w-4 h-4 text-[#9CA3AF] absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث داخل هذا القسم بالاسم أو الفكرة أو اسم العالم..."
            className="w-full min-h-[46px] pr-10 pl-4 rounded-2xl bg-[#141720] border border-white/[0.08] text-sm text-[#F2EFE9] placeholder:text-[#6B7280] focus:outline-none focus:border-[#D4A853]"
          />
        </div>
      )}

      {/* NEW TAB A: MANIPULATION SHIELD (درع الحماية + اختبار هل يتلاعب بي؟) */}
      {tab === 'shield' && (
        <div className="space-y-5">
          {/* Quick Quiz Banner & Interactive Box */}
          <section className="p-5 rounded-3xl bg-gradient-to-l from-[#1C2130] to-[#141720] border border-[#D4A853]/35 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-[#F2EFE9] flex items-center gap-2">
                  <ShieldIcon className="w-5 h-5 text-[#D4A853]" />
                  اختبار سريع: هل يتلاعب بي؟ (12 مؤشراً)
                </h2>
                <p className="text-xs text-[#9CA3AF] mt-1">
                  فكّر في شخص محدد يرهقك التعامل معه وأجب عن المؤشرات التالية لكشف نمط الضغط العاطفي.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowShieldQuiz((v) => !v)}
                className="min-h-[42px] px-4 rounded-xl bg-[#D4A853] text-[#0B0D12] text-xs font-bold cursor-pointer"
              >
                {showShieldQuiz ? 'إخفاء الاختبار' : 'ابدأ اختبار «هل يتلاعب بي؟»'}
              </button>
            </div>

            {showShieldQuiz && (
              <div className="space-y-3 pt-2 border-t border-white/[0.08]">
                {MANIPULATION_QUIZ_ITEMS.map((item, idx) => {
                  const val = shieldQuiz[item.id];
                  return (
                    <div
                      key={item.id}
                      className="p-3.5 rounded-2xl bg-[#10131B] border border-white/[0.06] space-y-2.5"
                    >
                      <div className="text-xs sm:text-sm text-[#F2EFE9] leading-relaxed">
                        <span className="text-[#D4A853] font-bold ml-1">{idx + 1}.</span>
                        {item.text}
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { v: 0, label: 'لا يحدث' },
                          { v: 1, label: 'أحياناً' },
                          { v: 2, label: 'يتكرر كثيراً' },
                        ].map((opt) => (
                          <button
                            key={opt.v}
                            type="button"
                            onClick={() => setShieldQuiz((prev) => ({ ...prev, [item.id]: opt.v }))}
                            className={`py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                              val === opt.v
                                ? opt.v === 2
                                  ? 'bg-rose-500/20 border-rose-400 text-rose-200'
                                  : opt.v === 1
                                  ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                                  : 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
                                : 'bg-[#171B26] border-white/[0.08] text-[#9CA3AF]'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}

                {shieldQuizStats.answered >= 6 && (
                  <div
                    className={`p-4 rounded-2xl border space-y-2 ${
                      shieldQuizStats.pct >= 60
                        ? 'bg-rose-500/12 border-rose-500/35'
                        : shieldQuizStats.pct >= 30
                        ? 'bg-amber-500/12 border-amber-500/35'
                        : 'bg-emerald-500/12 border-emerald-500/35'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-[#F2EFE9]">
                        {shieldQuizStats.pct >= 60
                          ? 'مؤشر مرتفع جداً لتلاعب وضغط عاطفي مستمر'
                          : shieldQuizStats.pct >= 30
                          ? 'مؤشرات متوسطة لأنماط ضغط تحتاج حدوداً واضحة'
                          : 'مؤشر منخفض — خلافات عادية قابلة للحل بالحوار'}
                      </span>
                      <span className="text-sm font-extrabold text-[#D4A853] tabular-nums">
                        {shieldQuizStats.pct}%
                      </span>
                    </div>
                    {shieldQuizStats.flaggedTags.length > 0 && (
                      <p className="text-xs text-[#E5E2DC]">
                        <strong className="text-[#D4A853]">الأساليب الأوضح ظهوراً: </strong>
                        {shieldQuizStats.flaggedTags.join(' · ')}
                      </p>
                    )}
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => setShieldQuiz({})}
                        className="text-xs text-[#9CA3AF] hover:text-[#F2EFE9] flex items-center gap-1 cursor-pointer"
                      >
                        <RefreshIcon className="w-3.5 h-3.5" />
                        إعادة الاختبار
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* 6 Manipulation Tactics Cards (prioritizing personal vulnerabilities) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {[...filteredTactics]
              .sort((a, b) => {
                if (selfSynth.completionPct < 15) return 0;
                const aV = selfSynth.manipulationVulnerabilities.some((v) => v.tacticId === a.id) ? 0 : 1;
                const bV = selfSynth.manipulationVulnerabilities.some((v) => v.tacticId === b.id) ? 0 : 1;
                return aV - bV;
              })
              .map((t) => {
                const vuln =
                  selfSynth.completionPct >= 15
                    ? selfSynth.manipulationVulnerabilities.find((v) => v.tacticId === t.id)
                    : undefined;
                return (
                  <article
                    key={t.id}
                    className={`p-5 rounded-3xl bg-[#141720] border space-y-3.5 ${
                      vuln
                        ? 'border-amber-400/45 shadow-[0_0_24px_-12px_rgba(251,191,36,0.45)]'
                        : 'border-white/[0.08]'
                    }`}
                  >
                    {vuln && (
                      <div className="p-3 rounded-2xl bg-amber-500/12 border border-amber-400/35 text-xs space-y-1">
                        <div className="font-bold text-amber-300 flex items-center gap-1.5">
                          <ShieldIcon className="w-3.5 h-3.5 shrink-0" />
                          <span>حذر مضاعف حسب ملفك الشخصي</span>
                        </div>
                        <p className="text-[#F2EFE9] leading-relaxed">{vuln.reason}</p>
                      </div>
                    )}
                    <div>
                      <div className="text-[11px] font-semibold text-[#D4A853]">{t.englishName}</div>
                      <h3 className="text-base font-bold text-[#F2EFE9] mt-0.5">{t.name}</h3>
                      <p className="text-xs sm:text-sm text-[#D6D2C9] mt-1.5 leading-relaxed">
                        {t.howItWorks}
                      </p>
                    </div>

                <div className="p-3.5 rounded-2xl bg-[#1B1F2B] space-y-1.5">
                  <div className="text-xs font-bold text-amber-300">علامات اكتشافه مبكراً:</div>
                  <ul className="space-y-1.5 text-xs text-[#E5E2DC] leading-relaxed">
                    {t.signs.map((s, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="text-amber-400">•</span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-bold text-emerald-300">جمل رد جاهزة (اضغط للنسخ):</div>
                  {t.counterPhrases.map((phrase, idx) => {
                    const key = `shield_${t.id}_${idx}`;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => void handleCopy(key, phrase)}
                        className="w-full p-3 rounded-xl bg-[#10131B] hover:bg-[#1B1F2B] border border-white/[0.06] flex items-start justify-between gap-2 text-right cursor-pointer"
                      >
                        <span className="text-xs text-[#F2EFE9] leading-relaxed">«{phrase}»</span>
                        {copiedKey === key ? (
                          <CheckIcon className="w-4 h-4 text-emerald-400 shrink-0" />
                        ) : (
                          <CopyIcon className="w-4 h-4 text-[#D4A853] shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="p-3 rounded-xl bg-[#D4A853]/10 border border-[#D4A853]/25 text-xs text-[#F2EFE9] leading-relaxed">
                  <strong className="text-[#D4A853]">قاعدة ذهبية: </strong>
                  {t.goldenRule}
                </div>
                  </article>
                );
              })}
          </div>
        </div>
      )}

      {/* NEW TAB B: BOOK SUMMARIES (6 BOOKS × 7 LESSONS EACH) */}
      {tab === 'books' && (
        <div className="space-y-4">
          {[...filteredBooks]
            .sort((a, b) => {
              if (!adaptivePlan.isPersonalized) return 0;
              const aRec = adaptivePlan.recommendedBookIds.some((r) => r.id === a.id) ? 0 : 1;
              const bRec = adaptivePlan.recommendedBookIds.some((r) => r.id === b.id) ? 0 : 1;
              return aRec - bRec;
            })
            .map((book) => {
              const isOpen = expandedBookId === book.id;
              const recBook = adaptivePlan.isPersonalized
                ? adaptivePlan.recommendedBookIds.find((r) => r.id === book.id)
                : undefined;
              return (
                <section
                  key={book.id}
                  className={`rounded-3xl bg-[#141720] border overflow-hidden ${
                    recBook
                      ? 'border-[#D4A853]/45 shadow-[0_0_24px_-12px_rgba(212,168,83,0.45)]'
                      : 'border-white/[0.08]'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setExpandedBookId(isOpen ? '' : book.id)}
                    className="w-full p-5 text-right flex items-center justify-between gap-3 cursor-pointer"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#D4A853]/12 border border-[#D4A853]/30 text-[#D4A853] flex items-center justify-center shrink-0 mt-0.5">
                        <BookOpenIcon className="w-5 h-5" />
                      </div>
                      <div>
                        {recBook && (
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#D4A853]/15 border border-[#D4A853]/35 text-[11px] font-bold text-[#D4A853] mb-1">
                            <SparklesIcon className="w-3 h-3" />
                            <span>موصى به لشخصيتك</span>
                          </div>
                        )}
                        <h2 className="text-base font-bold text-[#F2EFE9]">{book.title}</h2>
                        <p className="text-xs text-[#D4A853] mt-0.5">
                          {book.author} · {book.year} · 7 دروس وتمرين تطبيقي
                        </p>
                        {recBook && (
                          <p className="text-xs text-[#D6D2C9] mt-1 leading-relaxed">
                            {recBook.reason}
                          </p>
                        )}
                      </div>
                    </div>
                    <span className="text-xs font-bold text-[#D4A853] shrink-0">
                      {isOpen ? 'إغلاق' : 'اقرأ الملخص'}
                    </span>
                  </button>

                {isOpen && (
                  <div className="px-5 pb-6 pt-3 border-t border-white/[0.07] space-y-4 animate-view">
                    <div className="p-4 rounded-2xl bg-[#1B1F2B]">
                      <div className="text-xs font-bold text-[#D4A853] mb-1">الفكرة الجوهرية للكتاب</div>
                      <p className="text-xs sm:text-sm text-[#F2EFE9] leading-relaxed">{book.coreIdea}</p>
                    </div>

                    <div className="space-y-2">
                      <div className="text-xs font-bold text-[#F2EFE9]">الدروس السبعة العملية:</div>
                      {book.lessons.map((lesson, idx) => (
                        <div
                          key={idx}
                          className="p-3.5 rounded-2xl bg-[#10131B] border border-white/[0.06] flex gap-2.5 text-xs sm:text-sm text-[#E5E2DC] leading-relaxed"
                        >
                          <span className="w-6 h-6 rounded-lg bg-[#D4A853]/15 text-[#D4A853] font-bold flex items-center justify-center shrink-0 tabular-nums text-xs">
                            {idx + 1}
                          </span>
                          <span>{lesson}</span>
                        </div>
                      ))}
                    </div>

                    <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/25">
                      <div className="text-xs font-bold text-emerald-300 mb-1">التمرين التطبيقي</div>
                      <p className="text-xs sm:text-sm text-[#F2EFE9] leading-relaxed">{book.exercise}</p>
                    </div>
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}

      {/* NEW TAB C: SEARCHABLE PSYCHOLOGY GLOSSARY (32 TERMS) */}
      {tab === 'glossary' && (
        <div className="space-y-4">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {['الكل', 'دفاع نفسي', 'انحياز معرفي', 'تلاعب وحدود', 'علاقات وتعلق', 'تواصل وإقناع', 'اتزان نفسي'].map(
              (cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setGlossaryCat(cat)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 border cursor-pointer ${
                    glossaryCat === cat
                      ? 'bg-[#D4A853] text-[#0B0D12] border-[#D4A853]'
                      : 'bg-[#141720] text-[#9CA3AF] border-white/[0.08]'
                  }`}
                >
                  {cat}
                </button>
              )
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {filteredGlossary.map((g) => (
              <article
                key={g.id}
                className="p-4 sm:p-5 rounded-3xl bg-[#141720] border border-white/[0.08] space-y-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-base font-bold text-[#F2EFE9]">{g.term}</h3>
                    <div className="text-[11px] text-[#7E8594]">{g.english}</div>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-[#D4A853]/12 text-[#D4A853] text-[10px] font-bold shrink-0">
                    {g.category}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-[#E5E2DC] leading-relaxed">{g.definition}</p>
                <div className="p-3 rounded-2xl bg-[#1B1F2B] text-xs text-[#D6D2C9] leading-relaxed">
                  <strong className="text-sky-300">مثال واقعي: </strong>
                  {g.example}
                </div>
              </article>
            ))}
          </div>
          {filteredGlossary.length === 0 && (
            <div className="p-6 rounded-2xl bg-[#141720] border border-white/[0.08] text-center text-xs text-[#9CA3AF]">
              لا توجد مصطلحات مطابقة لبحثك. جرّب كلمة أخرى مثل «إسقاط» أو «هالة» أو «تعلق».
            </div>
          )}
        </div>
      )}

      {/* 1. DIFFICULT PERSONALITIES (9) */}
      {tab === 'difficult' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDifficult.map((p) => {
            const favId = `diff_${p.id}`;
            const isFav = favoriteIds.includes(favId);
            return (
              <div
                key={p.id}
                className="p-5 rounded-3xl bg-[#141720] border border-white/[0.08] hover:border-[#D4A853]/35 transition-colors flex flex-col justify-between gap-4"
              >
                <button
                  type="button"
                  onClick={() => setSelectedPersonality(p)}
                  className="text-right cursor-pointer"
                >
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-[#D4A853] font-semibold">الشدة: {p.intensity}</span>
                    <span className="text-[#9CA3AF] tabular-nums">10 جمل جاهزة</span>
                  </div>
                  <h2 className="text-lg font-bold text-[#F2EFE9]">{p.name}</h2>
                  <p className="text-xs text-[#9CA3AF] mt-1 leading-relaxed">{p.subtitle}</p>
                  <p className="text-xs text-[#C8C3B9] mt-2.5 line-clamp-2 leading-relaxed">
                    {p.howTheyThink}
                  </p>
                </button>

                <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setSelectedPersonality(p)}
                    className="text-xs font-bold text-[#D4A853] flex items-center gap-1 cursor-pointer"
                  >
                    <span>افتح الخطة الكاملة</span>
                    <ChevronLeftIcon className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onToggleFavorite(favId)}
                    aria-label="إضافة للمفضلة"
                    className={`min-h-[36px] min-w-[36px] rounded-lg flex items-center justify-center cursor-pointer ${
                      isFav ? 'text-rose-400' : 'text-[#9CA3AF] hover:text-[#F2EFE9]'
                    }`}
                  >
                    <HeartIcon className="w-4 h-4" filled={isFav} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 2. 60 COGNITIVE BIASES */}
      {tab === 'biases' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredBiases.map((b) => {
            const isFav = favoriteIds.includes(b.id);
            return (
              <article
                key={b.id}
                className="p-5 rounded-3xl bg-[#141720] border border-white/[0.08] space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-xs text-[#D4A853] font-bold tabular-nums">
                      #{String(b.number).padStart(2, '0')} · {b.author}
                    </div>
                    <h2 className="text-base font-bold text-[#F2EFE9] mt-0.5">{b.name}</h2>
                    <div className="text-[11px] text-[#7E8594]">{b.englishName}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onToggleFavorite(b.id)}
                    aria-label="مفضلة"
                    className={`min-h-[40px] min-w-[40px] rounded-xl flex items-center justify-center shrink-0 cursor-pointer ${
                      isFav ? 'text-rose-400 bg-rose-500/10' : 'text-[#9CA3AF] hover:bg-white/[0.05]'
                    }`}
                  >
                    <HeartIcon className="w-4 h-4" filled={isFav} />
                  </button>
                </div>

                <p className="text-xs sm:text-sm text-[#E5E2DC] leading-relaxed">
                  <strong className="text-[#D4A853]">الفكرة: </strong>
                  {b.definition}
                </p>

                <div className="p-3 rounded-2xl bg-[#1B1F2B] text-xs sm:text-sm text-[#D6D2C9] leading-relaxed">
                  <strong className="text-sky-300">مثال يومي: </strong>
                  {b.example}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs leading-relaxed">
                  <div className="p-3 rounded-2xl bg-emerald-500/8 border border-emerald-500/20 text-[#E5E2DC]">
                    <strong className="text-emerald-300 block mb-0.5">كيف أستفيد منه أخلاقياً؟</strong>
                    {b.howToUse}
                  </div>
                  <div className="p-3 rounded-2xl bg-rose-500/8 border border-rose-500/20 text-[#E5E2DC]">
                    <strong className="text-rose-300 block mb-0.5">كيف أحمي نفسي منه؟</strong>
                    {b.howToProtect}
                  </div>
                </div>

                <p className="text-xs text-[#C8C3B9] pt-2 border-t border-white/[0.06] leading-relaxed">
                  <strong className="text-[#D4A853]">تمرين تطبيقي: </strong>
                  {b.exercise}
                </p>
              </article>
            );
          })}
        </div>
      )}

      {/* 3..6. DEFENSES / INFLUENCE / THEORIES / BODY LANGUAGE */}
      {(tab === 'defenses' ||
        tab === 'influence' ||
        tab === 'theories' ||
        tab === 'bodyLanguage') && (
        <div className="space-y-4">
          {tab === 'bodyLanguage' && (
            <div className="p-4 sm:p-5 rounded-3xl bg-amber-500/10 border border-amber-400/35 flex items-start gap-3">
              <ShieldIcon className="w-6 h-6 text-amber-300 shrink-0 mt-0.5" />
              <div>
                <h2 className="text-sm font-bold text-amber-200">{BODY_LANGUAGE_WARNING.title}</h2>
                <p className="text-xs sm:text-sm text-[#F2EFE9] mt-1 leading-relaxed">
                  {BODY_LANGUAGE_WARNING.body}
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredSectionCards.map((card) => {
              const isFav = favoriteIds.includes(card.id);
              return (
                <article
                  key={card.id}
                  className="p-5 rounded-3xl bg-[#141720] border border-white/[0.08] space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-[11px] font-semibold text-[#D4A853]">
                          {card.subGroup}
                        </div>
                        <h2 className="text-base font-bold text-[#F2EFE9] mt-0.5">{card.title}</h2>
                        <div className="text-xs text-[#9CA3AF] mt-0.5">صاحبها: {card.author}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onToggleFavorite(card.id)}
                        aria-label="مفضلة"
                        className={`min-h-[40px] min-w-[40px] rounded-xl flex items-center justify-center shrink-0 cursor-pointer ${
                          isFav
                            ? 'text-rose-400 bg-rose-500/10'
                            : 'text-[#9CA3AF] hover:bg-white/[0.05]'
                        }`}
                      >
                        <HeartIcon className="w-4 h-4" filled={isFav} />
                      </button>
                    </div>

                    <p className="text-xs sm:text-sm text-[#E5E2DC] leading-relaxed">
                      <strong className="text-[#D4A853]">الفكرة: </strong>
                      {card.idea}
                    </p>

                    <div className="p-3.5 rounded-2xl bg-[#1B1F2B] text-xs sm:text-sm text-[#D6D2C9] leading-relaxed">
                      <strong className="text-sky-300">مثال: </strong>
                      {card.example}
                    </div>
                  </div>

                  <p className="text-xs text-[#C8C3B9] pt-2.5 border-t border-white/[0.06] leading-relaxed">
                    <strong className="text-emerald-300">تمرين تطبيقي: </strong>
                    {card.exercise}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      )}

      {/* 7. FAVORITES SHELF */}
      {tab === 'favorites' && (
        <div className="space-y-4">
          {favoriteItems.total === 0 ? (
            <div className="p-8 rounded-3xl bg-[#141720] border border-white/[0.08] text-center text-sm text-[#9CA3AF]">
              لم تحفظ أي بطاقة معرفية بعد. اضغط على أيقونة القلب ♥ في أي بطاقة أو انحياز أو شخصية صعبة للرجوع إليها سريعاً.
            </div>
          ) : (
            <div className="space-y-4">
              {favoriteItems.diff.length > 0 && (
                <div className="space-y-2.5">
                  <h2 className="text-sm font-bold text-[#D4A853]">الشخصيات الصعبة المحفوظة</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {favoriteItems.diff.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setSelectedPersonality(p)}
                        className="p-4 rounded-2xl bg-[#141720] border border-white/[0.08] text-right flex items-center justify-between cursor-pointer"
                      >
                        <div>
                          <div className="text-sm font-bold text-[#F2EFE9]">{p.name}</div>
                          <div className="text-xs text-[#9CA3AF] mt-0.5">{p.subtitle}</div>
                        </div>
                        <ChevronLeftIcon className="w-4 h-4 text-[#D4A853]" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {favoriteItems.biases.length > 0 && (
                <div className="space-y-2.5">
                  <h2 className="text-sm font-bold text-[#D4A853]">الانحيازات المعرفية المحفوظة</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {favoriteItems.biases.map((b) => (
                      <div key={b.id} className="p-4 rounded-2xl bg-[#141720] border border-white/[0.08] space-y-1.5">
                        <div className="flex items-center justify-between">
                          <strong className="text-sm text-[#F2EFE9]">#{b.number} {b.name}</strong>
                          <button
                            type="button"
                            onClick={() => onToggleFavorite(b.id)}
                            className="text-rose-400 p-1 cursor-pointer"
                            aria-label="إزالة من المفضلة"
                          >
                            <HeartIcon className="w-4 h-4" filled />
                          </button>
                        </div>
                        <p className="text-xs text-[#D6D2C9] leading-relaxed">{b.definition}</p>
                        <p className="text-xs text-emerald-300">تمرين: {b.exercise}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {favoriteItems.cards.length > 0 && (
                <div className="space-y-2.5">
                  <h2 className="text-sm font-bold text-[#D4A853]">البطاقات المعرفية المحفوظة</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {favoriteItems.cards.map((c) => (
                      <div key={c.id} className="p-4 rounded-2xl bg-[#141720] border border-white/[0.08] space-y-1.5">
                        <div className="flex items-center justify-between">
                          <strong className="text-sm text-[#F2EFE9]">{c.title}</strong>
                          <button
                            type="button"
                            onClick={() => onToggleFavorite(c.id)}
                            className="text-rose-400 p-1 cursor-pointer"
                            aria-label="إزالة من المفضلة"
                          >
                            <HeartIcon className="w-4 h-4" filled />
                          </button>
                        </div>
                        <div className="text-[11px] text-[#9CA3AF]">{c.author} · {c.subGroup}</div>
                        <p className="text-xs text-[#D6D2C9] leading-relaxed">{c.idea}</p>
                        <p className="text-xs text-emerald-300">تمرين: {c.exercise}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
