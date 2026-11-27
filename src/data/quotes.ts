import { QuoteCategory, QuoteEra, QuoteItem, QuoteVerification } from '../types';
import { QUOTES_PART_1 } from './quotesPart1';
import { QUOTES_PART_2 } from './quotesPart2';

export const BUILTIN_QUOTES: QuoteItem[] = [...QUOTES_PART_1, ...QUOTES_PART_2];

export const QUOTE_CATEGORIES: QuoteCategory[] = [
  'علم نفس',
  'فلسفة',
  'قيادة',
  'حكمة',
  'رواقية',
  'تحفيز',
];

export const QUOTE_ERAS: QuoteEra[] = [
  'قديم',
  'إسلامي وكلاسيكي',
  'نهضة وتنوير',
  'حديث ومعاصر',
];

export const QUOTE_VERIFICATIONS: QuoteVerification[] = [
  'موثقة بمصدر',
  'منسوبة ولم تُوثق',
  'مشكوك في نسبتها',
];

export const SAMPLE_IMPORT_JSON = `[
  {
    "text": "أضف هنا نص العبارة التي تريد حفظها في مكتبتك.",
    "author": "اسم القائل",
    "source": "اسم الكتاب أو الخطاب والصفحة إن وُجدت",
    "year": "السنة أو العصر",
    "era": "حديث ومعاصر",
    "category": "حكمة",
    "verification": "موثقة بمصدر",
    "explanation": "شرح قصير لمعنى العبارة وكيف تستفيد منها."
  }
]`;
