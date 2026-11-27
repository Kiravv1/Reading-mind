import { BigFiveScores, PersonalGoalKey, SelfProfileData } from '../types';

export type TrainingTrackId =
  | 'calm'
  | 'boundaries'
  | 'empathy'
  | 'presence'
  | 'decisions'
  | 'relationships';

export interface SelfQuestion {
  id: number;
  text: string;
  dimension: string;
  subDimension?: string;
  reverse?: boolean;
}

export const PERSONAL_GOALS: { key: PersonalGoalKey; label: string; desc: string }[] = [
  { key: 'calm', label: 'الهدوء وإيقاف التفكير المفرط', desc: 'ضبط القلق والغضب واستعادة السكينة الداخلية' },
  { key: 'boundaries', label: 'قوة الحدود وقول «لا» دون ذنب', desc: 'حماية طاقتي ووقتي بلطف وحزم أمام الضغوط' },
  { key: 'empathy', label: 'فهم الناس والذكاء العاطفي', desc: 'قراءة مشاعر عائلتي وأصحابي واحتواء الخلافات' },
  { key: 'presence', label: 'الثقة بالنفس والحضور القوي', desc: 'نبرة صوت ثابتة وهيبة هادئة دون تردد أو رهبة' },
  { key: 'decisions', label: 'وضوح القرار والتخلص من الانحيازات', desc: 'التفكير بموضوعية واتخاذ قرارات شخصية أدق' },
  { key: 'relationships', label: 'تعميق علاقاتي العائلية والاجتماعية', desc: 'بناء قرب صحي آمن وحوارات مثمرة مع أحبتي' },
];

export const SELF_BIG_FIVE_QS: SelfQuestion[] = [
  { id: 1, text: 'أستمتع بتجربة أفكار جديدة وأسئلة عميقة حول النفس والحياة.', dimension: 'openness' },
  { id: 2, text: 'أفضّل الروتين الثابت وأشعر بالضيق حين تتغير الخطط فجأة.', dimension: 'openness', reverse: true },
  { id: 3, text: 'أُنجز التزاماتي الشخصية بانتظام وأحافظ على وعودي مع من حولي.', dimension: 'conscientiousness' },
  { id: 4, text: 'أؤجّل كثيراً المهام المهمة حتى اللحظة الأخيرة.', dimension: 'conscientiousness', reverse: true },
  { id: 5, text: 'أستمد طاقتي من الجلسات الاجتماعية والتحدث مع العائلة والأصدقاء.', dimension: 'extraversion' },
  { id: 6, text: 'أحتاج لوقت طويل من الهدوء والانفراد لاستعادة نشاطي بعد اللقاءات.', dimension: 'extraversion', reverse: true },
  { id: 7, text: 'أهتم بمشاعر من حولي وأسعى للتفاهم حتى عند الاختلاف.', dimension: 'agreeableness' },
  { id: 8, text: 'أميل أحياناً للحسم الجاف أو الرد القاسي دون مراعاة مشاعر الطرف الآخر.', dimension: 'agreeableness', reverse: true },
  { id: 9, text: 'أشعر بالقلق السريع أو أفكر طويلاً في المواقف بعد انتهائها.', dimension: 'neuroticism' },
  { id: 10, text: 'أحافظ على هدوئي وتوازني الداخلي بسهولة حين تتوتر الأجواء حولي.', dimension: 'neuroticism', reverse: true },
  // Deepening statements (11-20)
  { id: 11, text: 'أحب قراءة وجهات نظر مختلفة حتى لو خالفت ما اعتدتُ عليه.', dimension: 'openness' },
  { id: 12, text: 'أميل للتمسك بالطريقة المألوفة ولا أتحمس لتجربة أساليب جديدة في حياتي.', dimension: 'openness', reverse: true },
  { id: 13, text: 'أرتّب أولوياتي بوضوح وأنتبه للتفاصيل الصغيرة قبل أن أتخذ خطوة.', dimension: 'conscientiousness' },
  { id: 14, text: 'أتشتت بسهولة وأترك بعض خططي الشخصية في منتصف الطريق.', dimension: 'conscientiousness', reverse: true },
  { id: 15, text: 'أبادر بالحديث وفتح المواضيع بسهولة عندما أكون في مجلس أو تجمع.', dimension: 'extraversion' },
  { id: 16, text: 'أفضّل الاستماع الصامت والمراقبة على أن أكون محور الحديث في الجلسة.', dimension: 'extraversion', reverse: true },
  { id: 17, text: 'أميل لإعطاء الآخرين العذر وحسن الظن قبل أن أحكم عليهم سلباً.', dimension: 'agreeableness' },
  { id: 18, text: 'أدخل في جدال حاد بسرعة إذا شعرت أن رأيي لم يُحترم.', dimension: 'agreeableness', reverse: true },
  { id: 19, text: 'تتقلب مشاعري بوضوح عند سماع تعليق نقدي أو موقف غير متوقع.', dimension: 'neuroticism' },
  { id: 20, text: 'أنام مرتاح البال غالباً دون إعادة تشغيل حوارات اليوم في رأسي.', dimension: 'neuroticism', reverse: true },
];

export const SELF_ATTACHMENT_QS: SelfQuestion[] = [
  { id: 1, text: 'أقلق أحياناً من أن الأشخاص المقربين قد يبتعدون عني أو يتغيرون تجاهي.', dimension: 'anxious' },
  { id: 2, text: 'أحتاج لطمأنة متكررة من أحبتي لأشعر أن العلاقة بخير.', dimension: 'anxious' },
  { id: 3, text: 'أشعر بعدم الارتياح عندما يقترب الآخرون عاطفياً أكثر من اللازم.', dimension: 'avoidant' },
  { id: 4, text: 'أفضّل الاعتماد على نفسي بالكامل وإخفاء ضعفي حتى عن أقرب الناس.', dimension: 'avoidant' },
  { id: 5, text: 'أستطيع التعبير عن احتياجاتي وحدودي بوضوح وهدوء دون خوف من فقدان العلاقة.', dimension: 'secure' },
  { id: 6, text: 'أثق أن الخلافات العابرة مع من أحب يمكن حلها بالحوار لا بالقطيعة.', dimension: 'secure' },
  { id: 7, text: 'أتضايق بشدة إذا تأخر شخص مقرب في الرد على رسالتي وأفسّر ذلك سلبياً.', dimension: 'anxious' },
  { id: 8, text: 'أنسحب بصمت وأغلق على نفسي فور تصاعد أي توتر عاطفي.', dimension: 'avoidant' },
  // Deepening statements (9-12)
  { id: 9, text: 'أراقب نبرة صوت أو ملامح المقربين باستمرار خوفاً من أن يكونوا منزعجين مني.', dimension: 'anxious' },
  { id: 10, text: 'أشعر بالاختناق إذا طلب مني شخص قريب مشاركة كل تفاصيل يومي ومشاعري.', dimension: 'avoidant' },
  { id: 11, text: 'أشعر بالأمان عندما أطلب مساعدة أو دعماً من شخص أثق به دون شعور بالضعف.', dimension: 'secure' },
  { id: 12, text: 'أستطيع منح أحبتي مساحتهم الخاصة دون أن أفسر ذلك كرفض أو جفاء.', dimension: 'secure' },
];

