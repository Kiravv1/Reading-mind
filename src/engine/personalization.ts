import {
  analyzeBiasQuiz,
  BIAS_META,
  BiasKey,
  DAILY_CHALLENGES,
  DailyChallengeItem,
  PERSONAL_GOALS,
  SELF_ATTACHMENT_QS,
  SELF_BIG_FIVE_QS,
  SELF_CONFIDENCE_QS,
  SELF_DISC_CONFLICT_QS,
  SELF_EQ_QS,
  SELF_VALUES_STRESS_QS,
  SelfQuestion,
  TrainingTrackId,
} from '../data/selfAndBiasData';
import {
  AppNavigateTarget,
  AppState,
  BigFiveScores,
  BiasQuizState,
  DiscScores,
  PersonProfile,
  SelfProfileData,
  SituationReview,
} from '../types';
import { analyzePerson } from './analyzer';

// =====================================================================
// TYPES FOR DEEP SELF SYNTHESIS & ADAPTIVE INTERCONNECTED ENGINE
// =====================================================================
export type StressModeKey = 'fight' | 'flight' | 'freeze' | 'fawn';

export interface EqBreakdown {
  overall: number;
  selfAwareness: number;
  selfRegulation: number;
  empathy: number;
  socialSkill: number;
}

export interface CoreValueScore {
  key: 'autonomy' | 'belonging' | 'growth' | 'security' | 'dignity' | 'authenticity';
  label: string;
  score: number;
}

export interface PersonalityArchetype {
  id: string;
  title: string;
  tagline: string;
  summary: string;
  howOthersSeeYou: string;
  whatYouFeelInside: string;
  energyStyle: string;
}

export interface DeepSelfSynthesis {
  answeredCount: number;
  totalQuestions: number;
  completionPct: number;
  moduleProgress: {
    big5: { done: number; total: number };
    attachment: { done: number; total: number };
    eq: { done: number; total: number };
    confidence: { done: number; total: number };
    discConflict: { done: number; total: number };
    valuesStress: { done: number; total: number };
  };
  displayName: string;
  personalGoalLabel: string | null;
  archetype: PersonalityArchetype;
  bigFive: BigFiveScores;
  disc: DiscScores;
  dominantDisc: 'D' | 'I' | 'S' | 'C';
  dominantDiscLabel: string;
  attachment: {
    key: 'secure' | 'anxious' | 'avoidant' | 'fearful';
    name: string;
    description: string;
    anxiousScore: number;
    avoidantScore: number;
    secureScore: number;
  };
  eq: EqBreakdown;
  confidenceScore: number;
  conflictStyle: { name: string; description: string };
  decisionStyle: { name: string; description: string };
  stressResponse: {
    key: StressModeKey;
    name: string;
    description: string;
    antidote: string;
    scores: Record<StressModeKey, number>;
  };
  coreValues: CoreValueScore[];
  strengths: string[];
  blindSpots: string[];
  triggers: string[];
  manipulationVulnerabilities: { tacticId: string; tacticName: string; reason: string }[];
  communicationBlueprint: {
    whenListening: string;
    whenDisagreeing: string;
    whenSettingBoundaries: string;
    whenStressed: string;
  };
  topBiases: { key: BiasKey; name: string; pct: number; howToOvercome: string }[];
}

export interface TrainingTrackRecommendation {
  id: TrainingTrackId;
  title: string;
  shortTitle: string;
  priority: number; // 0..100
  urgencyLabel: 'أولوية قصوى' | 'مسار داعم' | 'تعزيز مستمر';
  reason: string;
  primaryActionLabel: string;
  primaryTarget: AppNavigateTarget;
  secondaryActionLabel: string;
  secondaryTarget: AppNavigateTarget;
}

export interface AdaptiveTrainingPlan {
  isPersonalized: boolean;
  headline: string;
  rationaleSummary: string;
  tracks: TrainingTrackRecommendation[];
  primaryTrack: TrainingTrackRecommendation;
  secondaryTrack: TrainingTrackRecommendation;
  priorityDays: { day: number; trackId: TrainingTrackId; reason: string }[];
  recommendedSoundId: string;
  recommendedSoundTitle: string;
  recommendedSoundReason: string;
  recommendedHabitId: string;
  recommendedHabitLabel: string;
  recommendedHabitReason: string;
  recommendedSimScenarioIds: string[];
  recommendedSimTab: 'scenarios' | 'boundaries' | 'listening' | 'objections';
  recommendedSimReason: string;
  vulnerableTacticIds: string[];
  recommendedBookIds: { id: string; reason: string }[];
}

export interface PairCompatibilityReport {
  harmonyPct: number;
  harmonyLabel: string;
  dynamicTitle: string;
  sharedStrengths: string[];
  frictionPoints: string[];
  yourWatchOut: string;
  goldenRule: string;
  provenBestApproach: { name: string; rate: number; count: number } | null;
}

// =====================================================================
// HELPER CALCULATORS
// =====================================================================
function calcDim(
  qs: SelfQuestion[],
  answers: Record<number, number> | undefined,
  dim: string,
  useSub = false
): number {
  const safe = answers || {};
  const filtered = qs.filter((q) => (useSub ? q.subDimension === dim : q.dimension === dim));
  let sum = 0;
  let count = 0;
  for (const q of filtered) {
    const raw = safe[q.id];
    if (typeof raw === 'number' && raw >= 1 && raw <= 5) {
      sum += q.reverse ? 6 - raw : raw;
      count++;
    }
  }
  if (count === 0) return 50;
  return Math.round(((sum / count - 1) / 4) * 100);
}

const DISC_LABELS: Record<'D' | 'I' | 'S' | 'C', string> = {
  D: 'حاسم ومبادر (D)',
  I: 'مؤثر ودافئ اجتماعياً (I)',
  S: 'هادئ ومسالم ومخلص (S)',
  C: 'تحليلي ودقيق ومنهجي (C)',
};

