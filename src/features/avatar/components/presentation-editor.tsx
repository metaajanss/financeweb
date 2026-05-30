'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Upload, Trash2, RotateCw, FileText, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { MAX_PRESENTATION_PDF_BYTES } from '../constants'

interface SlideRow {
    id: string
    page_number: number
    image_url: string
    speaking_script: string
}

interface PresentationRow {
    id: string
    title: string | null
    page_count: number
    status: 'processing' | 'ready' | 'failed'
    error_message: string | null
}

const POLL_MS = 3000

export default function PresentationEditor() {
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [presentation, setPresentation] = useState<PresentationRow | null>(null)
    const [slides, setSlides] = useState<SlideRow[]>([])
    const [loading, setLoading] = useState(true)
    const [uploading, setUploading] = useState(false)
    const [savingSlideIds, setSavingSlideIds] = useState<Set<string>>(new Set())

    const fetchPresentation = useCallback(async () => {
        try {
            const res = await fetch('/api/avatar/presentation')
            if (!res.ok) {
                if (res.status !== 404) toast.error('Sunum bilgileri alınamadı')
                setPresentation(null)
                setSlides([])
                return
            }
            const data = await res.json().catch(() => {
                console.error('[PresentationEditor] Failed to parse presentation response')
                return { presentation: null, slides: [] }
            }) as { presentation: PresentationRow | null; slides: SlideRow[] }
            setPresentation(data.presentation)
            setSlides(data.slides || [])
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        void fetchPresentation()
    }, [fetchPresentation])

    // Poll while processing.
    useEffect(() => {
        if (presentation?.status !== 'processing') return
        const id = setInterval(() => {
            void fetchPresentation()
        }, POLL_MS)
        return () => clearInterval(id)
    }, [presentation?.status, fetchPresentation])

    const handleFile = useCallback(async (file: File) => {
        if (file.type !== 'application/pdf') {
            toast.error('Sadece PDF dosyası kabul edilir')
            return
        }
        if (file.size > MAX_PRESENTATION_PDF_BYTES) {
            toast.error('Dosya boyutu 10 MB\'ı aşamaz')
            return
        }
        if (presentation && !confirm('Mevcut sunum silinip yeni sunum yüklenecek. Devam edilsin mi?')) {
            return
        }

        setUploading(true)
        try {
            const formData = new FormData()
            formData.append('file', file)
            formData.append('title', file.name.replace(/\.pdf$/i, ''))

            const res = await fetch('/api/avatar/presentation', { method: 'POST', body: formData })
            if (!res.ok) {
                const body = await res.json().catch(() => ({}))
                toast.error((body as { error?: string }).error || 'Yükleme başarısız')
                return
            }
            const data = await res.json().catch(() => {
                console.error('[PresentationEditor] Failed to parse upload response')
                return { presentation: null, slides: [] }
            }) as { presentation: PresentationRow | null; slides: SlideRow[] }
            setPresentation(data.presentation)
            setSlides(data.slides || [])
            toast.success('Sunum yüklendi ve işlendi')
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Yükleme hatası')
        } finally {
            setUploading(false)
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }, [presentation])

    const onPickClick = () => fileInputRef.current?.click()
    const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0]
        if (f) void handleFile(f)
    }

    const onDrop = (e: React.DragEvent) => {
        e.preventDefault()
        const f = e.dataTransfer.files?.[0]
        if (f) void handleFile(f)
    }

    const handleDelete = async () => {
        if (!confirm('Sunumu silmek istediğinizden emin misiniz?')) return
        const res = await fetch('/api/avatar/presentation', { method: 'DELETE' })
        if (!res.ok) {
            toast.error('Silinemedi')
            return
        }
        setPresentation(null)
        setSlides([])
        toast.success('Sunum silindi')
    }

    const updateSlideScript = async (slide: SlideRow, newScript: string) => {
        if (slide.speaking_script === newScript) return
        setSavingSlideIds(prev => new Set(prev).add(slide.id))
        try {
            const res = await fetch(`/api/avatar/presentation/slides/${slide.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ speaking_script: newScript }),
            })
            if (!res.ok) {
                const body = await res.json().catch(() => ({}))
                toast.error((body as { error?: string }).error || 'Kayıt başarısız')
                return
            }
            setSlides(prev => prev.map(s => (s.id === slide.id ? { ...s, speaking_script: newScript } : s)))
            toast.success('Slayt güncellendi')
        } finally {
            setSavingSlideIds(prev => {
                const next = new Set(prev)
                next.delete(slide.id)
                return next
            })
        }
    }

    return (
        <div className="bg-surface border border-border p-6 lg:p-8 rounded-3xl shadow-xl shadow-black/10">
            <div className="flex items-center justify-between mb-6 border-b border-border pb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <FileText size={20} className="text-primary" />
                    </div>
                    <div>
                        <h2 className="text-lg font-black text-foreground uppercase tracking-widest">
                            Sunum Materyali
                        </h2>
                        <p className="text-[10px] text-muted font-bold uppercase tracking-widest opacity-70">
                            Maksimum 10 MB, tek PDF — toplantılarda avatar bu sunumu yapacak
                        </p>
                    </div>
                </div>
                {presentation && (
                    <div className="flex items-center gap-2">
                        <StatusBadge status={presentation.status} />
                        <button
                            type="button"
                            onClick={onPickClick}
                            disabled={uploading}
                            className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border border-border hover:border-primary/40 transition-colors disabled:opacity-40"
                        >
                            <RotateCw size={11} /> Yeniden Yükle
                        </button>
                        <button
                            type="button"
                            onClick={handleDelete}
                            className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border border-red-500/30 text-red-500 hover:bg-red-500/10 transition-colors"
                        >
                            <Trash2 size={11} /> Sil
                        </button>
                    </div>
                )}
            </div>

            <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={onPick}
            />

            {loading ? (
                <div className="flex items-center gap-2 py-12 justify-center text-muted">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-[11px] uppercase tracking-widest">Yükleniyor...</span>
                </div>
            ) : !presentation ? (
                <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={onDrop}
                    onClick={onPickClick}
                    className="border-2 border-dashed border-border rounded-2xl p-10 text-center hover:border-primary/40 hover:bg-primary/5 cursor-pointer transition-all"
                >
                    {uploading ? (
                        <div className="flex flex-col items-center gap-3">
                            <Loader2 className="w-10 h-10 text-primary animate-spin" />
                            <p className="text-sm font-semibold text-foreground">Yükleniyor ve işleniyor...</p>
                            <p className="text-[10px] text-muted uppercase tracking-widest">Bu birkaç saniye sürebilir</p>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-3">
                            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                                <Upload className="w-6 h-6 text-primary" />
                            </div>
                            <p className="text-sm font-semibold text-foreground">PDF dosyası yükleyin</p>
                            <p className="text-[10px] text-muted uppercase tracking-widest">Sürükleyip bırakın veya tıklayın · max 10 MB</p>
                        </div>
                    )}
                </div>
            ) : presentation.status === 'processing' ? (
                <div className="flex flex-col items-center gap-3 py-12">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    <p className="text-sm font-semibold text-foreground">PDF işleniyor</p>
                    <p className="text-[10px] text-muted uppercase tracking-widest">{presentation.page_count} sayfa için konuşma metni hazırlanıyor...</p>
                </div>
            ) : presentation.status === 'failed' ? (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-500 mt-0.5" />
                    <div>
                        <p className="text-[11px] font-bold text-red-500 uppercase tracking-widest">İşleme başarısız</p>
                        <p className="text-[10px] text-muted mt-1">{presentation.error_message || 'Bilinmeyen hata. Yeniden yüklemeyi deneyin.'}</p>
                    </div>
                </div>
            ) : (
                <div className="space-y-5">
                    <p className="text-[10px] text-muted uppercase tracking-widest">
                        {presentation.title} · {presentation.page_count} slayt — Her slayt için konuşma metnini gerekirse düzenleyin.
                    </p>
                    {slides.map((slide) => (
                        <SlideEditor
                            key={slide.id}
                            slide={slide}
                            isSaving={savingSlideIds.has(slide.id)}
                            onSave={(value) => updateSlideScript(slide, value)}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}

function StatusBadge({ status }: { status: PresentationRow['status'] }) {
    if (status === 'ready') {
        return (
            <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-emerald-500 bg-emerald-500/10 border border-emerald-500/30 px-2 py-1 rounded-md">
                <CheckCircle2 size={10} /> Hazır
            </span>
        )
    }
    if (status === 'processing') {
        return (
            <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-amber-500 bg-amber-500/10 border border-amber-500/30 px-2 py-1 rounded-md">
                <Loader2 size={10} className="animate-spin" /> İşleniyor
            </span>
        )
    }
    return (
        <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-red-500 bg-red-500/10 border border-red-500/30 px-2 py-1 rounded-md">
            <AlertCircle size={10} /> Başarısız
        </span>
    )
}

function SlideEditor({
    slide,
    isSaving,
    onSave,
}: {
    slide: SlideRow
    isSaving: boolean
    onSave: (value: string) => void
}) {
    const [draft, setDraft] = useState(slide.speaking_script)
    useEffect(() => setDraft(slide.speaking_script), [slide.speaking_script])
    const dirty = draft !== slide.speaking_script

    return (
        <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-4 p-4 rounded-xl bg-background border border-border/60">
            <div className="space-y-1">
                <p className="text-[9px] font-black text-muted uppercase tracking-widest">Slayt {slide.page_number}</p>

                <img
                    src={slide.image_url}
                    alt={`Slayt ${slide.page_number}`}
                    className="w-full rounded-lg border border-border/60"
                />
            </div>
            <div className="space-y-2">
                <label className="text-[9px] font-black text-muted uppercase tracking-widest">
                    Konuşma metni (avatar bu sayfada bunu söyleyecek)
                </label>
                <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    rows={6}
                    maxLength={4000}
                    className="w-full p-3 rounded-lg bg-surface border border-border text-sm text-foreground focus:border-primary focus:outline-none resize-y"
                />
                <div className="flex items-center justify-between">
                    <span className="text-[9px] text-muted uppercase tracking-widest">
                        {draft.length} / 4000
                    </span>
                    <button
                        type="button"
                        onClick={() => onSave(draft)}
                        disabled={!dirty || isSaving}
                        className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        {isSaving ? 'Kaydediliyor...' : dirty ? 'Kaydet' : 'Kaydedildi'}
                    </button>
                </div>
            </div>
        </div>
    )
}