export const SELF_EQ_QS: SelfQuestion[] = [
  { id: 1, text: 'أستطيع تحديد اسم الشعور الذي يمر بي بدقة (إحباط، قلق، غيرة، إرهاق) وقت حدوثه.', dimension: 'eq', subDimension: 'self_awareness' },
  { id: 2, text: 'أنجح غالباً في التوقف لثوانٍ قبل الرد عندما يستفزني أحد.', dimension: 'eq', subDimension: 'self_regulation' },
  { id: 3, text: 'ألاحظ تغير نبرة صوت أو ملامح من أتحدث معه حتى لو لم يصرح بانزعاجه.', dimension: 'eq', subDimension: 'empathy' },
  { id: 4, text: 'أستطيع الاستماع لشخص يختلف معي دون مقاطعته أو تجهيز دفاعي مسبقاً.', dimension: 'eq', subDimension: 'social_skill' },
  { id: 5, text: 'حين أخطئ في حق شخص قريب، أستطيع الاعتذار بصدق دون لف أو تبرير.', dimension: 'eq', subDimension: 'social_skill' },
  { id: 6, text: 'أميّز بين النية الحقيقية للآخر وبين طريقته المتوترة أحياناً في الكلام.', dimension: 'eq', subDimension: 'empathy' },
  { id: 7, text: 'أستعيد توازني النفسي بسرعة نسبية بعد المواقف المحبطة.', dimension: 'eq', subDimension: 'self_regulation' },
  { id: 8, text: 'أعبّر عن انزعاجي بوضوح هادئ بدلاً من الكبت الطويل ثم الانفجار.', dimension: 'eq', subDimension: 'self_regulation' },
  // Deepening statements (9-12)
  { id: 9, text: 'أعرف مبكراً علامات الجسد التي تنذرني بأنني بدأت أغضب أو أفقد صبري.', dimension: 'eq', subDimension: 'self_awareness' },
  { id: 10, text: 'أنتبه عندما يؤثر تعبي أو جوعي أو ضغط يومي على طريقة حكمي على من حولي.', dimension: 'eq', subDimension: 'self_awareness' },
  { id: 11, text: 'أستطيع تفهّم زاوية الطرف الآخر وتسمية شعوره قبل أن أبدي رأيي المخالف.', dimension: 'eq', subDimension: 'empathy' },
  { id: 12, text: 'أجيد تهدئة الأجواء المشحونة بين شخصين مقربين بكلمات متزنة ومحترمة.', dimension: 'eq', subDimension: 'social_skill' },
];

export const SELF_CONFIDENCE_QS: SelfQuestion[] = [
  { id: 1, text: 'أستطيع قول «لا» بلطف وحزم عندما لا يناسبني طلب ما.', dimension: 'conf' },
  { id: 2, text: 'لا تهتز قيمتي الذاتية لمجرد أن شخصاً لم يوافقني الرأي أو انتقدني.', dimension: 'conf' },
  { id: 3, text: 'أتحدث بنبرة واضحة وتواصل بصري مريح في الجلسات العائلية والاجتماعية.', dimension: 'conf' },
  { id: 4, text: 'أثق بقدرتي على اتخاذ قراراتي الشخصية وتحمل نتائجها.', dimension: 'conf' },
  { id: 5, text: 'أتوقف عن مقارنة نفسي المستمرة بالآخرين وأركّز على تطوري الخاص.', dimension: 'conf' },
  { id: 6, text: 'أستطيع الدفاع عن حقي وحدودي دون صراخ ودون اعتذار مفرط.', dimension: 'conf' },
  { id: 7, text: 'أتقبل الإطراء الصادق بابتسامة وشكر دون التقليل من نفسي.', dimension: 'conf' },
  { id: 8, text: 'أواجه المواقف الصعبة خطوة بخطوة بدلاً من الهروب المستمر منها.', dimension: 'conf' },
  // Deepening statements (9-10)
  { id: 9, text: 'أستطيع أن أطلب ما أحتاجه بصراحة دون لف ودوران أو شعور بأنني أثقل على أحد.', dimension: 'conf' },
  { id: 10, text: 'لا أغيّر قناعتي الواضحة لمجرد إرضاء الأغلبية أو تجنّب نظرة استغراب.', dimension: 'conf' },
];

