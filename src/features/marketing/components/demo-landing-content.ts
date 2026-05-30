type DemoContent = {
    metaTitle: string;
    metaDescription: string;
    header: {
        nav: Array<{ label: string; href: string }>;
        secondaryCta: string;
        primaryCta: string;
    };
    hero: {
        eyebrow: string;
        title: string;
        description: string;
        primaryCta: string;
        secondaryCta: string;
        support: string[];
        queueTitle: string;
        queueSubtitle: string;
        sequenceTitle: string;
        sequenceSubtitle: string;
        panelStats: Array<{ label: string; value: string }>;
    };
    integrations: {
        title: string;
        items: string[];
    };
    workflow: {
        eyebrow: string;
        title: string;
        description: string;
        steps: Array<{
            id: string;
            title: string;
            description: string;
            detail: string;
        }>;
        boardTitle: string;
        boardItems: Array<{ label: string; status: string }>;
    };
    platform: {
        eyebrow: string;
        title: string;
        description: string;
        modules: Array<{
            title: string;
            description: string;
            bullets: string[];
        }>;
    };
    visibility: {
        eyebrow: string;
        title: string;
        description: string;
        cards: Array<{
            title: string;
            description: string;
            lines: string[];
        }>;
    };
    pricing: {
        eyebrow: string;
        title: string;
        description: string;
        plans: Array<{
            name: string;
            price: string;
            period: string;
            description: string;
            features: string[];
            cta: string;
            featured?: boolean;
        }>;
    };
    faq: {
        eyebrow: string;
        title: string;
        description: string;
        items: Array<{ question: string; answer: string }>;
    };
    closing: {
        title: string;
        description: string;
        primaryCta: string;
        secondaryCta: string;
    };
    footer: {
        note: string;
        links: Array<{ label: string; href: string }>;
    };
};