function resolveArchetype(
  b5: BigFiveScores,
  domDisc: 'D' | 'I' | 'S' | 'C',
  eq: number,
  conf: number,
  attachKey: 'secure' | 'anxious' | 'avoidant' | 'fearful'
): PersonalityArchetype {
  if (domDisc === 'C' || (b5.openness >= 62 && b5.conscientiousness >= 60 && b5.extraversion <= 55)) {
    return {
      id: 'calm_analyst',
      title: 'الحكيم التحليلي العميق',
      tagline: 'ترى التفاصيل التي يفوتها الآخرون وتبحث عن المعنى والوضوح قبل الفعل',
      summary:
        'تجمع بين عمق التفكير ودقة الملاحظة؛ لا تحب السطحية ولا القرارات المتعجلة، وتبني ثقتك بالناس على المواقف الحقيقية لا الكلام الجميل.',
      howOthersSeeYou:
        'شخص رزين، عاقل، يُعتمد على رأيه في المواقف المعقدة، وأحياناً قد يظنك البعض متحفظاً أو شديد الحذر في البداية.',
      whatYouFeelInside:
        'تحمل بداخلك حواراً ذهنياً نشطاً جداً؛ تحلّل كلام الناس وتبحث عن الاتساق، وقد تتعب عندما يحيط بك ضجيج أو عشوائية عاطفية.',
      energyStyle:
        b5.extraversion >= 58
          ? 'طاقتك متوازنة بين العمق الفردي والحوارات الثنائية الهادفة.'
          : 'تُشحن طاقتك في الخلوة الهادئة والتفكير الصافي أكثر من التجمعات الصاخبة.',
    };
  }

  if (b5.agreeableness >= 65 && (b5.neuroticism >= 58 || attachKey === 'anxious' || conf < 58)) {
    return {
      id: 'empathetic_guardian',
      title: 'الحارس المتعاطف الحسّاس',
      tagline: 'قلبك واسع ورادارك العاطفي دقيق، وتحتاج لحماية طاقتك بحدود واضحة',
      summary:
        'تمتلك قدرة فطرية على الإحساس بمشاعر عائلتك وأصدقائك وتخفيف توترهم، لكنك أحياناً تتحمل هموم غيرك فوق طاقتك أو تتأثر طويلاً بالتجاهل والنقد.',
      howOthersSeeYou:
        'شخص دافئ، مخلص، آمن للفضفضة، ويُعتمد على طيبته ووقوفه مع الجميع في الأوقات الصعبة.',
      whatYouFeelInside:
        'تتمنى أحياناً لو يفهمك أحد دون أن تضطر للشرح، وتخشى أن يزعج وضعك للحدود من تحبهم فتؤجّل حماية راحتك.',
      energyStyle:
        'تستنزفك الأجواء المشحونة والعتاب الصامت، وتُشحن طاقتك بالسكينة والتقدير الصادق والوضوح العاطفي.',
    };
  }

  if (domDisc === 'D' || (conf >= 68 && b5.conscientiousness >= 60)) {
    return {
      id: 'decisive_pillar',
      title: 'القائد الحاسم المتماسك',
      tagline: 'واضح الوجهة، تتحمل المسؤولية وتفضّل الحلول العملية على الدوران',
      summary:
        'تملك عزيمة عالية وحضوراً قوياً؛ حين يرتبك الآخرون تميل أنت لترتيب الصورة واتخاذ القرار. وتكمن قوتك العظمى حين تمزج هذا الحسم بالإنصات الدافئ.',
      howOthersSeeYou:
        'شخص قوي، حازم، لا يُستغل بسهولة، وقد يراك البعض شديد المباشرة حين تتكلم بعجلة أو تحت الضغط.',
      whatYouFeelInside:
        'تحب أن تكون الأمور واضحة وعادلة، ويضغط عليك شعورك الدائم بضرورة ضبط كل شيء وعدم إظهار التعب.',
      energyStyle:
        'تُشحن بالإنجاز الواضح والاحترام المتبادل، وتُستنزف من المماطلة والدراما المتكررة بلا حلول.',
    };
  }

  if (domDisc === 'I' || (b5.extraversion >= 65 && b5.agreeableness >= 58)) {
    return {
      id: 'warm_catalyst',
      title: 'المبادر الدافئ المؤثّر',
      tagline: 'حضورك يحيي الجلسات وتقنع القلوب بروحك المتفاعلة والمرنة',
      summary:
        'تستمد حيويتك من القرب الإنساني وتبادل الأفكار، وتجيد كسر الجليد وتلطيف الخلافات. حين تدعم هذه العفوية بانضباط هادئ واستماع عميق يصبح تأثيرك استثنائياً.',
      howOthersSeeYou:
        'شخص مرح، قريب من القلب، سريع البديهة، يبعث الأمل والحماس في من حوله.',
      whatYouFeelInside:
        'تقدّر التفاعل والتقدير، وقد تتضايق بصمت من البرود المفاجئ أو التفاصيل الروتينية الطويلة.',
      energyStyle:
        'تُشحن بالصحبة الصادقة والأحاديث الملهمة، وتحتاج بين الحين والآخر لوقفة هدوء لترتيب أولوياتك.',
    };
  }

  if (attachKey === 'avoidant' || (b5.extraversion <= 42 && b5.agreeableness <= 55)) {
    return {
      id: 'deep_independent',
      title: 'المستقل العميق الهادئ',
      tagline: 'تعتز بمساحتك واستقلالك وتتعامل مع الحياة بهدوء واتزان',
      summary:
        'لا تنجرف بسهولة خلف ضغط الجماعة وتفضل حل مشاكلك بهدوء وبنفسك. وتتسع علاقاتك عمقاً حين تسمح لأقرب الناس برؤية مشاعرك بدلاً من حملها وحدك.',
      howOthersSeeYou:
        'شخص هادئ، مكتفٍ بذاته، لا يكثر الشكوى، وقد يفسّر البعض صمتك أحياناً على أنه مسافة عاطفية.',
      whatYouFeelInside:
        'تقدّر الهدوء والحرية، وتنفر من الفضول الزائد أو المحاصرة بالأسئلة حين تحتاج لوقت تعيد فيه ترتيب أفكارك.',
      energyStyle:
        'تُشحن بالمساحة الشخصية والأنشطة الفردية الهادئة، وتُستنزف من العلاقات المتطلبة أو الفوضوية.',
    };
  }

  if (eq >= 65 && b5.neuroticism <= 45) {
    return {
      id: 'balanced_sage',
      title: 'المُصلِح المتزن والهادئ',
      tagline: 'تجمع بين الوعي العاطفي والهدوء الداخلي في إدارة نفسك وعلاقاتك',
      summary:
        'تملك بوصلة داخلية متوازنة تسمح لك برؤية مشاعرك ومشاعر الآخرين بوضوح دون أن تجرفك الموجة. وجودك في العائلة والصحبة يخلق طمأنينة واتزاناً.',
      howOthersSeeYou:
        'شخص ناضج، مستمع جيد، يحفظ أسراره وأسرار غيره، ويميل إلى الحلول العادلة لا الانفعال.',
      whatYouFeelInside:
        'تسعى للاتساق بين قيمك وتصرفاتك، وتحتاج أحياناً للتذكير بأنك لست مسؤولاً عن إصلاح كل خلاف حولك.',
      energyStyle:
        'تُشحن بالحوارات الصادقة والعادات اليومية المنتظمة وتصفية الذهن.',
    };
  }

  return {
    id: 'evolving_explorer',
    title: 'المستكشف الواعي لذاته',
    tagline: 'شخصية مرنة في مرحلة نمو وتشكيل وعي أعمق بالذات والعلاقات',
    summary:
      'تمتلك مرونة تسمح لك بالتكيّف مع أنماط مختلفة من الناس، وكلما أكملت اختبارات «ملفي أنا» ازدادت دقة الخريطة التي يرسمها التطبيق لطباعك وتدريبك.',
    howOthersSeeYou:
      'شخص متوازن وقابل للتفاهم، يجمع بين الهدوء والفضول لفهم ما يجري حوله.',
    whatYouFeelInside:
      'لديك رغبة صادقة في فهم نفسك بعمق وبناء علاقات أكثر راحة ووضوحاً دون ضغوط خفية.',
    energyStyle:
      'تُشحن بالتعلّم الهادف والعلاقات الصادقة الخالية من التصنّع.',
  };
}