// 5th Module: Personal DISC + Conflict Style + Decision Style (12 statements)
export const SELF_DISC_CONFLICT_QS: SelfQuestion[] = [
  { id: 1, text: 'أفضّل الحسم السريع والحديث المباشر للوصول للنتيجة دون إطالة في المقدمات.', dimension: 'D' },
  { id: 2, text: 'أتولى زمام المبادرة والقرار تلقائياً حين تتردد المجموعة في اختيار خطوة.', dimension: 'D' },
  { id: 3, text: 'أحب بث الحماس والمرح في الجلسات وتقريب القلوب بروح إيجابية.', dimension: 'I' },
  { id: 4, text: 'أؤثّر في من حولي بالقصص والعفوية والدفء أكثر من القواعد الصارمة.', dimension: 'I' },
  { id: 5, text: 'الهدوء والانسجام واستقرار العلاقات أهم عندي من الفوز بنقاش أو فرض رأي.', dimension: 'S' },
  { id: 6, text: 'أصبر طويلاً على من أحب وأفضّل التدرّج البطيء على التغييرات المفاجئة.', dimension: 'S' },
  { id: 7, text: 'أحلّل التفاصيل والحقائق بدقة قبل أن أقتنع بفكرة أو أُصدر حكماً.', dimension: 'C' },
  { id: 8, text: 'تزعجني المبالغة والعشوائية، وأرتاح حين تكون الأمور منطقية وموثّقة.', dimension: 'C' },
  // Conflict & Decision markers
  { id: 9, text: 'عند الخلاف، أواجه الموضوع مباشرة ولا أرتاح حتى نضع النقاط على الحروف.', dimension: 'conflict_confront' },
  { id: 10, text: 'عند الخلاف، أتنازل أو أصمت غالباً حفاظاً على الهدوء حتى لو بقيت متضايقاً داخلياً.', dimension: 'conflict_appease' },
  { id: 11, text: 'في قراراتي المهمة، أعتمد على مقارنة الأسباب والنتائج بالورقة والقلم أكثر من الحدس.', dimension: 'decision_analytical' },
  { id: 12, text: 'في قراراتي المهمة، أتردد طويلاً خوفاً من الندم أو إزعاج أحد المقربين.', dimension: 'decision_hesitant' },
];

// 6th Module: Core Values & Stress Response (Fight / Flight / Freeze / Fawn) (10 statements)
export const SELF_VALUES_STRESS_QS: SelfQuestion[] = [
  // Stress responses (4F)
  { id: 1, text: 'تحت الضغط الشديد أو الاستفزاز، ترتفع نبرتي سريعاً وأندفع للدفاع أو الهجوم المباشر.', dimension: 'stress_fight' },
  { id: 2, text: 'تحت الضغط الشديد، أرغب فوراً في مغادرة المكان أو الانشغال بأي شيء للهروب من التوتر.', dimension: 'stress_flight' },
  { id: 3, text: 'تحت الضغط الشديد، يتجمد ذهني وأصمت عاجزاً عن إيجاد الرد المناسب إلا بعد انتهاء الموقف.', dimension: 'stress_freeze' },
  { id: 4, text: 'تحت الضغط الشديد، أوافق سريعاً أو أعتذر وأحاول تلطيف الجو وإرضاء الطرف الآخر فوراً.', dimension: 'stress_fawn' },
  // Core Personal Values (6 statements)
  { id: 5, text: 'حريتي الشخصية واستقلالية قراري من أهم ما لا أقبل المساس به.', dimension: 'val_autonomy' },
  { id: 6, text: 'ترابط العائلة ودفء الصحبة والانتماء يأتون في مقدمة أولوياتي.', dimension: 'val_belonging' },
  { id: 7, text: 'تطوير نفسي وفهم الحياة بعمق يمنحني أكبر شعور بالمعنى.', dimension: 'val_growth' },
  { id: 8, text: 'الطمأنينة والاستقرار والوضوح أهم عندي من المغامرة والمفاجآت.', dimension: 'val_security' },
  { id: 9, text: 'الكرامة والاحترام المتبادل وترك أثر طيب في الناس يحرّكون اختياراتي.', dimension: 'val_dignity' },
  { id: 10, text: 'الصدق والعدالة والإنصاف حتى مع نفسي قيم لا أساوم عليها.', dimension: 'val_authenticity' },
];

export interface SelfProfileReport {
  completionPct: number;
  bigFive: BigFiveScores;
  attachmentStyle: { name: string; description: string };
  eqScore: number;
  confidenceScore: number;
  strengths: string[];
  blindSpots: string[];
  triggers: string[];
  actionPlan: string[];
}

function calcDimAvg(qs: SelfQuestion[], answers: Record<number, number>, dim: string): number {
  const filtered = qs.filter((q) => q.dimension === dim);
  let sum = 0;
  let count = 0;
  for (const q of filtered) {
    const raw = answers[q.id];
    if (typeof raw === 'number' && raw >= 1 && raw <= 5) {
      const val = q.reverse ? 6 - raw : raw;
      sum += val;
      count++;
    }
  }
  if (count === 0) return 50;
  return Math.round(((sum / count - 1) / 4) * 100);
}

