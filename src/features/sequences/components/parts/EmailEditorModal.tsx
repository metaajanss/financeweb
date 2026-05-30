'use client';

import { useEffect, useCallback, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import Link from '@tiptap/extension-link';
import Color from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import CharacterCount from '@tiptap/extension-character-count';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import {
    Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight,
    List, ListOrdered, Link2, Image as ImageIcon, X, Check,
    Strikethrough, Heading1, Heading2, Eye, EyeOff, Code,
} from 'lucide-react';
import { cn } from '@/shared/utils';

interface EmailEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onApply: (html: string) => void;
    initialContent: string;
    channel: 'email' | 'whatsapp';
    variantLabel?: string;
}

/** Template variable chips shown in the toolbar */
const TEMPLATE_VARS = [
    { label: 'Ad', value: '{{firstName}}' },
    { label: 'Soyad', value: '{{lastName}}' },
    { label: 'Şirket', value: '{{company}}' },
    { label: 'E-posta', value: '{{email}}' },
    { label: 'Telefon', value: '{{phone}}' },
    { label: 'Kaynak', value: '{{source}}' },
];

function ToolbarButton({
    onClick,
    active,
    title,
    children,
    disabled,
}: {
    onClick: () => void;
    active?: boolean;
    title: string;
    children: React.ReactNode;
    disabled?: boolean;
}) {
    return (
        <button
            type="button"
            title={title}
            disabled={disabled}
            onClick={onClick}
            className={cn(
                'p-1.5 rounded-md transition-all text-slate-600 dark:text-slate-400',
                'hover:bg-slate-100 dark:hover:bg-slate-800',
                active && 'bg-primary/15 text-primary',
                disabled && 'opacity-40 cursor-not-allowed pointer-events-none'
            )}
        >
            {children}
        </button>
    );
}

function Separator() {
    return <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 mx-1 self-center" />;
}