// =====================================================================
// 1. DEEP SELF SYNTHESIS
// =====================================================================
export function analyzeDeepSelf(
  selfProfile: SelfProfileData,
  biasQuiz?: BiasQuizState
): DeepSelfSynthesis {
  const b5Ans = selfProfile.bigFiveAnswers || {};
  const attAns = selfProfile.attachmentAnswers || {};
  const eqAns = selfProfile.eqAnswers || {};
  const confAns = selfProfile.confidenceAnswers || {};
  const dcAns = selfProfile.discConflictAnswers || {};
  const valAns = selfProfile.valuesAnswers || {};

  const moduleProgress = {
    big5: { done: Object.keys(b5Ans).length, total: SELF_BIG_FIVE_QS.length },
    attachment: { done: Object.keys(attAns).length, total: SELF_ATTACHMENT_QS.length },
    eq: { done: Object.keys(eqAns).length, total: SELF_EQ_QS.length },
    confidence: { done: Object.keys(confAns).length, total: SELF_CONFIDENCE_QS.length },
    discConflict: { done: Object.keys(dcAns).length, total: SELF_DISC_CONFLICT_QS.length },
    valuesStress: { done: Object.keys(valAns).length, total: SELF_VALUES_STRESS_QS.length },
  };

  const totalQuestions =
    moduleProgress.big5.total +
    moduleProgress.attachment.total +
    moduleProgress.eq.total +
    moduleProgress.confidence.total +
    moduleProgress.discConflict.total +
    moduleProgress.valuesStress.total;

  const answeredCount =
    moduleProgress.big5.done +
    moduleProgress.attachment.done +
    moduleProgress.eq.done +
    moduleProgress.confidence.done +
    moduleProgress.discConflict.done +
    moduleProgress.valuesStress.done;

  const completionPct = Math.round((answeredCount / totalQuestions) * 100);

  const bigFive: BigFiveScores = {
    openness: calcDim(SELF_BIG_FIVE_QS, b5Ans, 'openness'),
    conscientiousness: calcDim(SELF_BIG_FIVE_QS, b5Ans, 'conscientiousness'),
    extraversion: calcDim(SELF_BIG_FIVE_QS, b5Ans, 'extraversion'),
    agreeableness: calcDim(SELF_BIG_FIVE_QS, b5Ans, 'agreeableness'),
    neuroticism: calcDim(SELF_BIG_FIVE_QS, b5Ans, 'neuroticism'),
  };

  // Blend explicit DISC answers with Big Five fallback when DISC module not yet answered
  const hasDisc = moduleProgress.discConflict.done > 0;
  const disc: DiscScores = {
    D: hasDisc
      ? calcDim(SELF_DISC_CONFLICT_QS, dcAns, 'D')
      : Math.round(bigFive.extraversion * 0.4 + (100 - bigFive.agreeableness) * 0.4 + bigFive.conscientiousness * 0.2),
    I: hasDisc
      ? calcDim(SELF_DISC_CONFLICT_QS, dcAns, 'I')
      : Math.round(bigFive.extraversion * 0.6 + bigFive.openness * 0.25 + bigFive.agreeableness * 0.15),
    S: hasDisc
      ? calcDim(SELF_DISC_CONFLICT_QS, dcAns, 'S')
      : Math.round(bigFive.agreeableness * 0.55 + (100 - bigFive.neuroticism) * 0.25 + (100 - bigFive.extraversion) * 0.2),
    C: hasDisc
      ? calcDim(SELF_DISC_CONFLICT_QS, dcAns, 'C')
      : Math.round(bigFive.conscientiousness * 0.6 + bigFive.openness * 0.2 + (100 - bigFive.extraversion) * 0.2),
  };

  const dominantDisc = (['D', 'I', 'S', 'C'] as const).reduce((best, k) =>
    disc[k] > disc[best] ? k : best
  );

  // Attachment
  const anxiousScore = calcDim(SELF_ATTACHMENT_QS, attAns, 'anxious');
  const avoidantScore = calcDim(SELF_ATTACHMENT_QS, attAns, 'avoidant');
  const secureScore = calcDim(SELF_ATTACHMENT_QS, attAns, 'secure');

  let attachment: DeepSelfSynthesis['attachment'] = {
    key: 'secure',
    name: 'تعلق آمن متوازن',
    description: 'تجمع بين الدفء في العلاقات واحترام حدودك وحدود الآخرين، وتتعامل مع الخلافات بمرونة ونضج.',
    anxiousScore,
    avoidantScore,
    secureScore,
  };
  if (anxiousScore >= 58 && avoidantScore >= 58) {
    attachment = {
      key: 'fearful',
      name: 'تعلق متذبذب (قلق وتجنبي معاً)',
      description: 'تتوق بشدة للقرب والأمان لكنك تخشى الأذى في الوقت ذاته، مما يجعلك تقترب ثم تنسحب عند التوتر.',
      anxiousScore,
      avoidantScore,
      secureScore,
    };
  } else if (anxiousScore >= 58 && anxiousScore >= secureScore) {
    attachment = {
      key: 'anxious',
      name: 'تعلق قلق (باحث عن الطمأنة)',
      description: 'تملك قلباً مخلصاً وحساساً للتفاصيل، لكنك قد تقلق بسرعة من التغيرات البسيطة في نبرة أو تواصل المقربين.',
      anxiousScore,
      avoidantScore,
      secureScore,
    };
  } else if (avoidantScore >= 58 && avoidantScore >= secureScore) {
    attachment = {
      key: 'avoidant',
      name: 'تعلق تجنبي (مستقل بزيادة)',
      description: 'تعتز باستقلاليتك وقدرتك على حل أمورك بنفسك، لكنك قد تغلق بابك العاطفي سريعاً عند تصاعد الضغط.',
      anxiousScore,
      avoidantScore,
      secureScore,
    };
  }

  // EQ 4 Pillars
  const eq: EqBreakdown = {
    overall: calcDim(SELF_EQ_QS, eqAns, 'eq'),
    selfAwareness: calcDim(SELF_EQ_QS, eqAns, 'self_awareness', true),
    selfRegulation: calcDim(SELF_EQ_QS, eqAns, 'self_regulation', true),
    empathy: calcDim(SELF_EQ_QS, eqAns, 'empathy', true),
    socialSkill: calcDim(SELF_EQ_QS, eqAns, 'social_skill', true),
  };

  const confidenceScore = calcDim(SELF_CONFIDENCE_QS, confAns, 'conf');

  // Conflict style
  const confront = calcDim(SELF_DISC_CONFLICT_QS, dcAns, 'conflict_confront');
  const appease = calcDim(SELF_DISC_CONFLICT_QS, dcAns, 'conflict_appease');
  let conflictStyle = {
    name: 'تعاوني وباحث عن حل متوازن',
    description: 'تسعى لحفظ كرامة الطرفين والوصول لحل عملي يرضي العلاقة دون صدام ولا تنازل مؤذٍ.',
  };
  if (appease >= 65 && confidenceScore < 62) {
    conflictStyle = {
      name: 'مسترضٍ ومُؤجّل للخلاف',
      description: 'تميل لابتلاع انزعاجك أو التنازل سريعاً حفاظاً على الجو العام، ثم يتراكم الضغط داخلك لاحقاً.',
    };
  } else if (confront >= 68 && bigFive.agreeableness < 55) {
    conflictStyle = {
      name: 'مواجه ومباشر بحسم',
      description: 'لا تحب المواربة وتفضّل وضع النقاط على الحروف فوراً، وتحتاج لمراقبة حدّة النبرة وقت الغضب.',
    };
  } else if (avoidantScore >= 60) {
    conflictStyle = {
      name: 'منسحب وهادئ لتبريد الجو',
      description: 'تبتعد عند ارتفاع الأصوات لحماية هدوئك، لكن إطالة الصمت دون عودة للحوار قد تترك الخلاف معلقاً.',
    };
  }

  // Decision style
  const analytical = calcDim(SELF_DISC_CONFLICT_QS, dcAns, 'decision_analytical');
  const hesitant = calcDim(SELF_DISC_CONFLICT_QS, dcAns, 'decision_hesitant');
  let decisionStyle = {
    name: 'متوازن بين المنطق والحدس',
    description: 'تجمع المعطيات الأساسية ثم تستشير إحساسك وقيمك قبل الحسم.',
  };
  if (hesitant >= 62 || (bigFive.neuroticism >= 62 && confidenceScore < 58)) {
    decisionStyle = {
      name: 'حذر ومتردد خشية الندم',
      description: 'تقلّب الاحتمالات كثيراً خوفاً من الخطأ أو إزعاج أحد، مما يستهلك طاقتك قبل التحرك.',
    };
  } else if (analytical >= 68 || dominantDisc === 'C') {
    decisionStyle = {
      name: 'تحليلي منهجي',
      description: 'تبني قراراتك على الأدلة والمقارنة الدقيقة وتحب الوضوح والخطط المسبقة.',
    };
  } else if (dominantDisc === 'D' || dominantDisc === 'I') {
    decisionStyle = {
      name: 'حدسي وسريع الحسم',
      description: 'تلتقط الصورة الكبرى بسرعة وتتحرك بثقة، وتستفيد من مراجعة التفاصيل المهمة قبل القرارات الكبرى.',
    };
  }

  // Stress response (4F)
  const hasValStress = moduleProgress.valuesStress.done > 0;
  const stressScores: Record<StressModeKey, number> = {
    fight: hasValStress
      ? calcDim(SELF_VALUES_STRESS_QS, valAns, 'stress_fight')
      : Math.round((100 - bigFive.agreeableness) * 0.55 + disc.D * 0.45),
    flight: hasValStress
      ? calcDim(SELF_VALUES_STRESS_QS, valAns, 'stress_flight')
      : Math.round(avoidantScore * 0.6 + bigFive.neuroticism * 0.4),
    freeze: hasValStress
      ? calcDim(SELF_VALUES_STRESS_QS, valAns, 'stress_freeze')
      : Math.round((100 - confidenceScore) * 0.55 + bigFive.neuroticism * 0.45),
    fawn: hasValStress
      ? calcDim(SELF_VALUES_STRESS_QS, valAns, 'stress_fawn')
      : Math.round(bigFive.agreeableness * 0.55 + (100 - confidenceScore) * 0.45),
  };

  const topStressKey = (['fawn', 'freeze', 'flight', 'fight'] as StressModeKey[]).reduce((best, k) =>
    stressScores[k] > stressScores[best] ? k : best
  );

  const STRESS_META: Record<StressModeKey, { name: string; description: string; antidote: string }> = {
    fight: {
      name: 'استجابة القتال والاندفاع',
      description: 'عند الاستفزاز تميل للرد السريع أو رفع النبرة لحماية موقفك وكرامتك فوراً.',
      antidote: 'قاعدة الـ3 ثوانٍ وزفير طويل قبل أول كلمة؛ هيبتك في هدوئك لا في سرعة ردك.',
    },
    flight: {
      name: 'استجابة الهروب والانسحاب',
      description: 'عند التوتر ترغب في مغادرة الموقف أو الانشغال بعيداً حتى يهدأ الضغط.',
      antidote: 'سمِّ حاجتك للهدوء بجملة محترمة («أحتاج 15 دقيقة لأفكر بهدوء وسأعود لك») بدلاً من الاختفاء الصامت.',
    },
    freeze: {
      name: 'استجابة التجمّد والصمت',
      description: 'عند الضغط المفاجئ يتوقف تدفق الكلمات وتجد الرد المثالي فقط بعد انتهاء الموقف.',
      antidote: 'احفظ جملة مهلة جاهزة («نقطة مهمة، سأفكر فيها وأرد عليك لاحقاً») لتفك التجمّد فوراً.',
    },
    fawn: {
      name: 'استجابة الإرضاء السريع',
      description: 'عند التوتر تميل للموافقة أو الاعتذار السريع لتهدئة الطرف الآخر على حساب راحتك.',
      antidote: 'توقّف قبل قول «نعم» وذكّر نفسك: «يمكنني أن أكون لطيفاً وحازماً في الوقت نفسه».',
    },
  };

  // Core values ranked
  const coreValues: CoreValueScore[] = (
    [
      { key: 'autonomy', dim: 'val_autonomy', label: 'الاستقلالية وحرية القرار' },
      { key: 'belonging', dim: 'val_belonging', label: 'العائلة والانتماء والدفء' },
      { key: 'growth', dim: 'val_growth', label: 'النمو والوعي العميق' },
      { key: 'security', dim: 'val_security', label: 'الطمأنينة والاستقرار' },
      { key: 'dignity', dim: 'val_dignity', label: 'الكرامة والاحترام المتبادل' },
      { key: 'authenticity', dim: 'val_authenticity', label: 'الصدق والإنصاف' },
    ] as const
  )
    .map((v) => ({
      key: v.key,
      label: v.label,
      score: calcDim(SELF_VALUES_STRESS_QS, valAns, v.dim),
    }))
    .sort((a, b) => b.score - a.score);

  const archetype = resolveArchetype(bigFive, dominantDisc, eq.overall, confidenceScore, attachment.key);

  // Rich Strengths
  const strengths: string[] = [];
  if (bigFive.openness >= 64) strengths.push('عقل منفتح وفضول عميق يمنحك قدرة رائعة على فهم الطبائع المعقدة.');
  if (bigFive.conscientiousness >= 64) strengths.push('موثوقية وانضباط عالٍ يجعل كلمتك محل ثقة واحترام في عائلتك وصحبتك.');
  if (bigFive.agreeableness >= 64) strengths.push('دفء وتعاطف طبيعي يجعلك ملاذاً آمناً ومُهدئاً للتوترات.');
  if (bigFive.neuroticism <= 42) strengths.push('ثبات انفعالي مميز يحفظ اتزانك حين تنفعل الأجواء حولك.');
  if (eq.empathy >= 68) strengths.push('رادار عاطفي قوي في التقاط ما وراء الكلمات ونبرة الصوت.');
  if (eq.selfRegulation >= 68) strengths.push('قدرة ناضجة على ضبط ردة الفعل واختيار الاستجابة الحكيمة.');
  if (confidenceScore >= 68) strengths.push('ثقة صحية وحضور واضح في الدفاع عن حدودك دون عدوانية.');
  if (strengths.length === 0) {
    strengths.push('وعيك الذاتي وإقبالك الصادق على اكتشاف طباعك هما أقوى نقطة انطلاق للنمو.');
  }

  // Rich Blind Spots
  const blindSpots: string[] = [];
  if (bigFive.agreeableness >= 66 && confidenceScore < 62) {
    blindSpots.push('الميل لإرضاء المقربين على حساب راحتك قد يراكم داخلك ضيقاً صامتاً ينفجر متأخراً.');
  }
  if (bigFive.agreeableness <= 45 || dominantDisc === 'D') {
    blindSpots.push('صراحتك وحسمك المباشر قد يُقرأ كقسوة أو جفاف لدى الأشخاص الحساسين رغم صفاء نيتك.');
  }
  if (bigFive.neuroticism >= 60) {
    blindSpots.push('التفكير المفرط بعد المواقف قد يضخّم تفاصيل صغيرة ويصنع سيناريوهات غير حقيقية.');
  }
  if (attachment.key === 'anxious' || attachment.key === 'fearful') {
    blindSpots.push('الحساسية لتأخر الردود أو برود النبرة قد تدفعك للتفسير السلبي أو العتاب السريع قبل التثبت.');
  }
  if (attachment.key === 'avoidant' || attachment.key === 'fearful') {
    blindSpots.push('الانسحاب الصامت لحماية نفسك قد يراه أحبتك تجاهلاً أو قلة اهتمام.');
  }
  if (eq.selfRegulation < 55) {
    blindSpots.push('الاستجابة السريعة وقت الإرهاق أو الاستفزاز قد تُضيع عليك حقك رغم أنك على صواب.');
  }
  if (blindSpots.length === 0) {
    blindSpots.push('انتبه لأوقات الإرهاق الجسدي وقلة النوم؛ فهي اللحظات التي تنخفض فيها مرونة أكثر الناس اتزاناً.');
  }

  // Triggers
  const triggers: string[] = [];
  if (bigFive.neuroticism >= 55 || anxiousScore >= 56) {
    triggers.push('التجاهل أو الغموض المفاجئ من شخص مقرب دون توضيح.');
  }
  if (bigFive.conscientiousness >= 60 || dominantDisc === 'C') {
    triggers.push('الفوضى، إخلاف الوعود، أو التحدث بعشوائية ومبالغة بلا أدلة.');
  }
  if (confidenceScore < 62) {
    triggers.push('التقليل من رأيك أو السخرية منك أمام الآخرين.');
  }
  if (avoidantScore >= 56 || coreValues[0]?.key === 'autonomy') {
    triggers.push('التحكم في قراراتك أو محاصرتك بالأسئلة حين تحتاج لهدوءك.');
  }
  if (bigFive.agreeableness >= 60) {
    triggers.push('الجحود واستغلال طيبتك أو الضغط عليك بالذنب لتتنازل.');
  }
  triggers.push('المقاطعة المستمرة وتحريف كلامك خارج قصده الحقيقي.');

  // Manipulation Vulnerabilities (Directly interconnected with Knowledge -> Shield!)
  const manipulationVulnerabilities: { tacticId: string; tacticName: string; reason: string }[] = [];
  if (bigFive.agreeableness >= 60 || topStressKey === 'fawn' || confidenceScore < 62) {
    manipulationVulnerabilities.push({
      tacticId: 'guilt_tripping',
      tacticName: 'التلاعب بالذنب',
      reason: 'لأن قلبك يقدّر العلاقات ويكره إزعاج من يحب، قد يستغل المتلاعب ذلك ليجعلك تتنازل عن حدودك.',
    });
  }
  if (anxiousScore >= 55 || bigFive.neuroticism >= 58) {
    manipulationVulnerabilities.push({
      tacticId: 'silent_treatment',
      tacticName: 'المعاملة الصامتة',
      reason: 'حساسيتك للبرود والغموض تجعل الصمت العقابي مؤلماً لك ويدفعك للمبادرة بالاعتذار حتى لو لم تخطئ.',
    });
  }
  if (confidenceScore < 60 || eq.selfAwareness < 58 || hesitant >= 60) {
    manipulationVulnerabilities.push({
      tacticId: 'gaslighting',
      tacticName: 'الإضاءة الغازية (التشكيك في الواقع)',
      reason: 'ميلك لمراجعة نفسك وتقبّل احتمال خطئك قد يستغله المتلاعب ليجعلك تشك في ذاكرتك وحكمك.',
    });
  }
  if (dominantDisc === 'I' || anxiousScore >= 56) {
    manipulationVulnerabilities.push({
      tacticId: 'love_bombing',
      tacticName: 'القصف بالحب والمديح المفرط',
      reason: 'تقديرك الكبير للدفء والقبول قد يجعلك تفتح ثقتك بسرعة لمن يبالغ في الإطراء المبكر.',
    });
  }
  if (hesitant >= 58 || topStressKey === 'freeze') {
    manipulationVulnerabilities.push({
      tacticId: 'time_pressure',
      tacticName: 'الضغط بالوقت والاستعجال',
      reason: 'الاستعجال المتعمّد يربك تفكيرك الهادئ ويدفعك للموافقة قبل أن تراجع خياراتك بوضوح.',
    });
  }
  if (manipulationVulnerabilities.length < 2) {
    manipulationVulnerabilities.push({
      tacticId: 'deflection_distortion',
      tacticName: 'التضليل وتغيير المسار',
      reason: 'حتى أصحاب الثقة العالية قد يُستدرجون للجدال في تفاصيل جانبية تُنسيهم النقطة الأساسية.',
    });
  }

  // Personal Communication Blueprint
  const communicationBlueprint = {
    whenListening:
      eq.empathy >= 65
        ? 'استمر في قوة إنصاتك الدافئ، وتذكّر فقط ألا تحمل مشاعر الآخرين كعبء شخصي بعد انتهاء الجلسة.'
        : 'ركّز على عكس الشعور بجملة قصيرة («يبدو أن هذا أرهقك فعلاً») قبل تقديم أي نصيحة أو حل منطقي.',
    whenDisagreeing:
      dominantDisc === 'D' || topStressKey === 'fight'
        ? 'اخفض سرعة صوتك 20% وابدأ بنقطة اتفاق صغيرة قبل طرح رأيك المخالف حتى لا يُفهم حسمك كهجوم.'
        : 'عبّر عن رأيك بوضوح من أول مرة بصيغة «أنا أرى / أفضّل» بدلاً من الصمت ثم التراكم.',
    whenSettingBoundaries:
      confidenceScore < 62 || topStressKey === 'fawn'
        ? 'استخدم قاعدة الجملة الواحدة دون تبرير طويل: «أقدّر طلبك، لكن لا أستطيع تنفيذ ذلك حالياً».'
        : 'اربط حدّك الحازم بلمسة ودّ مختصرة ليصل الوضوح مع الحفاظ على دفء العلاقة.',
    whenStressed: STRESS_META[topStressKey].antidote,
  };

  // Pull top biases from Bias Quiz if answered
  const biasRes = biasQuiz ? analyzeBiasQuiz(biasQuiz.answers || {}) : null;
  const topBiases =
    biasRes && biasRes.answeredCount >= 3
      ? biasRes.rankedBiases
          .filter((b) => b.count > 0)
          .slice(0, 3)
          .map((b) => ({
            key: b.key,
            name: BIAS_META[b.key].name,
            pct: b.pct,
            howToOvercome: BIAS_META[b.key].howToOvercome,
          }))
      : [];

  const goalMeta = PERSONAL_GOALS.find((g) => g.key === selfProfile.personalGoal);

  return {
    answeredCount,
    totalQuestions,
    completionPct,
    moduleProgress,
    displayName: (selfProfile.displayName || '').trim(),
    personalGoalLabel: goalMeta ? goalMeta.label : null,
    archetype,
    bigFive,
    disc,
    dominantDisc,
    dominantDiscLabel: DISC_LABELS[dominantDisc],
    attachment,
    eq,
    confidenceScore,
    conflictStyle,
    decisionStyle,
    stressResponse: {
      key: topStressKey,
      ...STRESS_META[topStressKey],
      scores: stressScores,
    },
    coreValues,
    strengths: strengths.slice(0, 5),
    blindSpots: blindSpots.slice(0, 5),
    triggers: triggers.slice(0, 5),
    manipulationVulnerabilities: manipulationVulnerabilities.slice(0, 3),
    communicationBlueprint,
    topBiases,
  };
}

