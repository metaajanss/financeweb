'use client'

import { useEffect, useState } from 'react'
import { X, Loader2, CalendarPlus, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'
import { createManualMeeting } from '@/features/meetings'

interface ManualMeetingModalProps {
    open: boolean
    onClose: () => void
    onCreated?: () => void
}

function defaultStartLocal() {
    const d = new Date()
    d.setMinutes(d.getMinutes() + 30 - (d.getMinutes() % 15))
    d.setSeconds(0)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function ManualMeetingModal({ open, onClose, onCreated }: ManualMeetingModalProps) {
    const t = useTranslations('CalendarPage.manualForm')
    const [title, setTitle] = useState('')
    const [startsAt, setStartsAt] = useState(defaultStartLocal())
    const [duration, setDuration] = useState(30)
    const [attendee, setAttendee] = useState('')
    const [description, setDescription] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (open) {
            setTitle('')
            setStartsAt(defaultStartLocal())
            setDuration(30)
            setAttendee('')
            setDescription('')
            setError(null)
            setSubmitting(false)
        }
    }, [open])

    if (!open) return null

    const submit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        setSubmitting(true)
        try {
            const result = await createManualMeeting({
                title,
                startsAtLocal: startsAt,
                durationMinutes: Number(duration),
                attendeeEmail: attendee.trim() || undefined,
                description: description.trim() || undefined,
            })
            if ('error' in result && result.error) {
                setError(result.error)
                return
            }
            toast.success(t('success'))
            onCreated?.()
            onClose()
        } catch (err) {
            setError(err instanceof Error ? err.message : t('unknownError'))
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <form
                onSubmit={submit}
                className="bg-surface border border-border rounded-3xl shadow-2xl w-full max-w-lg p-6 lg:p-8 space-y-5"
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                            <CalendarPlus size={20} className="text-primary" />
                        </div>
                        <div>
                            <h2 className="text-base font-black text-foreground uppercase tracking-widest">
                                {t('modalTitle')}
                            </h2>
                            <p className="text-[10px] text-muted font-bold uppercase tracking-widest opacity-70">
                                {t('info')}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-muted text-muted hover:text-foreground transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="text-[10px] font-black text-muted uppercase tracking-widest mb-1.5 block">
                            {t('title')}
                        </label>
                        <input
                            type="text"
                            required
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder={t('titlePlaceholder')}
                            className="w-full px-3 py-2.5 rounded-lg bg-background border border-border text-sm text-foreground focus:border-primary focus:outline-none"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-black text-muted uppercase tracking-widest mb-1.5 block">
                                {t('dateTime')}
                            </label>
                            <input
                                type="datetime-local"
                                required
                                value={startsAt}
                                onChange={(e) => setStartsAt(e.target.value)}
                                className="w-full px-3 py-2.5 rounded-lg bg-background border border-border text-sm text-foreground focus:border-primary focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-muted uppercase tracking-widest mb-1.5 block">
                                {t('duration')}
                            </label>
                            <input
                                type="number"
                                required
                                min={5}
                                max={480}
                                step={5}
                                value={duration}
                                onChange={(e) => setDuration(Number(e.target.value))}
                                className="w-full px-3 py-2.5 rounded-lg bg-background border border-border text-sm text-foreground focus:border-primary focus:outline-none"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-[10px] font-black text-muted uppercase tracking-widest mb-1.5 block">
                            {t('attendee')}
                        </label>
                        <input
                            type="email"
                            value={attendee}
                            onChange={(e) => setAttendee(e.target.value)}
                            placeholder={t('attendeePlaceholder')}
                            className="w-full px-3 py-2.5 rounded-lg bg-background border border-border text-sm text-foreground focus:border-primary focus:outline-none"
                        />
                    </div>

                    <div>
                        <label className="text-[10px] font-black text-muted uppercase tracking-widest mb-1.5 block">
                            {t('description')}
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={3}
                            placeholder={t('descriptionPlaceholder')}
                            className="w-full px-3 py-2.5 rounded-lg bg-background border border-border text-sm text-foreground focus:border-primary focus:outline-none resize-y"
                        />
                    </div>
                </div>

                {error && (
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                        <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                        <p className="text-[11px] text-red-500 font-medium">{error}</p>
                    </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={submitting}
                        className="px-4 py-2 rounded-lg text-sm font-medium text-muted hover:bg-muted/50 disabled:opacity-50"
                    >
                        {t('cancel')}
                    </button>
                    <button
                        type="submit"
                        disabled={submitting || !title.trim() || !startsAt}
                        className="flex items-center gap-2 px-5 py-2 rounded-lg btn-primary-gradient text-sm font-bold uppercase tracking-widest disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        {submitting && <Loader2 size={14} className="animate-spin" />}
                        {t('create')}
                    </button>
                </div>
            </form>
        </div>
    )
}
