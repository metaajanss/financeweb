/**
 * Centralized user-facing strings for the avatar feature.
 *
 * Goal: keep all human-readable error / status text in one place so we can
 * audit translations, copy-edit, and (eventually) plumb a real locale through.
 * For now every caller uses the default 'tr' locale; the structure is
 * forward-compatible with a future locale router.
 */
export const avatarMessages = {
    planRequired: {
        tr: 'AI Avatar Pro veya Business plan gerektirir',
        en: 'AI Avatar requires Pro or Business plan',
    },
    presentationPlanRequired: {
        tr: 'Sunum yükleme Pro veya Business plan gerektirir',
        en: 'Presentation upload requires Pro or Business plan',
    },
    subscriptionInactive: {
        tr: 'Aboneliğiniz aktif değil',
        en: 'Subscription is not active',
    },
    avatarFeatureNotEnabled: {
        tr: 'Avatar bu hesap için etkin değil',
        en: 'Avatar feature not enabled for this account',
    },
    avatarFeatureDisabled: {
        tr: 'Avatar özelliği geçici olarak devre dışı',
        en: 'Avatar feature is temporarily disabled',
    },
    pdfRequired: {
        tr: 'PDF dosyası gerekli',
        en: 'PDF file is required',
    },
    pdfOnly: {
        tr: 'Sadece PDF dosyası kabul edilir',
        en: 'Only PDF files are accepted',
    },
    pdfTooLarge: {
        tr: "Dosya boyutu 10 MB'ı aşamaz",
        en: 'File size cannot exceed 10 MB',
    },
    pdfProcessFailed: {
        tr: 'PDF işlenemedi',
        en: 'Failed to process PDF',
    },
    pdfEmpty: {
        tr: 'PDF boş veya okunamadı',
        en: 'PDF is empty or unreadable',
    },
    pdfUploadFailed: {
        tr: 'PDF yüklenemedi',
        en: 'Failed to upload PDF',
    },
    presentationInsertFailed: {
        tr: 'Sunum kaydı oluşturulamadı',
        en: 'Failed to create presentation record',
    },
    slideImageUploadFailed: {
        tr: 'Slayt görseli yüklenemedi',
        en: 'Failed to upload slide image',
    },
    slideInsertFailed: {
        tr: 'Slayt kaydı eklenemedi',
        en: 'Failed to insert slide record',
    },
} as const

export type AvatarMessageKey = keyof typeof avatarMessages
export type AvatarLocale = 'tr' | 'en'

export function t(key: AvatarMessageKey, lang: AvatarLocale = 'tr'): string {
    return avatarMessages[key][lang] ?? avatarMessages[key].tr
}
