import React, { useEffect, useRef, useState } from 'react';
import { AppState } from '../types';
import { exportBackupJson, parseBackupJson } from '../utils/storage';
import {
  checkBiometricSupport,
  DEFAULT_LOCK_CONFIG,
  generateSalt,
  hashPassword,
  LockConfig,
  LockMode,
  registerBiometric,
  verifyPassword,
} from '../utils/security';
import { usePWAInstall } from '../hooks/usePWAInstall';
import {
  CloseIcon,
  DownloadIcon,
  EyeIcon,
  EyeOffIcon,
  FingerprintIcon,
  LockIcon,
  ShieldIcon,
  TrashIcon,
  UploadIcon,
} from './Icons';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  state: AppState;
  lockConfig: LockConfig;
  onUpdateLockConfig: (next: LockConfig) => void;
  onLockNow: () => void;
  onImportState: (newState: AppState) => void;
  onResetAll: () => void;
  onOpenEthics: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  open,
  onClose,
  state,
  lockConfig,
  onUpdateLockConfig,
  onLockNow,
  onImportState,
  onResetAll,
  onOpenEthics,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();

  // Security / Lock UI state
  const [bioSupported, setBioSupported] = useState<boolean | null>(null);
  const [lockAction, setLockAction] = useState<'none' | 'setup' | 'change' | 'disable'>('none');
  const [selectedMode, setSelectedMode] = useState<LockMode>(lockConfig.mode || 'pin');
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [lockBusy, setLockBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStatusMsg(null);
    setLockAction('none');
    setSelectedMode(lockConfig.mode || 'pin');
    setCurrentPwd('');
    setNewPwd('');
    setConfirmPwd('');
    void checkBiometricSupport().then(setBioSupported);
  }, [open, lockConfig.mode]);

  if (!open) return null;

  const resetPwdFields = () => {
    setCurrentPwd('');
    setNewPwd('');
    setConfirmPwd('');
    setLockAction('none');
  };

  const validateNewSecret = (val: string, mode: LockMode): string | null => {
    if (mode === 'pin') {
      if (!/^\d{4,6}$/.test(val)) {
        return 'يجب أن يتكوّن رمز PIN من 4 إلى 6 أرقام فقط.';
      }
      return null;
    }
    if (val.length < 4) {
      return 'يجب أن تتكون كلمة المرور من 4 أحرف أو أرقام على الأقل.';
    }
    return null;
  };

  const handleSetupPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validateNewSecret(newPwd, selectedMode);
    if (err) {
      setStatusMsg({ type: 'err', text: err });
      return;
    }
    if (newPwd !== confirmPwd) {
      setStatusMsg({
        type: 'err',
        text: selectedMode === 'pin' ? 'رمزا PIN غير متطابقين.' : 'كلمتا المرور غير متطابقتين.',
      });
      return;
    }
    setLockBusy(true);
    const { hash, salt } = await hashPassword(newPwd);
    onUpdateLockConfig({
      ...lockConfig,
      enabled: true,
      mode: selectedMode,
      passwordHash: hash,
      passwordSalt: salt,
      encryptNotes: true,
      noteEncSalt: lockConfig.noteEncSalt || generateSalt(),
    });
    setLockBusy(false);
    resetPwdFields();
    setStatusMsg({
      type: 'ok',
      text:
        selectedMode === 'pin'
          ? 'تم تفعيل قفل رمز PIN وتشفير ملاحظات الأشخاص محلياً! يمكنك أيضاً إضافة البصمة.'
          : 'تم تفعيل قفل كلمة المرور وتشفير ملاحظات الأشخاص محلياً! يمكنك أيضاً إضافة البصمة.',
    });
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validateNewSecret(newPwd, selectedMode);
    if (err) {
      setStatusMsg({ type: 'err', text: err });
      return;
    }
    if (newPwd !== confirmPwd) {
      setStatusMsg({ type: 'err', text: 'تأكيد الرمز الجديد غير متطابق.' });
      return;
    }
    setLockBusy(true);
    const valid = await verifyPassword(currentPwd, lockConfig.passwordHash, lockConfig.passwordSalt);
    if (!valid) {
      setLockBusy(false);
      setStatusMsg({ type: 'err', text: 'الرمز الحالي غير صحيح.' });
      return;
    }
    const { hash, salt } = await hashPassword(newPwd);
    onUpdateLockConfig({
      ...lockConfig,
      mode: selectedMode,
      passwordHash: hash,
      passwordSalt: salt,
      noteEncSalt: lockConfig.noteEncSalt || generateSalt(),
    });
    setLockBusy(false);
    resetPwdFields();
    setStatusMsg({ type: 'ok', text: 'تم تحديث رمز القفل وإعادة تشفير الملاحظات بأمان.' });
  };

  const handleDisableLock = async (e: React.FormEvent) => {
    e.preventDefault();
    setLockBusy(true);
    const valid = await verifyPassword(currentPwd, lockConfig.passwordHash, lockConfig.passwordSalt);
    setLockBusy(false);
    if (!valid) {
      setStatusMsg({ type: 'err', text: 'الرمز غير صحيح؛ لم يتم تعطيل القفل.' });
      return;
    }
    onUpdateLockConfig({ ...DEFAULT_LOCK_CONFIG });
    resetPwdFields();
    setStatusMsg({ type: 'ok', text: 'تم إيقاف قفل التطبيق وفك تشفير ملاحظاتك محلياً.' });
  };

  const handleToggleBiometric = async () => {
    if (!lockConfig.enabled) {
      setLockAction('setup');
      setStatusMsg({
        type: 'err',
        text: 'يرجى تعيين كلمة مرور أولاً لتكون بديلاً آمناً قبل تفعيل البصمة.',
      });
      return;
    }

    if (lockConfig.biometricEnabled) {
      onUpdateLockConfig({
        ...lockConfig,
        biometricEnabled: false,
        biometricCredentialId: null,
      });
      setStatusMsg({ type: 'ok', text: 'تم إلغاء الفتح بالبصمة مع الإبقاء على كلمة المرور.' });
      return;
    }

    setLockBusy(true);
    setStatusMsg(null);
    const res = await registerBiometric();
    setLockBusy(false);
    if (res.ok && res.credentialId) {
      onUpdateLockConfig({
        ...lockConfig,
        biometricEnabled: true,
        biometricCredentialId: res.credentialId,
      });
      setStatusMsg({ type: 'ok', text: 'تم ربط البصمة / التعرف على الوجه بنجاح!' });
    } else {
      setStatusMsg({
        type: 'err',
        text: res.error || 'تعذّر تفعيل البصمة على هذا الجهاز حالياً.',
      });
    }
  };

  const handleExport = () => {
    exportBackupJson(state);
    setStatusMsg({ type: 'ok', text: 'تم تنزيل ملف النسخة الاحتياطية (JSON) بنجاح.' });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result : '';
      const parsed = parseBackupJson(text);
      if (!parsed) {
        setStatusMsg({ type: 'err', text: 'الملف غير صالح أو لا يطابق صيغة نسخة مرشد النفس.' });
        return;
      }
      onImportState(parsed);
      setStatusMsg({ type: 'ok', text: 'تم استعادة النسخة الاحتياطية وتحديث جميع بياناتك بنجاح.' });
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
    >
      <div className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl bg-[#141720] border border-white/[0.1] p-6 shadow-2xl max-h-[88dvh] overflow-y-auto animate-view">
        <div className="w-10 h-1 rounded-full bg-white/15 mx-auto mb-4 sm:hidden" />

        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 id="settings-title" className="text-lg font-bold text-[#F2EFE9]">
              الأمان والبيانات والنسخ الاحتياطي
            </h2>
            <p className="text-xs text-[#9CA3AF] mt-0.5 tabular-nums">
              تخزين محلي كامل · {365 + state.customQuotes.length} عبارة · {state.people.length} في دائرتي · {state.completedDays.length}/30 يوماً
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center text-[#9CA3AF] hover:text-[#F2EFE9] hover:bg-white/[0.06] transition-colors cursor-pointer"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        {statusMsg && (
          <div
            className={`mb-4 p-3.5 rounded-2xl text-xs sm:text-sm border leading-relaxed ${
              statusMsg.type === 'ok'
                ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/25 text-rose-300'
            }`}
          >
            {statusMsg.text}
          </div>
        )}

        <div className="space-y-3">
          {/* LOCK & BIOMETRIC SECURITY CARD */}
          <section className="p-4 rounded-2xl bg-[#1B1F2B] border border-[#D4A853]/30 space-y-3.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#D4A853]/12 border border-[#D4A853]/30 text-[#D4A853] flex items-center justify-center shrink-0">
                  <LockIcon className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-bold text-[#F2EFE9]">
                    قفل التطبيق (PIN / كلمة مرور / بصمة) وتشفير الملاحظات
                  </div>
                  <div className="text-[11px] text-[#9CA3AF]">
                    {lockConfig.enabled
                      ? `${lockConfig.mode === 'pin' ? 'رمز PIN' : 'كلمة مرور'}${
                          lockConfig.biometricEnabled ? ' + البصمة' : ''
                        }${lockConfig.encryptNotes ? ' • ملاحظات مشفّرة' : ''}`
                      : 'غير مفعّل · احمِ ملاحظاتك الخاصة عن الأشخاص'}
                  </div>
                </div>
              </div>
              {lockConfig.enabled && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onLockNow();
                  }}
                  className="min-h-[38px] px-3 rounded-xl bg-[#D4A853] text-[#0B0D12] text-xs font-bold shrink-0 hover:bg-[#E2BA6B] cursor-pointer"
                >
                  قفل الآن
                </button>
              )}
            </div>

            {!lockConfig.enabled ? (
              lockAction === 'setup' ? (
                <form onSubmit={(e) => void handleSetupPassword(e)} className="space-y-2.5 pt-2 border-t border-white/[0.07]">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedMode('pin');
                        setNewPwd('');
                        setConfirmPwd('');
                      }}
                      className={`py-2 rounded-xl text-xs font-bold border transition ${
                        selectedMode === 'pin'
                          ? 'bg-[#D4A853]/20 border-[#D4A853] text-[#D4A853]'
                          : 'bg-[#141720] border-white/10 text-[#9CA3AF]'
                      }`}
                    >
                      رمز PIN (4–6 أرقام)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedMode('password');
                        setNewPwd('');
                        setConfirmPwd('');
                      }}
                      className={`py-2 rounded-xl text-xs font-bold border transition ${
                        selectedMode === 'password'
                          ? 'bg-[#D4A853]/20 border-[#D4A853] text-[#D4A853]'
                          : 'bg-[#141720] border-white/10 text-[#9CA3AF]'
                      }`}
                    >
                      كلمة مرور
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showPwd ? 'text' : 'password'}
                      inputMode={selectedMode === 'pin' ? 'numeric' : 'text'}
                      maxLength={selectedMode === 'pin' ? 6 : 64}
                      autoComplete="new-password"
                      required
                      minLength={4}
                      value={newPwd}
                      onChange={(e) =>
                        setNewPwd(
                          selectedMode === 'pin'
                            ? e.target.value.replace(/\D/g, '').slice(0, 6)
                            : e.target.value
                        )
                      }
                      placeholder={
                        selectedMode === 'pin'
                          ? 'أدخل رمز PIN من 4 إلى 6 أرقام'
                          : 'كلمة المرور الجديدة (4 أحرف/أرقام فأكثر)'
                      }
                      className="w-full min-h-[44px] pr-3.5 pl-11 rounded-xl bg-[#141720] border border-white/[0.1] text-xs sm:text-sm text-[#F2EFE9] focus:outline-none focus:border-[#D4A853]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd((v) => !v)}
                      aria-label="إظهار أو إخفاء الرمز"
                      className="absolute left-2 top-1/2 -translate-y-1/2 p-2 text-[#9CA3AF] hover:text-[#F2EFE9] cursor-pointer"
                    >
                      {showPwd ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                    </button>
                  </div>
                  <input
                    type={showPwd ? 'text' : 'password'}
                    inputMode={selectedMode === 'pin' ? 'numeric' : 'text'}
                    maxLength={selectedMode === 'pin' ? 6 : 64}
                    autoComplete="new-password"
                    required
                    minLength={4}
                    value={confirmPwd}
                    onChange={(e) =>
                      setConfirmPwd(
                        selectedMode === 'pin'
                          ? e.target.value.replace(/\D/g, '').slice(0, 6)
                          : e.target.value
                      )
                    }
                    placeholder={selectedMode === 'pin' ? 'تأكيد رمز PIN' : 'تأكيد كلمة المرور'}
                    className="w-full min-h-[44px] px-3.5 rounded-xl bg-[#141720] border border-white/[0.1] text-xs sm:text-sm text-[#F2EFE9] focus:outline-none focus:border-[#D4A853]"
                  />
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={lockBusy}
                      className="flex-1 min-h-[44px] rounded-xl bg-[#D4A853] text-[#0B0D12] text-xs font-bold hover:bg-[#E2BA6B] disabled:opacity-50 cursor-pointer"
                    >
                      {lockBusy ? 'جارٍ التشفير والحفظ...' : 'حفظ وتفعيل القفل'}
                    </button>
                    <button
                      type="button"
                      onClick={resetPwdFields}
                      className="min-h-[44px] px-4 rounded-xl bg-[#141720] text-xs text-[#9CA3AF] cursor-pointer"
                    >
                      إلغاء
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setStatusMsg(null);
                    setLockAction('setup');
                  }}
                  className="w-full min-h-[46px] rounded-xl bg-[#D4A853] hover:bg-[#E2BA6B] text-[#0B0D12] text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <LockIcon className="w-4 h-4" />
                  <span>تفعيل قفل PIN أو كلمة مرور + تشفير الملاحظات</span>
                </button>
              )
            ) : (
              <div className="space-y-2.5 pt-2 border-t border-white/[0.07]">
                {/* Fingerprint / Biometric Toggle */}
                <button
                  type="button"
                  disabled={lockBusy}
                  onClick={() => void handleToggleBiometric()}
                  className={`w-full min-h-[48px] px-3.5 py-2.5 rounded-xl border flex items-center justify-between text-right transition-colors cursor-pointer disabled:opacity-60 ${
                    lockConfig.biometricEnabled
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                      : 'bg-[#141720] hover:bg-[#181C27] border-white/[0.08] text-[#F2EFE9]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <FingerprintIcon className="w-5 h-5 text-[#D4A853] shrink-0" />
                    <div>
                      <div className="text-xs sm:text-sm font-semibold">
                        {lockConfig.biometricEnabled ? 'البصمة / الوجه مفعّلة' : 'تفعيل الفتح بالبصمة / الوجه'}
                      </div>
                      <div className="text-[11px] text-[#9CA3AF]">
                        {bioSupported === false
                          ? 'تعمل بعد التثبيت كتطبيق (PWA) على جهاز يدعم البصمة'
                          : 'فتح فوري عبر حساس البصمة أو Face ID في جهازك'}
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-[#D4A853] shrink-0 mr-2">
                    {lockConfig.biometricEnabled ? 'إلغاء' : 'تفعيل'}
                  </span>
                </button>

                {/* Encrypt Notes Toggle */}
                <button
                  type="button"
                  onClick={() =>
                    onUpdateLockConfig({
                      ...lockConfig,
                      encryptNotes: !lockConfig.encryptNotes,
                      noteEncSalt: lockConfig.noteEncSalt || generateSalt(),
                    })
                  }
                  className="w-full min-h-[46px] px-3.5 py-2 rounded-xl bg-[#141720] border border-white/[0.08] flex items-center justify-between text-right text-xs text-[#E5E2DC] cursor-pointer"
                >
                  <div>
                    <div className="font-semibold">تشفير ملاحظات الأشخاص تلقائياً (AES-256)</div>
                    <div className="text-[10px] text-[#9CA3AF]">تُحفظ الملاحظات مشفّرة في التخزين والنسخ الاحتياطي</div>
                  </div>
                  <span
                    className={`font-bold shrink-0 mr-2 ${
                      lockConfig.encryptNotes ? 'text-emerald-400' : 'text-[#9CA3AF]'
                    }`}
                  >
                    {lockConfig.encryptNotes ? 'مفعّل' : 'متوقف'}
                  </span>
                </button>

                {/* Auto-lock on hide */}
                <button
                  type="button"
                  onClick={() =>
                    onUpdateLockConfig({
                      ...lockConfig,
                      autoLockOnHide: !lockConfig.autoLockOnHide,
                    })
                  }
                  className="w-full min-h-[44px] px-3.5 rounded-xl bg-[#141720] border border-white/[0.08] flex items-center justify-between text-xs text-[#E5E2DC] cursor-pointer"
                >
                  <span>قفل تلقائي عند مغادرة التطبيق أو إغلاق الشاشة</span>
                  <span
                    className={`font-bold ${
                      lockConfig.autoLockOnHide ? 'text-emerald-400' : 'text-[#9CA3AF]'
                    }`}
                  >
                    {lockConfig.autoLockOnHide ? 'مفعّل' : 'متوقف'}
                  </span>
                </button>

                {/* Change / Disable Action Triggers */}
                {lockAction === 'none' && (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setStatusMsg(null);
                        setLockAction('change');
                      }}
                      className="min-h-[42px] rounded-xl bg-[#141720] hover:bg-[#191E2A] border border-white/[0.08] text-xs font-semibold text-[#F2EFE9] cursor-pointer"
                    >
                      تغيير الرمز / النوع
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setStatusMsg(null);
                        setLockAction('disable');
                      }}
                      className="min-h-[42px] rounded-xl border border-rose-500/25 text-rose-300 hover:bg-rose-500/10 text-xs font-semibold cursor-pointer"
                    >
                      إيقاف القفل
                    </button>
                  </div>
                )}

                {/* Change Password / PIN Form */}
                {lockAction === 'change' && (
                  <form onSubmit={(e) => void handleChangePassword(e)} className="space-y-2 pt-2">
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedMode('pin');
                          setNewPwd('');
                          setConfirmPwd('');
                        }}
                        className={`py-1.5 rounded-xl text-xs font-bold border ${
                          selectedMode === 'pin'
                            ? 'bg-[#D4A853]/20 border-[#D4A853] text-[#D4A853]'
                            : 'bg-[#141720] border-white/10 text-[#9CA3AF]'
                        }`}
                      >
                        رمز PIN
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedMode('password');
                          setNewPwd('');
                          setConfirmPwd('');
                        }}
                        className={`py-1.5 rounded-xl text-xs font-bold border ${
                          selectedMode === 'password'
                            ? 'bg-[#D4A853]/20 border-[#D4A853] text-[#D4A853]'
                            : 'bg-[#141720] border-white/10 text-[#9CA3AF]'
                        }`}
                      >
                        كلمة مرور
                      </button>
                    </div>
                    <input
                      type={showPwd ? 'text' : 'password'}
                      required
                      value={currentPwd}
                      onChange={(e) => setCurrentPwd(e.target.value)}
                      placeholder="الرمز الحالي"
                      className="w-full min-h-[42px] px-3.5 rounded-xl bg-[#141720] border border-white/[0.1] text-xs text-[#F2EFE9]"
                    />
                    <input
                      type={showPwd ? 'text' : 'password'}
                      inputMode={selectedMode === 'pin' ? 'numeric' : 'text'}
                      required
                      minLength={4}
                      value={newPwd}
                      onChange={(e) =>
                        setNewPwd(
                          selectedMode === 'pin'
                            ? e.target.value.replace(/\D/g, '').slice(0, 6)
                            : e.target.value
                        )
                      }
                      placeholder={selectedMode === 'pin' ? 'رمز PIN الجديد (4-6 أرقام)' : 'كلمة المرور الجديدة'}
                      className="w-full min-h-[42px] px-3.5 rounded-xl bg-[#141720] border border-white/[0.1] text-xs text-[#F2EFE9]"
                    />
                    <input
                      type={showPwd ? 'text' : 'password'}
                      inputMode={selectedMode === 'pin' ? 'numeric' : 'text'}
                      required
                      minLength={4}
                      value={confirmPwd}
                      onChange={(e) =>
                        setConfirmPwd(
                          selectedMode === 'pin'
                            ? e.target.value.replace(/\D/g, '').slice(0, 6)
                            : e.target.value
                        )
                      }
                      placeholder="تأكيد الرمز الجديد"
                      className="w-full min-h-[42px] px-3.5 rounded-xl bg-[#141720] border border-white/[0.1] text-xs text-[#F2EFE9]"
                    />
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={lockBusy}
                        className="flex-1 min-h-[42px] rounded-xl bg-[#D4A853] text-[#0B0D12] text-xs font-bold cursor-pointer"
                      >
                        تحديث الرمز
                      </button>
                      <button
                        type="button"
                        onClick={resetPwdFields}
                        className="min-h-[42px] px-3.5 rounded-xl bg-[#141720] text-xs text-[#9CA3AF] cursor-pointer"
                      >
                        إلغاء
                      </button>
                    </div>
                  </form>
                )}

                {/* Disable Lock Form */}
                {lockAction === 'disable' && (
                  <form onSubmit={(e) => void handleDisableLock(e)} className="space-y-2 pt-2">
                    <input
                      type={showPwd ? 'text' : 'password'}
                      required
                      value={currentPwd}
                      onChange={(e) => setCurrentPwd(e.target.value)}
                      placeholder="أدخل كلمة المرور الحالية لإيقاف القفل"
                      className="w-full min-h-[42px] px-3.5 rounded-xl bg-[#141720] border border-rose-500/30 text-xs text-[#F2EFE9]"
                    />
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={lockBusy}
                        className="flex-1 min-h-[42px] rounded-xl bg-rose-500 text-white text-xs font-bold cursor-pointer"
                      >
                        تأكيد إيقاف القفل
                      </button>
                      <button
                        type="button"
                        onClick={resetPwdFields}
                        className="min-h-[42px] px-3.5 rounded-xl bg-[#141720] text-xs text-[#9CA3AF] cursor-pointer"
                      >
                        إلغاء
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </section>

          {/* Export */}
          <button
            type="button"
            onClick={handleExport}
            className="w-full min-h-[52px] px-4 py-3 rounded-2xl bg-[#1B1F2B] hover:bg-[#232838] border border-white/[0.08] flex items-center justify-between text-right transition-colors cursor-pointer"
          >
            <div>
              <div className="text-sm font-semibold text-[#F2EFE9]">تصدير نسخة احتياطية (JSON)</div>
              <div className="text-xs text-[#9CA3AF] mt-0.5">حفظ دائرتي، العبارات المستوردة، المفضلات، المزاج، والتدريب</div>
            </div>
            <DownloadIcon className="w-5 h-5 text-[#D4A853] shrink-0 mr-3" />
          </button>

          {/* Import */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full min-h-[52px] px-4 py-3 rounded-2xl bg-[#1B1F2B] hover:bg-[#232838] border border-white/[0.08] flex items-center justify-between text-right transition-colors cursor-pointer"
          >
            <div>
              <div className="text-sm font-semibold text-[#F2EFE9]">استيراد نسخة احتياطية (JSON)</div>
              <div className="text-xs text-[#9CA3AF] mt-0.5">استرجاع بياناتك من ملف نسخة احتياطية سابقة</div>
            </div>
            <UploadIcon className="w-5 h-5 text-[#D4A853] shrink-0 mr-3" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            onChange={handleFileChange}
            className="hidden"
          />

          {/* PWA Install & APK Conversion Readiness Section */}
          <div className="p-4 rounded-2xl bg-[#1B1F2B] border border-white/[0.08] space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-[#F2EFE9]">
                  {isInstalled ? 'التطبيق مثبّت وجاهز أوفلاين ✓' : 'تثبيت كتطبيق أو تحويله إلى APK'}
                </div>
                <div className="text-xs text-[#9CA3AF] mt-0.5">
                  ملفات PWA و Capacitor جاهزة بالكامل (أيقونات + شاشة بداية + عمل أوفلاين 100%)
                </div>
              </div>
              {!isInstalled && isInstallable ? (
                <button
                  type="button"
                  onClick={() => {
                    void install();
                  }}
                  className="min-h-[44px] px-4 rounded-xl bg-[#D4A853] text-[#0B0D12] text-xs font-bold whitespace-nowrap shrink-0 hover:bg-[#E2BA6B] transition-colors cursor-pointer"
                >
                  تثبيت الآن
                </button>
              ) : !isInstalled && isIOS ? (
                <button
                  type="button"
                  onClick={() => setShowIOSGuide((v) => !v)}
                  className="min-h-[44px] px-4 rounded-xl border border-[#D4A853]/40 text-[#D4A853] text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer"
                >
                  طريقة iPhone
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowIOSGuide((v) => !v)}
                  className="min-h-[40px] px-3.5 rounded-xl border border-[#D4A853]/35 text-[#D4A853] text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {showIOSGuide ? 'إخفاء الدليل' : 'دليل APK'}
                </button>
              )}
            </div>

            {showIOSGuide && (
              <div className="pt-3 border-t border-white/[0.08] text-xs text-[#D6D2C9] leading-relaxed space-y-2">
                <p>
                  <strong className="text-[#D4A853]">1. التثبيت المباشر على الجوال (الأسرع):</strong>{' '}
                  في أندرويد (Chrome) افتح القائمة ← <strong>تثبيت التطبيق</strong>. في آيفون (Safari) اضغط <strong>مشاركة (Share)</strong> ← <strong>إضافة إلى الشاشة الرئيسية</strong>. يعمل بعدها كـتطبيق مستقل بدون شريط متصفح وأوفلاين 100%.
                </p>
                <p>
                  <strong className="text-[#D4A853]">2. استخراج ملف APK لأندرويد:</strong>{' '}
                  التطبيق مجهّز بملف Manifest كامل واختصارات وأيقونات قابلة للقناع (Maskable) وملف <code className="text-[#F2EFE9]" dir="ltr">capacitor.config.json</code>. يمكنك تحويل الرابط مباشرة إلى APK عبر <strong>PWABuilder</strong> أو تغليف مجلد البناء <code className="text-[#F2EFE9]" dir="ltr">dist/</code> عبر <strong>Capacitor</strong> بأمر واحد.
                </p>
              </div>
            )}
          </div>

          {/* Ethics re-read */}
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenEthics();
            }}
            className="w-full min-h-[48px] px-4 py-3 rounded-2xl bg-[#1B1F2B] hover:bg-[#232838] border border-white/[0.08] flex items-center justify-between text-right transition-colors cursor-pointer"
          >
            <span className="text-sm font-medium text-[#F2EFE9]">مراجعة الميثاق الأخلاقي والعلمي</span>
            <ShieldIcon className="w-4 h-4 text-[#9CA3AF]" />
          </button>

          {/* Reset data */}
          <div className="pt-3 border-t border-white/[0.08]">
            {!confirmReset ? (
              <button
                type="button"
                onClick={() => setConfirmReset(true)}
                className="w-full min-h-[48px] px-4 py-3 rounded-2xl border border-rose-500/25 text-rose-400 hover:bg-rose-500/10 flex items-center justify-center gap-2 text-sm font-medium transition-colors cursor-pointer"
              >
                <TrashIcon className="w-4 h-4" />
                <span>مسح جميع البيانات المحلية</span>
              </button>
            ) : (
              <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 space-y-3">
                <p className="text-sm text-rose-200">
                  هل أنت متأكد؟ سيتم حذف جميع ملفات دائرتي، الملاحظات، سجلات المزاج، وتقدم التدريب نهائياً. يُنصح بتصدير نسخة احتياطية أولاً.
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onResetAll();
                      setConfirmReset(false);
                      setStatusMsg({ type: 'ok', text: 'تم تصفير جميع البيانات المحلية.' });
                    }}
                    className="flex-1 min-h-[44px] rounded-xl bg-rose-500 text-white text-sm font-semibold hover:bg-rose-600 transition-colors cursor-pointer"
                  >
                    نعم، امسح الكل
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmReset(false)}
                    className="flex-1 min-h-[44px] rounded-xl bg-[#1B1F2B] text-[#F2EFE9] text-sm font-medium border border-white/[0.1] cursor-pointer"
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