export function analyzeSelfProfile(data: SelfProfileData): SelfProfileReport {
  const totalQs =
    SELF_BIG_FIVE_QS.length +
    SELF_ATTACHMENT_QS.length +
    SELF_EQ_QS.length +
    SELF_CONFIDENCE_QS.length +
    SELF_DISC_CONFLICT_QS.length +
    SELF_VALUES_STRESS_QS.length;
  const answered =
    Object.keys(data.bigFiveAnswers || {}).length +
    Object.keys(data.attachmentAnswers || {}).length +
    Object.keys(data.eqAnswers || {}).length +
    Object.keys(data.confidenceAnswers || {}).length +
    Object.keys(data.discConflictAnswers || {}).length +
    Object.keys(data.valuesAnswers || {}).length;

  const bigFive: BigFiveScores = {
    openness: calcDimAvg(SELF_BIG_FIVE_QS, data.bigFiveAnswers, 'openness'),
    conscientiousness: calcDimAvg(SELF_BIG_FIVE_QS, data.bigFiveAnswers, 'conscientiousness'),
    extraversion: calcDimAvg(SELF_BIG_FIVE_QS, data.bigFiveAnswers, 'extraversion'),
    agreeableness: calcDimAvg(SELF_BIG_FIVE_QS, data.bigFiveAnswers, 'agreeableness'),
    neuroticism: calcDimAvg(SELF_BIG_FIVE_QS, data.bigFiveAnswers, 'neuroticism'),
  };

  const anxious = calcDimAvg(SELF_ATTACHMENT_QS, data.attachmentAnswers, 'anxious');
  const avoidant = calcDimAvg(SELF_ATTACHMENT_QS, data.attachmentAnswers, 'avoidant');
  const secure = calcDimAvg(SELF_ATTACHMENT_QS, data.attachmentAnswers, 'secure');

  let attachmentStyle = {
    name: 'تعلق آمن متوازن',
    description: 'تجمع بين الدفء في العلاقات واحترام حدودك وحدود الآخرين، وتتعامل مع الخلافات بمرونة ونضج.',
  };
  if (anxious >= 60 && avoidant >= 60) {
    attachmentStyle = {
      name: 'تعلق متذبذب (قلق وتجنبي معاً)',
      description: 'تتوق بشدة للقرب والأمان لكنك تخشى الأذى في الوقت ذاته، مما يجعلك تقترب ثم تنسحب عند التوتر.',
    };
  } else if (anxious >= 60 && anxious > secure) {
    attachmentStyle = {
      name: 'تعلق قلق (باحث عن الطمأنة)',
      description: 'تملك قلباً مخلصاً وحساساً للتفاصيل، لكنك قد تقلق بسرعة من التغيرات البسيطة في نبرة أو تواصل المقربين.',
    };
  } else if (avoidant >= 60 && avoidant > secure) {
    attachmentStyle = {
      name: 'تعلق تجنبي (مستقل بزيادة)',
      description: 'تعتز باستقلاليتك وقدرتك على حل أمورك بنفسك، لكنك قد تغلق بابك العاطفي سريعاً عند تصاعد الضغط.',
    };
  }

  const eqScore = calcDimAvg(SELF_EQ_QS, data.eqAnswers, 'eq');
  const confidenceScore = calcDimAvg(SELF_CONFIDENCE_QS, data.confidenceAnswers, 'conf');

  const strengths: string[] = [];
  const blindSpots: string[] = [];
  const triggers: string[] = [];
  const actionPlan: string[] = [];

  if (bigFive.openness >= 65) strengths.push('عقل منفتح وفضول معرفي يساعدك على فهم طبائع الناس بمرونة وعمق.');
  if (bigFive.conscientiousness >= 65) strengths.push('انضباط وموثوقية عالية تجعل كلمتك محترمة لدى عائلتك وأصدقائك.');
  if (bigFive.agreeableness >= 65) strengths.push('دفء وتعاطف طبيعي يسهّل بناء الثقة وتهدئة التوترات.');
  if (bigFive.neuroticism <= 40) strengths.push('ثبات انفعالي ممتاز يبقيك هادئاً عندما تتصاعد مشاعر الآخرين.');
  if (eqScore >= 68) strengths.push('ذكاء عاطفي مرتفع في قراءة ما وراء الكلمات وتنظيم استجاباتك.');
  if (confidenceScore >= 68) strengths.push('ثقة صحية بالنفس وحضور متزن في وضع الحدود.');
  if (strengths.length === 0) strengths.push('رغبتك الصادقة في فحص ذاتك وتطوير وعيك هي أقوى نقطة انطلاق لديك.');

  if (bigFive.agreeableness >= 72 && confidenceScore < 60) {
    blindSpots.push('قد تميل لإرضاء الآخرين على حساب راحتك الخاصة ثم تشعر لاحقاً بالاستنزاف أو التراكم.');
  }
  if (bigFive.agreeableness <= 42) {
    blindSpots.push('قد تبدو صراحتك أحياناً جافة أو حادة للآخرين حتى لو كانت نيتك صافية ومفيدة.');
  }
  if (bigFive.neuroticism >= 62) {
    blindSpots.push('التفكير المفرط بعد المواقف قد يجعلك تقرأ نوايا سلبية لم يقصدها الطرف الآخر.');
  }
  if (anxious >= 60) {
    blindSpots.push('حساسيتك لتأخر الردود أو برود النبرة قد تدفعك للملاحقة أو اللوم قبل التثبت.');
  }
  if (avoidant >= 60) {
    blindSpots.push('ميلك للانسحاب الصامت عند الضغط قد يفسّره أحبتك على أنه لا مبالاة أو جفاء.');
  }
  if (bigFive.conscientiousness <= 45) {
    blindSpots.push('التأجيل أو العفوية الزائدة قد يسببان توتراً بسيطاً في التزاماتك مع المقربين.');
  }
  if (blindSpots.length === 0) {
    blindSpots.push('راقب أوقات الإرهاق الجسدي، فحتى الشخص المتوازن تنخفض مرونته عندما يستنزف طاقته.');
  }

  if (bigFive.neuroticism >= 55 || anxious >= 58) {
    triggers.push('التجاهل أو الغموض المفاجئ من شخص مقرب دون تفسير واضح.');
  }
  if (bigFive.conscientiousness >= 62) {
    triggers.push('عدم احترام الوقت أو الفوضى أو إخلاف الوعود المتكرر.');
  }
  if (confidenceScore < 60) {
    triggers.push('النقد أمام الآخرين أو التقليل من رأيك بنبرة ساخرة.');
  }
  if (avoidant >= 58) {
    triggers.push('الشعور بالمحاصرة أو كثرة الأسئلة الملحة حين تحتاج لمساحة هدوء.');
  }
  if (bigFive.agreeableness >= 62) {
    triggers.push('الشعور بالجحود أو استغلال طيبتك وتجاوز حدودك بالضغط العاطفي.');
  }
  triggers.push('المقاطعة المستمرة أثناء حديثك أو تحريف كلامك خارج سياقه.');

  if (bigFive.neuroticism >= 55) {
    actionPlan.push('استخدم زر «اهدأ الآن» وجلسات إيقاف التفكير المفرط فور تصاعد القلق.');
  }
  if (confidenceScore < 65) {
    actionPlan.push('تدرّب يومياً على قسم «تدريب الحدود» واختبر صياغة واحدة لطيفة وحازمة لقول لا.');
  }
  if (eqScore < 68) {
    actionPlan.push('طبّق تمرين «اعكس ما سمعت» في مدرب الاستماع 3 مرات هذا الأسبوع.');
  }
  actionPlan.push('دوّن موقفاً واحداً أسبوعياً في «مراجعة بعد الموقف» لاكتشاف الأساليب التي تنجح معك ومع دائرتك.');

  return {
    completionPct: Math.round((answered / totalQs) * 100),
    bigFive,
    attachmentStyle,
    eqScore,
    confidenceScore,
    strengths: strengths.slice(0, 5),
    blindSpots: blindSpots.slice(0, 4),
    triggers: triggers.slice(0, 5),
    actionPlan: actionPlan.slice(0, 4),
  };
}

// =====================================================================
// 15-SCENARIO MY BIASES QUIZ (اختبار انحيازاتي)
// =====================================================================
export type BiasKey =
  | 'confirmation'
  | 'overconfidence'
  | 'anchoring'
  | 'loss_aversion'
  | 'sunk_cost'
  | 'halo_effect'
  | 'mind_reading';