export function EmailEditorModal({
    isOpen,
    onClose,
    onApply,
    initialContent,
    channel,
    variantLabel,
}: EmailEditorModalProps) {
    const [showPreview, setShowPreview] = useState(false);
    const [linkUrl, setLinkUrl] = useState('');
    const [showLinkInput, setShowLinkInput] = useState(false);
    const [imageUrl, setImageUrl] = useState('');
    const [showImageInput, setShowImageInput] = useState(false);

    const isEmail = channel === 'email';

    const editor = useEditor({
        immediatelyRender: false,
        extensions: [
            StarterKit.configure({
                bulletList: { keepMarks: true },
                orderedList: { keepMarks: true },
            }),
            ...(isEmail ? [
                TextAlign.configure({ types: ['heading', 'paragraph'] }),
                Link.configure({ openOnClick: false, HTMLAttributes: { class: 'text-blue-600 underline' } }),
                Color,
                TextStyle,
                Image.configure({ HTMLAttributes: { class: 'max-w-full rounded-lg my-2' } }),
            ] : []),
            CharacterCount,
            Placeholder.configure({
                placeholder: isEmail
                    ? 'Email içeriğini buraya yazın...'
                    : 'WhatsApp mesajını buraya yazın...',
            }),
        ],
        content: initialContent || '',
        editorProps: {
            attributes: {
                class: cn(
                    'prose prose-sm dark:prose-invert max-w-none outline-none min-h-[280px] p-4',
                    'text-slate-800 dark:text-slate-200',
                    '[&_a]:text-blue-600 [&_a]:underline',
                    '[&_.is-editor-empty:first-child]:before:content-[attr(data-placeholder)]',
                    '[&_.is-editor-empty:first-child]:before:text-slate-400',
                    '[&_.is-editor-empty:first-child]:before:pointer-events-none',
                    '[&_.is-editor-empty:first-child]:before:float-left',
                    '[&_.is-editor-empty:first-child]:before:h-0',
                ),
            },
        },
    });

    // Sync content when modal re-opens with new initialContent
    useEffect(() => {
        if (editor && isOpen) {
            const current = editor.getHTML();
            if (current !== initialContent) {
                editor.commands.setContent(initialContent || '');
            }
        }
    }, [isOpen, initialContent, editor]);

    const handleApply = useCallback(() => {
        if (!editor) return;
        const html = editor.getHTML();
        // For whatsapp, strip HTML tags and return plain text
        const output = isEmail ? html : editor.getText();
        onApply(output);
        onClose();
    }, [editor, isEmail, onApply, onClose]);

    const handleInsertLink = useCallback(() => {
        if (!editor || !linkUrl) return;
        editor.chain().focus().setLink({ href: linkUrl, target: '_blank' }).run();
        setLinkUrl('');
        setShowLinkInput(false);
    }, [editor, linkUrl]);

    const handleInsertImage = useCallback(() => {
        if (!editor || !imageUrl) return;
        editor.chain().focus().setImage({ src: imageUrl }).run();
        setImageUrl('');
        setShowImageInput(false);
    }, [editor, imageUrl]);

    const handleInsertVar = useCallback((varValue: string) => {
        if (!editor) return;
        editor.chain().focus().insertContent(varValue).run();
    }, [editor]);

    const charCount = editor?.storage.characterCount?.characters?.() ?? 0;

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-3xl bg-white dark:bg-[#0f1115] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl shadow-black/30 flex flex-col overflow-hidden animate-in zoom-in-95 fade-in duration-200 max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-indigo-500/20 flex items-center justify-center">
                            {isEmail
                                ? <Bold size={15} className="text-primary" />
                                : <Code size={15} className="text-emerald-500" />
                            }
                        </div>
                        <div>
                            <h2 className="text-sm font-black text-slate-900 dark:text-white">
                                {isEmail ? 'Email Şablonu Düzenle' : 'WhatsApp Mesajı Düzenle'}
                                {variantLabel && (
                                    <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                                        {variantLabel}
                                    </span>
                                )}
                            </h2>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                {isEmail
                                    ? 'Tam formatlı HTML email — alıcı tam olarak gördüğü gibi alır'
                                    : 'Düz metin — WhatsApp *bold* ve _italic_ destekler'
                                }
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-500"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Toolbar — only for email */}
                {isEmail && !showPreview && (
                    <div className="flex flex-wrap items-center gap-0.5 px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 shrink-0">
                        {/* Text format */}
                        <ToolbarButton title="Kalın (Ctrl+B)" onClick={() => editor?.chain().focus().toggleBold().run()} active={editor?.isActive('bold')}>
                            <Bold size={15} />
                        </ToolbarButton>
                        <ToolbarButton title="İtalik (Ctrl+I)" onClick={() => editor?.chain().focus().toggleItalic().run()} active={editor?.isActive('italic')}>
                            <Italic size={15} />
                        </ToolbarButton>
                        <ToolbarButton title="Altı Çizili (Ctrl+U)" onClick={() => editor?.chain().focus().toggleUnderline?.().run?.()} active={editor?.isActive('underline')}>
                            <Underline size={15} />
                        </ToolbarButton>
                        <ToolbarButton title="Üstü Çizili" onClick={() => editor?.chain().focus().toggleStrike().run()} active={editor?.isActive('strike')}>
                            <Strikethrough size={15} />
                        </ToolbarButton>

                        <Separator />

                        {/* Headings */}
                        <ToolbarButton title="Başlık 1" onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()} active={editor?.isActive('heading', { level: 1 })}>
                            <Heading1 size={15} />
                        </ToolbarButton>
                        <ToolbarButton title="Başlık 2" onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} active={editor?.isActive('heading', { level: 2 })}>
                            <Heading2 size={15} />
                        </ToolbarButton>

                        <Separator />

                        {/* Lists */}
                        <ToolbarButton title="Madde listesi" onClick={() => editor?.chain().focus().toggleBulletList().run()} active={editor?.isActive('bulletList')}>
                            <List size={15} />
                        </ToolbarButton>
                        <ToolbarButton title="Sıralı liste" onClick={() => editor?.chain().focus().toggleOrderedList().run()} active={editor?.isActive('orderedList')}>
                            <ListOrdered size={15} />
                        </ToolbarButton>

                        <Separator />

                        {/* Alignment */}
                        <ToolbarButton title="Sola hizala" onClick={() => editor?.chain().focus().setTextAlign('left').run()} active={editor?.isActive({ textAlign: 'left' })}>
                            <AlignLeft size={15} />
                        </ToolbarButton>
                        <ToolbarButton title="Ortala" onClick={() => editor?.chain().focus().setTextAlign('center').run()} active={editor?.isActive({ textAlign: 'center' })}>
                            <AlignCenter size={15} />
                        </ToolbarButton>
                        <ToolbarButton title="Sağa hizala" onClick={() => editor?.chain().focus().setTextAlign('right').run()} active={editor?.isActive({ textAlign: 'right' })}>
                            <AlignRight size={15} />
                        </ToolbarButton>

                        <Separator />

                        {/* Link */}
                        <ToolbarButton title="Link ekle" onClick={() => { setShowLinkInput(v => !v); setShowImageInput(false); }} active={showLinkInput || editor?.isActive('link')}>
                            <Link2 size={15} />
                        </ToolbarButton>

                        {/* Image */}
                        <ToolbarButton title="Resim ekle (URL)" onClick={() => { setShowImageInput(v => !v); setShowLinkInput(false); }} active={showImageInput}>
                            <ImageIcon size={15} />
                        </ToolbarButton>
                    </div>
                )}

                {/* Link input row */}
                {isEmail && showLinkInput && (
                    <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-200 dark:border-slate-800 bg-blue-50/50 dark:bg-blue-900/10 shrink-0">
                        <Link2 size={14} className="text-blue-500 shrink-0" />
                        <input
                            autoFocus
                            type="url"
                            value={linkUrl}
                            onChange={e => setLinkUrl(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleInsertLink()}
                            placeholder="https://örnek.com"
                            className="flex-1 text-sm bg-transparent outline-none placeholder:text-slate-400"
                        />
                        <button
                            type="button"
                            onClick={handleInsertLink}
                            disabled={!linkUrl}
                            className="px-3 py-1 text-xs font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40"
                        >
                            Ekle
                        </button>
                        <button type="button" onClick={() => setShowLinkInput(false)} className="text-slate-400 hover:text-slate-600">
                            <X size={14} />
                        </button>
                    </div>
                )}

                {/* Image URL input row */}
                {isEmail && showImageInput && (
                    <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-200 dark:border-slate-800 bg-emerald-50/50 dark:bg-emerald-900/10 shrink-0">
                        <ImageIcon size={14} className="text-emerald-500 shrink-0" />
                        <input
                            autoFocus
                            type="url"
                            value={imageUrl}
                            onChange={e => setImageUrl(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleInsertImage()}
                            placeholder="https://örnek.com/resim.png"
                            className="flex-1 text-sm bg-transparent outline-none placeholder:text-slate-400"
                        />
                        <button
                            type="button"
                            onClick={handleInsertImage}
                            disabled={!imageUrl}
                            className="px-3 py-1 text-xs font-bold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-40"
                        >
                            Ekle
                        </button>
                        <button type="button" onClick={() => setShowImageInput(false)} className="text-slate-400 hover:text-slate-600">
                            <X size={14} />
                        </button>
                    </div>
                )}

                {/* Template variable chips */}
                <div className="flex flex-wrap items-center gap-1.5 px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40 shrink-0">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-1">Değişkenler:</span>
                    {TEMPLATE_VARS.map(v => (
                        <button
                            key={v.value}
                            type="button"
                            onClick={() => handleInsertVar(v.value)}
                            className="px-2 py-0.5 text-[11px] font-mono font-bold rounded-md border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                        >
                            {v.value}
                        </button>
                    ))}
                </div>

                {/* Editor / Preview */}
                <div className="flex-1 overflow-y-auto min-h-0">
                    {showPreview ? (
                        <div
                            className="p-6 prose prose-sm dark:prose-invert max-w-none text-slate-800 dark:text-slate-200 [&_a]:text-blue-600 [&_a]:underline"
                            dangerouslySetInnerHTML={{ __html: editor?.getHTML() || '' }}
                        />
                    ) : (
                        <EditorContent
                            editor={editor}
                            className="h-full [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[280px] [&_.ProseMirror]:p-5 [&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.ProseMirror_p.is-editor-empty:first-child::before]:text-slate-400 [&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none [&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left [&_.ProseMirror_p.is-editor-empty:first-child::before]:h-0"
                        />
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 shrink-0">
                    <div className="flex items-center gap-3">
                        <span className="text-[11px] text-slate-400 font-mono">
                            {charCount} karakter
                        </span>
                        {isEmail && (
                            <button
                                type="button"
                                onClick={() => setShowPreview(v => !v)}
                                className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                            >
                                {showPreview ? <EyeOff size={13} /> : <Eye size={13} />}
                                {showPreview ? 'Editör' : 'Önizleme'}
                            </button>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                        >
                            İptal
                        </button>
                        <button
                            type="button"
                            onClick={handleApply}
                            className="flex items-center gap-2 px-5 py-2 text-sm font-bold btn-primary-gradient text-white rounded-xl active:scale-[0.98] transition-all"
                        >
                            <Check size={15} />
                            Uygula
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
