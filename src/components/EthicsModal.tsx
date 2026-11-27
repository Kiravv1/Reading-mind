import React from 'react';
import { CompassLogoIcon, ShieldIcon } from './Icons';

interface EthicsModalProps {
  open: boolean;
  onAccept: () => void;
  isFirstRun: boolean;
}

export const EthicsModal: React.FC<EthicsModalProps> = ({ open, onAccept, isFirstRun }) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ethics-title"
    >
      <div className="w-full max-w-lg rounded-3xl bg-[#141720] border border-white/[0.1] p-6 sm:p-8 shadow-2xl max-h-[90dvh] overflow-y-auto animate-view">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 rounded-2xl bg-[#D4A853]/12 border border-[#D4A853]/30 flex items-center justify-center text-[#D4A853] shrink-0">
            <CompassLogoIcon className="w-6 h-6" />
          </div>
          <div>
            <h2 id="ethics-title" className="text-xl font-bold text-[#F2EFE9]">
              ميثاق الاستخدام الأخلاقي والعلمي
            </h2>
            <p className="text-xs text-[#9CA3AF] mt-0.5">
              مرشد النفس والتأثير · يعمل محلياً بالكامل بدون إنترنت
            </p>
          </div>
        </div>

        <div className="space-y-4 text-sm text-[#D6D2C9] leading-relaxed">
          <div className="p-4 rounded-2xl bg-[#1B1F2B] border border-white/[0.06]">
            <div className="flex items-center gap-2 font-semibold text-[#F2EFE9] mb-1.5">
              <ShieldIcon className="w-4 h-4 text-[#D4A853] shrink-0" />
              <span>للفهم والتواصل وتطوير الذات فقط</span>
            </div>
            <p className="text-[#B8B4AA]">
              صُمّمت هذه الأداة لتساعدك على فهم أنماط السلوك البشري، حماية حدودك النفسية، تحسين جودة حواراتك، وبناء اتزانك الداخلي. لا يُسمح باستخدامها للتلاعب بالآخرين أو استغلالهم أو إيذائهم نفسياً.
            </p>
          </div>

          <div className="space-y-2.5 px-1">
            <p>
              <strong className="text-[#F2EFE9]">1. تقديرات سلوكية وليست تشخيصاً:</strong> النتائج والتقارير داخل التطبيق تقديرات إرشادية مبنية على ملاحظاتك الشخصية ونماذج علم النفس السلوكي (Big Five وDISC وCBT وDESC وVoss)، ولا تغني عن التشخيص النفسي أو الطبي المختص.
            </p>
            <p>
              <strong className="text-[#F2EFE9]">2. خصوصية كاملة 100% أوفلاين:</strong> جميع بياناتك وملاحظاتك ومذكراتك تُحفظ محلياً على جهازك فقط (IndexedDB وlocalStorage) ولا تغادر هاتفك لأي خادم أو طرف ثالث.
            </p>
            <p>
              <strong className="text-[#F2EFE9]">3. الرعاية عند الضيق الشديد:</strong> إن كنت تمرّ بحالة نفسية شديدة السوء أو ضغط يتجاوز طاقتك، فإن مشاركة شخص موثوق أو استشارة مختص نفسي هي الخطوة الأهم والأكثر شجاعة.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onAccept}
          className="mt-6 w-full min-h-[48px] rounded-2xl bg-[#D4A853] text-[#0B0D12] font-bold text-sm hover:bg-[#E2BA6B] active:scale-[0.99] transition-all cursor-pointer"
        >
          {isFirstRun ? 'أفهم وأوافق — ابدأ استخدام التطبيق' : 'حسناً، إغلاق'}
        </button>
      </div>
    </div>
  );
};
