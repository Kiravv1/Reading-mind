import { AppState, QuoteCategory, QuoteEra, QuoteItem, QuoteVerification } from '../types';

const DB_NAME = 'MurshidAlNafsPersonalDB';
const DB_VERSION = 2;
const STORE_NAME = 'app_state';
const STATE_KEY = 'main_state_v2';
const LS_KEY = 'murshid_al_nafs_personal_v2';

export const DEFAULT_APP_STATE: AppState = {
  version: 3,
  ethicsAccepted: false,
  customQuotes: [],
  favoriteQuoteIds: [],
  favoriteKnowledgeIds: [],
  people: [],
  influenceLinks: [],
  situationReviews: [],
  lastAnalyzedPersonId: null,
  selfProfile: {
    displayName: '',
    personalGoal: undefined,
    bigFiveAnswers: {},
    attachmentAnswers: {},
    eqAnswers: {},
    confidenceAnswers: {},
    discConflictAnswers: {},
    valuesAnswers: {},
    updatedAt: null,
  },
  biasQuiz: {
    answers: {},
    completedAt: null,
  },
  decisions: [],
  habitLogs: [],
  voiceEvals: [],
  completedChallengeDates: [],
  xpPoints: 0,
  moodLogs: [],
  cbtLogs: [],
  stoicLogs: [],
  completedDays: [],
  streakDays: 0,
  lastMissionDate: null,
  presenceChecklist: {},
  confidenceChecklist: {},
  weeklyEvaluations: [],
  simResults: {},
};

export function getTodayIso(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDaysIso(isoDate: string, days: number): string {
  const d = new Date(isoDate + 'T00:00:00');
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function daysBetweenIso(earlierIso: string, laterIso: string): number {
  const a = new Date(earlierIso.slice(0, 10) + 'T00:00:00').getTime();
  const b = new Date(laterIso.slice(0, 10) + 'T00:00:00').getTime();
  if (isNaN(a) || isNaN(b)) return 0;
  return Math.floor((b - a) / (1000 * 60 * 60 * 24));
}

export function formatArabicDate(iso: string): string {
  if (!iso) return '';
  try {
    const parts = iso.slice(0, 10).split('-').map(Number);
    if (parts.length !== 3 || parts.some(isNaN)) return iso;
    const months = [
      'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
      'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
    ];
    return `${parts[2]} ${months[parts[1] - 1] ?? ''} ${parts[0]}`;
  } catch {
    return iso;
  }
}

export function generateId(prefix = 'id'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function openDatabase(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export function loadStateSync(): AppState {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      return sanitizeAppState(JSON.parse(raw));
    }
  } catch {
    // ignore
  }
  return { ...DEFAULT_APP_STATE };
}

export async function loadStateAsync(): Promise<AppState> {
  const db = await openDatabase();
  if (db) {
    try {
      const result = await new Promise<AppState | null>((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(STATE_KEY);
        req.onsuccess = () => resolve(req.result ?? null);
        req.onerror = () => resolve(null);
      });
      if (result) {
        const clean = sanitizeAppState(result);
        try {
          localStorage.setItem(LS_KEY, JSON.stringify(clean));
        } catch {
          // ignore
        }
        return clean;
      }
    } catch {
      // ignore
    }
  }
  return loadStateSync();
}

export async function saveState(state: AppState): Promise<void> {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  } catch {
    // ignore quota error (IndexedDB handles large quote libraries)
  }
  const db = await openDatabase();
  if (db) {
    try {
      await new Promise<void>((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.put(state, STATE_KEY);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      });
    } catch {
      // ignore
    }
  }
}

export function sanitizeAppState(raw: unknown): AppState {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_APP_STATE };
  const obj = raw as Partial<AppState>;
  const sp = obj.selfProfile;
  const bq = obj.biasQuiz;
  return {
    version: 3,
    ethicsAccepted: Boolean(obj.ethicsAccepted),
    customQuotes: Array.isArray(obj.customQuotes) ? obj.customQuotes : [],
    favoriteQuoteIds: Array.isArray(obj.favoriteQuoteIds) ? obj.favoriteQuoteIds : [],
    favoriteKnowledgeIds: Array.isArray(obj.favoriteKnowledgeIds) ? obj.favoriteKnowledgeIds : [],
    people: Array.isArray(obj.people) ? obj.people : [],
    influenceLinks: Array.isArray(obj.influenceLinks) ? obj.influenceLinks : [],
    situationReviews: Array.isArray(obj.situationReviews) ? obj.situationReviews : [],
    lastAnalyzedPersonId: typeof obj.lastAnalyzedPersonId === 'string' ? obj.lastAnalyzedPersonId : null,
    selfProfile: {
      displayName: sp && typeof sp.displayName === 'string' ? sp.displayName : '',
      personalGoal: sp && typeof sp.personalGoal === 'string' ? sp.personalGoal : undefined,
      bigFiveAnswers: sp && typeof sp.bigFiveAnswers === 'object' ? sp.bigFiveAnswers : {},
      attachmentAnswers: sp && typeof sp.attachmentAnswers === 'object' ? sp.attachmentAnswers : {},
      eqAnswers: sp && typeof sp.eqAnswers === 'object' ? sp.eqAnswers : {},
      confidenceAnswers: sp && typeof sp.confidenceAnswers === 'object' ? sp.confidenceAnswers : {},
      discConflictAnswers:
        sp && typeof sp.discConflictAnswers === 'object' ? sp.discConflictAnswers : {},
      valuesAnswers: sp && typeof sp.valuesAnswers === 'object' ? sp.valuesAnswers : {},
      updatedAt: sp && typeof sp.updatedAt === 'string' ? sp.updatedAt : null,
    },
    biasQuiz: {
      answers: bq && typeof bq.answers === 'object' ? bq.answers : {},
      completedAt: bq && typeof bq.completedAt === 'string' ? bq.completedAt : null,
    },
    decisions: Array.isArray(obj.decisions) ? obj.decisions : [],
    habitLogs: Array.isArray(obj.habitLogs) ? obj.habitLogs : [],
    voiceEvals: Array.isArray(obj.voiceEvals) ? obj.voiceEvals : [],
    completedChallengeDates: Array.isArray(obj.completedChallengeDates) ? obj.completedChallengeDates : [],
    xpPoints: typeof obj.xpPoints === 'number' && obj.xpPoints >= 0 ? obj.xpPoints : 0,
    moodLogs: Array.isArray(obj.moodLogs) ? obj.moodLogs : [],
    cbtLogs: Array.isArray(obj.cbtLogs) ? obj.cbtLogs : [],
    stoicLogs: Array.isArray(obj.stoicLogs) ? obj.stoicLogs : [],
    completedDays: Array.isArray(obj.completedDays)
      ? obj.completedDays.filter((n) => typeof n === 'number' && n >= 1 && n <= 30)
      : [],
    streakDays: typeof obj.streakDays === 'number' && obj.streakDays >= 0 ? obj.streakDays : 0,
    lastMissionDate: typeof obj.lastMissionDate === 'string' ? obj.lastMissionDate : null,
    presenceChecklist: obj.presenceChecklist && typeof obj.presenceChecklist === 'object' ? obj.presenceChecklist : {},
    confidenceChecklist: obj.confidenceChecklist && typeof obj.confidenceChecklist === 'object' ? obj.confidenceChecklist : {},
    weeklyEvaluations: Array.isArray(obj.weeklyEvaluations) ? obj.weeklyEvaluations : [],
    simResults: obj.simResults && typeof obj.simResults === 'object' ? obj.simResults : {},
  };
}