export interface BiasQuizOption {
  id: string;
  text: string;
  bias: BiasKey | 'balanced';
}

export interface BiasQuizQuestion {
  id: number;
  scenario: string;
  options: BiasQuizOption[];
}

export const BIAS_META: Record<
  BiasKey,
  { name: string; summary: string; howToOvercome: string }
> = {
  confirmation: {
    name: 'الانحياز التأكيدي',
    summary: 'البحث عما يثبت رأيك المسبق في الناس والمواقف وتجاهل الإشارات المخالفة.',
    howToOvercome: 'قبل حسم حكمك على شخص، اسأل نفسك: «ما أقوى دليل يمكن أن يثبت أنني مخطئ في ظني؟».',
  },
  overconfidence: {
    name: 'الثقة المفرطة بالتوقع',
    summary: 'المبالغة في اليقين بصحة حدسك أو تقديرك دون اختبار الوقائع أو سماع رأي آخر.',
    howToOvercome: 'اكتب توقعاتك في «مفكرة القرارات» بنسبة مئوية وراجعها بعد أسبوعين لقياس دقتك الواقعية.',
  },
  anchoring: {
    name: 'انحياز التثبيت (الارتكاز على أول معلومة)',
    summary: 'التأثر الشديد بأول انطباع أو أول رواية تسمعها حتى لو ظهرت لاحقاً تفاصيل أوضح.',
    howToOvercome: 'استمع دائماً للطرف الآخر بنفس الانفتاح وكأنك لم تسمع الرواية الأولى بعد.',
  },
  loss_aversion: {
    name: 'النفور من الخسارة',
    summary: 'الخوف الزائد من خسارة الراحة المؤقتة أو إزعاج أحد، مما يمنعك من اتخاذ قرارات أصح.',
    howToOvercome: 'وازن السؤال: بدلاً من «ماذا سأخسر لو غيّرت؟» اسأل «ماذا أخسر كل يوم لو بقيت كما أنا؟».',
  },
  sunk_cost: {
    name: 'مغالطة التكلفة الغارقة',
    summary: 'التمسك بخيار أو علاقة مرهقة فقط بسبب الوقت أو الجهد القديم الذي بذلته فيها.',
    howToOvercome: 'اسأل نفسك: «لو كنت أبدأ من الصفر اليوم بلا ماضٍ، هل كنت سأختار نفس هذا المسار؟».',
  },
  halo_effect: {
    name: 'تأثير الهالة',
    summary: 'الحكم على كامل شخصية الإنسان من صفة واحدة جذابة أو مزعجة فقط.',
    howToOvercome: 'افصل الصفات عن بعضها: يمكن لشخص أن يكون كريماً ولطيفاً لكنه غير منظم في المواعيد.',
  },
  mind_reading: {
    name: 'قراءة الأفكار والتهويل',
    summary: 'افتراض معرفة نوايا الآخرين السلبية من إشارات غامضة دون سؤال مباشر.',
    howToOvercome: 'استبدل التخمين بسؤال لطيف مباشر: «لاحظت هدوءك اليوم، هل كل شيء بخير؟».',
  },
};

