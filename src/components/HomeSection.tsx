import React, { useMemo, useRef, useState } from 'react';
import {
  BUILTIN_QUOTES,
  QUOTE_CATEGORIES,
  QUOTE_ERAS,
  QUOTE_VERIFICATIONS,
  SAMPLE_IMPORT_JSON,
} from '../data/quotes';
import { SIMULATOR_SCENARIOS } from '../data/simulatorScenarios';
import { THIRTY_DAY_PROGRAM } from '../data/trainingData';
import {
  AppNavigateTarget,
  AppState,
  QuoteCategory,
  QuoteEra,
  QuoteItem,
  QuoteVerification,
  TabId,
} from '../types';
import { getUserLevel } from '../data/selfAndBiasData';
import {
  analyzeDeepSelf,
  buildAdaptiveTrainingPlan,
  getPersonalizedTodayChallenge,
} from '../engine/personalization';
import {
  copyToClipboard,
  daysBetweenIso,
  getTodayIso,
  parseImportedQuotesJson,
} from '../utils/storage';
import {
  CalendarIcon,
  CheckIcon,
  ChevronLeftIcon,
  CloseIcon,
  CopyIcon,
  FlipIcon,
  HeartIcon,
  SearchIcon,
  ShareIcon,
  ShuffleIcon,
  SparklesIcon,
  UploadIcon,
  VolumeIcon,
  WindIcon,
} from './Icons';

interface HomeSectionProps {
  state: AppState;
  onToggleFavoriteQuote: (quoteId: string) => void;
  onImportQuotes: (quotes: QuoteItem[]) => void;
  onNavigate: (tab: TabId) => void;
  onNavigateTo: (target: AppNavigateTarget) => void;
  onOpenCalmNow: () => void;
  onOpenSoundStudio: () => void;
}

function getQuoteOfTheDay(allQuotes: QuoteItem[]): QuoteItem {
  const today = getTodayIso();
  let hash = 0;
  for (let i = 0; i < today.length; i++) {
    hash = (hash * 31 + today.charCodeAt(i)) % 100000;
  }
  return allQuotes[hash % allQuotes.length] ?? BUILTIN_QUOTES[0];
}