export function exportBackupJson(state: AppState): void {
  const payload = {
    app: 'مرشد النفس والتأثير',
    version: 3,
    exportedAt: new Date().toISOString(),
    data: state,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `murshid-personal-backup-${getTodayIso()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function parseBackupJson(text: string): AppState | null {
  try {
    const parsed = JSON.parse(text);
    const candidate = parsed && typeof parsed === 'object' && 'data' in parsed ? parsed.data : parsed;
    if (!candidate || typeof candidate !== 'object') return null;
    if (
      !('people' in candidate) &&
      !('moodLogs' in candidate) &&
      !('customQuotes' in candidate) &&
      !('completedDays' in candidate) &&
      !('decisions' in candidate)
    ) {
      return null;
    }
    return sanitizeAppState({ ...candidate, ethicsAccepted: true });
  } catch {
    return null;
  }
}

const VALID_CATS: QuoteCategory[] = ['علم نفس', 'فلسفة', 'قيادة', 'حكمة', 'رواقية', 'تحفيز'];
const VALID_ERAS: QuoteEra[] = ['قديم', 'إسلامي وكلاسيكي', 'نهضة وتنوير', 'حديث ومعاصر'];
const VALID_VERIFS: QuoteVerification[] = ['موثقة بمصدر', 'منسوبة ولم تُوثق', 'مشكوك في نسبتها'];

export function parseImportedQuotesJson(rawText: string): { quotes: QuoteItem[]; error?: string } {
  try {
    const parsed = JSON.parse(rawText);
    const list = Array.isArray(parsed)
      ? parsed
      : parsed && typeof parsed === 'object' && Array.isArray(parsed.quotes)
      ? parsed.quotes
      : null;

    if (!list || list.length === 0) {
      return { quotes: [], error: 'يجب أن يكون النص مصفوفة JSON تحتوي على عبارة واحدة على الأقل.' };
    }

    const normalized: QuoteItem[] = [];
    for (let i = 0; i < list.length; i++) {
      const item = list[i];
      if (!item || typeof item !== 'object') continue;
      const text = String(item.text || item.النص || '').trim();
      const author = String(item.author || item.القائل || 'غير محدد').trim();
      if (!text) continue;
      const source = String(item.source || item.المصدر || 'غير مذكور').trim();
      const year = String(item.year || item.السنة || 'غير محدد').trim();
      const rawCat = String(item.category || item.التصنيف || 'حكمة').trim() as QuoteCategory;
      const rawEra = String(item.era || item.العصر || 'حديث ومعاصر').trim() as QuoteEra;
      const rawVer = String(
        item.verification || item.التوثيق || (source !== 'غير مذكور' ? 'موثقة بمصدر' : 'منسوبة ولم تُوثق')
      ).trim() as QuoteVerification;
      const explanation = String(
        item.explanation || item.الشرح || 'عبارة مستوردة إلى مكتبتك الشخصية للتأمل والمراجعة.'
      ).trim();

      normalized.push({
        id: generateId(`imp_${i}`),
        text,
        author,
        source,
        year,
        category: VALID_CATS.includes(rawCat) ? rawCat : 'حكمة',
        era: VALID_ERAS.includes(rawEra) ? rawEra : 'حديث ومعاصر',
        verification: VALID_VERIFS.includes(rawVer) ? rawVer : 'منسوبة ولم تُوثق',
        explanation,
      });
    }

    if (normalized.length === 0) {
      return { quotes: [], error: 'لم يتم العثور على عبارات صالحة تحتوي على حقل "text" أو "النص".' };
    }

    return { quotes: normalized };
  } catch {
    return { quotes: [], error: 'صيغة JSON غير صحيحة. تأكد من الأقواس وعلامات التنصيص.' };
  }
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fallback
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}
