import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CalmNowModal } from './components/CalmNowModal';
import { CircleSection, CircleSubTab } from './components/CircleSection';
import { EthicsModal } from './components/EthicsModal';
import { HomeSection } from './components/HomeSection';
import {
  BookOpenIcon,
  ChatBranchIcon,
  CompassLogoIcon,
  FlameIcon,
  HomeIcon,
  LockIcon,
  SettingsIcon,
  UsersIcon,
  VolumeIcon,
  WindIcon,
} from './components/Icons';
import { KnowledgeSection, KnowledgeTab } from './components/KnowledgeSection';
import { LockScreen } from './components/LockScreen';
import { SettingsModal } from './components/SettingsModal';
import { SimSubTab, SimulatorSection } from './components/SimulatorSection';
import { TrainingSection, TrainingSubTab } from './components/TrainingSection';
import {
  AppNavigateTarget,
  AppState,
  BiasQuizState,
  CbtEntry,
  DecisionEntry,
  InfluenceLink,
  MoodEntry,
  PersonProfile,
  QuoteItem,
  SelfProfileData,
  SituationReview,
  StoicEntry,
  TabId,
  VoiceEvalEntry,
  WeeklyEvaluation,
} from './types';
import {
  clearLockConfig,
  decryptNoteText,
  DEFAULT_LOCK_CONFIG,
  deriveNoteKey,
  encryptNoteText,
  isEncryptedNote,
  loadLockConfig,
  LockConfig,
  saveLockConfig,
} from './utils/security';
import {
  DEFAULT_APP_STATE,
  getTodayIso,
  loadStateAsync,
  loadStateSync,
  saveState,
} from './utils/storage';

const NAV_ITEMS: { id: TabId; label: string; icon: React.FC<{ className?: string }> }[] = [
  { id: 'home', label: 'الرئيسية', icon: HomeIcon },
  { id: 'circle', label: 'دائرتي', icon: UsersIcon },
  { id: 'knowledge', label: 'المعرفة', icon: BookOpenIcon },
  { id: 'training', label: 'التدريب', icon: FlameIcon },
  { id: 'simulator', label: 'المحاكي', icon: ChatBranchIcon },
];

const VALID_TABS: TabId[] = ['home', 'circle', 'knowledge', 'training', 'simulator'];

function getInitialTabFromUrl(): TabId {
  try {
    const params = new URLSearchParams(window.location.search);
    const t = params.get('tab') as TabId | null;
    if (t && VALID_TABS.includes(t)) return t;
  } catch {
    // ignore
  }
  return 'home';
}

function triggerHaptic(ms = 10): void {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(ms);
    }
  } catch {
    // ignore
  }
}