const enContent: DemoContent = {
    metaTitle: "Jumpix Demo Landing",
    metaDescription: "A product-first demo landing for Jumpix focused on sales teams, lead workflows, and premium positioning.",
    header: {
        nav: [
            { label: "Platform", href: "#platform" },
            { label: "Workflow", href: "#workflow" },
            { label: "Pricing", href: "#pricing" },
            { label: "FAQ", href: "#faq" },
        ],
        secondaryCta: "Contact",
        primaryCta: "Book Demo",
    },
    hero: {
        eyebrow: "Demo concept for a sharper Jumpix homepage",
        title: "Run your revenue workflow from one calm command center.",
        description: "This concept repositions Jumpix around the work sales teams actually do every day: find leads, score opportunities, launch outreach, and keep pipeline visibility without bouncing across five tools.",
        primaryCta: "Book Demo",
        secondaryCta: "See Pricing",
        support: ["Lead discovery", "AI scoring", "Sequences", "Shared visibility"],
        queueTitle: "Priority queue",
        queueSubtitle: "Teams can see who to work next without digging through tabs.",
        sequenceTitle: "Sequence health",
        sequenceSubtitle: "Track what is running, what needs review, and what is converting.",
        panelStats: [
            { label: "Lead view", value: "Unified" },
            { label: "Routing", value: "Rules-based" },
            { label: "Outreach", value: "Multi-step" },
        ],
    },
    integrations: {
        title: "Built around the workflows already living in your stack",
        items: ["Google Ads", "Google Sheets", "Instagram", "TikTok", "CRM sync"],
    },
    workflow: {
        eyebrow: "How it flows",
        title: "From incoming demand to prioritized outreach in three moves.",
        description: "The homepage demo is structured around the product loop that matters most for revenue teams. Each step earns its place and shows what the operator sees next.",
        steps: [
            {
                id: "01",
                title: "Capture and enrich",
                description: "Pull in leads from paid channels, forms, and spreadsheets, then fill the record with the context your reps need.",
                detail: "Source, firmographic context, owner, and next action are visible immediately.",
            },
            {
                id: "02",
                title: "Score and route",
                description: "Use clear scoring logic to move high-intent accounts to the top and route them without manual triage.",
                detail: "Priority stays visible instead of hiding inside disconnected reports.",
            },
            {
                id: "03",
                title: "Sequence and track",
                description: "Launch outreach, review replies, and keep analytics close to the work instead of in a separate reporting layer.",
                detail: "Operators can see sequence state, replies, and meetings in one rhythm.",
            },
        ],
        boardTitle: "Operator board",
        boardItems: [
            { label: "Paid campaign lead synced", status: "Ready for enrichment" },
            { label: "ICP match scored 92/100", status: "Send to SDR queue" },
            { label: "Sequence launched with CRM context", status: "Watching replies" },
        ],
    },
    platform: {
        eyebrow: "Platform suite",
        title: "Four product surfaces. One buying story.",
        description: "Instead of showing disconnected feature blocks, this concept presents Jumpix as a compact suite that helps teams run outbound and inbound follow-up with more clarity.",
        modules: [
            {
                title: "Lead discovery",
                description: "Bring prospects and inbound demand into one place with source visibility built in.",
                bullets: ["Channel-aware intake", "Account-ready records", "Operator-friendly queue"],
            },
            {
                title: "Scoring and enrichment",
                description: "Keep the best opportunities obvious with rules, context, and light AI assistance.",
                bullets: ["Priority layers", "Signal enrichment", "Clear routing states"],
            },
            {
                title: "Sequences",
                description: "Run follow-up without making the workflow feel robotic or hidden behind automation noise.",
                bullets: ["Step-based cadence", "Reply visibility", "Owner handoff moments"],
            },
            {
                title: "Analytics",
                description: "Stay close to meetings, replies, and source performance without leaving the product flow.",
                bullets: ["Revenue-facing metrics", "Workflow health", "Source accountability"],
            },
        ],
    },
    visibility: {
        eyebrow: "Team visibility",
        title: "Product proof without fake logos or inflated claims.",
        description: "Since this is a demo concept, the page leans on product clarity and operational visibility rather than made-up social proof. That keeps the direction honest while still feeling premium.",
        cards: [
            {
                title: "Lead source context",
                description: "Reps can see where a record came from, what campaign touched it, and what should happen next.",
                lines: ["Google Ads lead", "Sheet import follow-up", "CRM owner assigned"],
            },
            {
                title: "Queue prioritization",
                description: "A compact queue shows what deserves attention now instead of spreading urgency across multiple tools.",
                lines: ["High-intent account", "Warm reactivation", "Needs manual review"],
            },
            {
                title: "Sequence oversight",
                description: "Managers get one surface for launched steps, reply signals, and meeting movement.",
                lines: ["Running normally", "Reply detected", "Meeting booked"],
            },
        ],
    },
    pricing: {
        eyebrow: "Pricing",
        title: "Simple enough for a fast decision, structured enough for serious teams.",
        description: "This demo keeps the pricing area compact and conversion-focused, with the heavier sales motion reserved for the enterprise path.",
        plans: [
            {
                name: "Starter",
                price: "$19",
                period: "/month",
                description: "For early teams who need a cleaner lead workflow without heavy admin overhead.",
                features: ["1,000 enriched leads", "AI scoring", "Basic CRM sync", "Email support"],
                cta: "Start with Starter",
            },
            {
                name: "Pro",
                price: "$49",
                period: "/month",
                description: "For teams actively running outreach and needing stronger automation with more visibility.",
                features: ["5,000 enriched leads", "Sequences", "Advanced routing", "Priority support"],
                cta: "Choose Pro",
                featured: true,
            },
            {
                name: "Enterprise",
                price: "Custom",
                period: "",
                description: "For larger organizations that need custom workflows, security, and high-touch onboarding.",
                features: ["Unlimited workflows", "Custom security", "Dedicated onboarding", "Account support"],
                cta: "Talk to Sales",
            },
        ],
    },
    faq: {
        eyebrow: "FAQ",
        title: "Questions this concept is designed to answer fast.",
        description: "The homepage should remove hesitation quickly, not force people to hunt for the basics.",
        items: [
            {
                question: "Who is this homepage concept for?",
                answer: "It is designed for sales-led or revenue-led teams who need one product story that covers lead intake, prioritization, follow-up, and visibility.",
            },
            {
                question: "Why not use animated demo sections everywhere?",
                answer: "The current direction aims for calmer premium positioning. Motion is kept where it supports understanding, not where it competes with the message.",
            },
            {
                question: "Why is the proof section more restrained?",
                answer: "Because we should not invent customer logos, testimonials, or performance claims. This demo uses honest product proof first so we can layer in real assets later.",
            },
            {
                question: "Can this evolve into the real homepage?",
                answer: "Yes. The structure is intentionally production-friendly, so sections can be swapped from concept copy to final content without rebuilding the whole page.",
            },
        ],
    },
    closing: {
        title: "If this direction feels right, we can turn it into the real homepage next.",
        description: "This route is meant to help us discuss structure, tone, proof strategy, and product framing on something concrete instead of abstract notes.",
        primaryCta: "Continue with this direction",
        secondaryCta: "Open contact",
    },
    footer: {
        note: "Demo concept for discussion. Product-first, sales-focused, and intentionally light on invented proof.",
        links: [
            { label: "Main homepage", href: "/" },
            { label: "Pricing", href: "/pricing" },
            { label: "Contact", href: "/contact" },
        ],
    },
};

