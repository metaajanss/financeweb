'use client';

import { useTranslations } from 'next-intl';
import { CheckCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';

interface TwilioFormProps {
    step: 'IDLE' | 'OTP' | 'VERIFIED';
    setStep: (s: 'IDLE' | 'OTP' | 'VERIFIED') => void;
    from: string;
    setFrom: (v: string) => void;
    otp: string;
    setOtp: (v: string) => void;
    profileName: string;
    setProfileName: (v: string) => void;
    onResend?: (method: 'sms' | 'voice') => void;
    disabled?: boolean;
}

export function TwilioForm({ step, setStep, from, setFrom, otp, setOtp, profileName, setProfileName, onResend, disabled }: TwilioFormProps) {
    const t = useTranslations('Integrations.twilio');

    return (
        <>
            {step === 'IDLE' && (
                <div className="space-y-4">
                    <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl space-y-2">
                        <div className="flex items-center gap-2">
                            <AlertTriangle size={14} className="text-amber-500 shrink-0" />
                            <p className="text-xs font-bold text-amber-500">{t('checklistTitle')}</p>
                        </div>
                        <ul className="space-y-1.5 pl-1">
                            {(['checklistItem1', 'checklistItem2', 'checklistItem3', 'checklistItem4'] as const).map((key) => (
                                <li key={key} className="flex items-start gap-2 text-[11px] text-muted-foreground leading-relaxed">
                                    <span className="text-amber-500 mt-0.5 shrink-0">•</span>
                                    <span>{t(key)}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">{t('phoneLabel')}</label>
                        <input
                            type="text"
                            value={from}
                            onChange={(e) => setFrom(e.target.value)}
                            placeholder={t('phonePlaceholder')}
                            className="w-full p-3 rounded-lg bg-background border border-border focus:ring-2 focus:ring-primary outline-none"
                        />
                        <p className="text-[10px] text-muted-foreground">{t('phoneDesc')}</p>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">{t('nameLabel')}</label>
                        <input
                            type="text"
                            value={profileName}
                            onChange={(e) => setProfileName(e.target.value)}
                            placeholder={t('namePlaceholder')}
                            className="w-full p-3 rounded-lg bg-background border border-border focus:ring-2 focus:ring-primary outline-none"
                        />
                        <p className="text-[10px] text-muted-foreground">{t('nameDesc')}</p>
                    </div>
                </div>
            )}

            {step === 'OTP' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="text-center py-2">
                        <p className="text-sm font-medium">{t('codeSent')}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                            {t.rich('codeSentDesc', {
                                number: () => <span className="font-bold text-foreground">{from}</span>
                            })}
                        </p>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">{t('otpLabel')}</label>
                        <input
                            type="text"
                            maxLength={6}
                            value={otp}
                            onChange={(e) => setOtp(e.target.value)}
                            placeholder={t('otpPlaceholder')}
                            className="w-full p-4 text-center text-2xl tracking-[1em] font-bold rounded-lg bg-background border border-border focus:ring-2 focus:ring-primary outline-none"
                        />
                    </div>
                    <div className="flex flex-col gap-2">
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => onResend?.('sms')} disabled={disabled}>
                                {t('resendSms')}
                            </Button>
                            <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => onResend?.('voice')} disabled={disabled}>
                                {t('voiceCall')}
                            </Button>
                        </div>
                        <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => setStep('IDLE')}>
                            {t('changeNumber')}
                        </Button>
                    </div>
                </div>
            )}

            {step === 'VERIFIED' && (
                <div className="py-2 space-y-4">
                    <div className="flex items-center gap-3 p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
                        <CheckCircle className="text-emerald-500" size={20} />
                        <div>
                            <p className="text-sm font-bold text-emerald-500">{t('verifiedTitle')}</p>
                            <p className="text-xs text-muted-foreground">{t('verifiedDesc', { number: from })}</p>
                        </div>
                    </div>
                    <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl space-y-2 mt-4">
                        <div className="flex items-center justify-between">
                            <p className="text-[10px] font-black uppercase text-primary tracking-widest">{t('webhookStatus')}</p>
                            <div className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 text-[8px] font-black uppercase tracking-tighter border border-emerald-500/20">{t('webhookActive')}</div>
                        </div>
                        <div className="flex items-center gap-2 group">
                            <code className="text-[11px] font-mono bg-background/50 p-2.5 rounded-lg border border-border flex-1 border-dashed group-hover:border-primary/50 transition-colors">
                                https://jumpix.app/api/webhooks/whatsapp
                            </code>
                        </div>
                        <p className="text-[10px] text-muted-foreground leading-tight">
                            {t('webhookInfo')}
                        </p>
                    </div>
                </div>
            )}

            {step !== 'VERIFIED' && (
                <div className="p-4 bg-muted/30 border border-border rounded-xl">
                    <p className="text-[10px] text-muted-foreground leading-relaxed">
                        <span className="font-bold text-foreground">{t('noteTitle')}</span> {t('noteDesc')}
                    </p>
                </div>
            )}
        </>
    );
}
