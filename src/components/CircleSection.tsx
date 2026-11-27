import React, { useEffect, useMemo, useState } from 'react';
import {
  BEHAVIORAL_STATEMENTS,
  DEMO_CIRCLE_PERSON,
  RATING_LABELS,
  RELATIONSHIP_GUIDES,
} from '../data/questionnaire';
import { analyzePerson } from '../engine/analyzer';
import { analyzeDeepSelf, analyzePairCompatibility } from '../engine/personalization';
import {
  AppNavigateTarget,
  BiasQuizState,
  ClosenessLevel,
  InfluenceLink,
  PersonalRelationship,
  PersonProfile,
  SelfProfileData,
  SituationReview,
} from '../types';
import {
  copyToClipboard,
  daysBetweenIso,
  formatArabicDate,
  generateId,
  getTodayIso,
} from '../utils/storage';
import { decryptNoteText, encryptNoteText, isEncryptedNote } from '../utils/security';
import { RadarChart } from './Charts';
import { PreTalkCardPanel, PostReviewPanel } from './PreTalkAndReview';
import {
  CalendarIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CloseIcon,
  CopyIcon,
  LockIcon,
  PlusIcon,
  SparklesIcon,
  TrashIcon,
  UsersIcon,
} from './Icons';

export type CircleSubTab = 'profiles' | 'pretalk' | 'review' | 'guides' | 'map';

interface CircleSectionProps {
  people: PersonProfile[];
  influenceLinks: InfluenceLink[];
  situationReviews: SituationReview[];
  selfProfile: SelfProfileData;
  biasQuiz: BiasQuizState;
  initialSubTab?: CircleSubTab;
  noteCryptoKey: CryptoKey | null;
  notesEncrypted: boolean;
  onAddPerson: (person: PersonProfile) => void;
  onUpdatePerson: (person: PersonProfile) => void;
  onDeletePerson: (id: string) => void;
  onAddInfluenceLink: (link: InfluenceLink) => void;
  onDeleteInfluenceLink: (id: string) => void;
  onAddReview: (review: SituationReview) => void;
  onDeleteReview: (id: string) => void;
  onNavigateTo?: (target: AppNavigateTarget) => void;
}

const RELATIONSHIPS: PersonalRelationship[] = [
  'أب',
  'أم',
  'أخ',
  'أخت',
  'صديق',
  'قريب',
  'دائرة اجتماعية',
];

const CLOSENESS_LABELS: Record<ClosenessLevel, string> = {
  1: 'الأقرب لي',
  2: 'قريب',
  3: 'محيط اجتماعي',
};

