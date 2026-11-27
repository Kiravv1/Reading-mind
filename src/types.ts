export type TabId = 'home' | 'circle' | 'knowledge' | 'training' | 'simulator';

export type QuoteCategory =
  | 'علم نفس'
  | 'فلسفة'
  | 'قيادة'
  | 'حكمة'
  | 'رواقية'
  | 'تحفيز';

export type QuoteEra =
  | 'قديم'
  | 'إسلامي وكلاسيكي'
  | 'نهضة وتنوير'
  | 'حديث ومعاصر';

export type QuoteVerification =
  | 'موثقة بمصدر'
  | 'منسوبة ولم تُوثق'
  | 'مشكوك في نسبتها';

export interface QuoteItem {
  id: string;
  text: string;
  author: string;
  source: string;
  year: string;
  era: QuoteEra;
  category: QuoteCategory;
  verification: QuoteVerification;
  explanation: string;
}

export type PersonalRelationship =
  | 'أب'
  | 'أم'
  | 'أخ'
  | 'أخت'
  | 'صديق'
  | 'قريب'
  | 'دائرة اجتماعية';

export type ClosenessLevel = 1 | 2 | 3; // 1 = الأقرب, 2 = قريب, 3 = محيط

export interface BehavioralNote {
  id: string;
  date: string;
  text: string;
  context?: string;
}