export const HomeSection: React.FC<HomeSectionProps> = ({
  state,
  onToggleFavoriteQuote,
  onImportQuotes,
  onNavigate,
  onNavigateTo,
  onOpenCalmNow,
  onOpenSoundStudio,
}) => {
  const allQuotes = useMemo(
    () => [...state.customQuotes, ...BUILTIN_QUOTES],
    [state.customQuotes]
  );

  const quoteOfDay = useMemo(() => getQuoteOfTheDay(allQuotes), [allQuotes]);

  const [activeQuoteId, setActiveQuoteId] = useState<string>(quoteOfDay.id);
  const [isFlipped, setIsFlipped] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);

  // Sub-views & filters
  const [viewMode, setViewMode] = useState<'explore' | 'favorites'>('explore');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<QuoteCategory | 'الكل'>('الكل');
  const [authorFilter, setAuthorFilter] = useState<string>('الكل');
  const [eraFilter, setEraFilter] = useState<QuoteEra | 'الكل'>('الكل');
  const [verificationFilter, setVerificationFilter] = useState<QuoteVerification | 'الكل'>('الكل');
  const [visibleCount, setVisibleCount] = useState(24);

  // Import modal
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState('');
  const [importStatus, setImportStatus] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const heroCardRef = useRef<HTMLDivElement | null>(null);

  const activeQuote = useMemo(
    () => allQuotes.find((q) => q.id === activeQuoteId) ?? quoteOfDay,
    [allQuotes, activeQuoteId, quoteOfDay]
  );

  const authorsList = useMemo(() => {
    const set = new Set<string>();
    allQuotes.forEach((q) => set.add(q.author));
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'ar'));
  }, [allQuotes]);

  const filteredQuotes = useMemo(() => {
    const query = search.trim().toLowerCase();
    return allQuotes.filter((q) => {
      if (viewMode === 'favorites' && !state.favoriteQuoteIds.includes(q.id)) {
        return false;
      }
      if (categoryFilter !== 'الكل' && q.category !== categoryFilter) return false;
      if (authorFilter !== 'الكل' && q.author !== authorFilter) return false;
      if (eraFilter !== 'الكل' && q.era !== eraFilter) return false;
      if (verificationFilter !== 'الكل' && q.verification !== verificationFilter) return false;
      if (query) {
        const hay = `${q.text} ${q.author} ${q.source} ${q.explanation} ${q.category}`.toLowerCase();
        if (!hay.includes(query)) return false;
      }
      return true;
    });
  }, [
    allQuotes,
    viewMode,
    state.favoriteQuoteIds,
    categoryFilter,
    authorFilter,
    eraFilter,
    verificationFilter,
    search,
  ]);

  const handleRandomQuote = () => {
    const pool = filteredQuotes.length > 1 ? filteredQuotes : allQuotes;
    let next = pool[Math.floor(Math.random() * pool.length)];
    if (pool.length > 1 && next.id === activeQuote.id) {
      const idx = pool.findIndex((q) => q.id === activeQuote.id);
      next = pool[(idx + 1) % pool.length];
    }
    setIsFlipped(false);
    setActiveQuoteId(next.id);
  };

  const handleSelectQuote = (quote: QuoteItem) => {
    setIsFlipped(false);
    setActiveQuoteId(quote.id);
    heroCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const formatQuoteShareText = (q: QuoteItem) =>
    `«${q.text}»\n— ${q.author}\nالمصدر: ${q.source} (${q.year}) · ${q.verification}`;

  const handleCopy = async (q: QuoteItem) => {
    await copyToClipboard(formatQuoteShareText(q));
    setCopiedId(q.id);
    setTimeout(() => setCopiedId((curr) => (curr === q.id ? null : curr)), 2000);
  };

  const handleShare = async (q: QuoteItem) => {
    const text = formatQuoteShareText(q);
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: 'عبارة من مرشد النفس والتأثير',
          text,
        });
        return;
      } catch {
        // user cancelled or unavailable; fall through to copy
      }
    }
    await copyToClipboard(text);
    setShareFeedback('تم نسخ العبارة جاهزة للمشاركة');
    setTimeout(() => setShareFeedback(null), 2200);
  };

  const handleImportSubmit = () => {
    const res = parseImportedQuotesJson(importText);
    if (res.error) {
      setImportStatus({ type: 'err', text: res.error });
      return;
    }
    onImportQuotes(res.quotes);
    setImportStatus({
      type: 'ok',
      text: `تمت إضافة ${res.quotes.length} عبارة جديدة إلى مكتبتك المحلية بنجاح.`,
    });
    setImportText('');
    setActiveQuoteId(res.quotes[0].id);
    setIsFlipped(false);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const txt = typeof reader.result === 'string' ? reader.result : '';
      setImportText(txt);
      setImportStatus(null);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const isFav = state.favoriteQuoteIds.includes(activeQuote.id);

  const verificationColor = (v: QuoteVerification) => {
    if (v === 'موثقة بمصدر') return 'text-emerald-400';
    if (v === 'منسوبة ولم تُوثق') return 'text-amber-300';
    return 'text-rose-400';
  };

  const nextMission = useMemo(() => {
    return (
      THIRTY_DAY_PROGRAM.find((m) => !state.completedDays.includes(m.day)) ??
      THIRTY_DAY_PROGRAM[THIRTY_DAY_PROGRAM.length - 1]
    );
  }, [state.completedDays]);

  const todayIso = getTodayIso();
  const selfSynth = useMemo(
    () => analyzeDeepSelf(state.selfProfile, state.biasQuiz),
    [state.selfProfile, state.biasQuiz]
  );
  const adaptivePlan = useMemo(() => buildAdaptiveTrainingPlan(state), [state]);
  const personalizedChallenge = useMemo(
    () => getPersonalizedTodayChallenge(todayIso, adaptivePlan),
    [todayIso, adaptivePlan]
  );
  const todayChallenge = personalizedChallenge.challenge;
  const todayChallengeDone = state.completedChallengeDates.includes(todayIso);
  const userLevel = useMemo(() => getUserLevel(state.xpPoints), [state.xpPoints]);

  const relationshipAlertCount = useMemo(() => {
    let count = 0;
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    state.people.forEach((p) => {
      if (p.birthday && /^\d{4}-\d{2}-\d{2}$/.test(p.birthday)) {
        const [, mm, dd] = p.birthday.split('-').map(Number);
        let nextBd = new Date(now.getFullYear(), mm - 1, dd);
        if (nextBd < todayStart) {
          nextBd = new Date(now.getFullYear() + 1, mm - 1, dd);
        }
        const diffDays = Math.round((nextBd.getTime() - todayStart.getTime()) / 86400000);
        if (diffDays <= 14) count += 1;
      }
      if (p.lastContactDate) {
        const since = daysBetweenIso(p.lastContactDate, todayIso);
        if (since >= 21) count += 1;
      }
    });
    return count;
  }, [state.people, todayIso]);

  return (
    <div className="space-y-6 animate-view">
      {/* Quote of the Day Compact Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#141720] border border-white/[0.08] px-4 py-3">
        <button
          type="button"
          onClick={() => handleSelectQuote(quoteOfDay)}
          className="flex-1 min-w-[200px] text-right cursor-pointer group"
        >
          <div className="text-[11px] font-semibold text-[#D4A853]">
            عبارة اليوم · اضغط لعرضها
          </div>
          <p className="text-xs sm:text-sm text-[#E5E2DC] line-clamp-1 mt-0.5 group-hover:text-white transition-colors">
            «{quoteOfDay.text}» — {quoteOfDay.author}
          </p>
        </button>
        <div className="text-xs text-[#9CA3AF] tabular-nums shrink-0">
          المكتبة: <strong className="text-[#F2EFE9]">{allQuotes.length}</strong> عبارة
        </div>
      </div>

      {/* HERO 3D FLIP QUOTE CARD */}
      <section ref={heroCardRef} className="space-y-3">
        <div
          className="flip-scene w-full cursor-pointer select-none"
          onClick={() => setIsFlipped((v) => !v)}
          role="button"
          tabIndex={0}
          aria-label="اضغط لقلب بطاقة العبارة وعرض المصدر والشرح"
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setIsFlipped((v) => !v);
            }
          }}
        >
          <div className={`flip-card relative w-full min-h-[300px] sm:min-h-[330px] ${isFlipped ? 'is-flipped' : ''}`}>
            {/* FRONT FACE */}
            <div className="flip-face absolute inset-0 rounded-3xl bg-gradient-to-br from-[#171B26] via-[#141720] to-[#11141C] border border-[#D4A853]/30 p-6 sm:p-8 flex flex-col justify-between shadow-2xl">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="text-[#D4A853] font-semibold">
                  {activeQuote.category} · {activeQuote.era}
                </span>
                <span className={`font-semibold ${verificationColor(activeQuote.verification)}`}>
                  {activeQuote.verification}
                </span>
              </div>

              <div className="my-auto py-4 text-center">
                <p className="text-xl sm:text-2xl lg:text-[26px] font-bold text-[#F2EFE9] leading-[1.7] tracking-tight">
                  «{activeQuote.text}»
                </p>
              </div>

              <div className="flex items-center justify-between gap-2 pt-3 border-t border-white/[0.07] text-xs text-[#9CA3AF]">
                <span className="flex items-center gap-1.5 text-[#D4A853]">
                  <FlipIcon className="w-4 h-4" />
                  <span>اضغط لقلب البطاقة ← القائل والمصدر والشرح</span>
                </span>
                {activeQuote.id === quoteOfDay.id && (
                  <span className="text-[#D6D2C9]">عبارة اليوم</span>
                )}
              </div>
            </div>

            {/* BACK FACE */}
            <div className="flip-face flip-face-back absolute inset-0 rounded-3xl bg-gradient-to-br from-[#1B1F2C] via-[#151924] to-[#11141C] border border-[#D4A853]/45 p-6 sm:p-8 flex flex-col justify-between shadow-2xl overflow-y-auto">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="text-[#D4A853] font-bold">بطاقة التوثيق والمعنى</span>
                <span className={`font-semibold ${verificationColor(activeQuote.verification)}`}>
                  {activeQuote.verification}
                </span>
              </div>

              <div className="space-y-3 my-auto py-3">
                <div>
                  <div className="text-[11px] text-[#9CA3AF]">القائل</div>
                  <div className="text-lg sm:text-xl font-bold text-[#F2EFE9]">
                    {activeQuote.author}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="p-3 rounded-2xl bg-[#0F1219] border border-white/[0.06]">
                    <div className="text-[11px] text-[#9CA3AF]">المصدر</div>
                    <div className="text-xs sm:text-sm text-[#E5E2DC] mt-0.5 leading-relaxed">
                      {activeQuote.source}
                    </div>
                  </div>
                  <div className="p-3 rounded-2xl bg-[#0F1219] border border-white/[0.06]">
                    <div className="text-[11px] text-[#9CA3AF]">السنة والعصر</div>
                    <div className="text-xs sm:text-sm text-[#E5E2DC] mt-0.5 tabular-nums">
                      {activeQuote.year} · {activeQuote.era}
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#D4A853]/8 border border-[#D4A853]/20">
                  <div className="text-[11px] font-semibold text-[#D4A853] mb-1">
                    شرح قصير لمعناها
                  </div>
                  <p className="text-xs sm:text-sm text-[#E5E2DC] leading-relaxed">
                    {activeQuote.explanation}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-white/[0.07] text-xs text-[#9CA3AF]">
                <span className="flex items-center gap-1.5 text-[#D4A853]">
                  <FlipIcon className="w-4 h-4" />
                  <span>اضغط للعودة إلى نص العبارة</span>
                </span>
                <span>{activeQuote.category}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Hero Action Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <button
            type="button"
            onClick={handleRandomQuote}
            className="min-h-[48px] px-4 rounded-2xl bg-[#D4A853] hover:bg-[#E2BA6B] text-[#0B0D12] text-sm font-bold flex items-center justify-center gap-2 transition-colors active:scale-[0.98] cursor-pointer"
          >
            <ShuffleIcon className="w-4 h-4" />
            <span>عبارة عشوائية</span>
          </button>

          <button
            type="button"
            onClick={() => onToggleFavoriteQuote(activeQuote.id)}
            className={`min-h-[48px] px-4 rounded-2xl border text-sm font-semibold flex items-center justify-center gap-2 transition-colors active:scale-[0.98] cursor-pointer ${
              isFav
                ? 'bg-rose-500/15 border-rose-400/40 text-rose-300'
                : 'bg-[#141720] hover:bg-[#1B1F2B] border-white/[0.09] text-[#F2EFE9]'
            }`}
          >
            <HeartIcon className="w-4 h-4" filled={isFav} />
            <span>{isFav ? 'في المفضلة' : 'مفضلة'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              void handleCopy(activeQuote);
            }}
            className="min-h-[48px] px-4 rounded-2xl bg-[#141720] hover:bg-[#1B1F2B] border border-white/[0.09] text-[#F2EFE9] text-sm font-semibold flex items-center justify-center gap-2 transition-colors active:scale-[0.98] cursor-pointer"
          >
            {copiedId === activeQuote.id ? (
              <>
                <CheckIcon className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-300">تم النسخ</span>
              </>
            ) : (
              <>
                <CopyIcon className="w-4 h-4 text-[#D4A853]" />
                <span>نسخ</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              void handleShare(activeQuote);
            }}
            className="min-h-[48px] px-4 rounded-2xl bg-[#141720] hover:bg-[#1B1F2B] border border-white/[0.09] text-[#F2EFE9] text-sm font-semibold flex items-center justify-center gap-2 transition-colors active:scale-[0.98] cursor-pointer"
          >
            <ShareIcon className="w-4 h-4 text-[#D4A853]" />
            <span>{shareFeedback ? 'جُهّزت ✓' : 'مشاركة'}</span>
          </button>
        </div>
      </section>

      {/* PERSONALIZED COMPASS CARD (بوصلتك الشخصية اليوم) */}
      <section className="rounded-3xl bg-gradient-to-l from-[#1C2130] via-[#151925] to-[#141720] border border-[#D4A853]/35 p-4 sm:p-5 space-y-3.5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-bold text-[#D4A853] flex items-center gap-1.5">
                <SparklesIcon className="w-4 h-4 shrink-0" />
                <span>بوصلتك الشخصية اليوم</span>
              </span>
              <span className="px-2 py-0.5 rounded-lg bg-[#0B0D12]/60 border border-white/[0.08] text-[11px] text-[#D6D2C9] tabular-nums">
                ملفي أنا: {selfSynth.completionPct}%
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-[#F2EFE9]">
              {adaptivePlan.isPersonalized
                ? `${selfSynth.displayName ? `${selfSynth.displayName} — ` : ''}${selfSynth.archetype.title}`
                : 'اكتشف خريطة شخصيتك لتتخصّص خطتك تلقائياً'}
            </h2>
            <p className="text-xs text-[#C8C3B9] leading-relaxed">
              {adaptivePlan.isPersonalized
                ? `أولويتك الآن: ${adaptivePlan.primaryTrack.title} · ${adaptivePlan.primaryTrack.reason}`
                : 'أكمل اختبارات «ملفي أنا» (6 محاور علمية) ليضبط التطبيق تدريبك اليومي والمحاكي ودرع الحماية وتوافق علاقاتك بدقة.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onNavigateTo({ tab: 'training', trainingSubTab: 'self' })}
              className="min-h-[40px] px-3.5 rounded-xl bg-[#10131B] hover:bg-[#1B1F2B] border border-white/[0.1] text-xs font-semibold text-[#F2EFE9] cursor-pointer"
            >
              {selfSynth.completionPct >= 60 ? 'تقرير ملفي أنا' : 'أكمل ملفي أنا'}
            </button>
            <button
              type="button"
              onClick={() =>
                onNavigateTo(
                  adaptivePlan.isPersonalized
                    ? adaptivePlan.primaryTrack.primaryTarget
                    : { tab: 'training', trainingSubTab: 'self' }
                )
              }
              className="min-h-[40px] px-4 rounded-xl bg-[#D4A853] hover:bg-[#E2BA6B] text-[#0B0D12] text-xs font-bold flex items-center gap-1 cursor-pointer"
            >
              <span>
                {adaptivePlan.isPersonalized
                  ? adaptivePlan.primaryTrack.primaryActionLabel
                  : 'ابدأ التحليل الآن'}
              </span>
              <ChevronLeftIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </section>

      {/* Quick Calm, Soundscapes, Today's Challenge & Relationship Reminders */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={onOpenCalmNow}
            className="min-h-[68px] p-3.5 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-400/30 text-right flex flex-col justify-between transition-colors cursor-pointer"
          >
            <div className="flex items-center justify-between text-emerald-300">
              <WindIcon className="w-5 h-5" />
              <span className="text-[11px] font-semibold">طوارئ 60 ث</span>
            </div>
            <div className="mt-1.5">
              <div className="text-sm font-bold text-[#F2EFE9]">اهدأ الآن</div>
              <div className="text-[11px] text-[#9CA3AF]">تنفس موجّه وتأريض فوري</div>
            </div>
          </button>

          <button
            type="button"
            onClick={onOpenSoundStudio}
            className="min-h-[68px] p-3.5 rounded-2xl bg-[#D4A853]/10 hover:bg-[#D4A853]/15 border border-[#D4A853]/30 text-right flex flex-col justify-between transition-colors cursor-pointer"
          >
            <div className="flex items-center justify-between text-[#D4A853]">
              <VolumeIcon className="w-5 h-5" />
              <span className="text-[11px] font-semibold">أوفلاين</span>
            </div>
            <div className="mt-1.5">
              <div className="text-sm font-bold text-[#F2EFE9]">الصوتيات والهدوء</div>
              <div className="text-[11px] text-[#9CA3AF] line-clamp-1">
                {adaptivePlan.isPersonalized
                  ? `مقترح لك: ${adaptivePlan.recommendedSoundTitle}`
                  : 'موجات السكينة وبحر ومطر'}
              </div>
            </div>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => onNavigateTo({ tab: 'training', trainingSubTab: 'program' })}
            className="min-h-[68px] p-3.5 rounded-2xl bg-[#141720] hover:bg-[#191D29] border border-white/[0.08] text-right flex flex-col justify-between transition-colors cursor-pointer"
          >
            <div className="flex items-center justify-between gap-1 text-[11px]">
              <span className="flex items-center gap-1 text-[#D4A853] font-semibold">
                <SparklesIcon className="w-3.5 h-3.5" />
                <span>تحدي اليوم</span>
              </span>
              <span className={todayChallengeDone ? 'text-emerald-400 font-semibold' : 'text-[#9CA3AF] tabular-nums'}>
                {todayChallengeDone ? 'مكتمل ✓' : `+${todayChallenge.xp} XP`}
              </span>
            </div>
            <div className="mt-1.5">
              <div className="text-xs font-bold text-[#F2EFE9] line-clamp-1">
                {todayChallenge.title}
              </div>
              <div className="text-[11px] text-[#9CA3AF] mt-0.5 line-clamp-1 tabular-nums">
                {personalizedChallenge.matchReason ??
                  `المستوى ${userLevel.level}: ${userLevel.title} (${state.xpPoints} XP)`}
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('circle')}
            className="min-h-[68px] p-3.5 rounded-2xl bg-[#141720] hover:bg-[#191D29] border border-white/[0.08] text-right flex flex-col justify-between transition-colors cursor-pointer"
          >
            <div className="flex items-center justify-between gap-1 text-[11px]">
              <span className="flex items-center gap-1 text-[#D4A853] font-semibold">
                <CalendarIcon className="w-3.5 h-3.5" />
                <span>تذكيرات علاقات</span>
              </span>
              {relationshipAlertCount > 0 && (
                <span className="text-amber-300 font-bold tabular-nums">{relationshipAlertCount}</span>
              )}
            </div>
            <div className="mt-1.5">
              <div className="text-xs font-bold text-[#F2EFE9]">
                {relationshipAlertCount > 0
                  ? `${relationshipAlertCount} تنبيهات تواصل / ميلاد`
                  : 'علاقاتك متابعة جيداً'}
              </div>
              <div className="text-[11px] text-[#9CA3AF] mt-0.5">
                أعياد الميلاد والتواصل الدوري
              </div>
            </div>
          </button>
        </div>
      </section>

      {/* Quick Personal Status Strip */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <button
          type="button"
          onClick={() => onNavigate('circle')}
          className="p-4 rounded-2xl bg-[#141720] hover:bg-[#191D29] border border-white/[0.08] text-right transition-colors cursor-pointer"
        >
          <div className="text-[11px] text-[#9CA3AF]">دائرتي القريبة</div>
          <div className="text-lg font-bold text-[#F2EFE9] tabular-nums mt-0.5">
            {state.people.length} ملفات
          </div>
          <div className="text-[11px] text-[#D4A853] mt-1 flex items-center gap-1">
            <span>قبل الحوار · مراجعة · ملفات</span>
            <ChevronLeftIcon className="w-3.5 h-3.5" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('knowledge')}
          className="p-4 rounded-2xl bg-[#141720] hover:bg-[#191D29] border border-white/[0.08] text-right transition-colors cursor-pointer"
        >
          <div className="text-[11px] text-[#9CA3AF]">مكتبة المعرفة</div>
          <div className="text-base sm:text-lg font-bold text-[#F2EFE9] tabular-nums mt-0.5">
            درع الحماية · كتب · قاموس
          </div>
          <div className="text-[11px] text-[#D4A853] mt-1 flex items-center gap-1">
            <span>+ 60 انحيازاً و9 أنماط</span>
            <ChevronLeftIcon className="w-3.5 h-3.5" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('training')}
          className="p-4 rounded-2xl bg-[#141720] hover:bg-[#191D29] border border-white/[0.08] text-right transition-colors cursor-pointer"
        >
          <div className="text-[11px] text-[#9CA3AF]">مهمة اليوم {nextMission.day}/30</div>
          <div className="text-sm font-bold text-[#F2EFE9] line-clamp-1 mt-1">
            {nextMission.title}
          </div>
          <div className="text-[11px] text-[#D4A853] mt-1 tabular-nums">
            أنجزت {state.completedDays.length} يوماً · سلسلة {state.streakDays}
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('simulator')}
          className="p-4 rounded-2xl bg-[#141720] hover:bg-[#191D29] border border-white/[0.08] text-right transition-colors cursor-pointer"
        >
          <div className="text-[11px] text-[#9CA3AF]">محاكي الحوارات</div>
          <div className="text-lg font-bold text-[#F2EFE9] tabular-nums mt-0.5">
            {Object.keys(state.simResults).length} / {SIMULATOR_SCENARIOS.length} مواقف
          </div>
          <div className="text-[11px] text-[#D4A853] mt-1 flex items-center gap-1">
            <span>تدرّب قبل الواقع</span>
            <ChevronLeftIcon className="w-3.5 h-3.5" />
          </div>
        </button>
      </section>

      {/* QUOTES LIBRARY EXPLORER + FAVORITES + IMPORT */}
      <section className="rounded-3xl bg-[#141720] border border-white/[0.08] p-5 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setViewMode('explore');
                setVisibleCount(24);
              }}
              className={`min-h-[44px] px-4 rounded-xl text-xs sm:text-sm font-bold transition-colors cursor-pointer ${
                viewMode === 'explore'
                  ? 'bg-[#D4A853] text-[#0B0D12]'
                  : 'bg-[#1B1F2B] text-[#9CA3AF] hover:text-[#F2EFE9]'
              }`}
            >
              مكتبة العبارات ({allQuotes.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setViewMode('favorites');
                setVisibleCount(24);
              }}
              className={`min-h-[44px] px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                viewMode === 'favorites'
                  ? 'bg-rose-500/20 text-rose-200 border border-rose-400/40'
                  : 'bg-[#1B1F2B] text-[#9CA3AF] hover:text-[#F2EFE9]'
              }`}
            >
              <HeartIcon className="w-4 h-4" filled={viewMode === 'favorites'} />
              <span className="tabular-nums">المفضلة ({state.favoriteQuoteIds.length})</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              setImportStatus(null);
              setShowImportModal(true);
            }}
            className="min-h-[44px] px-4 rounded-xl bg-[#1B1F2B] hover:bg-[#232838] border border-[#D4A853]/40 text-[#D4A853] text-xs sm:text-sm font-semibold flex items-center gap-2 cursor-pointer"
          >
            <UploadIcon className="w-4 h-4" />
            <span>استيراد عبارات (JSON)</span>
          </button>
        </div>

        {/* Search & Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
          <div className="relative sm:col-span-2 lg:col-span-1">
            <SearchIcon className="w-4 h-4 text-[#9CA3AF] absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setVisibleCount(24);
              }}
              placeholder="ابحث في النص أو القائل..."
              className="w-full min-h-[44px] pr-10 pl-3 rounded-xl bg-[#1B1F2B] border border-white/[0.08] text-xs sm:text-sm text-[#F2EFE9] placeholder:text-[#6B7280] focus:outline-none focus:border-[#D4A853]"
            />
          </div>

          <select
            aria-label="تصفية حسب التصنيف"
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value as QuoteCategory | 'الكل');
              setVisibleCount(24);
            }}
            className="min-h-[44px] px-3 rounded-xl bg-[#1B1F2B] border border-white/[0.08] text-xs sm:text-sm text-[#F2EFE9] focus:outline-none focus:border-[#D4A853]"
          >
            <option value="الكل">التصنيف: الكل</option>
            {QUOTE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            aria-label="تصفية حسب القائل"
            value={authorFilter}
            onChange={(e) => {
              setAuthorFilter(e.target.value);
              setVisibleCount(24);
            }}
            className="min-h-[44px] px-3 rounded-xl bg-[#1B1F2B] border border-white/[0.08] text-xs sm:text-sm text-[#F2EFE9] focus:outline-none focus:border-[#D4A853]"
          >
            <option value="الكل">القائل: الكل ({authorsList.length})</option>
            {authorsList.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>

          <select
            aria-label="تصفية حسب العصر"
            value={eraFilter}
            onChange={(e) => {
              setEraFilter(e.target.value as QuoteEra | 'الكل');
              setVisibleCount(24);
            }}
            className="min-h-[44px] px-3 rounded-xl bg-[#1B1F2B] border border-white/[0.08] text-xs sm:text-sm text-[#F2EFE9] focus:outline-none focus:border-[#D4A853]"
          >
            <option value="الكل">العصر: الكل</option>
            {QUOTE_ERAS.map((era) => (
              <option key={era} value={era}>
                {era}
              </option>
            ))}
          </select>

          <select
            aria-label="تصفية حسب التوثيق"
            value={verificationFilter}
            onChange={(e) => {
              setVerificationFilter(e.target.value as QuoteVerification | 'الكل');
              setVisibleCount(24);
            }}
            className="min-h-[44px] px-3 rounded-xl bg-[#1B1F2B] border border-white/[0.08] text-xs sm:text-sm text-[#F2EFE9] focus:outline-none focus:border-[#D4A853]"
          >
            <option value="الكل">التوثيق: الكل</option>
            {QUOTE_VERIFICATIONS.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center justify-between text-xs text-[#9CA3AF]">
          <span className="tabular-nums">
            النتائج المعروضة: {Math.min(visibleCount, filteredQuotes.length)} من {filteredQuotes.length}
          </span>
          {(search || categoryFilter !== 'الكل' || authorFilter !== 'الكل' || eraFilter !== 'الكل' || verificationFilter !== 'الكل') && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setCategoryFilter('الكل');
                setAuthorFilter('الكل');
                setEraFilter('الكل');
                setVerificationFilter('الكل');
              }}
              className="text-[#D4A853] hover:underline cursor-pointer"
            >
              مسح الفلاتر
            </button>
          )}
        </div>

        {/* Quotes Grid */}
        {filteredQuotes.length === 0 ? (
          <div className="py-10 text-center text-sm text-[#9CA3AF]">
            {viewMode === 'favorites'
              ? 'لم تُضف عبارات إلى المفضلة بعد. اضغط على أيقونة القلب ♥ لحفظ عباراتك القريبة منك.'
              : 'لا توجد عبارات تطابق البحث أو الفلاتر الحالية.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredQuotes.slice(0, visibleCount).map((q) => {
              const fav = state.favoriteQuoteIds.includes(q.id);
              const selected = q.id === activeQuote.id;
              return (
                <div
                  key={q.id}
                  className={`p-4 rounded-2xl border transition-colors flex flex-col justify-between gap-3 ${
                    selected
                      ? 'bg-[#1B1F2B] border-[#D4A853]/50'
                      : 'bg-[#10131B] border-white/[0.06] hover:border-white/[0.14]'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => handleSelectQuote(q)}
                    className="text-right cursor-pointer"
                  >
                    <p className="text-sm font-medium text-[#F2EFE9] leading-relaxed">
                      «{q.text}»
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-[#9CA3AF]">
                      <strong className="text-[#D4A853] font-semibold">{q.author}</strong>
                      <span>·</span>
                      <span>{q.category}</span>
                      <span>·</span>
                      <span className={verificationColor(q.verification)}>{q.verification}</span>
                    </div>
                  </button>

                  <div className="flex items-center justify-between pt-2 border-t border-white/[0.05]">
                    <span className="text-[11px] text-[#7E8594] line-clamp-1">{q.source}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => onToggleFavoriteQuote(q.id)}
                        aria-label="إضافة للمفضلة"
                        className={`min-h-[36px] min-w-[36px] rounded-lg flex items-center justify-center cursor-pointer ${
                          fav ? 'text-rose-400' : 'text-[#9CA3AF] hover:text-[#F2EFE9]'
                        }`}
                      >
                        <HeartIcon className="w-4 h-4" filled={fav} />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          void handleCopy(q);
                        }}
                        aria-label="نسخ العبارة"
                        className="min-h-[36px] min-w-[36px] rounded-lg flex items-center justify-center text-[#9CA3AF] hover:text-[#D4A853] cursor-pointer"
                      >
                        {copiedId === q.id ? (
                          <CheckIcon className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <CopyIcon className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {filteredQuotes.length > visibleCount && (
          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => setVisibleCount((n) => n + 30)}
              className="min-h-[46px] px-6 rounded-xl bg-[#1B1F2B] hover:bg-[#232838] border border-white/[0.1] text-sm font-semibold text-[#F2EFE9] cursor-pointer"
            >
              عرض المزيد ({filteredQuotes.length - visibleCount} متبقية)
            </button>
          </div>
        )}
      </section>

      {/* IMPORT QUOTES JSON MODAL */}
      {showImportModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="import-quotes-title"
        >
          <div className="w-full sm:max-w-xl rounded-t-3xl sm:rounded-3xl bg-[#141720] border border-white/[0.1] p-6 shadow-2xl max-h-[90dvh] overflow-y-auto space-y-4 animate-view">
            <div className="flex items-center justify-between">
              <div>
                <h2 id="import-quotes-title" className="text-lg font-bold text-[#F2EFE9]">
                  استيراد عبارات جديدة (JSON)
                </h2>
                <p className="text-xs text-[#9CA3AF] mt-0.5">
                  أضف دفعات بلا حد لتصل مكتبتك إلى آلاف العبارات المحفوظة أوفلاين في IndexedDB
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                aria-label="إغلاق"
                className="min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center text-[#9CA3AF] hover:text-[#F2EFE9] cursor-pointer"
              >
                <CloseIcon className="w-5 h-5" />
              </button>
            </div>

            {importStatus && (
              <div
                className={`p-3.5 rounded-2xl text-xs sm:text-sm border ${
                  importStatus.type === 'ok'
                    ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300'
                    : 'bg-rose-500/10 border-rose-500/25 text-rose-300'
                }`}
              >
                {importStatus.text}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="min-h-[42px] px-3.5 rounded-xl bg-[#1B1F2B] hover:bg-[#232838] border border-white/[0.08] text-xs font-semibold text-[#F2EFE9] flex items-center gap-1.5 cursor-pointer"
              >
                <UploadIcon className="w-4 h-4 text-[#D4A853]" />
                <span>اختر ملف JSON من جهازك</span>
              </button>
              <button
                type="button"
                onClick={() => setImportText(SAMPLE_IMPORT_JSON)}
                className="min-h-[42px] px-3.5 rounded-xl bg-[#1B1F2B] hover:bg-[#232838] border border-white/[0.08] text-xs font-semibold text-[#D4A853] cursor-pointer"
              >
                إدراج قالب مثال جاهز
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json,.json"
                onChange={handleImportFile}
                className="hidden"
              />
            </div>

            <div>
              <label className="text-xs text-[#9CA3AF] block mb-1.5">
                الصق مصفوفة JSON هنا (يدعم الحقول بالإنجليزية أو العربية: text / النص، author / القائل، source / المصدر، year، category، era، verification، explanation):
              </label>
              <textarea
                rows={8}
                dir="ltr"
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder={SAMPLE_IMPORT_JSON}
                className="w-full p-3.5 rounded-2xl bg-[#0F1219] border border-white/[0.08] text-xs text-[#F2EFE9] font-mono focus:outline-none focus:border-[#D4A853]"
              />
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={handleImportSubmit}
                disabled={!importText.trim()}
                className="flex-1 min-h-[48px] rounded-2xl bg-[#D4A853] disabled:opacity-40 text-[#0B0D12] text-sm font-bold hover:bg-[#E2BA6B] transition-colors cursor-pointer"
              >
                استيراد وإضافة للمكتبة
              </button>
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="min-h-[48px] px-5 rounded-2xl bg-[#1B1F2B] text-sm text-[#D6D2C9] cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