export const MY_BIAS_QUIZ_QUESTIONS: BiasQuizQuestion[] = [
  {
    id: 1,
    scenario: 'قرأت معلومة في حديث عائلي توافق تماماً رأياً قديماً لديك، لكن قريباً لك قدّم دليلاً مخالفاً.',
    options: [
      { id: 'a', text: 'أبحث سريعاً في ذهني عن ثغرات في كلامه وأتمسك برأيي الأول.', bias: 'confirmation' },
      { id: 'b', text: 'أتوقف لأسمع دليله بفضول وأتحقق من الوجهين قبل الترجيح.', bias: 'balanced' },
      { id: 'c', text: 'أشعر بيقين كامل أنني أعرف هذا الموضوع أكثر منه ولا داعي للمراجعة.', bias: 'overconfidence' },
    ],
  },
  {
    id: 2,
    scenario: 'حجزت مع صديق لنشاط كلفك وقتاً وتخطيطاً، لكن يوم الخروج تشعر بإرهاق شديد ولا رغبة لك.',
    options: [
      { id: 'a', text: 'أذهب وأنا متعب جداً فقط لأنني خططت وتعبت مسبقاً ولا أريد أن يضيع جهدي.', bias: 'sunk_cost' },
      { id: 'b', text: 'أعتذر بلطف وأقترح تأجيله لوقت أكون فيه بحال أفضل ليستمتع كلانا.', bias: 'balanced' },
      { id: 'c', text: 'أذهب خوفاً من أن يغضب مني أو تتأثر علاقتنا ولو قليلاً.', bias: 'loss_aversion' },
    ],
  },
  {
    id: 3,
    scenario: 'التقيت بشخص جديد في مناسبة وكان حسن المظهر ولطيف الكلام ومرحاً جداً.',
    options: [
      { id: 'a', text: 'أشعر فوراً أنه شخص موثوق ووفيّ وأفتح له أسراري الخاصة بسرعة.', bias: 'halo_effect' },
      { id: 'b', text: 'أستمتع بجلسته، وأترك الثقة العميقة تنضج مع المواقف والوقت.', bias: 'balanced' },
      { id: 'c', text: 'أثق بحدسي الأول دائماً؛ أنا نادراً ما أخطئ في قراءة الناس من أول لقاء.', bias: 'overconfidence' },
    ],
  },
  {
    id: 4,
    scenario: 'أرسلت رسالة مهمة لصديق مقرب، ورأيت أنه قرأها ولم يرد لمدة 4 ساعات.',
    options: [
      { id: 'a', text: 'أجزم فوراً أنه متضايق مني أو يتعمد تجاهلي.', bias: 'mind_reading' },
      { id: 'b', text: 'أضع احتمال انشغاله أولاً، وإذا طال الأمر أسأله بهدوء لاحقاً.', bias: 'balanced' },
      { id: 'c', text: 'أتذكر موقفاً قديماً له وأعتبر هذا التأخير دليلاً جديداً أنه لا يهتم بي.', bias: 'confirmation' },
    ],
  },
  {
    id: 5,
    scenario: 'قبل أن تلتقي بقريب بعيد، أخبرك أحد أفراد الأسرة أنه «شخص صعب وحاد الطباع».',
    options: [
      { id: 'a', text: 'أدخل اللقاء وأنا متأهب وأفسّر أول جملة جادة يقولها على أنها حدّة.', bias: 'anchoring' },
      { id: 'b', text: 'أسمع الملاحظة كاحتمال لا كحقيقة، وأكوّن انطباعي من تعامله المباشر معي.', bias: 'balanced' },
      { id: 'c', text: 'أبحث خلال الجلسة عن أي إشارة تؤكد كلام قريبي عنه.', bias: 'confirmation' },
    ],
  },
  {
    id: 6,
    scenario: 'لديك عادة يومية تستهلك وقتك لكنك اعتدت عليها، وتعرف أن تغييرها سيفيد راحتك النفسية.',
    options: [
      { id: 'a', text: 'أؤجل التغيير لأن التخلي عما اعتدت عليه يشعرني بفقدان راحة مألوفة.', bias: 'loss_aversion' },
      { id: 'b', text: 'أجرّب استبدالها بخطوة صغيرة لمدة أسبوع وأقيس الفرق.', bias: 'balanced' },
      { id: 'c', text: 'أقنع نفسي أنني أستطيع تركها في أي يوم أريده دون خطة.', bias: 'overconfidence' },
    ],
  },
  {
    id: 7,
    scenario: 'بدأت قراءة كتاب ممل جداً لا يناسبك بعد 100 صفحة منه.',
    options: [
      { id: 'a', text: 'أُجبر نفسي على إكماله حتى النهاية فقط لأنني قرأت 100 صفحة بالفعل.', bias: 'sunk_cost' },
      { id: 'b', text: 'أتوقف دون ذنب وأنتقل لكتاب يضيف لي قيمة حقيقية.', bias: 'balanced' },
      { id: 'c', text: 'أحكم أن المؤلف كله غير جيد لمجرد أن هذا الكتاب لم يعجبني.', bias: 'halo_effect' },
    ],
  },
  {
    id: 8,
    scenario: 'في خلاف بين أخويك، جاءك الأول وحكى لك القصة كاملة من زاويته قبل أن يتكلم الثاني.',
    options: [
      { id: 'a', text: 'تترسخ رواية الأول كمرجع أساسي وأقيس كلام الثاني بناءً عليها.', bias: 'anchoring' },
      { id: 'b', text: 'أعلّق الحكم تماماً حتى أسمع الطرفين بالهدوء والإنصاف نفسه.', bias: 'balanced' },
      { id: 'c', text: 'أشعر أنني فهمت القصة فوراً من أول خمس دقائق ولا أحتاج تفاصيل إضافية.', bias: 'overconfidence' },
    ],
  },
  {
    id: 9,
    scenario: 'شخص تعرف عنه أنه متسرع في الكلام، قدّم لك هذه المرة نصيحة هادئة ومدروسة.',
    options: [
      { id: 'a', text: 'أقلل من قيمة نصيحته تلقائياً بسبب صورتي السلبية عنه في مواقف أخرى.', bias: 'halo_effect' },
      { id: 'b', text: 'أقيّم النصيحة بذاتها بغض النظر عن أخطائه السابقة.', bias: 'balanced' },
      { id: 'c', text: 'أشك أن وراء نصيحته نية خفية أو رغبة في السيطرة عليّ.', bias: 'mind_reading' },
    ],
  },
  {
    id: 10,
    scenario: 'تحتاج أن تقول «لا» لطلب غير مناسب من صديق قديم حتى تحفظ وقتك وهدوءك.',
    options: [
      { id: 'a', text: 'أوافق وأضغط على نفسي لأن خوف خسارة رضاه المؤقت أكبر من رغبتي في راحتي.', bias: 'loss_aversion' },
      { id: 'b', text: 'أعتذر بلطف ووضوح وأثق أن الصداقة الحقيقية تتحمل الصدق.', bias: 'balanced' },
      { id: 'c', text: 'أتوقع مسبقاً أنه سيقطع علاقته بي لو اعتذرت.', bias: 'mind_reading' },
    ],
  },
  {
    id: 11,
    scenario: 'علاقة صداقة أصبحت تستنزفك نفسياً باستمرار منذ أشهر، لكنها مستمرة منذ 7 سنوات.',
    options: [
      { id: 'a', text: 'أتحمل الأذى ولا أضع حدوداً لأنني أتحسر على السنوات السبع الماضية.', bias: 'sunk_cost' },
      { id: 'b', text: 'أقيّم العلاقة بواقعها اليوم وأضع حدوداً صحية أو أقلل الاحتكاك بلطف.', bias: 'balanced' },
      { id: 'c', text: 'أخاف من الشعور بالفراغ إذا تغير شكل العلاقة.', bias: 'loss_aversion' },
    ],
  },
  {
    id: 12,
    scenario: 'تتوقع كيف ستسير محادثة صعبة مع أحد أفراد عائلتك قبل بدئها.',
    options: [
      { id: 'a', text: 'أكون شبه متأكد 100% من كل جملة سيقولها وأبني ردودي الدفاعية مسبقاً.', bias: 'overconfidence' },
      { id: 'b', text: 'أستعد لثلاثة احتمالات وأبقي أذني مفتوحتين لما سيقوله فعلاً.', bias: 'balanced' },
      { id: 'c', text: 'أتخيل أسوأ رد فعل ممكن وأتوتر قبل أن يبدأ الكلام أصلاً.', bias: 'mind_reading' },
    ],
  },
  {
    id: 13,
    scenario: 'دخلت مجلساً عائلياً فصمت اثنان من الحاضرين فجأة عند دخولك.',
    options: [
      { id: 'a', text: 'أفترض مباشرة أنهما كانا يتحدثان عني بسوء.', bias: 'mind_reading' },
      { id: 'b', text: 'أُلقي التحية ببشاشة ولا أبني قصة كاملة على لحظة عابرة.', bias: 'balanced' },
      { id: 'c', text: 'أربطها بموقف سابق ليؤكد شكوكي أن أحدهما لا يرتاح لي.', bias: 'confirmation' },
    ],
  },
  {
    id: 14,
    scenario: 'أردت شراء هدية لصديقك فرأيت أول خيار بسعر مرتفع جداً، ثم رأيت خياراً آخر بنصف السعر.',
    options: [
      { id: 'a', text: 'أشعر فوراً أن الخيار الثاني صفقة ممتازة لمجرد مقارنته بالسعر الأول المرتفع.', bias: 'anchoring' },
      { id: 'b', text: 'أقيّم الخيار الثاني بناءً على ميزانيتي وقيمته الحقيقية لصديقي لا السعر الأول.', bias: 'balanced' },
      { id: 'c', text: 'أشتري الأغلى فقط لأن غلافه الأنيق يوحي لي أنه الأفضل دون فحص الجودة.', bias: 'halo_effect' },
    ],
  },
  {
    id: 15,
    scenario: 'اتخذت قراراً شخصياً مهماً الشهر الماضي وتبيّن أنه لم يكن موفقاً كما توقعت.',
    options: [
      { id: 'a', text: 'أبحث عن مبررات تثبت أن قراري كان صحيحاً وأن الظروف فقط هي السبب.', bias: 'confirmation' },
      { id: 'b', text: 'أراجع أسبابي بموضوعية، أتعلم الدرس، وأعدّل المسار بهدوء.', bias: 'balanced' },
      { id: 'c', text: 'أستمر في نفس المسار حتى لا أشعر بأن جهد الشهر الماضي ضاع.', bias: 'sunk_cost' },
    ],
  },
];