export const CircleSection: React.FC<CircleSectionProps> = ({
  people,
  influenceLinks,
  situationReviews,
  selfProfile,
  biasQuiz,
  initialSubTab = 'profiles',
  noteCryptoKey,
  notesEncrypted,
  onAddPerson,
  onUpdatePerson,
  onDeletePerson,
  onAddInfluenceLink,
  onDeleteInfluenceLink,
  onAddReview,
  onDeleteReview,
  onNavigateTo,
}) => {
  const [circleTab, setCircleTab] = useState<CircleSubTab>(initialSubTab);
  const [preTalkPersonId, setPreTalkPersonId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<'report' | 'quiz' | 'notes'>('report');
  const [quizCategory, setQuizCategory] = useState<string>('الكل');
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    setCircleTab(initialSubTab);
    if (initialSubTab !== 'profiles') {
      setSelectedId(null);
    }
  }, [initialSubTab]);

  const selfSynth = useMemo(() => analyzeDeepSelf(selfProfile, biasQuiz), [selfProfile, biasQuiz]);

  // Add person form
  const [newName, setNewName] = useState('');
  const [newRel, setNewRel] = useState<PersonalRelationship>('صديق');
  const [newCloseness, setNewCloseness] = useState<ClosenessLevel>(1);
  const [newTags, setNewTags] = useState('');
  const [newBirthday, setNewBirthday] = useState('');
  const [newLastContact, setNewLastContact] = useState(getTodayIso());

  // Note form + decrypted note cache
  const [noteDate, setNoteDate] = useState(getTodayIso());
  const [noteContext, setNoteContext] = useState('');
  const [noteText, setNoteText] = useState('');
  const [decryptedNotes, setDecryptedNotes] = useState<Record<string, string>>({});

  // Relationship guide expanded state & copy feedback
  const [expandedGuideId, setExpandedGuideId] = useState<string>(RELATIONSHIP_GUIDES[0].id);
  const [copiedPhrase, setCopiedPhrase] = useState<string | null>(null);

  // Circle map influence link form
  const [fromId, setFromId] = useState<string>('self');
  const [toId, setToId] = useState<string>('');
  const [linkStrength, setLinkStrength] = useState<'قوي' | 'متوسط' | 'خفيف'>('متوسط');
  const [linkNote, setLinkNote] = useState('');
  const [mapSelectedNodeId, setMapSelectedNodeId] = useState<string | null>(null);

  const selectedPerson = useMemo(
    () => people.find((p) => p.id === selectedId) ?? null,
    [people, selectedId]
  );

  const report = useMemo(
    () => (selectedPerson ? analyzePerson(selectedPerson) : null),
    [selectedPerson]
  );

  const quizCategories = useMemo(() => {
    const cats = Array.from(new Set(BEHAVIORAL_STATEMENTS.map((s) => s.category)));
    return ['الكل', ...cats];
  }, []);

  const visibleStatements = useMemo(() => {
    if (quizCategory === 'الكل') return BEHAVIORAL_STATEMENTS;
    return BEHAVIORAL_STATEMENTS.filter((s) => s.category === quizCategory);
  }, [quizCategory]);

  useEffect(() => {
    let cancelled = false;
    if (!selectedPerson) {
      setDecryptedNotes({});
      return;
    }
    const run = async () => {
      const map: Record<string, string> = {};
      for (const n of selectedPerson.notes) {
        map[n.id] = isEncryptedNote(n.text)
          ? await decryptNoteText(n.text, noteCryptoKey)
          : n.text;
      }
      if (!cancelled) setDecryptedNotes(map);
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [selectedPerson, noteCryptoKey]);

  // Relationship reminders: upcoming birthdays (within 14 days) + no contact for 21+ days
  const reminders = useMemo(() => {
    const todayIso = getTodayIso();
    const todayDate = new Date(todayIso + 'T00:00:00');
    const items: { id: string; personId: string; type: 'birthday' | 'contact'; text: string }[] = [];

    for (const p of people) {
      if (p.birthday && p.birthday.length >= 5) {
        const mmdd = p.birthday.length === 10 ? p.birthday.slice(5, 10) : p.birthday.slice(0, 5);
        const [mm, dd] = mmdd.split('-').map(Number);
        if (mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31) {
          let nextBday = new Date(todayDate.getFullYear(), mm - 1, dd);
          if (nextBday.getTime() < todayDate.getTime()) {
            nextBday = new Date(todayDate.getFullYear() + 1, mm - 1, dd);
          }
          const diffDays = Math.round(
            (nextBday.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24)
          );
          if (diffDays === 0) {
            items.push({
              id: `bday_${p.id}`,
              personId: p.id,
              type: 'birthday',
              text: `اليوم عيد ميلاد ${p.name} (${p.relationship})! بادر برسالة دافئة.`,
            });
          } else if (diffDays > 0 && diffDays <= 14) {
            items.push({
              id: `bday_${p.id}`,
              personId: p.id,
              type: 'birthday',
              text: `عيد ميلاد ${p.name} بعد ${diffDays} ${diffDays === 1 ? 'يوم' : 'أيام'}.`,
            });
          }
        }
      }

      const refDate = p.lastContactDate || p.updatedAt;
      if (refDate) {
        const gap = daysBetweenIso(refDate, todayIso);
        if (gap >= 21) {
          const weeks = Math.floor(gap / 7);
          items.push({
            id: `contact_${p.id}`,
            personId: p.id,
            type: 'contact',
            text: `تواصل مع ${p.name} (${p.relationship}) — لم تتواصل منذ ${weeks} أسابيع (${gap} يوماً).`,
          });
        }
      }
    }
    return items;
  }, [people]);

  const handleCreatePerson = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    const now = getTodayIso();
    const person: PersonProfile = {
      id: generateId('person'),
      name: newName.trim(),
      relationship: newRel,
      closeness: newCloseness,
      tags: newTags
        .split(/[،,]/)
        .map((t) => t.trim())
        .filter(Boolean),
      notes: [],
      answers: {},
      birthday: newBirthday || undefined,
      lastContactDate: newLastContact || now,
      createdAt: now,
      updatedAt: now,
    };
    onAddPerson(person);
    setSelectedId(person.id);
    setDetailTab('quiz');
    setShowAddForm(false);
    setNewName('');
    setNewTags('');
    setNewBirthday('');
    setNewLastContact(now);
  };

  const handleAddDemo = () => {
    const exists = people.some((p) => p.id === DEMO_CIRCLE_PERSON.id);
    const demo: PersonProfile = exists
      ? { ...DEMO_CIRCLE_PERSON, id: generateId('demo') }
      : { ...DEMO_CIRCLE_PERSON };
    onAddPerson(demo);
    setSelectedId(demo.id);
    setDetailTab('report');
  };

  const handleAnswer = (statementId: number, value: number) => {
    if (!selectedPerson) return;
    onUpdatePerson({
      ...selectedPerson,
      answers: { ...selectedPerson.answers, [statementId]: value },
      updatedAt: getTodayIso(),
    });
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPerson || !noteText.trim()) return;
    const raw = noteText.trim();
    const storedText =
      notesEncrypted && noteCryptoKey ? await encryptNoteText(raw, noteCryptoKey) : raw;
    onUpdatePerson({
      ...selectedPerson,
      notes: [
        {
          id: generateId('note'),
          date: noteDate || getTodayIso(),
          context: noteContext.trim() || undefined,
          text: storedText,
        },
        ...selectedPerson.notes,
      ],
      lastContactDate: getTodayIso(),
      updatedAt: getTodayIso(),
    });
    setNoteText('');
    setNoteContext('');
  };

  const handleDeleteNote = (noteId: string) => {
    if (!selectedPerson) return;
    onUpdatePerson({
      ...selectedPerson,
      notes: selectedPerson.notes.filter((n) => n.id !== noteId),
      updatedAt: getTodayIso(),
    });
  };

  const handleCopyPhrase = async (phrase: string) => {
    await copyToClipboard(phrase);
    setCopiedPhrase(phrase);
    setTimeout(() => setCopiedPhrase((p) => (p === phrase ? null : p)), 1800);
  };

  const handleCreateInfluenceLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromId || !toId || fromId === toId) return;
    onAddInfluenceLink({
      id: generateId('link'),
      fromPersonId: fromId,
      toPersonId: toId,
      strength: linkStrength,
      note: linkNote.trim() || 'تأثير ملحوظ في القرارات والمزاج',
    });
    setLinkNote('');
  };

  const getNodeLabel = (id: string) => {
    if (id === 'self') return 'أنا';
    return people.find((p) => p.id === id)?.name ?? 'شخص محذوف';
  };

  // Compute SVG positions for Circle Map
  const mapPositions = useMemo(() => {
    const cx = 210;
    const cy = 210;
    const coords: Record<string, { x: number; y: number; label: string; sub: string; closeness: number }> = {
      self: { x: cx, y: cy, label: 'أنا', sub: 'المركز', closeness: 0 },
    };
    const rings: Record<ClosenessLevel, PersonProfile[]> = { 1: [], 2: [], 3: [] };
    people.forEach((p) => {
      const level: ClosenessLevel = p.closeness === 1 || p.closeness === 2 || p.closeness === 3 ? p.closeness : 2;
      rings[level].push(p);
    });
    const radii: Record<ClosenessLevel, number> = { 1: 72, 2: 126, 3: 176 };
    ([1, 2, 3] as ClosenessLevel[]).forEach((level) => {
      const group = rings[level];
      const r = radii[level];
      group.forEach((p, idx) => {
        const angle = -Math.PI / 2 + (idx / Math.max(1, group.length)) * Math.PI * 2 + level * 0.45;
        coords[p.id] = {
          x: cx + r * Math.cos(angle),
          y: cy + r * Math.sin(angle),
          label: p.name,
          sub: p.relationship,
          closeness: level,
        };
      });
    });
    return coords;
  }, [people]);

  // PERSON DETAIL VIEW
  if (circleTab === 'profiles' && selectedPerson && report) {
    const answeredCount = Object.keys(selectedPerson.answers).length;
    const radarData = [
      { label: 'الانفتاح', value: report.bigFive.openness },
      { label: 'الضمير', value: report.bigFive.conscientiousness },
      { label: 'الانبساط', value: report.bigFive.extraversion },
      { label: 'التوافق', value: report.bigFive.agreeableness },
      { label: 'الحساسية', value: report.bigFive.neuroticism },
    ];
    const discRadar = [
      { label: 'الحسم (D)', value: report.disc.D },
      { label: 'التأثير (I)', value: report.disc.I },
      { label: 'الثبات (S)', value: report.disc.S },
      { label: 'الدقة (C)', value: report.disc.C },
    ];

    return (
      <div className="space-y-5 animate-view">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setSelectedId(null)}
            className="min-h-[44px] px-3.5 rounded-xl bg-[#141720] hover:bg-[#1B1F2B] border border-white/[0.08] text-sm text-[#F2EFE9] flex items-center gap-1.5 cursor-pointer"
          >
            <ChevronRightIcon className="w-4 h-4" />
            <span>دائرتي</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onDeletePerson(selectedPerson.id);
              setSelectedId(null);
            }}
            className="min-h-[44px] px-3.5 rounded-xl border border-rose-500/25 text-rose-400 hover:bg-rose-500/10 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            <TrashIcon className="w-4 h-4" />
            <span>حذف الملف</span>
          </button>
        </div>

        {/* Person Header Card */}
        <section className="rounded-3xl bg-[#141720] border border-white/[0.08] p-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs text-[#D4A853] font-semibold">
              {selectedPerson.relationship} · {CLOSENESS_LABELS[selectedPerson.closeness ?? 2]}
            </div>
            <h1 className="text-xl font-bold text-[#F2EFE9] mt-0.5">{selectedPerson.name}</h1>
            {selectedPerson.tags.length > 0 && (
              <p className="text-xs text-[#9CA3AF] mt-1">
                {selectedPerson.tags.join(' · ')}
              </p>
            )}
          </div>
          <div className="flex items-center gap-4 text-xs">
            <div className="text-center">
              <div className="text-[#9CA3AF]">درجة الثقة</div>
              <div className="text-lg font-bold text-[#D4A853] tabular-nums">
                {report.confidence.score}%
              </div>
            </div>
            <div className="h-8 w-px bg-white/[0.08]" />
            <div className="text-center">
              <div className="text-[#9CA3AF]">صعوبة التعامل</div>
              <div
                className={`text-lg font-bold tabular-nums ${
                  report.difficulty.score >= 65
                    ? 'text-rose-400'
                    : report.difficulty.score >= 45
                    ? 'text-amber-300'
                    : 'text-emerald-400'
                }`}
              >
                {report.difficulty.score}/100
              </div>
            </div>
          </div>
        </section>

        {/* Inner Detail Tabs */}
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              { id: 'report', label: 'التقرير والتحليل' },
              { id: 'quiz', label: `الاستبيان (${answeredCount}/40)` },
              { id: 'notes', label: `الملاحظات (${selectedPerson.notes.length})` },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setDetailTab(t.id)}
              className={`min-h-[46px] px-3 rounded-2xl text-xs sm:text-sm font-bold border transition-colors cursor-pointer ${
                detailTab === t.id
                  ? 'bg-[#D4A853] border-[#D4A853] text-[#0B0D12]'
                  : 'bg-[#141720] border-white/[0.08] text-[#9CA3AF] hover:text-[#F2EFE9]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* REPORT TAB */}
        {detailTab === 'report' && (
          <div className="space-y-5">
            {answeredCount < 10 && (
              <div className="p-4 rounded-2xl bg-[#D4A853]/10 border border-[#D4A853]/30 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs sm:text-sm text-[#F2EFE9]">
                  أجبتَ عن {answeredCount} من 40 عبارة سلوكية. كلما أكملتَ عبارات أكثر ارتفعت دقة التحليل والتوصيات.
                </p>
                <button
                  type="button"
                  onClick={() => setDetailTab('quiz')}
                  className="min-h-[42px] px-4 rounded-xl bg-[#D4A853] text-[#0B0D12] text-xs font-bold cursor-pointer"
                >
                  أكمل الاستبيان
                </button>
              </div>
            )}

            {/* Radar Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <section className="rounded-3xl bg-[#141720] border border-white/[0.08] p-5">
                <h2 className="text-sm font-bold text-[#F2EFE9] mb-1">
                  العوامل الخمسة الكبرى (Big Five)
                </h2>
                <p className="text-xs text-[#9CA3AF] mb-3">{report.confidence.explanation}</p>
                <RadarChart axes={radarData} size={250} />
              </section>

              <section className="rounded-3xl bg-[#141720] border border-white/[0.08] p-5">
                <h2 className="text-sm font-bold text-[#F2EFE9] mb-1">
                  النمط السلوكي (DISC) — الغالب: {report.dominantDiscLabel}
                </h2>
                <p className="text-xs text-[#9CA3AF] mb-3">
                  مؤشر كيفية استجابته للحوارات والقرارات اليومية داخل دائرتك
                </p>
                <RadarChart axes={discRadar} size={250} />
              </section>
            </div>

            {/* Attachment, Conflict, Decision & Difficulty */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-3xl bg-[#141720] border border-white/[0.08] p-5 space-y-3">
                <h3 className="text-sm font-bold text-[#D4A853]">الأنماط العلائقية والقرار</h3>
                <div className="p-3 rounded-2xl bg-[#1B1F2B]">
                  <div className="text-xs text-[#9CA3AF]">نمط التعلق الملاحظ</div>
                  <div className="text-sm font-bold text-[#F2EFE9] mt-0.5">{report.attachmentStyle.name}</div>
                  <p className="text-xs text-[#C8C3B9] mt-1 leading-relaxed">{report.attachmentStyle.description}</p>
                </div>
                <div className="p-3 rounded-2xl bg-[#1B1F2B]">
                  <div className="text-xs text-[#9CA3AF]">أسلوب الصراع والخلاف</div>
                  <div className="text-sm font-bold text-[#F2EFE9] mt-0.5">{report.conflictStyle.name}</div>
                  <p className="text-xs text-[#C8C3B9] mt-1 leading-relaxed">{report.conflictStyle.description}</p>
                </div>
                <div className="p-3 rounded-2xl bg-[#1B1F2B]">
                  <div className="text-xs text-[#9CA3AF]">أسلوب اتخاذ القرار</div>
                  <div className="text-sm font-bold text-[#F2EFE9] mt-0.5">{report.decisionStyle.name}</div>
                  <p className="text-xs text-[#C8C3B9] mt-1 leading-relaxed">{report.decisionStyle.description}</p>
                </div>
              </div>

              <div className="rounded-3xl bg-[#141720] border border-white/[0.08] p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-[#D4A853]">مؤشر صعوبة التعامل</h3>
                  <span className="text-xs font-bold text-[#F2EFE9] tabular-nums">
                    {report.difficulty.level} ({report.difficulty.score}%)
                  </span>
                </div>
                <div className="h-2.5 rounded-full bg-[#1B1F2B] overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      report.difficulty.score >= 65
                        ? 'bg-rose-400'
                        : report.difficulty.score >= 45
                        ? 'bg-amber-300'
                        : 'bg-emerald-400'
                    }`}
                    style={{ width: `${report.difficulty.score}%` }}
                  />
                </div>
                <ul className="space-y-2 pt-1">
                  {report.difficulty.reasons.map((r, i) => (
                    <li key={i} className="text-xs sm:text-sm text-[#D6D2C9] leading-relaxed flex gap-2">
                      <span className="text-[#D4A853]">•</span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* ME <-> PERSON COMPATIBILITY MATRIX (توافقك الشخصي معه) */}
            {(() => {
              const personReviews = situationReviews.filter((r) => r.personId === selectedPerson.id);
              const pair = analyzePairCompatibility(selfSynth, selectedPerson, personReviews);
              return (
                <section className="rounded-3xl bg-gradient-to-br from-[#191E2D] to-[#131722] border border-[#D4A853]/35 p-5 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-[11px] font-bold text-[#D4A853] flex items-center gap-1.5">
                        <SparklesIcon className="w-3.5 h-3.5" />
                        <span>تحليل التوافق بين ملفك أنت وملف {selectedPerson.name}</span>
                      </div>
                      <h3 className="text-base font-extrabold text-[#F2EFE9] mt-0.5">
                        {pair.dynamicTitle} · {pair.harmonyLabel}
                      </h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="px-3 py-1.5 rounded-xl bg-[#D4A853]/15 border border-[#D4A853]/35 text-sm font-extrabold text-[#D4A853] tabular-nums">
                        {pair.harmonyPct}%
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setPreTalkPersonId(selectedPerson.id);
                          setSelectedId(null);
                          setCircleTab('pretalk');
                        }}
                        className="min-h-[38px] px-3.5 rounded-xl bg-[#D4A853] text-[#0B0D12] text-xs font-bold cursor-pointer"
                      >
                        بطاقة قبل الحوار معه
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="p-3.5 rounded-2xl bg-[#0F121B] border border-emerald-500/20 space-y-1.5">
                      <div className="font-bold text-emerald-300">نقاط القوة والتلاقي بينكما</div>
                      {pair.sharedStrengths.map((s, i) => (
                        <p key={i} className="text-[#D6D2C9] leading-relaxed">• {s}</p>
                      ))}
                    </div>
                    <div className="p-3.5 rounded-2xl bg-[#0F121B] border border-amber-500/20 space-y-1.5">
                      <div className="font-bold text-amber-300">أين قد يحدث الاحتكاك بين طبعك وطبعه؟</div>
                      {pair.frictionPoints.map((f, i) => (
                        <p key={i} className="text-[#D6D2C9] leading-relaxed">• {f}</p>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="p-3.5 rounded-2xl bg-sky-500/8 border border-sky-400/25">
                      <span className="font-bold text-sky-300">انتبه لنفسك أنت معه: </span>
                      <span className="text-[#E5E2DC] leading-relaxed">{pair.yourWatchOut}</span>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-[#D4A853]/10 border border-[#D4A853]/30">
                      <span className="font-bold text-[#D4A853]">القاعدة الذهبية معه: </span>
                      <span className="text-[#F2EFE9] leading-relaxed">{pair.goldenRule}</span>
                    </div>
                  </div>

                  {selfSynth.completionPct < 30 && onNavigateTo && (
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/8 text-[11px] text-[#9CA3AF]">
                      <span>أكمل «ملفي أنا» ({selfSynth.completionPct}%) لتصبح مقارنة شخصيتك معه أدق بكثير.</span>
                      <button
                        type="button"
                        onClick={() => onNavigateTo({ tab: 'training', trainingSubTab: 'self' })}
                        className="text-[#D4A853] font-bold hover:underline cursor-pointer"
                      >
                        أكمل ملفي أنا ←
                      </button>
                    </div>
                  )}
                </section>
              );
            })()}

            {/* ALL 7 PERSONAL REPORT SECTIONS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { title: 'دوافعه الأساسية', items: report.motivations, tone: 'text-[#D4A853]' },
                { title: 'مخاوفه الخفية', items: report.fears, tone: 'text-amber-300' },
                { title: 'ما يزعجه ويستفزه', items: report.whatBothers, tone: 'text-rose-300' },
                { title: 'ما يقرّبه ويكسب ودّه', items: report.whatBringsCloser, tone: 'text-emerald-300' },
                { title: 'كيف أحاوره بذكاء؟', items: report.howToConverse, tone: 'text-[#D4A853]' },
                { title: 'متى أتكلم معه؟ (التوقيت الأمثل)', items: report.whenToTalk, tone: 'text-sky-300' },
              ].map((block) => (
                <section
                  key={block.title}
                  className="rounded-3xl bg-[#141720] border border-white/[0.08] p-5 space-y-2.5"
                >
                  <h3 className={`text-sm font-bold ${block.tone}`}>{block.title}</h3>
                  <ul className="space-y-2">
                    {block.items.map((item, idx) => (
                      <li key={idx} className="text-xs sm:text-sm text-[#E5E2DC] leading-relaxed flex gap-2">
                        <span className="text-[#D4A853] shrink-0">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>

            <section className="rounded-3xl bg-rose-500/8 border border-rose-500/25 p-5 space-y-2.5">
              <h3 className="text-sm font-bold text-rose-300">ما أتجنبه معه تماماً</h3>
              <ul className="space-y-2">
                {report.whatToAvoid.map((item, idx) => (
                  <li key={idx} className="text-xs sm:text-sm text-[#F2EFE9] leading-relaxed flex gap-2">
                    <span className="text-rose-400 shrink-0">×</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        )}

        {/* 40-STATEMENT QUESTIONNAIRE TAB */}
        {detailTab === 'quiz' && (
          <div className="space-y-4">
            <div className="rounded-2xl bg-[#141720] border border-white/[0.08] p-4 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#D6D2C9] font-semibold">
                  استبيان الملاحظة السلوكية (40 عبارة)
                </span>
                <span className="text-[#D4A853] font-bold tabular-nums">
                  {answeredCount} / 40
                </span>
              </div>
              <div className="h-2 rounded-full bg-[#1B1F2B] overflow-hidden">
                <div
                  className="h-full bg-[#D4A853] rounded-full transition-all"
                  style={{ width: `${Math.round((answeredCount / 40) * 100)}%` }}
                />
              </div>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {quizCategories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setQuizCategory(cat)}
                    className={`min-h-[38px] px-3 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer ${
                      quizCategory === cat
                        ? 'bg-[#D4A853] text-[#0B0D12]'
                        : 'bg-[#1B1F2B] text-[#9CA3AF] hover:text-[#F2EFE9]'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              {visibleStatements.map((st) => {
                const currentVal = selectedPerson.answers[st.id];
                return (
                  <div
                    key={st.id}
                    className="rounded-2xl bg-[#141720] border border-white/[0.08] p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm text-[#F2EFE9] leading-relaxed">
                        <span className="text-[#D4A853] font-bold tabular-nums ml-1.5">
                          {String(st.id).padStart(2, '0')}.
                        </span>
                        {st.text}
                      </p>
                      <span className="text-[11px] text-[#7E8594] shrink-0">{st.category}</span>
                    </div>
                    <div className="grid grid-cols-5 gap-1.5">
                      {RATING_LABELS.map((r) => {
                        const active = currentVal === r.value;
                        return (
                          <button
                            key={r.value}
                            type="button"
                            onClick={() => handleAnswer(st.id, r.value)}
                            className={`min-h-[44px] px-1 py-1.5 rounded-xl text-[11px] font-semibold border transition-colors cursor-pointer ${
                              active
                                ? 'bg-[#D4A853] border-[#D4A853] text-[#0B0D12]'
                                : 'bg-[#1B1F2B] border-white/[0.06] text-[#B8B4AA] hover:border-[#D4A853]/40'
                            }`}
                          >
                            <span className="block tabular-nums font-bold">{r.short}</span>
                            <span className="block text-[10px] leading-tight mt-0.5 truncate">
                              {r.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setDetailTab('report')}
              className="w-full min-h-[50px] rounded-2xl bg-[#D4A853] text-[#0B0D12] text-sm font-bold hover:bg-[#E2BA6B] cursor-pointer"
            >
              عرض التقرير والتحليل المحدّث
            </button>
          </div>
        )}

        {/* NOTES & CLOSENESS TAB */}
        {detailTab === 'notes' && (
          <div className="space-y-4">
            {/* Closeness, Birthday & Contact Reminder card */}
            <section className="rounded-3xl bg-[#141720] border border-white/[0.08] p-5 space-y-4">
              <div className="space-y-2.5">
                <div className="text-xs font-bold text-[#D4A853]">مستوى القرب في خريطة الدائرة</div>
                <div className="grid grid-cols-3 gap-2">
                  {([1, 2, 3] as ClosenessLevel[]).map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() =>
                        onUpdatePerson({ ...selectedPerson, closeness: lvl, updatedAt: getTodayIso() })
                      }
                      className={`min-h-[44px] rounded-xl text-xs font-bold border cursor-pointer ${
                        (selectedPerson.closeness ?? 2) === lvl
                          ? 'bg-[#D4A853] border-[#D4A853] text-[#0B0D12]'
                          : 'bg-[#1B1F2B] border-white/[0.08] text-[#9CA3AF]'
                      }`}
                    >
                      {CLOSENESS_LABELS[lvl]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-white/[0.07]">
                <div>
                  <label className="text-[11px] text-[#9CA3AF] block mb-1">
                    تاريخ الميلاد (لتذكير عيد الميلاد)
                  </label>
                  <input
                    type="date"
                    value={selectedPerson.birthday || ''}
                    onChange={(e) =>
                      onUpdatePerson({
                        ...selectedPerson,
                        birthday: e.target.value || undefined,
                        updatedAt: getTodayIso(),
                      })
                    }
                    className="w-full min-h-[42px] px-3 rounded-xl bg-[#1B1F2B] border border-white/[0.08] text-xs text-[#F2EFE9]"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[#9CA3AF] block mb-1">
                    آخر تواصل ({selectedPerson.lastContactDate ? formatArabicDate(selectedPerson.lastContactDate) : 'غير محدد'})
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      onUpdatePerson({
                        ...selectedPerson,
                        lastContactDate: getTodayIso(),
                        updatedAt: getTodayIso(),
                      })
                    }
                    className="w-full min-h-[42px] px-3 rounded-xl bg-emerald-500/15 border border-emerald-500/35 text-emerald-300 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <CheckIcon className="w-4 h-4" />
                    <span>سجّلت تواصل اليوم</span>
                  </button>
                </div>
              </div>
            </section>

            <form
              onSubmit={(e) => void handleAddNote(e)}
              className="rounded-3xl bg-[#141720] border border-white/[0.08] p-5 space-y-3"
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-[#F2EFE9]">إضافة ملاحظة سلوكية مؤرّخة</h3>
                {notesEncrypted && noteCryptoKey && (
                  <span className="text-[11px] text-emerald-300 flex items-center gap-1">
                    <LockIcon className="w-3.5 h-3.5" />
                    مشفّرة محلياً
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="date"
                  value={noteDate}
                  onChange={(e) => setNoteDate(e.target.value)}
                  className="min-h-[44px] px-3.5 rounded-xl bg-[#1B1F2B] border border-white/[0.08] text-xs sm:text-sm text-[#F2EFE9]"
                />
                <input
                  type="text"
                  value={noteContext}
                  onChange={(e) => setNoteContext(e.target.value)}
                  placeholder="السياق (مثلاً: جلسة عائلية، مكالمة، خلاف بسيط)"
                  className="min-h-[44px] px-3.5 rounded-xl bg-[#1B1F2B] border border-white/[0.08] text-xs sm:text-sm text-[#F2EFE9]"
                />
              </div>
              <textarea
                rows={3}
                required
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="دوّن ما لاحظته بموضوعية (ماذا قال أو فعل؟ وما الذي جعله يهدأ أو ينزعج؟)"
                className="w-full p-3.5 rounded-xl bg-[#1B1F2B] border border-white/[0.08] text-sm text-[#F2EFE9] resize-none focus:outline-none focus:border-[#D4A853]"
              />
              <button
                type="submit"
                className="min-h-[46px] px-5 rounded-xl bg-[#D4A853] text-[#0B0D12] text-sm font-bold hover:bg-[#E2BA6B] cursor-pointer"
              >
                حفظ الملاحظة
              </button>
            </form>

            <div className="space-y-3">
              {selectedPerson.notes.length === 0 ? (
                <div className="p-6 rounded-2xl bg-[#141720] border border-white/[0.06] text-center text-xs text-[#9CA3AF]">
                  لا توجد ملاحظات مسجلة بعد. الملاحظات الواقعية المتكررة ترفع دقة التحليل.
                </div>
              ) : (
                selectedPerson.notes.map((n) => (
                  <div
                    key={n.id}
                    className="p-4 rounded-2xl bg-[#141720] border border-white/[0.08] space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#D4A853] font-semibold tabular-nums flex items-center gap-1.5">
                        {isEncryptedNote(n.text) && <LockIcon className="w-3.5 h-3.5 text-emerald-400" />}
                        <span>
                          {formatArabicDate(n.date)}
                          {n.context ? ` · ${n.context}` : ''}
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeleteNote(n.id)}
                        aria-label="حذف الملاحظة"
                        className="text-[#9CA3AF] hover:text-rose-400 p-1 cursor-pointer"
                      >
                        <TrashIcon className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-sm text-[#E5E2DC] leading-relaxed">
                      {decryptedNotes[n.id] ?? (isEncryptedNote(n.text) ? 'جارٍ فك التشفير...' : n.text)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-view">
      {/* Header + Sub-tabs */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#F2EFE9]">دائرتي (العائلة والأصحاب)</h1>
          <p className="text-xs text-[#9CA3AF] mt-1">
            افهم من تحبهم وتعيش معهم بوعي علمي هادئ، وتعرّف على خريطة التأثير والقرب
          </p>
        </div>
        {circleTab === 'profiles' && (
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className="min-h-[44px] px-4 rounded-xl bg-[#D4A853] text-[#0B0D12] text-xs sm:text-sm font-bold flex items-center gap-1.5 hover:bg-[#E2BA6B] cursor-pointer"
          >
            <PlusIcon className="w-4 h-4" />
            <span>إضافة شخص</span>
          </button>
        )}
      </div>

      {/* 5 Sub-tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {(
          [
            { id: 'profiles', label: `الأشخاص (${people.length})` },
            { id: 'pretalk', label: 'قبل الحوار المهم' },
            { id: 'review', label: `مراجعة المواقف (${situationReviews.length})` },
            { id: 'guides', label: 'أدلة العلاقات' },
            { id: 'map', label: 'خريطة الدائرة' },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setCircleTab(t.id)}
            className={`min-h-[44px] px-4 rounded-2xl text-xs sm:text-sm font-bold border whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
              circleTab === t.id
                ? 'bg-[#D4A853] border-[#D4A853] text-[#0B0D12]'
                : 'bg-[#141720] border-white/[0.08] text-[#9CA3AF] hover:text-[#F2EFE9]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* PRE-TALK 3-STEP CARD SUB-TAB */}
      {circleTab === 'pretalk' && (
        <PreTalkCardPanel
          people={people}
          selfProfile={selfProfile}
          biasQuiz={biasQuiz}
          reviews={situationReviews}
          initialPersonId={preTalkPersonId}
        />
      )}

      {/* POST-SITUATION REVIEW SUB-TAB */}
      {circleTab === 'review' && (
        <PostReviewPanel
          people={people}
          reviews={situationReviews}
          onAddReview={onAddReview}
          onDeleteReview={onDeleteReview}
        />
      )}

      {/* SUB-TAB 1: PROFILES LIST */}
      {circleTab === 'profiles' && (
        <div className="space-y-4">
          {/* Smart Relationship Reminders Banner */}
          {reminders.length > 0 && (
            <section className="p-4 rounded-2xl bg-[#181C27] border border-[#D4A853]/35 space-y-2.5">
              <div className="text-xs font-bold text-[#D4A853] flex items-center gap-1.5">
                <CalendarIcon className="w-4 h-4" />
                <span>تذكيرات علاقات ({reminders.length})</span>
              </div>
              <div className="space-y-2">
                {reminders.map((rem) => {
                  const target = people.find((p) => p.id === rem.personId);
                  return (
                    <div
                      key={rem.id}
                      className="p-3 rounded-xl bg-[#12151E] border border-white/8 flex flex-wrap items-center justify-between gap-2 text-xs"
                    >
                      <span className="text-[#F2EFE9]">{rem.text}</span>
                      {rem.type === 'contact' && target && (
                        <button
                          type="button"
                          onClick={() =>
                            onUpdatePerson({
                              ...target,
                              lastContactDate: getTodayIso(),
                              updatedAt: getTodayIso(),
                            })
                          }
                          className="px-3 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/35 text-emerald-300 font-bold text-[11px] cursor-pointer"
                        >
                          تم التواصل ✓
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}
          {people.length === 0 ? (
            <section className="rounded-3xl bg-[#141720] border border-white/[0.08] p-7 text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-[#D4A853]/12 border border-[#D4A853]/30 text-[#D4A853] flex items-center justify-center mx-auto">
                <UsersIcon className="w-6 h-6" />
              </div>
              <div className="space-y-1 max-w-md mx-auto">
                <h2 className="text-base font-bold text-[#F2EFE9]">ابدأ ببناء دائرتك الشخصية</h2>
                <p className="text-xs sm:text-sm text-[#9CA3AF] leading-relaxed">
                  أضف ملفاً لأحد والديك أو إخوتك أو أصدقائك، أجب عن استبيان الملاحظات السلوكية (40 عبارة)، واحصل فوراً على تحليل Big Five وDISC وتقرير عملي للحوار.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAddForm(true)}
                  className="min-h-[46px] px-5 rounded-2xl bg-[#D4A853] text-[#0B0D12] text-sm font-bold hover:bg-[#E2BA6B] cursor-pointer"
                >
                  إضافة أول شخص
                </button>
                <button
                  type="button"
                  onClick={handleAddDemo}
                  className="min-h-[46px] px-5 rounded-2xl bg-[#1B1F2B] border border-white/[0.1] text-sm text-[#F2EFE9] hover:bg-[#232838] cursor-pointer"
                >
                  جرّب ملفاً جاهزاً (أخي عمر)
                </button>
              </div>
            </section>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {people.map((p) => {
                const rep = analyzePerson(p);
                const answered = Object.keys(p.answers).length;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setSelectedId(p.id);
                      setDetailTab('report');
                    }}
                    className="p-5 rounded-3xl bg-[#141720] hover:bg-[#191D29] border border-white/[0.08] text-right flex flex-col justify-between gap-4 transition-colors cursor-pointer"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="text-[#D4A853] font-semibold">
                          {p.relationship} · {CLOSENESS_LABELS[p.closeness ?? 2]}
                        </span>
                        <span className="text-[#9CA3AF] tabular-nums">{answered}/40 عبارة</span>
                      </div>
                      <h2 className="text-lg font-bold text-[#F2EFE9] mt-1">{p.name}</h2>
                      {p.tags.length > 0 && (
                        <p className="text-xs text-[#9CA3AF] mt-1 line-clamp-1">
                          {p.tags.join(' · ')}
                        </p>
                      )}
                    </div>

                    <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs">
                      <span className="text-[#D6D2C9]">
                        {rep.dominantDiscLabel} · {rep.attachmentStyle.name}
                      </span>
                      <ChevronLeftIcon className="w-4 h-4 text-[#9CA3AF]" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 2: READY RELATIONSHIP GUIDES */}
      {circleTab === 'guides' && (
        <div className="space-y-4">
          {RELATIONSHIP_GUIDES.map((g) => {
            const open = expandedGuideId === g.id;
            return (
              <section
                key={g.id}
                className="rounded-3xl bg-[#141720] border border-white/[0.08] overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setExpandedGuideId(open ? '' : g.id)}
                  className="w-full p-5 text-right flex items-center justify-between gap-3 cursor-pointer"
                >
                  <div>
                    <h2 className="text-base font-bold text-[#F2EFE9]">{g.title}</h2>
                    <p className="text-xs text-[#9CA3AF] mt-1">{g.subtitle}</p>
                  </div>
                  <span className="text-xs text-[#D4A853] font-semibold shrink-0">
                    {open ? 'إغلاق' : 'اقرأ الدليل'}
                  </span>
                </button>

                {open && (
                  <div className="px-5 pb-6 pt-2 border-t border-white/[0.07] space-y-5 animate-view">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="p-4 rounded-2xl bg-[#1B1F2B]">
                        <div className="text-xs font-bold text-[#D4A853] mb-1">الفهم النفسي للموقف</div>
                        <p className="text-xs sm:text-sm text-[#E5E2DC] leading-relaxed">{g.psychologyCore}</p>
                      </div>
                      <div className="p-4 rounded-2xl bg-[#1B1F2B]">
                        <div className="text-xs font-bold text-sky-300 mb-1">أفضل توقيت للحوار</div>
                        <p className="text-xs sm:text-sm text-[#E5E2DC] leading-relaxed">{g.timing}</p>
                      </div>
                    </div>

                    <div className="space-y-2.5">
                      <h3 className="text-sm font-bold text-[#F2EFE9]">خطة الخطوات العملية</h3>
                      {g.steps.map((s, idx) => (
                        <div key={idx} className="p-3.5 rounded-2xl bg-[#10131B] border border-white/[0.06]">
                          <div className="text-xs sm:text-sm font-bold text-[#D4A853]">{s.title}</div>
                          <p className="text-xs sm:text-sm text-[#D6D2C9] mt-1 leading-relaxed">{s.detail}</p>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-2.5">
                      <h3 className="text-sm font-bold text-[#F2EFE9]">جمل جاهزة (اضغط للنسخ)</h3>
                      <div className="space-y-2">
                        {g.readyPhrases.map((phrase, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              void handleCopyPhrase(phrase);
                            }}
                            className="w-full p-3.5 rounded-2xl bg-[#1B1F2B] hover:bg-[#232838] border border-white/[0.06] flex items-center justify-between gap-3 text-right cursor-pointer"
                          >
                            <span className="text-xs sm:text-sm text-[#F2EFE9] leading-relaxed">
                              «{phrase}»
                            </span>
                            {copiedPhrase === phrase ? (
                              <CheckIcon className="w-4 h-4 text-emerald-400 shrink-0" />
                            ) : (
                              <CopyIcon className="w-4 h-4 text-[#D4A853] shrink-0" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-rose-500/8 border border-rose-500/25 space-y-1.5">
                      <div className="text-xs font-bold text-rose-300">أخطاء تجنّبها</div>
                      {g.avoid.map((av, idx) => (
                        <p key={idx} className="text-xs sm:text-sm text-[#F2EFE9] flex gap-2">
                          <span className="text-rose-400">×</span>
                          <span>{av}</span>
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}

      {/* SUB-TAB 3: INTERACTIVE CIRCLE & INFLUENCE MAP */}
      {circleTab === 'map' && (
        <div className="space-y-5">
          <section className="rounded-3xl bg-[#141720] border border-white/[0.08] p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-[#F2EFE9]">خريطة الدائرة والتأثير المتبادل</h2>
                <p className="text-xs text-[#9CA3AF] mt-0.5">
                  توضح الحلقات من هو الأقرب لك، وتوضح الأسهم اتجاه التأثير («من يؤثر في من»)
                </p>
              </div>
              {people.length === 0 && (
                <button
                  type="button"
                  onClick={handleAddDemo}
                  className="min-h-[40px] px-3.5 rounded-xl bg-[#D4A853] text-[#0B0D12] text-xs font-bold cursor-pointer"
                >
                  أضف مثالاً للبدء
                </button>
              )}
            </div>

            {/* Pure Inline SVG Circle Map */}
            <div className="w-full max-w-[460px] mx-auto">
              <svg viewBox="0 0 420 420" className="w-full h-auto" role="img" aria-label="خريطة الدائرة والتأثير">
                <defs>
                  <marker id="arrow-strong" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#D4A853" />
                  </marker>
                  <marker id="arrow-mid" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#60A5FA" />
                  </marker>
                  <marker id="arrow-light" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#9CA3AF" />
                  </marker>
                </defs>

                {/* Concentric Rings */}
                <circle cx="210" cy="210" r="176" fill="#0F1219" stroke="rgba(255,255,255,0.08)" strokeDasharray="4 4" />
                <circle cx="210" cy="210" r="126" fill="#121620" stroke="rgba(255,255,255,0.1)" strokeDasharray="4 4" />
                <circle cx="210" cy="210" r="72" fill="#171C28" stroke="rgba(212,168,83,0.28)" />

                <text x="210" y="47" textAnchor="middle" fill="#6B7280" fontSize="10">المحيط الاجتماعي</text>
                <text x="210" y="96" textAnchor="middle" fill="#8B93A3" fontSize="10">الدائرة القريبة</text>
                <text x="210" y="150" textAnchor="middle" fill="#D4A853" fontSize="10">الأقرب</text>

                {/* Influence Arrows */}
                {influenceLinks.map((lnk) => {
                  const a = mapPositions[lnk.fromPersonId];
                  const b = mapPositions[lnk.toPersonId];
                  if (!a || !b) return null;
                  const dx = b.x - a.x;
                  const dy = b.y - a.y;
                  const dist = Math.hypot(dx, dy) || 1;
                  const pad = 26;
                  const x1 = a.x + (dx / dist) * pad;
                  const y1 = a.y + (dy / dist) * pad;
                  const x2 = b.x - (dx / dist) * pad;
                  const y2 = b.y - (dy / dist) * pad;
                  const stroke =
                    lnk.strength === 'قوي'
                      ? '#D4A853'
                      : lnk.strength === 'متوسط'
                      ? '#60A5FA'
                      : '#9CA3AF';
                  const marker =
                    lnk.strength === 'قوي'
                      ? 'url(#arrow-strong)'
                      : lnk.strength === 'متوسط'
                      ? 'url(#arrow-mid)'
                      : 'url(#arrow-light)';
                  return (
                    <line
                      key={lnk.id}
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke={stroke}
                      strokeWidth={lnk.strength === 'قوي' ? 2.4 : 1.7}
                      strokeOpacity="0.85"
                      markerEnd={marker}
                    />
                  );
                })}

                {/* Nodes */}
                {Object.entries(mapPositions).map(([id, pos]) => {
                  const isSelf = id === 'self';
                  const isSelected = mapSelectedNodeId === id;
                  return (
                    <g
                      key={id}
                      onClick={() => setMapSelectedNodeId(id)}
                      className="cursor-pointer"
                    >
                      <circle
                        cx={pos.x}
                        cy={pos.y}
                        r={isSelf ? 25 : 21}
                        fill={isSelf ? '#D4A853' : isSelected ? '#23293A' : '#1B1F2B'}
                        stroke={isSelf ? '#F2EFE9' : isSelected ? '#D4A853' : 'rgba(255,255,255,0.22)'}
                        strokeWidth={isSelected || isSelf ? 2 : 1.2}
                      />
                      <text
                        x={pos.x}
                        y={pos.y + 4}
                        textAnchor="middle"
                        fill={isSelf ? '#0B0D12' : '#F2EFE9'}
                        fontSize={isSelf ? '12' : '10.5'}
                        fontWeight="700"
                      >
                        {pos.label.slice(0, 9)}
                      </text>
                      {!isSelf && (
                        <text
                          x={pos.x}
                          y={pos.y + 33}
                          textAnchor="middle"
                          fill="#9CA3AF"
                          fontSize="9.5"
                        >
                          {pos.sub}
                        </text>
                      )}
                    </g>
                  );
                })}
              </svg>
            </div>

            {mapSelectedNodeId && mapSelectedNodeId !== 'self' && (
              <div className="p-3.5 rounded-2xl bg-[#1B1F2B] flex items-center justify-between gap-3 text-xs">
                <div>
                  <strong className="text-[#F2EFE9]">{getNodeLabel(mapSelectedNodeId)}</strong>
                  <span className="text-[#9CA3AF] mr-2">
                    اضغط لفتح التقرير الكامل وتعديل مستوى القرب
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedId(mapSelectedNodeId);
                    setCircleTab('profiles');
                    setDetailTab('report');
                  }}
                  className="min-h-[38px] px-3.5 rounded-xl bg-[#D4A853] text-[#0B0D12] font-bold cursor-pointer"
                >
                  فتح الملف
                </button>
              </div>
            )}
          </section>

          {/* Add Influence Link Form */}
          <form
            onSubmit={handleCreateInfluenceLink}
            className="rounded-3xl bg-[#141720] border border-white/[0.08] p-5 space-y-3"
          >
            <h3 className="text-sm font-bold text-[#F2EFE9]">أضف رابط تأثير («من يؤثر في من؟»)</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <select
                value={fromId}
                onChange={(e) => setFromId(e.target.value)}
                aria-label="المؤثِّر"
                className="min-h-[44px] px-3 rounded-xl bg-[#1B1F2B] border border-white/[0.08] text-xs sm:text-sm text-[#F2EFE9]"
              >
                <option value="self">المؤثِّر: أنا</option>
                {people.map((p) => (
                  <option key={p.id} value={p.id}>
                    المؤثِّر: {p.name} ({p.relationship})
                  </option>
                ))}
              </select>

              <select
                value={toId}
                onChange={(e) => setToId(e.target.value)}
                aria-label="المتأثِّر"
                className="min-h-[44px] px-3 rounded-xl bg-[#1B1F2B] border border-white/[0.08] text-xs sm:text-sm text-[#F2EFE9]"
              >
                <option value="">اختر المتأثِّر...</option>
                <option value="self">المتأثِّر: أنا</option>
                {people.map((p) => (
                  <option key={p.id} value={p.id}>
                    المتأثِّر: {p.name} ({p.relationship})
                  </option>
                ))}
              </select>

              <select
                value={linkStrength}
                onChange={(e) => setLinkStrength(e.target.value as 'قوي' | 'متوسط' | 'خفيف')}
                aria-label="قوة التأثير"
                className="min-h-[44px] px-3 rounded-xl bg-[#1B1F2B] border border-white/[0.08] text-xs sm:text-sm text-[#F2EFE9]"
              >
                <option value="قوي">تأثير قوي</option>
                <option value="متوسط">تأثير متوسط</option>
                <option value="خفيف">تأثير خفيف</option>
              </select>
            </div>

            <div className="flex flex-wrap gap-2.5">
              <input
                type="text"
                value={linkNote}
                onChange={(e) => setLinkNote(e.target.value)}
                placeholder="كيف يظهر هذا التأثير؟ (مثلاً: يستشيره في القرارات، أو يتأثر بمزاجه سريعاً)"
                className="flex-1 min-w-[200px] min-h-[44px] px-3.5 rounded-xl bg-[#1B1F2B] border border-white/[0.08] text-xs sm:text-sm text-[#F2EFE9]"
              />
              <button
                type="submit"
                disabled={!toId || fromId === toId}
                className="min-h-[44px] px-5 rounded-xl bg-[#D4A853] disabled:opacity-40 text-[#0B0D12] text-xs sm:text-sm font-bold cursor-pointer"
              >
                إضافة للخريطة
              </button>
            </div>

            {influenceLinks.length > 0 && (
              <div className="pt-3 border-t border-white/[0.07] space-y-2">
                {influenceLinks.map((lnk) => (
                  <div
                    key={lnk.id}
                    className="p-3 rounded-xl bg-[#1B1F2B] flex items-center justify-between gap-2 text-xs"
                  >
                    <div>
                      <span className="font-bold text-[#F2EFE9]">{getNodeLabel(lnk.fromPersonId)}</span>
                      <span className="text-[#D4A853] mx-1.5">← يؤثر ({lnk.strength}) في ←</span>
                      <span className="font-bold text-[#F2EFE9]">{getNodeLabel(lnk.toPersonId)}</span>
                      <p className="text-[#9CA3AF] mt-0.5">{lnk.note}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onDeleteInfluenceLink(lnk.id)}
                      aria-label="حذف الرابط"
                      className="text-[#9CA3AF] hover:text-rose-400 p-1.5 cursor-pointer"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </form>
        </div>
      )}

      {/* ADD PERSON MODAL */}
      {showAddForm && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm sm:p-4"
          role="dialog"
          aria-modal="true"
        >
          <form
            onSubmit={handleCreatePerson}
            className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl bg-[#141720] border border-white/[0.1] p-6 space-y-4 shadow-2xl animate-view"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#F2EFE9]">إضافة شخص إلى دائرتي</h2>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                aria-label="إغلاق"
                className="min-h-[40px] min-w-[40px] rounded-xl flex items-center justify-center text-[#9CA3AF] hover:text-[#F2EFE9] cursor-pointer"
              >
                <CloseIcon className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="text-xs text-[#9CA3AF] block mb-1">الاسم أو اللقب</label>
              <input
                type="text"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="مثال: والدي، أختي سارة، صديقي أحمد..."
                className="w-full min-h-[46px] px-3.5 rounded-xl bg-[#1B1F2B] border border-white/[0.08] text-sm text-[#F2EFE9] focus:outline-none focus:border-[#D4A853]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[#9CA3AF] block mb-1">صلة القرابة / العلاقة</label>
                <select
                  value={newRel}
                  onChange={(e) => setNewRel(e.target.value as PersonalRelationship)}
                  className="w-full min-h-[46px] px-3 rounded-xl bg-[#1B1F2B] border border-white/[0.08] text-sm text-[#F2EFE9]"
                >
                  {RELATIONSHIPS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-[#9CA3AF] block mb-1">درجة القرب</label>
                <select
                  value={newCloseness}
                  onChange={(e) => setNewCloseness(Number(e.target.value) as ClosenessLevel)}
                  className="w-full min-h-[46px] px-3 rounded-xl bg-[#1B1F2B] border border-white/[0.08] text-sm text-[#F2EFE9]"
                >
                  <option value={1}>الأقرب لي</option>
                  <option value={2}>قريب</option>
                  <option value={3}>محيط اجتماعي</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs text-[#9CA3AF] block mb-1">وسوم اختيارية (مفصولة بفاصلة)</label>
              <input
                type="text"
                value={newTags}
                onChange={(e) => setNewTags(e.target.value)}
                placeholder="مثال: حساس، كريم، يحب النقاش الهادئ"
                className="w-full min-h-[46px] px-3.5 rounded-xl bg-[#1B1F2B] border border-white/[0.08] text-sm text-[#F2EFE9]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[#9CA3AF] block mb-1">عيد الميلاد (اختياري)</label>
                <input
                  type="date"
                  value={newBirthday}
                  onChange={(e) => setNewBirthday(e.target.value)}
                  className="w-full min-h-[44px] px-3 rounded-xl bg-[#1B1F2B] border border-white/[0.08] text-xs text-[#F2EFE9]"
                />
              </div>
              <div>
                <label className="text-xs text-[#9CA3AF] block mb-1">آخر تواصل</label>
                <input
                  type="date"
                  value={newLastContact}
                  onChange={(e) => setNewLastContact(e.target.value)}
                  className="w-full min-h-[44px] px-3 rounded-xl bg-[#1B1F2B] border border-white/[0.08] text-xs text-[#F2EFE9]"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full min-h-[48px] rounded-2xl bg-[#D4A853] text-[#0B0D12] text-sm font-bold hover:bg-[#E2BA6B] cursor-pointer"
            >
              حفظ والبدء بالاستبيان (40 عبارة)
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