export interface PersonProfile {
  id: string;
  name: string;
  relationship: PersonalRelationship;
  closeness: ClosenessLevel;
  tags: string[];
  notes: BehavioralNote[];
  /** Question ID (1..40) -> rating 1..5 */
  answers: Record<number, number>;
  /** Optional birthday YYYY-MM-DD or MM-DD */
  birthday?: string;
  /** Optional last contact date YYYY-MM-DD */
  lastContactDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InfluenceLink {
  id: string;
  fromPersonId: string; // 'self' or person.id
  toPersonId: string; // 'self' or person.id
  strength: 'قوي' | 'متوسط' | 'خفيف';
  note: string;
}

export interface BigFiveScores {
  openness: number;
  conscientiousness: number;
  extraversion: number;
  agreeableness: number;
  neuroticism: number;
}

export interface DiscScores {
  D: number;
  I: number;
  S: number;
  C: number;
}

export interface PersonAnalysisReport {
  bigFive: BigFiveScores;
  disc: DiscScores;
  dominantDisc: 'D' | 'I' | 'S' | 'C';
  dominantDiscLabel: string;
  conflictStyle: { name: string; description: string };
  decisionStyle: { name: string; description: string };
  attachmentStyle: { name: string; description: string };
  confidence: {
    score: number;
    level: 'منخفضة' | 'متوسطة' | 'عالية';
    answeredCount: number;
    noteBonus: number;
    explanation: string;
  };
  difficulty: {
    score: number;
    level: 'سهل التعامل' | 'متوسط التحدي' | 'يحتاج حذراً وهدوءاً' | 'مرتفع الصعوبة';
    reasons: string[];
  };
  motivations: string[];
  fears: string[];
  whatBothers: string[];
  whatBringsCloser: string[];
  howToConverse: string[];
  whenToTalk: string[];
  whatToAvoid: string[];
}

export interface DifficultPersonality {
  id: string;
  name: string;
  subtitle: string;
  intensity: 'متوسط' | 'مرتفع' | 'شديد';
  coreDriver: string;
  howTheyThink: string;
  earlySigns: string[];
  typicalTactics: { name: string; explanation: string }[];
  stepByStepPlan: { step: string; detail: string }[];
  readyPhrases: string[]; // 10 phrases
  commonMistakes: string[];
  whenToWalkAway: string[];
}

export interface CognitiveBias {
  id: string;
  number: number;
  name: string;
  englishName: string;
  author: string;
  definition: string;
  example: string;
  howToUse: string;
  howToProtect: string;
  exercise: string;
}

export type KnowledgeSectionKey =
  | 'defenses'
  | 'influence'
  | 'theories'
  | 'bodyLanguage';

export interface KnowledgeCardItem {
  id: string;
  section: KnowledgeSectionKey;
  subGroup: string;
  title: string;
  author: string;
  idea: string;
  example: string;
  exercise: string;
}

export interface SimChoice {
  id: string;
  text: string;
  style: string;
  scoreDelta: number;
  quality: 'optimal' | 'good' | 'weak' | 'trap';
  feedback: string;
  nextNodeId: string | null;
}

export interface SimNode {
  id: string;
  speakerLine: string;
  cue: string;
  choices: SimChoice[];
}

export interface SimulatorScenario {
  id: string;
  personalityId: string;
  personalityName: string;
  relationTag: string;
  title: string;
  context: string;
  goal: string;
  startNodeId: string;
  nodes: Record<string, SimNode>;
}

export interface SimResultRecord {
  scenarioId: string;
  bestScore: number;
  attempts: number;
  lastPlayed: string;
}

export interface MoodEntry {
  id: string;
  date: string;
  timestamp: string;
  level: 1 | 2 | 3 | 4 | 5;
  emotions: string[];
  note: string;
}

export interface CbtEntry {
  id: string;
  date: string;
  situation: string;
  automaticThought: string;
  distortion: string;
  emotion: string;
  intensityBefore: number;
  alternativeThought: string;
  intensityAfter: number;
}

export interface StoicEntry {
  id: string;
  date: string;
  situation: string;
  inMyControl: string;
  outOfControl: string;
  virtuousAction: string;
}

export interface WeeklyEvaluation {
  id: string;
  date: string;
  weekLabel: string;
  scores: {
    emotionalBalance: number;
    boundaries: number;
    presence: number;
    persuasion: number;
    discipline: number;
  };
  note: string;
}

export interface SituationReview {
  id: string;
  date: string;
  personId: string; // person.id or 'general'
  personName: string;
  whatHappened: string;
  whatISaid: string;
  approachUsed: string;
  theirReaction: string;
  outcome: 'نجح' | 'جزئي' | 'لم ينجح';
  whatWorked: string;
  whatAngered: string;
  whatToChange: string;
}

export type PersonalGoalKey =
  | 'calm'
  | 'boundaries'
  | 'empathy'
  | 'presence'
  | 'decisions'
  | 'relationships';

export interface SelfProfileData {
  displayName?: string;
  personalGoal?: PersonalGoalKey;
  bigFiveAnswers: Record<number, number>;
  attachmentAnswers: Record<number, number>;
  eqAnswers: Record<number, number>;
  confidenceAnswers: Record<number, number>;
  discConflictAnswers: Record<number, number>;
  valuesAnswers: Record<number, number>;
  updatedAt: string | null;
}

export interface AppNavigateTarget {
  tab: TabId;
  trainingSubTab?:
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
  circleSubTab?: 'profiles' | 'pretalk' | 'review' | 'guides' | 'map';
  knowledgeSubTab?:
    | 'difficult'
    | 'shield'
    | 'books'
    | 'glossary'
    | 'biases'
    | KnowledgeSectionKey
    | 'favorites';
  simulatorSubTab?: 'scenarios' | 'boundaries' | 'listening' | 'objections';
}

export interface BiasQuizState {
  answers: Record<number, string>; // question id -> chosen option id
  completedAt: string | null;
}

export interface DecisionEntry {
  id: string;
  date: string;
  title: string;
  reasons: string;
  expectedOutcome: string;
  confidence: number; // 10..100
  reviewDate: string; // YYYY-MM-DD
  reviewed: boolean;
  actualOutcome?: string;
  accuracyRating?: number; // 1..5
  lessonLearned?: string;
}

export interface HabitDailyLog {
  date: string; // YYYY-MM-DD
  completedHabits: string[]; // habit IDs
}

export interface VoiceEvalEntry {
  id: string;
  date: string;
  promptTitle: string;
  durationSec: number;
  scores: {
    pace: number; // 1..5
    pauses: number; // 1..5
    clarity: number; // 1..5
    confidence: number; // 1..5
  };
  note: string;
}

export interface AppState {
  version: number;
  ethicsAccepted: boolean;
  customQuotes: QuoteItem[];
  favoriteQuoteIds: string[];
  favoriteKnowledgeIds: string[];
  people: PersonProfile[];
  influenceLinks: InfluenceLink[];
  situationReviews: SituationReview[];
  lastAnalyzedPersonId: string | null;
  selfProfile: SelfProfileData;
  biasQuiz: BiasQuizState;
  decisions: DecisionEntry[];
  habitLogs: HabitDailyLog[];
  voiceEvals: VoiceEvalEntry[];
  completedChallengeDates: string[];
  xpPoints: number;
  moodLogs: MoodEntry[];
  cbtLogs: CbtEntry[];
  stoicLogs: StoicEntry[];
  completedDays: number[];
  streakDays: number;
  lastMissionDate: string | null;
  presenceChecklist: Record<string, boolean>;
  confidenceChecklist: Record<string, boolean>;
  weeklyEvaluations: WeeklyEvaluation[];
  simResults: Record<string, SimResultRecord>;
}