export interface BiasQuizResult {
  answeredCount: number;
  balancedCount: number;
  rankedBiases: { key: BiasKey; count: number; pct: number }[];
}

export function analyzeBiasQuiz(answers: Record<number, string>): BiasQuizResult {
  const counts: Record<BiasKey, number> = {
    confirmation: 0,
    overconfidence: 0,
    anchoring: 0,
    loss_aversion: 0,
    sunk_cost: 0,
    halo_effect: 0,
    mind_reading: 0,
  };
  let answeredCount = 0;
  let balancedCount = 0;

  for (const q of MY_BIAS_QUIZ_QUESTIONS) {
    const pickedId = answers[q.id];
    if (!pickedId) continue;
    const opt = q.options.find((o) => o.id === pickedId);
    if (!opt) continue;
    answeredCount++;
    if (opt.bias === 'balanced') {
      balancedCount++;
    } else {
      counts[opt.bias]++;
    }
  }

  const maxPerBias: Record<BiasKey, number> = {
    confirmation: 5,
    overconfidence: 5,
    anchoring: 3,
    loss_aversion: 4,
    sunk_cost: 4,
    halo_effect: 4,
    mind_reading: 5,
  };

  const rankedBiases = (Object.keys(counts) as BiasKey[])
    .map((key) => ({
      key,
      count: counts[key],
      pct: Math.min(100, Math.round((counts[key] / maxPerBias[key]) * 100)),
    }))
    .sort((a, b) => b.pct - a.pct || b.count - a.count);

  return { answeredCount, balancedCount, rankedBiases };
}

// =====================================================================
// DAILY MICRO-CHALLENGES & XP LEVELS (تحدي اليوم + النقاط والمستويات)
// =====================================================================
export interface DailyChallengeItem {
  id: number;
  title: string;
  category: string;
  track: TrainingTrackId;
  tip: string;
  xp: number;
}