// =====================================================================
// 2. ADAPTIVE TRAINING PLAN ENGINE (التدريب يتحدد بدقة حسب شخصيتك!)
// =====================================================================
const TRACK_DAYS_MAP: Record<TrainingTrackId, { day: number; reason: string }[]> = {
  calm: [
    { day: 1, reason: 'بناء خط الأساس لمزاجك وملاحظة محفزات التوتر مبكراً' },
    { day: 2, reason: 'تنفس الصندوق لتهدئة الجهاز العصبي خلال دقيقة' },
    { day: 4, reason: 'فصل ما بيدك عما ليس بيدك لوقف الاستنزاف الذهني' },
    { day: 9, reason: 'تفكيك الأفكار التلقائية والتفكير المفرط بأسلوب CBT' },
    { day: 14, reason: 'التأريض السريع 5-4-3-2-1 للعودة للهدوء الفوري' },
    { day: 26, reason: 'الاستعداد الذهني الرواقي للمواقف المزعجة قبل حدوثها' },
  ],
  boundaries: [
    { day: 5, reason: 'قول «لا» بلطف وحزم دون شعور بالذنب أو تبرير طويل' },
    { day: 11, reason: 'تطبيق صيغة DESC للحزم الهادئ في المواقف العائلية' },
    { day: 16, reason: 'تقنية الاسطوانة المشروخة لصد الإلحاح المتكرر بهدوء' },
    { day: 21, reason: 'التحرر من رهبة الرفض وتقوية استقلالك النفسي' },
    { day: 28, reason: 'الثبات والهدوء عند المقاطعة والاستفزاز' },
  ],
  empathy: [
    { day: 3, reason: 'الإنصات العميق وتسمية مشاعر من تتحدث معه قبل الرد' },
    { day: 6, reason: 'تقنية المرآة (Voss) لفتح القلوب دون استجواب' },
    { day: 12, reason: 'قراءة لغة الجسد وملاحظة التغير عن خط الأساس' },
    { day: 17, reason: 'استبدال أسئلة «لماذا» الدفاعية بأسئلة معايِرة هادئة' },
    { day: 20, reason: 'التعاطف التكتيكي للوصول لجملة «هذا صحيح»' },
  ],
  presence: [
    { day: 7, reason: 'روتين المرآة اليومي لبناء الوقفة المتزنة والهيبة الهادئة' },
    { day: 10, reason: 'ضبط نبرة الصوت والإبطاء المدروس واستخدام التوقف الصامت' },
    { day: 18, reason: 'التواصل البصري المريح والإيماءات المفتوحة الواثقة' },
    { day: 23, reason: 'تمرين الخطابة المصغّرة 60 ثانية لصياغة فكرتك بثبات' },
    { day: 27, reason: 'بناء القصة الصادقة المؤثرة في 4 خطوات' },
  ],
  decisions: [
    { day: 8, reason: 'رصد انحيازاتك الذهنية اليومية قبل حسم الأحكام' },
    { day: 15, reason: 'التحقق من الأدلة وفصل الظن عن الحقيقة' },
    { day: 22, reason: 'تدقيق المخاوف المسبق قبل عرض قرار حساس على الأسرة' },
    { day: 24, reason: 'فحص 5 انحيازات معرفية وآليات دفاع تؤثر في قراراتك' },
    { day: 30, reason: 'صياغة ميثاقك الشخصي للقرارات والعلاقات المتزنة' },
  ],
  relationships: [
    { day: 13, reason: 'تحليل ملف شخص مقرب لفهم دوافعه ومخاوفه بعمق' },
    { day: 19, reason: 'تقدير محدد وصادق يعمّق الثقة والود في دائرتك' },
    { day: 25, reason: 'رسم خريطة الدائرة وفهم ديناميكيات التأثير حولك' },
    { day: 29, reason: 'تطبيق عملي متكامل في محاكي الحوارات الصعبة' },
  ],
};

