import { BEHAVIORAL_STATEMENTS } from '../data/questionnaire';
import {
  BigFiveScores,
  DiscScores,
  PersonAnalysisReport,
  PersonProfile,
} from '../types';

function clamp(val: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(val)));
}

export function analyzePerson(person: PersonProfile): PersonAnalysisReport {
  const answers = person.answers || {};
  const answeredIds = Object.keys(answers)
    .map(Number)
    .filter((id) => answers[id] >= 1 && answers[id] <= 5);

  const traitSums = { O: 0, C: 0, E: 0, A: 0, N: 0 };
  const traitWeights = { O: 0, C: 0, E: 0, A: 0, N: 0 };

  const discSums = { D: 0, I: 0, S: 0, C: 0 };
  const discWeights = { D: 0, I: 0, S: 0, C: 0 };

  const conflictScores: Record<string, number> = {
    competing: 0,
    collaborating: 0,
    compromising: 0,
    avoiding: 0,
    accommodating: 0,
  };

  const decisionScores: Record<string, number> = {
    analytical: 0,
    directive: 0,
    conceptual: 0,
    behavioral: 0,
  };

  const attachmentScores: Record<string, number> = {
    secure: 0,
    anxious: 0,
    avoidant: 0,
    fearful: 0,
  };

  for (const stmt of BEHAVIORAL_STATEMENTS) {
    const raw = answers[stmt.id];
    if (!raw) continue;
    const norm = (raw - 3) / 2;
    const pos = (raw - 1) / 4;
    const w = stmt.weights;

    const addTrait = (key: keyof typeof traitSums, weight?: number) => {
      if (!weight) return;
      traitSums[key] += norm * weight;
      traitWeights[key] += Math.abs(weight);
    };

    addTrait('O', w.O);
    addTrait('C', w.C);
    addTrait('E', w.E);
    addTrait('A', w.A);
    addTrait('N', w.N);

    const addDisc = (key: keyof typeof discSums, weight?: number) => {
      if (!weight) return;
      discSums[key] += norm * weight;
      discWeights[key] += Math.abs(weight);
    };

    addDisc('D', w.D);
    addDisc('I', w.I);
    addDisc('S', w.S);
    addDisc('C', w.C_disc);

    if (w.conflict) conflictScores[w.conflict] += pos;
    if (w.decision) decisionScores[w.decision] += pos;
    if (w.attachment) attachmentScores[w.attachment] += pos;
  }

  const toPct = (sum: number, totalW: number) =>
    totalW > 0 ? clamp(((sum / totalW) + 1) * 50) : 50;

  const bigFive: BigFiveScores = {
    openness: toPct(traitSums.O, traitWeights.O),
    conscientiousness: toPct(traitSums.C, traitWeights.C),
    extraversion: toPct(traitSums.E, traitWeights.E),
    agreeableness: toPct(traitSums.A, traitWeights.A),
    neuroticism: toPct(traitSums.N, traitWeights.N),
  };

  const disc: DiscScores = {
    D: toPct(discSums.D, discWeights.D),
    I: toPct(discSums.I, discWeights.I),
    S: toPct(discSums.S, discWeights.S),
    C: toPct(discSums.C, discWeights.C),
  };

  const discEntries: [keyof DiscScores, number][] = [
    ['D', disc.D],
    ['I', disc.I],
    ['S', disc.S],
    ['C', disc.C],
  ];
  discEntries.sort((a, b) => b[1] - a[1]);
  const dominantDisc = discEntries[0][0];

  const discLabels: Record<keyof DiscScores, string> = {
    D: 'الحازم المباشر (D — سريع القرار ويحب الوضوح)',
    I: 'الاجتماعي المؤثر (I — دافئ ويحب التفاعل والتقدير)',
    S: 'الهادئ المستقر (S — وفيّ ويحب السكينة والتدرّج)',
    C: 'التحليلي الدقيق (C — منطقي ويحب التفاصيل والأدلة)',
  };

  // Conflict Style
  conflictScores.competing += (disc.D / 100) * 0.6 + ((100 - bigFive.agreeableness) / 100) * 0.5;
  conflictScores.collaborating += (bigFive.agreeableness / 100) * 0.5 + (bigFive.openness / 100) * 0.4;
  conflictScores.accommodating += (disc.S / 100) * 0.5 + ((100 - disc.D) / 100) * 0.4;
  conflictScores.avoiding += ((100 - bigFive.extraversion) / 100) * 0.4;
  conflictScores.compromising += (bigFive.conscientiousness / 100) * 0.35;

  const topConflictKey = Object.entries(conflictScores).sort((a, b) => b[1] - a[1])[0][0];
  const conflictMap: Record<string, { name: string; description: string }> = {
    competing: {
      name: 'التنافسي الحازم',
      description: 'يتمسك بموقفه بقوة وقت الخلاف وقد يرفع وتيرة النقاش ليشعر بالسيطرة والحسم.',
    },
    collaborating: {
      name: 'التعاوني المتفاهم',
      description: 'يبحث عن حل يرضي الطرفين ويفضّل الصراحة الهادئة التي تحفظ المودة والاحترام.',
    },
    compromising: {
      name: 'التوفيقي العملي',
      description: 'يميل للحلول الوسط السريعة لتصفية الجو وعدم إطالة الزعل.',
    },
    avoiding: {
      name: 'التجنبي المنسحب',
      description: 'يهرب من المواجهة المباشرة أو يصمت عندما يشتد التوتر؛ يحتاج أماناً ولطفاً ليتكلم.',
    },
    accommodating: {
      name: 'المساير المتنازل',
      description: 'يُغلّب رضا المقربين على رغبته الشخصية، لكنه قد يكتم ضيقاً إن شعر بعدم التقدير.',
    },
  };

  // Decision Style
  decisionScores.analytical += (disc.C / 100) * 0.7 + (bigFive.conscientiousness / 100) * 0.5;
  decisionScores.directive += (disc.D / 100) * 0.8;
  decisionScores.conceptual += (bigFive.openness / 100) * 0.7 + (disc.I / 100) * 0.4;
  decisionScores.behavioral += (bigFive.agreeableness / 100) * 0.6 + (disc.S / 100) * 0.5;

  const topDecisionKey = Object.entries(decisionScores).sort((a, b) => b[1] - a[1])[0][0];
  const decisionMap: Record<string, { name: string; description: string }> = {
    analytical: {
      name: 'التحليلي المتأني',
      description: 'يدرس التفاصيل والاحتمالات بعناية قبل أن يقتنع أو يوافق على أي خطوة.',
    },
    directive: {
      name: 'الحاسم السريع',
      description: 'يفضّل الخلاصة الواضحة والخيارات المحددة ويكره التردد أو اللف والدوران.',
    },
    conceptual: {
      name: 'التصوري المرن',
      description: 'ينجذب للأفكار الجديدة والصورة الكبيرة ويتحمّس للمقترحات المبتكرة.',
    },
    behavioral: {
      name: 'الإنساني التشاركي',
      description: 'يهتم بأثر القرار على مشاعر العائلة والأصدقاء ويفضّل الاتفاق الودي.',
    },
  };

  // Attachment Style
  attachmentScores.secure += ((100 - bigFive.neuroticism) / 100) * 0.7 + (bigFive.agreeableness / 100) * 0.4;
  attachmentScores.anxious += (bigFive.neuroticism / 100) * 0.65;
  attachmentScores.avoidant += ((100 - bigFive.agreeableness) / 100) * 0.4 + ((100 - bigFive.extraversion) / 100) * 0.35;
  attachmentScores.fearful += (bigFive.neuroticism / 100) * 0.45 + ((100 - bigFive.agreeableness) / 100) * 0.3;

  const topAttachmentKey = Object.entries(attachmentScores).sort((a, b) => b[1] - a[1])[0][0];
  const attachmentMap: Record<string, { name: string; description: string }> = {
    secure: {
      name: 'التعلق الآمن',
      description: 'متوازن بين القرب والاستقلالية، ويتعامل مع الاختلاف والحدود بهدوء ونضج.',
    },
    anxious: {
      name: 'التعلق القلق',
      description: 'حسّاس جداً للفتور أو تأخر الردود، ويحتاج تطميناً ووضوحاً دافئاً ليشعر بالأمان.',
    },
    avoidant: {
      name: 'التعلق التجنبي',
      description: 'يحب استقلاليته وينغلق إذا شعر بالضغط العاطفي أو العتاب المستمر؛ ينفتح بالهدوء واحترام المساحة.',
    },
    fearful: {
      name: 'التعلق المتقلب (القلق-التجنبي)',
      description: 'يرغب في القرب ويخشى الخذلان في الوقت نفسه؛ يحتاج ثباتاً ووعوداً واضحة غير متناقضة.',
    },
  };

  // Confidence Score (out of 40 statements)
  const coveragePct = (answeredIds.length / BEHAVIORAL_STATEMENTS.length) * 85;
  const noteBonus = Math.min(15, (person.notes?.length || 0) * 3);
  const confidenceScore = clamp(coveragePct + noteBonus);
  const confidenceLevel: 'منخفضة' | 'متوسطة' | 'عالية' =
    confidenceScore >= 75 ? 'عالية' : confidenceScore >= 45 ? 'متوسطة' : 'منخفضة';
  const confidenceExplanation =
    confidenceLevel === 'عالية'
      ? `تم رصد ${answeredIds.length} من 40 عبارة سلوكية مع ${person.notes.length} ملاحظات مؤرخة؛ الصورة السلوكية واضحة وموثوقة للتواصل اليومي.`
      : confidenceLevel === 'متوسطة'
      ? `تم رصد ${answeredIds.length} من 40 عبارة؛ استمر بتسجيل ملاحظاتك عبر مواقف متنوعة لترتفع الدقة.`
      : `تم رصد ${answeredIds.length} من 40 عبارة فقط؛ النتائج أولية وتقديرية ويُنصح بإكمال المزيد من العبارات.`;

  // Interaction Difficulty Index
  let diffScore = 20;
  const diffReasons: string[] = [];

  if (bigFive.agreeableness <= 40) {
    diffScore += 22;
    diffReasons.push('انخفاض الوفاقية: يميل للجدال والحدة أكثر من اللين والتفاهم السريع.');
  } else if (bigFive.agreeableness <= 52) {
    diffScore += 10;
    diffReasons.push('مرونة متوسطة: يحتاج اختيار ألفاظ دقيقة تحفظ كرامته أثناء الاختلاف.');
  }

  if (bigFive.neuroticism >= 65) {
    diffScore += 24;
    diffReasons.push('ارتفاع الحساسية الانفعالية: قد يفسّر الملاحظة البسيطة كجرح شخصي أو يتوتر بسرعة.');
  } else if (bigFive.neuroticism >= 52) {
    diffScore += 10;
    diffReasons.push('تأثر سريع بالضغط والمزاج: التوقيت الهادئ ضروري جداً قبل أي حديث مهم معه.');
  }

  if (disc.D >= 68 && bigFive.agreeableness <= 50) {
    diffScore += 16;
    diffReasons.push('ميل قوي للسيطرة والحسم: قد يقاطع أو يفرض رأيه إن لم تُعرض الأمور بوضوح وهدوء.');
  }

  if (bigFive.conscientiousness <= 38) {
    diffScore += 12;
    diffReasons.push('تذبذب في الالتزام بالوعود والمواعيد: يحتاج اتفاقات بسيطة ومحددة.');
  }

  if (topAttachmentKey === 'fearful') {
    diffScore += 14;
    diffReasons.push('نمط تعلق متقلب: يحتاج ثباتاً عالياً منك وعدم الانجرار لتغيرات مزاجه.');
  } else if (topAttachmentKey === 'anxious') {
    diffScore += 8;
    diffReasons.push('حساسية للغموض: الصمت الطويل غير المفسّر يثير قلقه وسوء ظنه.');
  } else if (topAttachmentKey === 'avoidant') {
    diffScore += 8;
    diffReasons.push('انسحاب عند الحديث العاطفي: يضيق بالعتاب المباشر ويحتاج حوارات قصيرة وهادئة.');
  }

  if (diffReasons.length === 0) {
    diffReasons.push('توازن جيد بين الهدوء والتعاون يجعل القرب والحوار الصريح معه ميسوراً ومريحاً.');
  }

  const finalDiff = clamp(diffScore, 10, 96);
  const diffLevel: PersonAnalysisReport['difficulty']['level'] =
    finalDiff >= 72
      ? 'مرتفع الصعوبة'
      : finalDiff >= 52
      ? 'يحتاج حذراً وهدوءاً'
      : finalDiff >= 34
      ? 'متوسط التحدي'
      : 'سهل التعامل';

  // Tailored Personal Report Headings
  const motivations: string[] = [];
  const fears: string[] = [];
  const whatBothers: string[] = [];
  const whatBringsCloser: string[] = [];
  const howToConverse: string[] = [];
  const whenToTalk: string[] = [];
  const whatToAvoid: string[] = [];

  if (dominantDisc === 'D') {
    motivations.push('الشعور بالاستقلالية، الاحترام، والقدرة على التأثير وحسم الأمور بسرعة.');
    fears.push('أن يُستغَل أو يفقد السيطرة أو يُنظر إليه كضعيف أو غير مسموع الكلمة.');
    whatBothers.push('الإطالة واللف والدوران، التردد المستمر، أو مخاطبته بنبرة أوامر فوقية.');
    whatBringsCloser.push('الوضوح المباشر، الصدق، استشارته في القرارات المهمة، وتقدير قوته وحمايته.');
    howToConverse.push('ادخل في صلب الموضوع بلطف، اعرض خيارين عمليين واضحين، واحفظ له مساحة الاختيار.');
    whenToTalk.push('عندما يكون مرتاحاً وذهنه صافياً، وعلى انفراد بعيداً عن وجود الآخرين حتى لا يدافع عن هيبته.');
    whatToAvoid.push('تجنب الشكوى المطوّلة بلا حل، أو تحدّيه أمام بقية العائلة أو الأصحاب.');
  } else if (dominantDisc === 'I') {
    motivations.push('المحبة، التقدير، الأجواء الدافئة، والشعور بأنه مرغوب ومحل اهتمام.');
    fears.push('التجاهل العاطفي، الرفض، أو البرود والجفاء من المقربين.');
    whatBothers.push('النقد الجاف أمام الآخرين، الردود المقتضبة الباردة، أو تجاهل حماسه وقصصه.');
    whatBringsCloser.push('الإنصات لقصصه بابتسامة، الثناء الصادق المحدد، وقضاء أوقات ممتعة ودافئة معه.');
    howToConverse.push('ابدأ بجو ودي وكلمة تقدير صادقة، استخدم القصص والأمثلة، وتجنب الجفاف الزائد.');
    whenToTalk.push('في جلسة دافئة ومريحة (مع قهوة أو مشي هادئ) عندما يكون مزاجه منشرحاً.');
    whatToAvoid.push('تجنب إحراجه أمام الناس أو مقاطعة حماسه ببرود وانتقاد فوري.');
  } else if (dominantDisc === 'S') {
    motivations.push('الاستقرار، السكينة الأسرية، الوفاء، والانسجام مع من يحب.');
    fears.push('التغييرات المفاجئة، الصراعات الحادة، أو فقدان الأمان والعلاقات المقربة.');
    whatBothers.push('رفع الصوت، الاستعجال الضاغط، أو استغلال طيبته دون شكر وتقدير.');
    whatBringsCloser.push('الوفاء الدائم، السؤال الصادق عن حاله، الهدوء، واحترام إيقاعه وعدم استعجاله.');
    howToConverse.push('تحدث بنبرة هادئة ومطمئنة، مهّد للأفكار الجديدة تدريجياً، واسأله بلطف عن رأيه الحقيقي.');
    whenToTalk.push('في وقت هادئ غير مضغوط، مع إعطائه مهلة ليفكر دون إلحاح فوري على الإجابة.');
    whatToAvoid.push('تجنب مفاجأته بقرارات كبيرة دون تمهيد أو ممارسة ضغط صوتي وعصبي عليه.');
  } else {
    motivations.push('الوضوح، الصواب المنطقي، الأمان المخطط له، وتجنب الأخطاء والمفاجآت.');
    fears.push('الفوضى، اتخاذ قرار متسرع يسبب ندماً، أو الانتقاد على قلة الدقة.');
    whatBothers.push('الوعود العشوائية، الكلام العام بلا تفاصيل، أو الاستعجال العاطفي.');
    whatBringsCloser.push('الالتزام بالمواعيد، احترام عقله وتفكيره، والشفافية الكاملة في الحقائق.');
    howToConverse.push('اعرض فكرتك مرتبة بنقاط واضحة، اذكر المزايا والعيوب بصدق، وأعطه وقتاً للتفكير.');
    whenToTalk.push('عندما لا يكون منشغلاً بمهام أخرى، بعد إعطائه فكرة مسبقة عمّا تريد مناقشته.');
    whatToAvoid.push('تجنب الضغط العاطفي والمبالغة أو إخفاء تفاصيل مهمة ستكتشف لاحقاً.');
  }

  // Big Five & Attachment enrichments
  if (bigFive.openness >= 62) {
    whatBringsCloser.push('مشاركة أفكار جديدة وكتب وتجارب وتأملات عميقة خارج الأحاديث التقليدية.');
  } else if (bigFive.openness <= 40) {
    howToConverse.push('اربط أي فكرة جديدة بشيء مألوف ومجرّب ومطمئن له لتخفيف تحفظه.');
  }

  if (bigFive.neuroticism >= 60) {
    fears.push('الخذلان، سوء الفهم، أو تضخم المشكلات الصغيرة فجأة.');
    whenToTalk.push('تجنب تماماً فتح مواضيع حساسة وقت تعبه أو جوعه أو آخر الليل؛ اختر وقت صفاء وهدوء.');
    howToConverse.push('سمِّ مشاعره بلطف أولاً ("أرى أن هذا يقلقك") ليهدأ قلبه قبل مناقشة أي تفاصيل.');
    whatToAvoid.push('تجنب النقد المفاجئ أو العبارات المطلقة مثل "أنت دائماً..." و"أنت أبداً...".');
  } else if (bigFive.neuroticism <= 38) {
    howToConverse.push('يتقبل الصراحة المباشرة المحترمة بسهولة نسبياً دون حساسية مفرطة.');
  }

  if (topAttachmentKey === 'anxious') {
    whatBringsCloser.push('الوضوح في المواعيد والتطمين اللفظي الصادق بمكانته عندك.');
    whatToAvoid.push('تجنب الاختفاء المفاجئ أو ترك رسائله بلا توضيح لفترة طويلة.');
  } else if (topAttachmentKey === 'avoidant') {
    whatBringsCloser.push('احترام مساحته الخاصة والأنشطة المشتركة الهادئة دون إلحاح عاطفي.');
    whenToTalk.push('أثناء مشي قصير أو حديث هادئ محدود المدة (10–15 دقيقة) بلا عتاب ثقيل.');
    whatToAvoid.push('تجنب ملاحقته بالأسئلة العاطفية المتلاحقة عندما يطلب مساحة ليهدأ.');
  } else if (topAttachmentKey === 'fearful') {
    whatBringsCloser.push('الثبات على نفس اللطف والوضوح في كل مرة؛ الاستقرار يبني ثقته تدريجياً.');
  }

  // Relationship-specific nuance
  if (person.relationship === 'أب' || person.relationship === 'أم') {
    whatBringsCloser.push('إشعارهما بأن خبرتهما ومكانتهما محفوظة، وطمأنة قلبهما على سلامتك ومستقبلك.');
    whenToTalk.push('بعد أوقات الراحة والهدوء في البيت، وبحديث فردي دافئ لا وسط ضوضاء المجلس.');
  } else if (person.relationship === 'أخ' || person.relationship === 'أخت') {
    whatToAvoid.push('تجنب لهجة الوصاية والتفوق أو المقارنة بين الإخوة أمام الوالدين.');
  } else if (person.relationship === 'صديق') {
    whatBringsCloser.push('المبادرة بالسؤال الصادق في غير أوقات الحاجة، وحفظ السر والوفاء بالوعد.');
  }

  return {
    bigFive,
    disc,
    dominantDisc,
    dominantDiscLabel: discLabels[dominantDisc],
    conflictStyle: conflictMap[topConflictKey],
    decisionStyle: decisionMap[topDecisionKey],
    attachmentStyle: attachmentMap[topAttachmentKey],
    confidence: {
      score: confidenceScore,
      level: confidenceLevel,
      answeredCount: answeredIds.length,
      noteBonus,
      explanation: confidenceExplanation,
    },
    difficulty: {
      score: finalDiff,
      level: diffLevel,
      reasons: diffReasons,
    },
    motivations,
    fears,
    whatBothers,
    whatBringsCloser,
    howToConverse,
    whenToTalk,
    whatToAvoid,
  };
}