const trContent: DemoContent = {
    metaTitle: "Jumpix Demo Landing",
    metaDescription: "Satis ekiplerine odaklanan, daha premium ve daha net bir Jumpix landing konsepti.",
    header: {
        nav: [
            { label: "Platform", href: "#platform" },
            { label: "Akis", href: "#workflow" },
            { label: "Fiyat", href: "#pricing" },
            { label: "SSS", href: "#faq" },
        ],
        secondaryCta: "Iletisim",
        primaryCta: "Demo Al",
    },
    hero: {
        eyebrow: "Daha keskin bir Jumpix ana sayfasi icin demo konsepti",
        title: "Gelir operasyonunu tek ve sakin bir komuta ekranindan yonet.",
        description: "Bu konsept Jumpix'i satis ekiplerinin her gun yaptigi islerin etrafinda yeniden konumluyor: lead bul, firsati puanla, outreach baslat ve pipeline gorunurlugunu bes farkli araca dagitmadan koru.",
        primaryCta: "Demo Al",
        secondaryCta: "Fiyatlari Gor",
        support: ["Lead discovery", "AI scoring", "Sequences", "Shared visibility"],
        queueTitle: "Oncelik kuyrugu",
        queueSubtitle: "Ekipler siradaki en dogru isi sekmeler arasinda kaybolmadan gorebilir.",
        sequenceTitle: "Sequence sagligi",
        sequenceSubtitle: "Neyin calistigini, neyin inceleme istedigini ve neyin donusum verdigini ayni yerde izle.",
        panelStats: [
            { label: "Lead gorunumu", value: "Birlesik" },
            { label: "Yonlendirme", value: "Kuralli" },
            { label: "Outreach", value: "Cok adimli" },
        ],
    },
    integrations: {
        title: "Halihazirda kullandiginiz buyume akislarinin etrafinda kuruldu",
        items: ["Google Ads", "Google Sheets", "Instagram", "TikTok", "CRM sync"],
    },
    workflow: {
        eyebrow: "Nasil akiyor",
        title: "Gelen talebi oncelikli outreach'e uc net adimda cevir.",
        description: "Bu demo sayfasi urun dongusunu gelir ekipleri icin en anlamli sira ile anlatir. Her adim neden onemli oldugunu ve operatorun bir sonraki ekranda ne gordugunu gosterir.",
        steps: [
            {
                id: "01",
                title: "Topla ve zenginlestir",
                description: "Lead'leri reklam kanallari, formlar ve sheet'lerden cek; sonra kaydi ekip icin anlamli hale getir.",
                detail: "Kaynak, firma baglami, sahip ve sonraki aksiyon ilk anda gorunur.",
            },
            {
                id: "02",
                title: "Puanla ve yonlendir",
                description: "Yuksek niyetli hesaplari ustte tutan net scoring mantigi ile manuel triage ihtiyacini azalt.",
                detail: "Oncelik kopuk raporlarin icine saklanmaz; ekip akisinda kalir.",
            },
            {
                id: "03",
                title: "Sequence baslat ve takip et",
                description: "Outreach'i cikar, reply'lari incele ve analitigi ayri bir katmana surmeden is akisina yakin tut.",
                detail: "Sequence durumu, reply ve toplanti ayni ritim icinde izlenir.",
            },
        ],
        boardTitle: "Operator panosu",
        boardItems: [
            { label: "Paid campaign lead sync edildi", status: "Zenginlestirme icin hazir" },
            { label: "ICP eslesmesi 92/100 puanlandi", status: "SDR kuyruguna aktar" },
            { label: "CRM baglamiyla sequence basladi", status: "Reply izleniyor" },
        ],
    },
    platform: {
        eyebrow: "Platform yapisi",
        title: "Dort urun yuzeyi. Tek satin alma hikayesi.",
        description: "Kopuk feature bloklari gostermek yerine bu konsept Jumpix'i outbound ve inbound takiplerini daha net yurutmeye yarayan kompakt bir suite olarak sunar.",
        modules: [
            {
                title: "Lead discovery",
                description: "Prospect ve inbound talebi kaynak gorunurlugu ile tek yerde topla.",
                bullets: ["Kanal bazli intake", "Hazir hesap kaydi", "Operator dostu kuyruk"],
            },
            {
                title: "Scoring ve enrichment",
                description: "Kurallar, baglam ve hafif AI yardimi ile en iyi firsatlari gorunur tut.",
                bullets: ["Oncelik katmanlari", "Sinyal zenginlestirme", "Net yonlendirme durumlari"],
            },
            {
                title: "Sequences",
                description: "Takibi otomasyon gurultusune cevirmeden yurut; ekip neyin nerede oldugunu gorebilsin.",
                bullets: ["Adim bazli cadence", "Reply gorunurlugu", "Handoff anlari"],
            },
            {
                title: "Analytics",
                description: "Toplanti, reply ve kaynak performansini urun akisindan cikmadan izle.",
                bullets: ["Gelir odakli metrikler", "Workflow sagligi", "Kaynak hesap verebilirligi"],
            },
        ],
    },
    visibility: {
        eyebrow: "Gorunurluk",
        title: "Sahte logo ya da sisirilmis claim kullanmadan urun kaniti.",
        description: "Bu bir demo konsepti oldugu icin sayfa, uydurma sosyal kanit yerine urun netligi ve operasyonel gorunurluge dayanir. Bu da yonu durust tutarken yine premium his verir.",
        cards: [
            {
                title: "Lead kaynak baglami",
                description: "Rep'ler kaydin nereden geldigi, hangi kampanyaya dokundugu ve bir sonraki adimin ne oldugunu gorebilir.",
                lines: ["Google Ads lead", "Sheet import follow-up", "CRM owner assigned"],
            },
            {
                title: "Kuyruk onceligi",
                description: "Kompakt bir kuyruk, dikkatin simdi nereye gitmesi gerektigini tek bakista anlatir.",
                lines: ["High-intent account", "Warm reactivation", "Needs manual review"],
            },
            {
                title: "Sequence denetimi",
                description: "Yoneticiler baslatilan adimlari, reply sinyallerini ve toplanti hareketini tek yuzeyde gorebilir.",
                lines: ["Running normally", "Reply detected", "Meeting booked"],
            },
        ],
    },
    pricing: {
        eyebrow: "Fiyatlandirma",
        title: "Hizli karar icin yeterince basit, ciddi ekipler icin yeterince duzenli.",
        description: "Bu demo fiyatlandirma alanini kompakt ve donusum odakli tutar; daha agir satis hareketi enterprise yoluna birakilir.",
        plans: [
            {
                name: "Starter",
                price: "$19",
                period: "/ay",
                description: "Lead akisina daha duzenli bir yapi getirmek isteyen erken asama ekipler icin.",
                features: ["1.000 enriched lead", "AI scoring", "Temel CRM sync", "Email support"],
                cta: "Starter ile basla",
            },
            {
                name: "Pro",
                price: "$49",
                period: "/ay",
                description: "Aktif outreach yapan ve daha guclu otomasyonla gorunurluk isteyen ekipler icin.",
                features: ["5.000 enriched lead", "Sequences", "Advanced routing", "Priority support"],
                cta: "Pro'yu sec",
                featured: true,
            },
            {
                name: "Enterprise",
                price: "Ozel",
                period: "",
                description: "Guvenlik, ozel workflow ve yuksek temasli onboarding isteyen buyuk ekipler icin.",
                features: ["Sinirsiz workflow", "Ozel guvenlik", "Dedicated onboarding", "Account support"],
                cta: "Satis ekibiyle gorus",
            },
        ],
    },
    faq: {
        eyebrow: "SSS",
        title: "Bu konseptin hizlica cevaplamasi gereken sorular.",
        description: "Ana sayfa temel sorulari kisa surede cozmeli; kullaniciyi detay aramaya zorlamamali.",
        items: [
            {
                question: "Bu konsept kim icin tasarlandi?",
                answer: "Lead intake, onceliklendirme, takip ve gorunurlugu tek urun hikayesinde gormek isteyen satis veya revenue ekipleri icin tasarlandi.",
            },
            {
                question: "Neden her yerde animasyonlu demo yok?",
                answer: "Bu yon daha sakin ve premium bir konumlanma hedefliyor. Hareket sadece anlasilmayi destekledigi yerde kaliyor.",
            },
            {
                question: "Neden proof alani daha kontrollu?",
                answer: "Cunku gercek olmayan logo, testimonial veya performans claim'i uretmemeliyiz. Bu demo once urun kanitiyla ilerliyor; gercek asset'ler sonra eklenebilir.",
            },
            {
                question: "Bu direkt gercek homepage'e donebilir mi?",
                answer: "Evet. Yapi bilincli olarak production-friendly tasarlandi; bu sayede konsept copy'si daha sonra final icerikle degistirilebilir.",
            },
        ],
    },
    closing: {
        title: "Yon dogruysa bunu bir sonraki adimda gercek homepage'e cevirebiliriz.",
        description: "Bu route, soyut notlar yerine somut bir yuzey uzerinden yapiyi, tonu, proof stratejisini ve urun anlatimini tartisabilmemiz icin hazirlandi.",
        primaryCta: "Bu yonle devam edelim",
        secondaryCta: "Iletisimi ac",
    },
    footer: {
        note: "Konusma ve iterasyon icin hazirlanan demo konsepti. Uydurma proof yerine urun netligini merkeze alir.",
        links: [
            { label: "Ana sayfa", href: "/" },
            { label: "Fiyatlandirma", href: "/pricing" },
            { label: "Iletisim", href: "/contact" },
        ],
    },
};

export function getDemoLandingContent(locale: string): DemoContent {
    return locale === "tr" ? trContent : enContent;
}

export type { DemoContent };