export function buildAdaptiveTrainingPlan(state: AppState): AdaptiveTrainingPlan {
  const synth = analyzeDeepSelf(state.selfProfile, state.biasQuiz);
  const goal = state.selfProfile.personalGoal;

  // Dynamic real-world telemetry adjustments from user's own logs
  const recentMoods = state.moodLogs.slice(0, 7);
  const avgMood =
    recentMoods.length > 0
      ? recentMoods.reduce((s, m) => s + m.level, 0) / recentMoods.length
      : 3.4;

  const failedReviews = state.situationReviews.filter((r) => r.outcome === 'لم ينجح').length;
  const reviewedDecisions = state.decisions.filter((d) => d.reviewed && typeof d.accuracyRating === 'number');
  const avgDecAcc =
    reviewedDecisions.length > 0
      ? reviewedDecisions.reduce((s, d) => s + (d.accuracyRating || 3), 0) / reviewedDecisions.length
      : 3.5;

  const topBiasKey = synth.topBiases[0]?.key || null;

  // Compute priority scores (0..100) for all 6 tracks
  let calmScore =
    Math.round(synth.bigFive.neuroticism * 0.55 + (100 - synth.eq.selfRegulation) * 0.3) +
    (synth.attachment.key === 'anxious' || synth.attachment.key === 'fearful' ? 14 : 0) +
    (avgMood <= 2.8 ? 15 : 0) +
    (topBiasKey === 'mind_reading' ? 10 : 0) +
    (goal === 'calm' ? 22 : 0);

  let boundariesScore =
    Math.round((100 - synth.confidenceScore) * 0.45 + synth.bigFive.agreeableness * 0.25) +
    (synth.stressResponse.key === 'fawn' ? 18 : synth.stressResponse.key === 'freeze' ? 12 : 0) +
    (topBiasKey === 'loss_aversion' || topBiasKey === 'sunk_cost' ? 10 : 0) +
    (goal === 'boundaries' ? 22 : 0);

  let empathyScore =
    Math.round((100 - synth.eq.overall) * 0.55 + (100 - synth.eq.empathy) * 0.3) +
    (synth.dominantDisc === 'D' ? 12 : 0) +
    (synth.stressResponse.key === 'fight' ? 12 : 0) +
    (failedReviews >= 2 ? 10 : 0) +
    (goal === 'empathy' ? 22 : 0);

  let presenceScore =
    Math.round((100 - synth.confidenceScore) * 0.55 + (100 - synth.bigFive.extraversion) * 0.2) +
    (synth.stressResponse.key === 'freeze' ? 14 : 0) +
    (state.voiceEvals.length === 0 ? 6 : 0) +
    (goal === 'presence' ? 22 : 0);

  let decisionsScore =
    Math.round((synth.topBiases[0]?.pct || 35) * 0.5 + (avgDecAcc < 3.2 ? 22 : 10)) +
    (synth.decisionStyle.name.includes('متردد') ? 16 : 0) +
    (topBiasKey === 'confirmation' || topBiasKey === 'overconfidence' || topBiasKey === 'anchoring' ? 14 : 0) +
    (goal === 'decisions' ? 22 : 0);

  let relationshipsScore =
    Math.round(
      (synth.attachment.key !== 'secure' ? 58 : 34) +
        (100 - synth.eq.socialSkill) * 0.25 +
        (state.people.length === 0 ? 8 : 0)
    ) + (goal === 'relationships' ? 22 : 0);

  const clamp = (n: number) => Math.max(20, Math.min(99, Math.round(n)));
  calmScore = clamp(calmScore);
  boundariesScore = clamp(boundariesScore);
  empathyScore = clamp(empathyScore);
  presenceScore = clamp(presenceScore);
  decisionsScore = clamp(decisionsScore);
  relationshipsScore = clamp(relationshipsScore);

  const rawTracks: TrainingTrackRecommendation[] = [
    {
      id: 'calm',
      title: 'مسار الهدوء وإيقاف التفكير المفرط',
      shortTitle: 'الهدوء وضبط الانفعال',
      priority: calmScore,
      urgencyLabel: 'تعزيز مستمر',
      reason:
        synth.bigFive.neuroticism >= 58
          ? `حساسيتك الانفعالية مرتفعة (${synth.bigFive.neuroticism}%)، لذا تهدئة جهازك العصبي وتفكيك التفكير المفرط يرفعان جودة يومك وعلاقاتك فوراً.`
          : avgMood <= 2.8
          ? 'متوسط مزاجك الأخير منخفض نسبياً؛ التركيز على جلسات التهدئة وتصحيح الأفكار سيستعيد توازنك سريعاً.'
          : 'تقوية التنظيم الذاتي والهدوء الداخلي تحميك من الاستفزاز المفاجئ.',
      primaryActionLabel: 'افتح استوديو الصوتيات والموجات',
      primaryTarget: { tab: 'training', trainingSubTab: 'sounds' },
      secondaryActionLabel: 'تمارين الاتزان وCBT',
      secondaryTarget: { tab: 'training', trainingSubTab: 'emotional' },
    },
    {
      id: 'boundaries',
      title: 'مسار الحزم ووضع الحدود دون ذنب',
      shortTitle: 'الحدود وقول «لا»',
      priority: boundariesScore,
      urgencyLabel: 'تعزيز مستمر',
      reason:
        synth.stressResponse.key === 'fawn'
          ? 'استجابتك التلقائية للضغط تميل للإرضاء السريع؛ التدرب على قول «لا» بلطف وحزم هو أكبر نقلة نوعية لك.'
          : synth.confidenceScore < 62
          ? `درجة الثقة والحدود لديك (${synth.confidenceScore}%) تشير لحاجة واضحة للتدرب على صياغات رفض هادئة دون تبرير.`
          : 'حماية حدودك بوضوح تمنع التراكم وتحفظ المودة في علاقاتك.',
      primaryActionLabel: 'تدرّب على «كيف أقول لا»',
      primaryTarget: { tab: 'simulator', simulatorSubTab: 'boundaries' },
      secondaryActionLabel: 'درع الحماية من التلاعب',
      secondaryTarget: { tab: 'knowledge', knowledgeSubTab: 'shield' },
    },
    {
      id: 'empathy',
      title: 'مسار الذكاء العاطفي والاستماع العميق',
      shortTitle: 'الاستماع والذكاء العاطفي',
      priority: empathyScore,
      urgencyLabel: 'تعزيز مستمر',
      reason:
        synth.eq.overall < 64
          ? `الذكاء العاطفي لديك (${synth.eq.overall}%) يمكن مضاعفة أثره عبر تمرين «اعكس ما سمعت» والأسئلة المعايِرة.`
          : synth.dominantDisc === 'D'
          ? 'طبعك الحاسم (D) يصبح أكثر تأثيراً وإقناعاً حين تسبقه بتسمية شعور الطرف الآخر قبل الحل.'
          : 'الإنصات العميق يذيب المقاومة ويقرّب القلوب في حواراتك اليومية.',
      primaryActionLabel: 'مدرب الاستماع والأسئلة',
      primaryTarget: { tab: 'simulator', simulatorSubTab: 'listening' },
      secondaryActionLabel: 'مراجعة مواقفك مع دائرتك',
      secondaryTarget: { tab: 'circle', circleSubTab: 'review' },
    },
    {
      id: 'presence',
      title: 'مسار الحضور والهيبة وصوتك الواثق',
      shortTitle: 'الحضور ونبرة الصوت',
      priority: presenceScore,
      urgencyLabel: 'تعزيز مستمر',
      reason:
        synth.stressResponse.key === 'freeze'
          ? 'لأن الضغط قد يسبب لك تجمّداً مؤقتاً في الكلام، سماع صوتك والتدرب على الردود الجاهزة سيكسران هذا الحاجز.'
          : 'صقل نبرة الصوت والوقفات ولغة الجسد يمنحك حضوراً هادئاً مسموعاً في كل مجلس.',
      primaryActionLabel: 'افتح مدرب الصوت',
      primaryTarget: { tab: 'training', trainingSubTab: 'voice' },
      secondaryActionLabel: 'بطاقات الحضور والهيبة',
      secondaryTarget: { tab: 'training', trainingSubTab: 'presence' },
    },
    {
      id: 'decisions',
      title: 'مسار وضوح القرار وتصحيح الانحيازات',
      shortTitle: 'القرار والانحيازات',
      priority: decisionsScore,
      urgencyLabel: 'تعزيز مستمر',
      reason:
        synth.topBiases.length > 0
          ? `أبرز انحياز ظهر في اختبارك هو «${synth.topBiases[0].name}»؛ توثيق قراراتك ومراجعتها سيرفع دقة حكمك بوضوح.`
          : 'اختبار انحيازاتك ومفكرة القرارات يحميانك من التردد والاندفاع والندم.',
      primaryActionLabel: 'اختبار انحيازاتي',
      primaryTarget: { tab: 'training', trainingSubTab: 'biases' },
      secondaryActionLabel: 'مفكرة القرارات',
      secondaryTarget: { tab: 'training', trainingSubTab: 'decisions' },
    },
    {
      id: 'relationships',
      title: 'مسار الأمان العاطفي وبناء القرب الصحي',
      shortTitle: 'علاقاتي والأمان العاطفي',
      priority: relationshipsScore,
      urgencyLabel: 'تعزيز مستمر',
      reason:
        synth.attachment.key !== 'secure'
          ? `نمط تعلقك (${synth.attachment.name}) يستفيد جداً من التحضير المسبق للحوارات وفهم توافقك مع كل شخص في دائرتك.`
          : 'الاستعداد قبل الحوارات المهمة ومراجعة ما ينجح مع كل شخص يضاعفان جودة علاقاتك.',
      primaryActionLabel: 'بطاقة قبل الحوار المهم',
      primaryTarget: { tab: 'circle', circleSubTab: 'pretalk' },
      secondaryActionLabel: 'دائرتي وتوافق الشخصيات',
      secondaryTarget: { tab: 'circle', circleSubTab: 'profiles' },
    },
  ];

  rawTracks.sort((a, b) => b.priority - a.priority);
  const tracks: TrainingTrackRecommendation[] = rawTracks.map((t, idx) => ({
    ...t,
    urgencyLabel: idx < 2 ? 'أولوية قصوى' : idx < 4 ? 'مسار داعم' : 'تعزيز مستمر',
  }));

  const primaryTrack = tracks[0];
  const secondaryTrack = tracks[1];

  // Build top 10 prioritized days from Top 3 tracks
  const seenDays = new Set<number>();
  const priorityDays: { day: number; trackId: TrainingTrackId; reason: string }[] = [];
  for (const t of tracks.slice(0, 3)) {
    for (const d of TRACK_DAYS_MAP[t.id]) {
      if (!seenDays.has(d.day) && priorityDays.length < 10) {
        seenDays.add(d.day);
        priorityDays.push({ day: d.day, trackId: t.id, reason: d.reason });
      }
    }
  }

  // Personalized Soundscape match
  let recommendedSoundId = 'stop_overthinking';
  let recommendedSoundTitle = 'موجات إيقاف التفكير المفرط';
  let recommendedSoundReason = 'تناسب تهدئة الضجيج الذهني واستعادة الصفاء قبل النوم أو بعد حوار مرهق.';
  if (primaryTrack.id === 'calm' || synth.bigFive.neuroticism >= 58) {
    recommendedSoundId = 'stop_overthinking';
    recommendedSoundTitle = 'موجات إيقاف التفكير المفرط';
    recommendedSoundReason = `مختارة لنمطك (${synth.archetype.title}) لتفريغ القلق وإعادة إبطاء إيقاع التفكير.`;
  } else if (primaryTrack.id === 'decisions' || synth.dominantDisc === 'C') {
    recommendedSoundId = 'deep_focus';
    recommendedSoundTitle = 'موجات التركيز العميق';
    recommendedSoundReason = 'مثالية لطبيعتك التحليلية أثناء مراجعة قراراتك أو قراءة ملخصات الكتب.';
  } else if (synth.stressResponse.key === 'fight' || synth.stressResponse.key === 'flight') {
    recommendedSoundId = 'calm_heartbeat';
    recommendedSoundTitle = 'نبض السكينة البطيء (60 نبضة/د)';
    recommendedSoundReason = 'يُزامن تنفسك ويخفض سرعة الاندفاع والتوتر الجسدي خلال دقائق.';
  } else {
    recommendedSoundId = 'ocean_waves';
    recommendedSoundTitle = 'أمواج البحر الهادئة';
    recommendedSoundReason = 'إيقاع طبيعي مريح يساعدك على الشحن العاطفي الهادئ يومياً.';
  }

  // Personalized Highest-Leverage Daily Habit
  let recommendedHabitId = 'calm';
  let recommendedHabitLabel = 'لحظة هدوء وتنفس';
  let recommendedHabitReason = 'تثبيت 5 دقائق هدوء يومياً هو أقوى رافعة لتوازنك النفسي.';
  if (primaryTrack.id === 'boundaries') {
    recommendedHabitId = 'boundaries';
    recommendedHabitLabel = 'حفظ حدودي اليوم';
    recommendedHabitReason = 'ممارسة حد صغير يومياً تعيد برمجة استجابتك وتبني احترامك لذاتك.';
  } else if (primaryTrack.id === 'decisions' || primaryTrack.id === 'empathy') {
    recommendedHabitId = 'reading';
    recommendedHabitLabel = 'قراءة وتعلم يومي';
    recommendedHabitReason = '15 دقيقة يومياً في المعرفة والوعي تضاعف دقة قراءتك لنفسك وللآخرين.';
  } else if (synth.bigFive.neuroticism >= 60) {
    recommendedHabitId = 'sleep';
    recommendedHabitLabel = 'نوم كافٍ ومريح';
    recommendedHabitReason = 'النوم الجيد هو خط الدفاع الأول ضد الحساسية الانفعالية والتفكير المفرط.';
  }

  // Personalized Simulator Scenarios & Sub-Tab
  const simScenarioSet = new Set<string>();
  const addScenarios = (ids: string[]) => ids.forEach((id) => simScenarioSet.add(id));
  if (primaryTrack.id === 'boundaries' || secondaryTrack.id === 'boundaries') {
    addScenarios(['sim_friend_guilt', 'sim_controller_family', 'sim_leave_toxic_group']);
  }
  if (primaryTrack.id === 'calm' || secondaryTrack.id === 'calm') {
    addScenarios(['sim_angry_father', 'sim_volatile_close', 'sim_critic_relative']);
  }
  if (primaryTrack.id === 'empathy' || secondaryTrack.id === 'relationships') {
    addScenarios(['sim_stubborn_sibling', 'sim_persuade_parents', 'sim_victim_friend']);
  }
  if (primaryTrack.id === 'presence' || secondaryTrack.id === 'presence') {
    addScenarios(['sim_narcissist_relative', 'sim_brother_provoke', 'sim_angry_father']);
  }
  if (simScenarioSet.size < 4) {
    addScenarios(['sim_angry_father', 'sim_friend_guilt', 'sim_persuade_parents', 'sim_critic_relative']);
  }

  const recommendedSimTab: AdaptiveTrainingPlan['recommendedSimTab'] =
    primaryTrack.id === 'boundaries'
      ? 'boundaries'
      : primaryTrack.id === 'empathy'
      ? 'listening'
      : primaryTrack.id === 'presence' || primaryTrack.id === 'decisions'
      ? 'objections'
      : 'scenarios';

  const recommendedSimReason =
    recommendedSimTab === 'boundaries'
      ? 'ملفك يرشّح لك البدء بـ«تدريب الحدود (كيف أقول لا)» لرفع ثباتك أمام الإلحاح.'
      : recommendedSimTab === 'listening'
      ? 'ملفك يرشّح لك «مدرب الاستماع والأسئلة» وتمرين عكس المشاعر.'
      : recommendedSimTab === 'objections'
      ? 'ملفك يرشّح لك «محاكي الاعتراضات» للتدرّب على الرد الواثق الهادئ.'
      : 'جرّب السيناريوهات المعلّمة بنجمة ذهبية لأنها تحاكي أبرز محفزات شخصيتك.';

  // Personalized Book Summaries (top 2)
  const recommendedBookIds: { id: string; reason: string }[] = [];
  if (primaryTrack.id === 'decisions' || synth.topBiases.length > 0) {
    recommendedBookIds.push({
      id: 'book_kahneman',
      reason: 'يكشف كيف يعمل تفكيرك السريع والانحيازات التي ظهرت في ملفك.',
    });
  }
  if (primaryTrack.id === 'calm' || synth.bigFive.neuroticism >= 55) {
    recommendedBookIds.push({
      id: 'book_frankl',
      reason: 'يعلّمك امتلاك المساحة الذهبية بين الاستفزاز وردة فعلك.',
    });
  }
  if (primaryTrack.id === 'empathy' || synth.eq.overall < 68) {
    recommendedBookIds.push({
      id: 'book_goleman',
      reason: 'دليل عملي لرفع ركائز الذكاء العاطفي الأربع لديك.',
    });
  }
  if (primaryTrack.id === 'boundaries' || primaryTrack.id === 'relationships') {
    recommendedBookIds.push({
      id: 'book_voss',
      reason: 'يمنحك أدوات التعاطف التكتيكي وقول «لا» دون كسر الود.',
    });
  }
  if (recommendedBookIds.length < 2) {
    recommendedBookIds.push({
      id: 'book_carnegie',
      reason: 'يرسّخ قواعد كسب القلوب والتأثير الدافئ في العائلة والصحبة.',
    });
  }
  if (recommendedBookIds.length < 2) {
    recommendedBookIds.push({
      id: 'book_cialdini',
      reason: 'يحصّنك ضد أساليب الإقناع والضغط النفسي الخفي.',
    });
  }

  const isPersonalized = synth.completionPct >= 15 || Boolean(goal);

  const headline = isPersonalized
    ? `خطة تدريب مصمّمة لـ«${synth.archetype.title}»`
    : 'أكمل «ملفي أنا» لتتخصّص خطتك التدريبية تلقائياً';

  const rationaleSummary = isPersonalized
    ? `بناءً على ملفك الشخصي (${synth.completionPct}% مكتمل) ونمط تعلقك (${synth.attachment.name}) واستجابتك للضغط (${synth.stressResponse.name})، يركّز التطبيق تدريبك الآن على «${primaryTrack.shortTitle}» يليه «${secondaryTrack.shortTitle}».`
    : 'كلما أجبت عن اختبارات «ملفي أنا» و«انحيازاتي»، أعاد التطبيق ترتيب التحدي اليومي، وأيام الـ30، والسيناريوهات، ودرع الحماية لتناسبك وحدك.';

  return {
    isPersonalized,
    headline,
    rationaleSummary,
    tracks,
    primaryTrack,
    secondaryTrack,
    priorityDays,
    recommendedSoundId,
    recommendedSoundTitle,
    recommendedSoundReason,
    recommendedHabitId,
    recommendedHabitLabel,
    recommendedHabitReason,
    recommendedSimScenarioIds: Array.from(simScenarioSet).slice(0, 4),
    recommendedSimTab,
    recommendedSimReason,
    vulnerableTacticIds: synth.manipulationVulnerabilities.map((v) => v.tacticId),
    recommendedBookIds: recommendedBookIds.slice(0, 2),
  };
}