export default function App() {
  const [state, setState] = useState<AppState>(() => loadStateSync());
  const stateRef = useRef<AppState>(state);
  const [lockConfig, setLockConfig] = useState<LockConfig>(() => loadLockConfig());
  const [isUnlocked, setIsUnlocked] = useState<boolean>(() => !loadLockConfig().enabled);
  const [noteCryptoKey, setNoteCryptoKey] = useState<CryptoKey | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>(() => getInitialTabFromUrl());
  const [trainingSubTab, setTrainingSubTab] = useState<TrainingSubTab>('program');
  const [circleSubTab, setCircleSubTab] = useState<CircleSubTab>('profiles');
  const [knowledgeSubTab, setKnowledgeSubTab] = useState<KnowledgeTab>('difficult');
  const [simulatorSubTab, setSimulatorSubTab] = useState<SimSubTab>('scenarios');
  const [simInitPersonality, setSimInitPersonality] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showEthicsManual, setShowEthicsManual] = useState(false);
  const [calmOpen, setCalmOpen] = useState(false);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Hydrate full state from IndexedDB on mount
  useEffect(() => {
    let mounted = true;
    loadStateAsync().then((loaded) => {
      if (mounted) {
        stateRef.current = loaded;
        setState(loaded);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  // Derive in-memory AES-GCM key for private notes when unlocked; clear immediately on lock
  useEffect(() => {
    let active = true;
    if (
      isUnlocked &&
      lockConfig.enabled &&
      lockConfig.encryptNotes &&
      lockConfig.passwordHash &&
      lockConfig.noteEncSalt
    ) {
      void deriveNoteKey(lockConfig.passwordHash, lockConfig.noteEncSalt).then((key) => {
        if (active) setNoteCryptoKey(key);
      });
    } else {
      setNoteCryptoKey(null);
    }
    return () => {
      active = false;
    };
  }, [
    isUnlocked,
    lockConfig.enabled,
    lockConfig.encryptNotes,
    lockConfig.passwordHash,
    lockConfig.noteEncSalt,
  ]);

  const lockAppNow = useCallback(() => {
    setNoteCryptoKey(null);
    setIsUnlocked(false);
  }, []);

  // Auto-lock when app goes to background / tab hidden
  useEffect(() => {
    if (!lockConfig.enabled || !lockConfig.autoLockOnHide) return;
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        lockAppNow();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [lockConfig.enabled, lockConfig.autoLockOnHide, lockAppNow]);

  // Smooth Android hardware back-button support for PWA & APK WebViews
  useEffect(() => {
    const handlePopState = () => {
      if (calmOpen) {
        setCalmOpen(false);
        return;
      }
      if (showSettings) {
        setShowSettings(false);
        return;
      }
      if (showEthicsManual) {
        setShowEthicsManual(false);
        return;
      }
      if (activeTab !== 'home') {
        setActiveTab('home');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [activeTab, showSettings, showEthicsManual, calmOpen]);

  const handleUpdateLockConfig = useCallback(
    async (next: LockConfig) => {
      const prevConfig = lockConfig;
      let oldKey = noteCryptoKey;
      if (
        !oldKey &&
        prevConfig.enabled &&
        prevConfig.encryptNotes &&
        prevConfig.passwordHash &&
        prevConfig.noteEncSalt
      ) {
        oldKey = await deriveNoteKey(prevConfig.passwordHash, prevConfig.noteEncSalt);
      }

      const newKey =
        next.enabled && next.encryptNotes && next.passwordHash && next.noteEncSalt
          ? await deriveNoteKey(next.passwordHash, next.noteEncSalt)
          : null;

      // Re-encrypt or decrypt existing private notes cleanly so user never loses access
      const currentState = stateRef.current;
      const shouldTransform =
        Boolean(oldKey) ||
        Boolean(newKey) ||
        currentState.people.some((p) => p.notes.some((n) => isEncryptedNote(n.text)));

      if (shouldTransform && currentState.people.length > 0) {
        const updatedPeople = await Promise.all(
          currentState.people.map(async (person) => {
            if (!person.notes.length) return person;
            const updatedNotes = await Promise.all(
              person.notes.map(async (note) => {
                const plain =
                  isEncryptedNote(note.text) && oldKey
                    ? await decryptNoteText(note.text, oldKey)
                    : note.text;
                const finalText = newKey ? await encryptNoteText(plain, newKey) : plain;
                return finalText === note.text ? note : { ...note, text: finalText };
              })
            );
            return { ...person, notes: updatedNotes };
          })
        );
        const nextState: AppState = { ...currentState, people: updatedPeople };
        stateRef.current = nextState;
        setState(nextState);
        void saveState(nextState);
      }

      setNoteCryptoKey(newKey);
      setLockConfig(next);
      saveLockConfig(next);
      if (!next.enabled) {
        setIsUnlocked(true);
      }
    },
    [lockConfig, noteCryptoKey]
  );

  const handleEmergencyReset = useCallback(() => {
    clearLockConfig();
    setNoteCryptoKey(null);
    setLockConfig({ ...DEFAULT_LOCK_CONFIG });
    const reset: AppState = { ...DEFAULT_APP_STATE, ethicsAccepted: true };
    stateRef.current = reset;
    setState(reset);
    void saveState(reset);
    setIsUnlocked(true);
  }, []);

  const updateState = useCallback((updater: (prev: AppState) => AppState) => {
    setState((prev) => {
      const next = updater(prev);
      stateRef.current = next;
      void saveState(next);
      return next;
    });
  }, []);

  const handleToggleFavoriteQuote = useCallback(
    (quoteId: string) => {
      updateState((prev) => {
        const exists = prev.favoriteQuoteIds.includes(quoteId);
        return {
          ...prev,
          favoriteQuoteIds: exists
            ? prev.favoriteQuoteIds.filter((id) => id !== quoteId)
            : [quoteId, ...prev.favoriteQuoteIds],
        };
      });
    },
    [updateState]
  );

  const handleImportQuotes = useCallback(
    (quotes: QuoteItem[]) => {
      updateState((prev) => ({
        ...prev,
        customQuotes: [...quotes, ...prev.customQuotes],
      }));
    },
    [updateState]
  );

  const handleToggleFavoriteKnowledge = useCallback(
    (id: string) => {
      updateState((prev) => {
        const exists = prev.favoriteKnowledgeIds.includes(id);
        return {
          ...prev,
          favoriteKnowledgeIds: exists
            ? prev.favoriteKnowledgeIds.filter((item) => item !== id)
            : [id, ...prev.favoriteKnowledgeIds],
        };
      });
    },
    [updateState]
  );

  const handleAddPerson = useCallback(
    (person: PersonProfile) => {
      updateState((prev) => ({
        ...prev,
        people: [person, ...prev.people],
        lastAnalyzedPersonId: person.id,
      }));
    },
    [updateState]
  );

  const handleUpdatePerson = useCallback(
    (person: PersonProfile) => {
      updateState((prev) => ({
        ...prev,
        people: prev.people.map((p) => (p.id === person.id ? person : p)),
        lastAnalyzedPersonId: person.id,
      }));
    },
    [updateState]
  );

  const handleDeletePerson = useCallback(
    (id: string) => {
      updateState((prev) => ({
        ...prev,
        people: prev.people.filter((p) => p.id !== id),
        influenceLinks: prev.influenceLinks.filter(
          (l) => l.fromPersonId !== id && l.toPersonId !== id
        ),
        lastAnalyzedPersonId:
          prev.lastAnalyzedPersonId === id ? null : prev.lastAnalyzedPersonId,
      }));
    },
    [updateState]
  );

  const handleAddInfluenceLink = useCallback(
    (link: InfluenceLink) => {
      updateState((prev) => ({
        ...prev,
        influenceLinks: [link, ...prev.influenceLinks],
      }));
    },
    [updateState]
  );

  const handleDeleteInfluenceLink = useCallback(
    (id: string) => {
      updateState((prev) => ({
        ...prev,
        influenceLinks: prev.influenceLinks.filter((l) => l.id !== id),
      }));
    },
    [updateState]
  );

  const handleAddReview = useCallback(
    (review: SituationReview) => {
      updateState((prev) => ({
        ...prev,
        situationReviews: [review, ...prev.situationReviews],
        xpPoints: prev.xpPoints + 10,
      }));
    },
    [updateState]
  );

  const handleDeleteReview = useCallback(
    (id: string) => {
      updateState((prev) => ({
        ...prev,
        situationReviews: prev.situationReviews.filter((r) => r.id !== id),
      }));
    },
    [updateState]
  );

  const handleCompleteDay = useCallback(
    (day: number) => {
      updateState((prev) => {
        const exists = prev.completedDays.includes(day);
        if (exists) {
          return {
            ...prev,
            completedDays: prev.completedDays.filter((d) => d !== day),
          };
        }
        const today = getTodayIso();
        const nextStreak =
          prev.lastMissionDate === today ? Math.max(1, prev.streakDays) : prev.streakDays + 1;
        return {
          ...prev,
          completedDays: [...prev.completedDays, day].sort((a, b) => a - b),
          streakDays: nextStreak,
          lastMissionDate: today,
        };
      });
    },
    [updateState]
  );

  const handleAddMood = useCallback(
    (entry: MoodEntry) => {
      updateState((prev) => ({
        ...prev,
        moodLogs: [entry, ...prev.moodLogs],
      }));
    },
    [updateState]
  );

  const handleAddCbt = useCallback(
    (entry: CbtEntry) => {
      updateState((prev) => ({
        ...prev,
        cbtLogs: [entry, ...prev.cbtLogs],
      }));
    },
    [updateState]
  );

  const handleDeleteCbt = useCallback(
    (id: string) => {
      updateState((prev) => ({
        ...prev,
        cbtLogs: prev.cbtLogs.filter((c) => c.id !== id),
      }));
    },
    [updateState]
  );

  const handleAddStoic = useCallback(
    (entry: StoicEntry) => {
      updateState((prev) => ({
        ...prev,
        stoicLogs: [entry, ...prev.stoicLogs],
      }));
    },
    [updateState]
  );

  const handleTogglePresence = useCallback(
    (itemId: string) => {
      updateState((prev) => ({
        ...prev,
        presenceChecklist: {
          ...prev.presenceChecklist,
          [itemId]: !prev.presenceChecklist[itemId],
        },
      }));
    },
    [updateState]
  );

  const handleToggleConfidence = useCallback(
    (itemId: string) => {
      updateState((prev) => ({
        ...prev,
        confidenceChecklist: {
          ...prev.confidenceChecklist,
          [itemId]: !prev.confidenceChecklist[itemId],
        },
      }));
    },
    [updateState]
  );

  const handleAddWeekly = useCallback(
    (entry: WeeklyEvaluation) => {
      updateState((prev) => ({
        ...prev,
        weeklyEvaluations: [entry, ...prev.weeklyEvaluations],
        xpPoints: prev.xpPoints + 15,
      }));
    },
    [updateState]
  );

  const handleCompleteDailyChallenge = useCallback(
    (dateIso: string, xpReward: number) => {
      updateState((prev) => {
        if (prev.completedChallengeDates.includes(dateIso)) return prev;
        return {
          ...prev,
          completedChallengeDates: [dateIso, ...prev.completedChallengeDates],
          xpPoints: prev.xpPoints + xpReward,
        };
      });
    },
    [updateState]
  );

  const handleUpdateSelfProfile = useCallback(
    (next: SelfProfileData) => {
      updateState((prev) => {
        const firstComplete = !prev.selfProfile.updatedAt && Boolean(next.updatedAt);
        return {
          ...prev,
          selfProfile: next,
          xpPoints: prev.xpPoints + (firstComplete ? 25 : 0),
        };
      });
    },
    [updateState]
  );

  const handleUpdateBiasQuiz = useCallback(
    (next: BiasQuizState) => {
      updateState((prev) => {
        const firstComplete = !prev.biasQuiz.completedAt && Boolean(next.completedAt);
        return {
          ...prev,
          biasQuiz: next,
          xpPoints: prev.xpPoints + (firstComplete ? 25 : 0),
        };
      });
    },
    [updateState]
  );

  const handleAddDecision = useCallback(
    (entry: DecisionEntry) => {
      updateState((prev) => ({
        ...prev,
        decisions: [entry, ...prev.decisions],
        xpPoints: prev.xpPoints + 10,
      }));
    },
    [updateState]
  );

  const handleUpdateDecision = useCallback(
    (entry: DecisionEntry) => {
      updateState((prev) => {
        const old = prev.decisions.find((d) => d.id === entry.id);
        const justReviewed = Boolean(old && !old.reviewed && entry.reviewed);
        return {
          ...prev,
          decisions: prev.decisions.map((d) => (d.id === entry.id ? entry : d)),
          xpPoints: prev.xpPoints + (justReviewed ? 15 : 0),
        };
      });
    },
    [updateState]
  );

  const handleDeleteDecision = useCallback(
    (id: string) => {
      updateState((prev) => ({
        ...prev,
        decisions: prev.decisions.filter((d) => d.id !== id),
      }));
    },
    [updateState]
  );

  const handleToggleHabit = useCallback(
    (habitId: string, dateIso: string) => {
      updateState((prev) => {
        const existing = prev.habitLogs.find((l) => l.date === dateIso);
        const alreadyDone = existing?.completedHabits.includes(habitId) ?? false;
        const nextIds = alreadyDone
          ? (existing?.completedHabits ?? []).filter((id) => id !== habitId)
          : [...(existing?.completedHabits ?? []), habitId];
        const nextLogs = existing
          ? prev.habitLogs.map((l) =>
              l.date === dateIso ? { ...l, completedHabits: nextIds } : l
            )
          : [{ date: dateIso, completedHabits: nextIds }, ...prev.habitLogs];
        return {
          ...prev,
          habitLogs: nextLogs,
          xpPoints: Math.max(0, prev.xpPoints + (alreadyDone ? -5 : 5)),
        };
      });
    },
    [updateState]
  );

  const handleAddVoiceEval = useCallback(
    (entry: VoiceEvalEntry) => {
      updateState((prev) => ({
        ...prev,
        voiceEvals: [entry, ...prev.voiceEvals],
        xpPoints: prev.xpPoints + 10,
      }));
    },
    [updateState]
  );

  const handleDeleteVoiceEval = useCallback(
    (id: string) => {
      updateState((prev) => ({
        ...prev,
        voiceEvals: prev.voiceEvals.filter((v) => v.id !== id),
      }));
    },
    [updateState]
  );

  const handleSaveSimResult = useCallback(
    (scenarioId: string, score: number) => {
      updateState((prev) => {
        const existing = prev.simResults[scenarioId];
        return {
          ...prev,
          simResults: {
            ...prev.simResults,
            [scenarioId]: {
              scenarioId,
              bestScore: existing ? Math.max(existing.bestScore, score) : score,
              attempts: (existing?.attempts ?? 0) + 1,
              lastPlayed: getTodayIso(),
            },
          },
        };
      });
    },
    [updateState]
  );

  const handlePracticeInSimulator = useCallback((personalityId: string) => {
    setSimulatorSubTab('scenarios');
    setSimInitPersonality(personalityId);
    setActiveTab('simulator');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleOpenSoundStudio = useCallback(() => {
    triggerHaptic(10);
    setTrainingSubTab('sounds');
    setActiveTab('training');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleNavigateTo = useCallback(
    (target: AppNavigateTarget) => {
      triggerHaptic(10);
      if (target.trainingSubTab) setTrainingSubTab(target.trainingSubTab);
      if (target.circleSubTab) setCircleSubTab(target.circleSubTab);
      if (target.knowledgeSubTab) setKnowledgeSubTab(target.knowledgeSubTab);
      if (target.simulatorSubTab) setSimulatorSubTab(target.simulatorSubTab);
      if (target.tab !== activeTab) {
        try {
          window.history.pushState(
            { tab: target.tab },
            '',
            target.tab === 'home' ? '/' : `/?tab=${target.tab}`
          );
        } catch {
          // ignore history restrictions in sandboxed iframes
        }
      }
      setActiveTab(target.tab);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [activeTab]
  );

  const handleNavigate = useCallback(
    (tab: TabId) => {
      triggerHaptic(10);
      if (tab === 'training') {
        setTrainingSubTab('program');
      } else if (tab === 'circle') {
        setCircleSubTab('profiles');
      } else if (tab === 'knowledge') {
        setKnowledgeSubTab('difficult');
      } else if (tab === 'simulator') {
        setSimulatorSubTab('scenarios');
      }
      if (tab !== activeTab) {
        try {
          window.history.pushState({ tab }, '', tab === 'home' ? '/' : `/?tab=${tab}`);
        } catch {
          // ignore history restrictions in sandboxed iframes
        }
      }
      setActiveTab(tab);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [activeTab]
  );

  if (lockConfig.enabled && !isUnlocked) {
    return (
      <LockScreen
        lockConfig={lockConfig}
        onUnlocked={() => setIsUnlocked(true)}
        onEmergencyReset={handleEmergencyReset}
      />
    );
  }

  return (
    <div dir="rtl" className="min-h-dvh bg-[#0B0D12] text-[#F2EFE9] flex flex-col lg:flex-row">
      {/* Desktop Sidebar Navigation */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:shrink-0 lg:sticky lg:top-0 lg:h-dvh bg-[#10131B] border-l border-white/[0.07] p-5 justify-between">
        <div className="space-y-6">
          <div className="flex items-center gap-3 px-1">
            <div className="w-10 h-10 rounded-2xl bg-[#D4A853]/12 border border-[#D4A853]/30 flex items-center justify-center text-[#D4A853] shrink-0">
              <CompassLogoIcon className="w-6 h-6" />
            </div>
            <div>
              <div className="text-sm font-bold text-[#F2EFE9] leading-tight">
                مرشد النفس والتأثير
              </div>
              <div className="text-[11px] text-[#9CA3AF] mt-0.5">
                دليل شخصي أوفلاين 100%
              </div>
            </div>
          </div>

          <nav className="space-y-1.5" aria-label="التنقل الرئيسي">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavigate(item.id)}
                  className={`w-full min-h-[48px] px-4 rounded-2xl flex items-center gap-3 text-sm font-semibold transition-colors cursor-pointer ${
                    active
                      ? 'bg-[#D4A853] text-[#0B0D12]'
                      : 'text-[#B8B4AA] hover:text-[#F2EFE9] hover:bg-white/[0.05]'
                  }`}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="space-y-2">
          <button
            type="button"
            onClick={() => {
              triggerHaptic(15);
              setCalmOpen(true);
            }}
            className="w-full min-h-[46px] px-4 rounded-2xl bg-emerald-500/12 hover:bg-emerald-500/20 border border-emerald-400/35 flex items-center justify-between text-xs font-bold text-emerald-200 transition-colors cursor-pointer"
          >
            <span>اهدأ الآن (60 ثانية)</span>
            <WindIcon className="w-4 h-4 text-emerald-300" />
          </button>

          <button
            type="button"
            onClick={handleOpenSoundStudio}
            className="w-full min-h-[44px] px-4 rounded-2xl bg-[#141720] hover:bg-[#1B1F2B] border border-white/[0.08] flex items-center justify-between text-xs font-semibold text-[#D6D2C9] transition-colors cursor-pointer"
          >
            <span>الصوتيات والمؤثرات</span>
            <VolumeIcon className="w-4 h-4 text-[#D4A853]" />
          </button>

          <button
            type="button"
            onClick={() => {
              if (lockConfig.enabled) {
                lockAppNow();
              } else {
                setShowSettings(true);
              }
            }}
            className="w-full min-h-[46px] px-4 rounded-2xl bg-[#141720] hover:bg-[#1B1F2B] border border-[#D4A853]/30 flex items-center justify-between text-xs font-semibold text-[#F2EFE9] transition-colors cursor-pointer"
          >
            <span>{lockConfig.enabled ? 'قفل التطبيق الآن' : 'قفل بـ PIN وبصمة'}</span>
            <LockIcon className="w-4 h-4 text-[#D4A853]" />
          </button>

          <button
            type="button"
            onClick={() => setShowSettings(true)}
            className="w-full min-h-[46px] px-4 rounded-2xl bg-[#141720] hover:bg-[#1B1F2B] border border-white/[0.08] flex items-center justify-between text-xs font-semibold text-[#D6D2C9] transition-colors cursor-pointer"
          >
            <span>الأمان والنسخ الاحتياطي</span>
            <SettingsIcon className="w-4 h-4 text-[#D4A853]" />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Top Header */}
        <header className="lg:hidden sticky top-0 z-30 bg-[#0B0D12]/90 backdrop-blur-md border-b border-white/[0.07] px-4 pb-3 safe-pt flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#D4A853]/12 border border-[#D4A853]/30 flex items-center justify-center text-[#D4A853] shrink-0">
              <CompassLogoIcon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-bold text-[#F2EFE9] leading-tight truncate">
                مرشد النفس والتأثير
              </div>
              <div className="text-[11px] text-[#9CA3AF]">
                {NAV_ITEMS.find((n) => n.id === activeTab)?.label}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                triggerHaptic(15);
                setCalmOpen(true);
              }}
              aria-label="وضع الطوارئ اهدأ الآن"
              className="min-h-[42px] px-2.5 rounded-xl bg-emerald-500/12 border border-emerald-400/35 text-emerald-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <WindIcon className="w-4 h-4 text-emerald-300" />
              <span>اهدأ الآن</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (lockConfig.enabled) {
                  lockAppNow();
                } else {
                  setShowSettings(true);
                }
              }}
              aria-label={lockConfig.enabled ? 'قفل التطبيق الآن' : 'إعداد القفل والبصمة'}
              className={`min-h-[42px] min-w-[42px] rounded-xl border flex items-center justify-center cursor-pointer ${
                lockConfig.enabled
                  ? 'bg-[#D4A853]/15 border-[#D4A853]/40 text-[#D4A853]'
                  : 'bg-[#141720] border-white/[0.08] text-[#D6D2C9]'
              }`}
            >
              <LockIcon className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setShowSettings(true)}
              aria-label="الأمان والبيانات والنسخ الاحتياطي"
              className="min-h-[42px] min-w-[42px] rounded-xl bg-[#141720] border border-white/[0.08] flex items-center justify-center text-[#D4A853] cursor-pointer"
            >
              <SettingsIcon className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Active Section */}
        <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-5 pb-28 lg:pb-12">
          {activeTab === 'home' && (
            <HomeSection
              state={state}
              onToggleFavoriteQuote={handleToggleFavoriteQuote}
              onImportQuotes={handleImportQuotes}
              onNavigate={handleNavigate}
              onNavigateTo={handleNavigateTo}
              onOpenCalmNow={() => setCalmOpen(true)}
              onOpenSoundStudio={handleOpenSoundStudio}
            />
          )}

          {activeTab === 'circle' && (
            <CircleSection
              people={state.people}
              influenceLinks={state.influenceLinks}
              situationReviews={state.situationReviews}
              selfProfile={state.selfProfile}
              biasQuiz={state.biasQuiz}
              initialSubTab={circleSubTab}
              noteCryptoKey={noteCryptoKey}
              notesEncrypted={Boolean(lockConfig.enabled && lockConfig.encryptNotes)}
              onAddPerson={handleAddPerson}
              onUpdatePerson={handleUpdatePerson}
              onDeletePerson={handleDeletePerson}
              onAddInfluenceLink={handleAddInfluenceLink}
              onDeleteInfluenceLink={handleDeleteInfluenceLink}
              onAddReview={handleAddReview}
              onDeleteReview={handleDeleteReview}
              onNavigateTo={handleNavigateTo}
            />
          )}

          {activeTab === 'knowledge' && (
            <KnowledgeSection
              state={state}
              initialSubTab={knowledgeSubTab}
              favoriteIds={state.favoriteKnowledgeIds}
              onToggleFavorite={handleToggleFavoriteKnowledge}
              onPracticeInSimulator={handlePracticeInSimulator}
            />
          )}

          {activeTab === 'training' && (
            <TrainingSection
              state={state}
              initialSubTab={trainingSubTab}
              onNavigateTo={handleNavigateTo}
              onCompleteDay={handleCompleteDay}
              onCompleteDailyChallenge={handleCompleteDailyChallenge}
              onAddMood={handleAddMood}
              onAddCbt={handleAddCbt}
              onDeleteCbt={handleDeleteCbt}
              onAddStoic={handleAddStoic}
              onTogglePresence={handleTogglePresence}
              onToggleConfidence={handleToggleConfidence}
              onAddWeekly={handleAddWeekly}
              onUpdateSelfProfile={handleUpdateSelfProfile}
              onUpdateBiasQuiz={handleUpdateBiasQuiz}
              onAddDecision={handleAddDecision}
              onUpdateDecision={handleUpdateDecision}
              onDeleteDecision={handleDeleteDecision}
              onToggleHabit={handleToggleHabit}
              onAddVoiceEval={handleAddVoiceEval}
              onDeleteVoiceEval={handleDeleteVoiceEval}
            />
          )}

          {activeTab === 'simulator' && (
            <SimulatorSection
              state={state}
              simResults={state.simResults}
              initialSubTab={simulatorSubTab}
              initialPersonalityId={simInitPersonality}
              onClearInitialPersonality={() => setSimInitPersonality(null)}
              onSaveResult={handleSaveSimResult}
            />
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (5 Tabs) */}
      <nav
        aria-label="التنقل السفلي"
        className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-[#10131B]/95 backdrop-blur-md border-t border-white/[0.08] px-2 pt-1.5 safe-pb"
      >
        <div className="grid grid-cols-5 gap-1 max-w-xl mx-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavigate(item.id)}
                className={`min-h-[54px] rounded-2xl flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer ${
                  active ? 'text-[#D4A853] bg-[#D4A853]/10' : 'text-[#9CA3AF]'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[11px] font-semibold leading-none">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Global Calm Now Emergency Modal */}
      <CalmNowModal
        open={calmOpen}
        onClose={() => setCalmOpen(false)}
        onOpenSoundStudio={handleOpenSoundStudio}
      />

      {/* Modals */}
      <SettingsModal
        open={showSettings}
        onClose={() => setShowSettings(false)}
        state={state}
        lockConfig={lockConfig}
        onUpdateLockConfig={(next) => {
          void handleUpdateLockConfig(next);
        }}
        onLockNow={lockAppNow}
        onImportState={(newState) => {
          stateRef.current = newState;
          setState(newState);
          void saveState(newState);
        }}
        onResetAll={() => {
          const reset: AppState = { ...DEFAULT_APP_STATE, ethicsAccepted: true };
          stateRef.current = reset;
          setState(reset);
          void saveState(reset);
        }}
        onOpenEthics={() => setShowEthicsManual(true)}
      />

      <EthicsModal
        open={!state.ethicsAccepted || showEthicsManual}
        isFirstRun={!state.ethicsAccepted}
        onAccept={() => {
          updateState((prev) => ({ ...prev, ethicsAccepted: true }));
          setShowEthicsManual(false);
        }}
      />
    </div>
  );
}
