import React, { useCallback, useEffect, useState } from 'react';
import {
  LockConfig,
  verifyBiometric,
  verifyPassword,
} from '../utils/security';
import {
  CompassLogoIcon,
  EyeIcon,
  EyeOffIcon,
  FingerprintIcon,
  LockIcon,
  TrashIcon,
} from './Icons';

interface LockScreenProps {
  lockConfig: LockConfig;
  onUnlocked: () => void;
  onEmergencyReset: () => void;
}

const MAX_ATTEMPTS = 5;
const COOLDOWN_SECONDS = 30;

export const LockScreen: React.FC<LockScreenProps> = ({
  lockConfig,
  onUnlocked,
  onEmergencyReset,
}) => {
  const isPinMode = lockConfig.mode === 'pin';
  const [secret, setSecret] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [bioChecking, setBioChecking] = useState(false);
  const [failedCount, setFailedCount] = useState(0);
  const [cooldownLeft, setCooldownLeft] = useState(0);
  const [showForgot, setShowForgot] = useState(false);
  const [confirmWord, setConfirmWord] = useState('');

  useEffect(() => {
    if (cooldownLeft <= 0) return;
    const timer = window.setInterval(() => {
      setCooldownLeft((sec) => (sec <= 1 ? 0 : sec - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldownLeft]);

  const handleBiometricUnlock = useCallback(async () => {
    if (!lockConfig.biometricEnabled || !lockConfig.biometricCredentialId || bioChecking) {
      return;
    }
    setError(null);
    setBioChecking(true);
    const res = await verifyBiometric(lockConfig.biometricCredentialId);
    setBioChecking(false);
    if (res.ok) {
      onUnlocked();
    } else if (res.error) {
      setError(res.error);
    }
  }, [lockConfig.biometricEnabled, lockConfig.biometricCredentialId, bioChecking, onUnlocked]);

  const attemptVerify = useCallback(
    async (value: string) => {
      if (cooldownLeft > 0 || checking || !value) return;
      setError(null);
      setChecking(true);

      const ok = await verifyPassword(
        value,
        lockConfig.passwordHash,
        lockConfig.passwordSalt
      );
      setChecking(false);

      if (ok) {
        setSecret('');
        setFailedCount(0);
        onUnlocked();
      } else {
        const nextFails = failedCount + 1;
        setFailedCount(nextFails);
        setSecret('');
        if (nextFails >= MAX_ATTEMPTS) {
          setCooldownLeft(COOLDOWN_SECONDS);
          setFailedCount(0);
          setError(
            `محاولات خاطئة متكررة. يرجى الانتظار ${COOLDOWN_SECONDS} ثانية قبل المحاولة مجدداً.`
          );
        } else {
          setError(
            `${isPinMode ? 'رمز PIN غير صحيح' : 'كلمة المرور غير صحيحة'} (متبقي ${
              MAX_ATTEMPTS - nextFails
            } محاولات).`
          );
        }
      }
    },
    [
      cooldownLeft,
      checking,
      lockConfig.passwordHash,
      lockConfig.passwordSalt,
      failedCount,
      isPinMode,
      onUnlocked,
    ]
  );

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void attemptVerify(secret);
  };

  const handlePinDigit = (digit: string) => {
    if (cooldownLeft > 0 || checking) return;
    if (secret.length >= 6) return;
    setError(null);
    setSecret((prev) => prev + digit);
  };

  const handlePinBackspace = () => {
    if (cooldownLeft > 0 || checking) return;
    setSecret((prev) => prev.slice(0, -1));
  };

  return (
    <div
      dir="rtl"
      className="min-h-dvh bg-[#0B0D12] text-[#F2EFE9] flex items-center justify-center p-4 sm:p-6"
    >
      <div className="w-full max-w-md rounded-3xl bg-[#141720] border border-white/[0.1] p-6 sm:p-8 shadow-2xl space-y-6 animate-view">
        {/* Brand & Lock Emblem */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-[#D4A853]/12 border border-[#D4A853]/35 text-[#D4A853] flex items-center justify-center mx-auto">
            <CompassLogoIcon className="w-9 h-9" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#F2EFE9]">مرشد النفس والتأثير</h1>
            <p className="text-xs text-[#9CA3AF] mt-1 flex items-center justify-center gap-1.5">
              <LockIcon className="w-3.5 h-3.5 text-[#D4A853]" />
              <span>
                {lockConfig.encryptNotes
                  ? 'التطبيق مقفل وملاحظات الأشخاص مشفّرة محلياً'
                  : 'التطبيق مقفل لحماية خصوصيتك الشخصية'}
              </span>
            </p>
          </div>
        </div>

        {/* Biometric Unlock CTA (when enabled) */}
        {lockConfig.biometricEnabled && lockConfig.biometricCredentialId && (
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => {
                void handleBiometricUnlock();
              }}
              disabled={bioChecking}
              className="w-full min-h-[60px] px-5 py-3 rounded-2xl bg-[#D4A853] hover:bg-[#E2BA6B] disabled:opacity-60 text-[#0B0D12] font-bold flex items-center justify-center gap-3 transition-all active:scale-[0.99] cursor-pointer"
            >
              <FingerprintIcon className="w-7 h-7 shrink-0" />
              <span className="text-base">
                {bioChecking ? 'جارٍ التحقق بالبصمة...' : 'فتح بالبصمة أو الوجه'}
              </span>
            </button>

            <div className="flex items-center gap-3 text-[11px] text-[#7E8594]">
              <div className="h-px flex-1 bg-white/[0.08]" />
              <span>{isPinMode ? 'أو أدخل رمز PIN' : 'أو أدخل كلمة المرور'}</span>
              <div className="h-px flex-1 bg-white/[0.08]" />
            </div>
          </div>
        )}

        {/* PIN Keypad OR Password Form */}
        {isPinMode ? (
          <form onSubmit={handleFormSubmit} className="space-y-4">
            {/* PIN Dots */}
            <div className="flex items-center justify-center gap-3 py-2" dir="ltr">
              {[0, 1, 2, 3, 4, 5].map((i) => {
                const filled = i < secret.length;
                return (
                  <div
                    key={i}
                    className={`w-4 h-4 rounded-full border transition-all ${
                      filled
                        ? 'bg-[#D4A853] border-[#D4A853] scale-110'
                        : i < 4
                        ? 'border-white/30 bg-white/5'
                        : 'border-white/15 bg-transparent'
                    }`}
                  />
                );
              })}
            </div>

            {error && (
              <div
                role="alert"
                className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/25 text-xs text-rose-300 text-center leading-relaxed"
              >
                {error}
              </div>
            )}

            {/* Numeric Pad */}
            <div className="grid grid-cols-3 gap-2.5 max-w-[260px] mx-auto" dir="ltr">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  disabled={cooldownLeft > 0 || checking}
                  onClick={() => handlePinDigit(digit)}
                  className="h-14 rounded-2xl bg-[#1B1F2B] hover:bg-[#232838] active:scale-95 border border-white/[0.08] text-xl font-bold text-[#F2EFE9] tabular-nums transition cursor-pointer disabled:opacity-40"
                >
                  {digit}
                </button>
              ))}
              <button
                type="button"
                disabled={cooldownLeft > 0 || checking || secret.length === 0}
                onClick={() => setSecret('')}
                className="h-14 rounded-2xl bg-[#141720] hover:bg-[#1B1F2B] border border-white/[0.06] text-xs font-semibold text-[#9CA3AF] cursor-pointer disabled:opacity-40"
              >
                مسح
              </button>
              <button
                type="button"
                disabled={cooldownLeft > 0 || checking}
                onClick={() => handlePinDigit('0')}
                className="h-14 rounded-2xl bg-[#1B1F2B] hover:bg-[#232838] active:scale-95 border border-white/[0.08] text-xl font-bold text-[#F2EFE9] tabular-nums transition cursor-pointer disabled:opacity-40"
              >
                0
              </button>
              <button
                type="button"
                disabled={cooldownLeft > 0 || checking || secret.length === 0}
                onClick={handlePinBackspace}
                aria-label="حذف رقم"
                className="h-14 rounded-2xl bg-[#141720] hover:bg-[#1B1F2B] border border-white/[0.06] text-base font-bold text-[#D4A853] cursor-pointer disabled:opacity-40"
              >
                ⌫
              </button>
            </div>

            <button
              type="submit"
              disabled={secret.length < 4 || cooldownLeft > 0 || checking}
              className="w-full min-h-[50px] rounded-2xl bg-[#D4A853] hover:bg-[#E2BA6B] text-[#0B0D12] text-sm font-bold transition-colors cursor-pointer disabled:opacity-40"
            >
              {cooldownLeft > 0
                ? `انتظر ${cooldownLeft} ثانية...`
                : checking
                ? 'جارٍ التحقق...'
                : 'فتح التطبيق'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div>
              <label htmlFor="unlock-password" className="text-xs text-[#9CA3AF] block mb-1.5">
                كلمة المرور
              </label>
              <div className="relative">
                <input
                  id="unlock-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={secret}
                  disabled={cooldownLeft > 0 || checking}
                  onChange={(e) => setSecret(e.target.value)}
                  placeholder="أدخل كلمة المرور الخاصة بك"
                  className="w-full min-h-[50px] pr-4 pl-12 rounded-2xl bg-[#1B1F2B] border border-white/[0.1] text-sm text-[#F2EFE9] placeholder:text-[#6B7280] focus:outline-none focus:border-[#D4A853] disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                  className="absolute left-2 top-1/2 -translate-y-1/2 min-h-[40px] min-w-[40px] rounded-xl flex items-center justify-center text-[#9CA3AF] hover:text-[#F2EFE9] cursor-pointer"
                >
                  {showPassword ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/25 text-xs text-rose-300 leading-relaxed"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={!secret || cooldownLeft > 0 || checking}
              className={`w-full min-h-[50px] rounded-2xl text-sm font-bold transition-colors cursor-pointer disabled:opacity-50 ${
                lockConfig.biometricEnabled
                  ? 'bg-[#1B1F2B] hover:bg-[#232838] border border-white/[0.12] text-[#F2EFE9]'
                  : 'bg-[#D4A853] hover:bg-[#E2BA6B] text-[#0B0D12]'
              }`}
            >
              {cooldownLeft > 0
                ? `انتظر ${cooldownLeft} ثانية...`
                : checking
                ? 'جارٍ التحقق...'
                : 'فتح التطبيق'}
            </button>
          </form>
        )}

        {/* Privacy-preserving forgot secret */}
        <div className="pt-3 border-t border-white/[0.07] text-center">
          {!showForgot ? (
            <button
              type="button"
              onClick={() => setShowForgot(true)}
              className="text-xs text-[#9CA3AF] hover:text-[#D4A853] transition-colors cursor-pointer"
            >
              {isPinMode ? 'نسيت رمز PIN؟' : 'نسيت كلمة المرور؟'}
            </button>
          ) : (
            <div className="p-4 rounded-2xl bg-rose-500/8 border border-rose-500/25 text-right space-y-3">
              <p className="text-xs text-rose-200 leading-relaxed">
                لأن التطبيق يعمل أوفلاين 100% بدون خادم ولا يحفظ رمزك كنص مقروء، لا يمكن استرجاعه. لحماية خصوصيتك، يتطلب إزالة القفل تصفير البيانات المحلية (يمكنك استرجاعها لاحقاً من نسختك الاحتياطية JSON إن كانت لديك).
              </p>
              <div>
                <label className="text-[11px] text-[#D6D2C9] block mb-1">
                  اكتب كلمة <strong className="text-rose-300">مسح</strong> للتأكيد:
                </label>
                <input
                  type="text"
                  value={confirmWord}
                  onChange={(e) => setConfirmWord(e.target.value)}
                  placeholder="مسح"
                  className="w-full min-h-[42px] px-3 rounded-xl bg-[#141720] border border-rose-500/30 text-xs text-[#F2EFE9]"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={confirmWord.trim() !== 'مسح'}
                  onClick={onEmergencyReset}
                  className="flex-1 min-h-[42px] rounded-xl bg-rose-500 disabled:opacity-40 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <TrashIcon className="w-3.5 h-3.5" />
                  <span>إزالة القفل وتصفير البيانات</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForgot(false);
                    setConfirmWord('');
                  }}
                  className="min-h-[42px] px-3.5 rounded-xl bg-[#1B1F2B] text-xs text-[#D6D2C9] cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