// =====================================================================
// 3. PERSONALIZED TODAY'S CHALLENGE
// =====================================================================
export function getPersonalizedTodayChallenge(
  todayIso: string,
  plan: AdaptiveTrainingPlan
): { challenge: DailyChallengeItem; matchReason: string | null } {
  const parts = todayIso.split('-').map(Number);
  const seed = (parts[0] || 2026) * 372 + (parts[1] || 1) * 31 + (parts[2] || 1);

  if (!plan.isPersonalized) {
    return {
      challenge: DAILY_CHALLENGES[Math.abs(seed) % DAILY_CHALLENGES.length],
      matchReason: null,
    };
  }

  const topTracks = new Set<TrainingTrackId>([plan.primaryTrack.id, plan.secondaryTrack.id]);
  const tailored = DAILY_CHALLENGES.filter((c) => topTracks.has(c.track));
  const pool = tailored.length > 0 ? tailored : DAILY_CHALLENGES;
  const picked = pool[Math.abs(seed) % pool.length];
  const matchedTrack =
    picked.track === plan.primaryTrack.id ? plan.primaryTrack : plan.secondaryTrack;

  return {
    challenge: picked,
    matchReason: `مختار لشخصيتك: ${matchedTrack.shortTitle}`,
  };
}

// =====================================================================
// 4. ME <-> PERSON COMPATIBILITY ENGINE (توافقك وتفاعلك مع كل شخص في دائرتي)
// =====================================================================
export function analyzePairCompatibility(
  selfSynth: DeepSelfSynthesis,
  person: PersonProfile,
  reviewsForPerson: SituationReview[] = []
): PairCompatibilityReport {
  const other = analyzePerson(person);

  // Calculate compatibility score across Big Five, DISC, Attachment
  let harmony = 74;
  const sharedStrengths: string[] = [];
  const frictionPoints: string[] = [];

  // 1. Attachment pairing dynamics
  const otherAttachName = other.attachmentStyle.name;
  const otherIsAvoidant = otherAttachName.includes('تجنبي');
  const otherIsAnxious = otherAttachName.includes('قلق');

  if (selfSynth.attachment.key === 'anxious' && otherIsAvoidant) {
    harmony -= 16;
    frictionPoints.push(
      'ديناميكية «الملاحِق والمنسحب»: كلما قلقتَ وسارعتَ للسؤال والعتاب، قد يغلق هو أكثر بحثاً عن مساحة — الحل هو تهدئة نفسك أولاً ومنحه مهلة قصيرة واضحة.'
    );
  } else if (selfSynth.attachment.key === 'avoidant' && otherIsAnxious) {
    harmony -= 14;
    frictionPoints.push(
      'صمتك السريع عند التوتر يرفع قلقه بشدة؛ جملة طمأنة قصيرة («أحتاج ساعة هدوء وسنتحدث بكل ود») توفر عليك 80% من الخلاف.'
    );
  } else if (selfSynth.attachment.key === 'secure' && otherAttachName.includes('آمن')) {
    harmony += 12;
    sharedStrengths.push('قاعدة أمان عاطفي مشتركة تسهّل المصارحة وحل الخلافات دون قطيعة.');
  }

  // 2. DISC dynamic
  const myD = selfSynth.dominantDisc;
  const theirD = other.dominantDisc;

  if (myD === 'D' && theirD === 'D') {
    harmony -= 10;
    frictionPoints.push(
      'قوة إرادة عالية لدى الطرفين (D مع D): احذر أن يتحول الاختلاف إلى صراع كرامة؛ اعرض خيارات واضحة بدلاً من الأوامر.'
    );
  } else if ((myD === 'S' || selfSynth.stressResponse.key === 'fawn') && theirD === 'D') {
    harmony -= 8;
    frictionPoints.push(
      'حسمه السريع (D) مع ميلك للتلطيف قد يجعلك تتنازل أكثر مما ينبغي؛ جهّز حدّك في جملة مختصرة مسبقاً قبل الحديث.'
    );
  } else if (myD === 'C' && theirD === 'I') {
    harmony -= 5;
    sharedStrengths.push('تكامل جميل: حماسه وعفويته (I) مع دقتك ومنطقك (C) يصنعان توازناً رائعاً.');
    frictionPoints.push('قد يرى تدقيقك في التفاصيل تقييداً، وقد ترى عفويته عشوائية؛ ابدأ بالتقدير قبل الملاحظات.');
  } else if (myD === 'I' && theirD === 'C') {
    harmony -= 5;
    sharedStrengths.push('دفؤك وروحك الحيوية (I) يخففان صرامة تحليله (C)، ومنطقه يحمي قراراتكما.');
    frictionPoints.push('لا تتعجل في إقناعه بالحماس فقط؛ اعرض له 2–3 أسباب مرتبة وهادئة.');
  } else if (myD === 'S' && theirD === 'S') {
    harmony += 10;
    sharedStrengths.push('انسجام وهدوء كبير بينكما واحترام متبادل للودّ والسكينة.');
    frictionPoints.push('قد يؤجل كلاكما المصارحة خوفاً من إزعاج الآخر؛ خصّصا وقتاً لطيفاً للمصارحة الدورية.');
  } else {
    harmony += 6;
    sharedStrengths.push(`تكامل متوازن بين طبعك (${selfSynth.dominantDiscLabel}) وطبعه (${other.dominantDiscLabel}).`);
  }

  // 3. Emotional stability & empathy
  if (selfSynth.bigFive.neuroticism >= 60 && other.bigFive.neuroticism >= 60) {
    harmony -= 12;
    frictionPoints.push(
      'ارتفاع الحساسية الانفعالية عند الطرفين قد يُشعل التوتر بسرعة؛ طبّق قاعدة التوقف 60 ثانية فور ارتفاع النبرة.'
    );
  } else if (selfSynth.bigFive.neuroticism <= 45 && other.bigFive.neuroticism >= 60) {
    harmony += 5;
    sharedStrengths.push('هدوؤك الداخلي يعمل كمرساة أمان تمتص انفعاله السريع وتعيد له توازنه.');
  }

  if (Math.abs(selfSynth.bigFive.openness - other.bigFive.openness) <= 20) {
    harmony += 4;
    sharedStrengths.push('تقارب في طريقة التفكير والنظرة للأفكار الجديدة والحوارات.');
  }

  if (selfSynth.bigFive.agreeableness >= 62 && other.bigFive.agreeableness >= 62) {
    harmony += 6;
    sharedStrengths.push('ميل مشترك للرحمة والمودة وحسن الظن يسهّل تجاوز الهفوات.');
  }

  if (sharedStrengths.length === 0) {
    sharedStrengths.push('اختلاف طباعكما يمنح كل طرف زاوية رؤية تنقص الآخر إذا أُدير باحترام وهدوء.');
  }
  if (frictionPoints.length === 0) {
    frictionPoints.push('نقاط الاحتكاك قليلة؛ حافظا فقط على الوضوح في التوقعات وعدم افتراض النوايا وقت التعب.');
  }

  // Proven best approach from Post-Situation Reviews with this exact person
  let provenBestApproach: PairCompatibilityReport['provenBestApproach'] = null;
  if (reviewsForPerson.length > 0) {
    const map = new Map<string, { score: number; count: number }>();
    for (const r of reviewsForPerson) {
      const curr = map.get(r.approachUsed) || { score: 0, count: 0 };
      curr.count += 1;
      curr.score += r.outcome === 'نجح' ? 1 : r.outcome === 'جزئي' ? 0.5 : 0;
      map.set(r.approachUsed, curr);
    }
    const ranked = Array.from(map.entries())
      .map(([name, v]) => ({ name, count: v.count, rate: Math.round((v.score / v.count) * 100) }))
      .sort((a, b) => b.rate - a.rate || b.count - a.count);
    if (ranked[0]) provenBestApproach = ranked[0];
  }

  const yourWatchOut =
    selfSynth.stressResponse.key === 'fawn' && theirD === 'D'
      ? `انتبه لاستجابة الإرضاء لديك مع ${person.name}: لا توافق فوراً تحت الضغط؛ قل «سأفكر وأرد عليك».`
      : selfSynth.stressResponse.key === 'fight' && other.bigFive.neuroticism >= 58
      ? `انتبه لسرعة ردك وقت الاستفزاز مع ${person.name}: ثانيتان من الصمت تمنعان تصعيداً كبيراً.`
      : selfSynth.attachment.key === 'anxious'
      ? `لا تقرأ صمت أو انشغال ${person.name} كتغيير في مشاعره؛ اسأل بلطف ووضوح بدلاً من التخمين.`
      : `راقب أوقات إرهاقك قبل الخوض في موضوع حساس مع ${person.name} لتبقى على أفضل نسخة هادئة منك.`;

  const goldenRule = provenBestApproach && provenBestApproach.rate >= 70
    ? `الأسلوب الأنجح فعلياً من تجاربك مع ${person.name} هو «${provenBestApproach.name}» بنسبة نجاح ${provenBestApproach.rate}% — اجعله مدخلك الأول.`
    : theirD === 'D'
    ? `مع ${person.name}: اختصر، احترم استقلاليته، وامنحه خيارين واضحين بهدوء وثبات.`
    : theirD === 'C'
    ? `مع ${person.name}: قدّم أسباباً منظمة وهادئة وامنحه وقتاً للتفكير دون استعجال.`
    : theirD === 'I'
    ? `مع ${person.name}: ابدأ بالدفء والتقدير الصادق ثم اربط فكرتك بالنتيجة الإيجابية المشتركة.`
    : `مع ${person.name}: ابدأ بالأمان والطمأنة واطرح التغيير بتدرّج لطيف بعيداً عن المفاجآت.`;

  const harmonyPct = Math.max(35, Math.min(96, Math.round(harmony)));
  const harmonyLabel =
    harmonyPct >= 80
      ? 'تناغم عالٍ جداً'
      : harmonyPct >= 66
      ? 'توافق جيد مع فرص تكامل'
      : harmonyPct >= 52
      ? 'علاقة تحتاج وعياً بالاختلاف'
      : 'ديناميكية حساسة تحتاج حدوداً وهدوءاً';

  const dynamicTitle = `${selfSynth.dominantDiscLabel.split(' ')[0]} (أنت) ↔ ${other.dominantDiscLabel.split(' ')[0]} (${person.name})`;

  return {
    harmonyPct,
    harmonyLabel,
    dynamicTitle,
    sharedStrengths: sharedStrengths.slice(0, 3),
    frictionPoints: frictionPoints.slice(0, 3),
    yourWatchOut,
    goldenRule,
    provenBestApproach,
  };
}