export const DAILY_CHALLENGES: DailyChallengeItem[] = [
  { id: 1, title: 'لاحظ 3 إشارات لغة جسد عند شخص تتحدث معه اليوم (دون أن تحكم، فقط لاحظ خط أساسه)', category: 'قراءة السلوك', track: 'empathy', tip: 'راقب وتيرة التنفس وحركة اليدين واتجاه القدمين مقارنة بحالته المريحة.', xp: 25 },
  { id: 2, title: 'استمع لشخص من عائلتك أو أصدقائك 5 دقائق كاملة بدون أي مقاطعة أو نصيحة غير مطلوبة', category: 'استماع عميق', track: 'empathy', tip: 'اكتفِ بالتواصل البصري الدافئ والإيماءة ثم لخّص شعوره في جملة واحدة.', xp: 25 },
  { id: 3, title: 'توقف 3 ثوانٍ كاملة قبل الرد في أول موقف يشعرك بالتوتر أو الاستعجال اليوم', category: 'اتزان عاطفي', track: 'calm', tip: 'ثلاث ثوانٍ تفصل بين ردة الفعل الاندفاعية والاختيار الواعي.', xp: 25 },
  { id: 4, title: 'قدّم تقديراً صادقاً ومحدداً لشخص قريب على تفصيلة صغيرة يفعلها عادة دون أن يشكره أحد', category: 'تأثير إيجابي', track: 'relationships', tip: 'التقدير المحدد («أقدّر هدوءك حين...») أعمق أثراً من المديح العام.', xp: 25 },
  { id: 5, title: 'طبّق تقنية «المرآة» مرتين اليوم: كرّر آخر كلمتين مهمتين قالهما محدثك بنبرة هادئة', category: 'حوار وتواصل', track: 'empathy', tip: 'ستندهش كيف يفتح الشخص قلبه ويوضح لك ما لم يكن سيقوله.', xp: 25 },
  { id: 6, title: 'اسأل سؤالاً معايِراً يبدأ بـ«كيف» أو «ما الذي» بدلاً من سؤال «لماذا» الدفاعي', category: 'أسئلة ذكية', track: 'relationships', tip: '«ما الذي يجعلك تشعر بذلك؟» ألطف وأكثر فتحاً للحوار من «لماذا أنت هكذا؟».', xp: 25 },
  { id: 7, title: 'راقب حديثك الداخلي اليوم والتقط تشوهاً معرفياً واحداً (كالتهويل أو قراءة الأفكار) وصحّحه', category: 'وعي ذاتي', track: 'decisions', tip: 'اسأل نفسك: ما الدليل الفعلي، وما التفسير الأهدأ؟', xp: 25 },
  { id: 8, title: 'تحدث اليوم بسرعة أبطأ بنسبة 15% وبصوت أهدأ في أهم مكالمة أو حوار لديك', category: 'حضور وصوت', track: 'presence', tip: 'التريث في الكلام يمنحك هيبة وهدوءاً ويخفض توتر المستمع.', xp: 25 },
  { id: 9, title: 'تواصل مع شخص عزيز لم تتحدث معه منذ فترة برسالة دافئة صادقة دون طلب أي شيء', category: 'رعاية العلاقات', track: 'relationships', tip: 'العلاقات القوية تُبنى بالاهتمام الصغير في الأوقات العادية.', xp: 25 },
  { id: 10, title: 'مارس «فصل المهام» في موقف واحد اليوم: التزم بلطفك وصدقك واترك ردة فعل الآخر له', category: 'حدود صحية', track: 'boundaries', tip: 'أنت مسؤول عن أسلوبك المحترم، لا عن إدارة مزاج الجميع.', xp: 25 },
  { id: 11, title: 'سمِّ شعور محدثك في جملة لطيفة («يبدو أن هذا الأمر أرهقك فعلاً») قبل طرح أي حل', category: 'تعاطف تكتيكي', track: 'empathy', tip: 'التفهم العاطفي أولاً يجعل الحلول المنطقية مقبولة لاحقاً.', xp: 25 },
  { id: 12, title: 'خذ 60 ثانية من التنفس الهادئ أو الصوتيات المهدئة قبل النوم لتصفية ذهنك من التفكير المفرط', category: 'هدوء ذهني', track: 'calm', tip: 'إغلاق اليوم بسلام يرفع جودة نومك ومزاجك في الغد.', xp: 25 },
  { id: 13, title: 'اكتب موقفاً أزعجك اليوم في عمودين: ما بيدي تغييره، وما ليس بيدي (تمرين رواقي)', category: 'رواقية', track: 'calm', tip: 'انقل طاقتك بالكامل للعمود الأول واترك الثاني يمضي.', xp: 25 },
  { id: 14, title: 'درّب نفسك على قول «لا» أو «أحتاج وقتاً لأفكر» بلطف على طلب واحد صغير لا يناسبك', category: 'حزم وحدود', track: 'boundaries', tip: 'الحدود الواضحة تحمي المودة من التراكم والعتاب الخفي.', xp: 25 },
  { id: 15, title: 'أنهِ نقاشاً خلافياً واحداً اليوم بحفظ ماء وجه الطرف الآخر بدل الإصرار على الكلمة الأخيرة', category: 'حكمة وتأثير', track: 'relationships', tip: 'الانتصار الحقيقي هو بقاء الود والاحترام، لا الفوز بالجدال.', xp: 25 },
  { id: 16, title: 'لاحظ وضعية جسمك 3 مرات اليوم: أرخِ كتفيك، ارفع رأسك بهدوء، وتنفس من البطن', category: 'حضور وهيبة', track: 'presence', tip: 'الجسد المسترخي يرسل إشارة أمان لعقلك قبل الآخرين.', xp: 25 },
  { id: 17, title: 'قبل حسم أي حكم أو قرار اليوم، اكتب سبباً واحداً قد يثبت عكس توقعك الأول', category: 'وضوح القرار', track: 'decisions', tip: 'سؤال «ماذا لو كنت مخطئاً؟» يحميك من الانحياز التأكيدي والثقة المفرطة.', xp: 25 },
  { id: 18, title: 'تدرّب على طلب احتياج واحد واضح بهدوء دون تلميح غير مباشر أو اعتذار مفرط', category: 'ثقة وحدود', track: 'boundaries', tip: 'الوضوح الهادئ يريح الطرفين ويبني احترامك لنفسك.', xp: 25 },
];

export const XP_LEVELS = [
  { level: 1, title: 'ملاحظ واعٍ', minXp: 0 },
  { level: 2, title: 'مستمع هادئ', minXp: 100 },
  { level: 3, title: 'قارئ للطبائع', minXp: 250 },
  { level: 4, title: 'متزن وحازم', minXp: 450 },
  { level: 5, title: 'حكيم في علاقاته', minXp: 750 },
  { level: 6, title: 'سيّد الهدوء والتأثير', minXp: 1100 },
];

export function getTodayChallenge(todayIso: string): DailyChallengeItem {
  const parts = todayIso.split('-').map(Number);
  const seed = (parts[0] || 2025) * 372 + (parts[1] || 1) * 31 + (parts[2] || 1);
  return DAILY_CHALLENGES[Math.abs(seed) % DAILY_CHALLENGES.length];
}

export function getUserLevel(xp: number): {
  level: number;
  title: string;
  currentMin: number;
  nextMin: number | null;
  progressPct: number;
} {
  let idx = 0;
  for (let i = 0; i < XP_LEVELS.length; i++) {
    if (xp >= XP_LEVELS[i].minXp) idx = i;
  }
  const curr = XP_LEVELS[idx];
  const next = XP_LEVELS[idx + 1] || null;
  const progressPct = next
    ? Math.min(100, Math.round(((xp - curr.minXp) / (next.minXp - curr.minXp)) * 100))
    : 100;
  return {
    level: curr.level,
    title: curr.title,
    currentMin: curr.minXp,
    nextMin: next ? next.minXp : null,
    progressPct,
  };
}

// =====================================================================
// DAILY HABITS (متتبع العادات)
// =====================================================================
export interface HabitDefinition {
  id: string;
  label: string;
  shortLabel: string;
  description: string;
}

export const DAILY_HABITS: HabitDefinition[] = [
  { id: 'sleep', label: 'نوم كافٍ ومريح', shortLabel: 'النوم', description: '7 إلى 8 ساعات نوم منتظم لتهدئة الجهاز العصبي' },
  { id: 'exercise', label: 'رياضة أو مشي 20 دقيقة', shortLabel: 'الرياضة', description: 'تفريغ التوتر الجسدي ورفع هرمونات الاتزان' },
  { id: 'reading', label: 'قراءة وتعلم يومي', shortLabel: 'القراءة', description: '15 دقيقة قراءة أو مراجعة بطاقة علم نفس' },
  { id: 'calm', label: 'لحظة هدوء وتنفس', shortLabel: 'الهدوء', description: '5 دقائق تأمل، تنفس بطيء، أو صوتيات مهدئة' },
  { id: 'boundaries', label: 'حفظ حدودي اليوم', shortLabel: 'الحدود', description: 'التعامل بلطف مع الآخرين دون تنازل مؤذٍ عن نفسي' },
];
