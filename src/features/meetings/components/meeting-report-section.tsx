'use client'

import { useEffect, useState } from 'react'
import { Loader2, Download, FileVideo, FileText, Sparkles, BarChart3 } from 'lucide-react'
import { getMeetingReport } from '@/features/meetings'

type Tab = 'summary' | 'recording' | 'transcript'

interface MeetingReportSectionProps {
    meetingId: string
}

interface Report {
    meeting: {
        id: string
        title: string | null
        status: string | null
        start_time: string
        end_time: string
        recording_url: string | null
        transcript_url: string | null
    }
    transcripts: Array<{
        id: string
        speaker: string | null
        content: string
        spoken_at: string | null
        created_at: string
    }>
    metrics: Record<string, unknown>
    summary: string
}

export default function MeetingReportSection({ meetingId }: MeetingReportSectionProps) {
    const [tab, setTab] = useState<Tab>('summary')
    const [report, setReport] = useState<Report | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        let cancelled = false
        ;(async () => {
            setLoading(true)
            setError(null)
            const result = await getMeetingReport(meetingId)
            if (cancelled) return
            if ('error' in result && result.error) {
                setError(result.error)
            } else if ('meeting' in result) {
                setReport(result as Report)
            }
            setLoading(false)
        })()
        return () => { cancelled = true }
    }, [meetingId])

    if (loading) {
        return (
            <div className="flex items-center gap-2 py-12 justify-center text-muted">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Toplantı raporu yükleniyor...</span>
            </div>
        )
    }
    if (error || !report) {
        return <div className="text-sm text-red-500 py-4">{error || 'Rapor yüklenemedi'}</div>
    }

    const slidesShown = (report.metrics['slides_shown'] as number[] | undefined) || []
    const questionsAnswered = (report.metrics['questions_answered'] as number | undefined) || 0
    const durationMs = (report.metrics['presentation_duration_ms'] as number | undefined) || 0
    const minutes = Math.floor(durationMs / 60000)
    const seconds = Math.floor((durationMs % 60000) / 1000)

    const downloadTranscript = () => {
        const text = report.transcripts
            .map(t => `[${t.spoken_at || t.created_at}] ${t.speaker || 'Konuşmacı'}: ${t.content}`)
            .join('\n')
        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `transcript-${meetingId}.txt`
        a.click()
        URL.revokeObjectURL(url)
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-1 border-b border-border">
                <TabButton active={tab === 'summary'} icon={<Sparkles size={14} />} onClick={() => setTab('summary')}>Özet</TabButton>
                <TabButton active={tab === 'recording'} icon={<FileVideo size={14} />} onClick={() => setTab('recording')}>Kayıt</TabButton>
                <TabButton active={tab === 'transcript'} icon={<FileText size={14} />} onClick={() => setTab('transcript')}>Transkript</TabButton>
            </div>

            {tab === 'summary' && (
                <div className="space-y-4">
                    {report.summary ? (
                        <div className="p-4 rounded-xl bg-background border border-border">
                            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{report.summary}</p>
                        </div>
                    ) : (
                        <p className="text-sm text-muted py-4">Özet henüz oluşturulmadı.</p>
                    )}

                    {(slidesShown.length > 0 || questionsAnswered > 0 || durationMs > 0) && (
                        <div className="grid grid-cols-3 gap-3">
                            <MetricCard
                                icon={<BarChart3 size={16} />}
                                label="Sunulan slayt"
                                value={String(slidesShown.length)}
                            />
                            <MetricCard
                                icon={<BarChart3 size={16} />}
                                label="Yanıtlanan soru"
                                value={String(questionsAnswered)}
                            />
                            <MetricCard
                                icon={<BarChart3 size={16} />}
                                label="Sunum süresi"
                                value={`${minutes}d ${seconds}s`}
                            />
                        </div>
                    )}
                </div>
            )}

            {tab === 'recording' && (
                <div className="space-y-3">
                    {report.meeting.recording_url ? (
                        <>
                            <video
                                src={report.meeting.recording_url}
                                controls
                                className="w-full rounded-xl bg-black"
                            />
                            <a
                                href={report.meeting.recording_url}
                                download
                                className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                            >
                                <Download size={14} /> Kaydı indir
                            </a>
                        </>
                    ) : (
                        <p className="text-sm text-muted py-6">Toplantı kaydı henüz hazır değil.</p>
                    )}
                </div>
            )}

            {tab === 'transcript' && (
                <div className="space-y-3">
                    {report.transcripts.length === 0 ? (
                        <p className="text-sm text-muted py-6">Transkript bulunamadı.</p>
                    ) : (
                        <>
                            <button
                                onClick={downloadTranscript}
                                className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                            >
                                <Download size={14} /> .txt olarak indir
                            </button>
                            <div className="max-h-96 overflow-y-auto p-4 rounded-xl bg-background border border-border space-y-2">
                                {report.transcripts.map(t => (
                                    <div key={t.id} className="text-sm">
                                        <span className="text-xs text-muted font-medium">
                                            [{new Date(t.spoken_at || t.created_at).toLocaleTimeString()}]{' '}
                                            <span className="text-foreground">{t.speaker || 'Konuşmacı'}:</span>
                                        </span>
                                        <span className="ml-2 text-foreground">{t.content}</span>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    )
}

function TabButton({
    active,
    icon,
    onClick,
    children,
}: {
    active: boolean
    icon: React.ReactNode
    onClick: () => void
    children: React.ReactNode
}) {
    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-widest border-b-2 transition-colors ${
                active
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted hover:text-foreground'
            }`}
        >
            {icon}
            {children}
        </button>
    )
}

function MetricCard({
    icon,
    label,
    value,
}: {
    icon: React.ReactNode
    label: string
    value: string
}) {
    return (
        <div className="p-3 rounded-xl bg-background border border-border">
            <div className="flex items-center gap-1.5 text-muted text-[10px] font-bold uppercase tracking-widest mb-1">
                {icon}
                {label}
            </div>
            <div className="text-lg font-black text-foreground">{value}</div>
        </div>
    )
}
