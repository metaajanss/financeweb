import type { FAQItem } from '@/shared/types/ai-config'
import type { SequenceStep } from '../server/actions'

// Sequence Flow Templates
export type SequenceTemplate = {
    id: string;
    name: string;
    description: string;
    trigger_type: 'now' | 'instant' | 'no_response' | 'meeting_booked' | 'lead_created' | 'custom' | 'hubspot_lead' | 'salesforce_lead' | 'pipedrive_lead' | 'zoho_lead';
    lead_type: string;
    steps: SequenceStep[];
    tags: string[];
    icon: string;
    channelType: 'email' | 'whatsapp' | 'mixed';
};

export const sequenceTemplates: SequenceTemplate[] = [
    {
        id: 'cold-email-campaign',
        name: 'Cold Email Campaign',
        description: 'A 4-step email sequence to engage cold leads with personalized outreach and follow-ups.',
        trigger_type: 'lead_created',
        lead_type: 'all_leads',
        channelType: 'email',
        icon: 'mail',
        tags: ['outreach', 'cold-leads', 'sales'],
        steps: [
            { delay_hours: 0, message_template: 'Hi {{firstName}},\n\nI noticed {{company}} is growing fast. I help companies like yours streamline lead management with AI-powered automation.\n\nWorth a brief chat?\n\nBest,\n{{senderName}}', channel: 'email', ai_icebreaker: true, ai_autopilot: false, template_subject: 'Quick question about {{company}}' } as SequenceStep,
            { delay_hours: 72, message_template: 'Hi {{firstName}},\n\nFollowing up on my previous email. I\'d love to show you how we helped similar companies increase conversion rates by 40%.\n\nDo you have 15 minutes this week?\n\nBest,\n{{senderName}}', channel: 'email', ai_icebreaker: false, ai_autopilot: false, template_subject: 'Re: Quick question' } as SequenceStep,
            { delay_hours: 96, message_template: '{{firstName}},\n\nI truly believe we can help {{company}} scale your outreach efforts.\n\nHere\'s a 2-minute demo: [Link]\n\nLet me know if you\'d like to discuss!\n\nBest,\n{{senderName}}', channel: 'email', ai_icebreaker: false, ai_autopilot: false, template_subject: 'One last thing' } as SequenceStep,
            { delay_hours: 168, message_template: 'Hi {{firstName}},\n\nI\'ll stop reaching out after this, but I wanted to leave you with our case study on how we helped similar companies double qualified leads in 30 days.\n\nFeel free to reach out anytime.\n\nBest,\n{{senderName}}', channel: 'email', ai_icebreaker: false, ai_autopilot: false, template_subject: 'Final: growth case study' } as SequenceStep
        ]
    },
    {
        id: 'whatsapp-followup',
        name: 'WhatsApp Follow-up Sequence',
        description: '3-step WhatsApp sequence to re-engage leads who have not responded to initial outreach.',
        trigger_type: 'no_response',
        lead_type: 'all_leads',
        channelType: 'whatsapp',
        icon: 'message-square',
        tags: ['whatsapp', 'follow-up', 'engagement'],
        steps: [
            { delay_hours: 24, message_template: 'Hi {{firstName}}! 👋\n\nI sent you an email earlier about helping {{company}} with lead automation.\n\nWanted to reach out here in case email isn\'t your preferred channel.\n\nOpen to a quick 10-minute chat?', channel: 'whatsapp', ai_icebreaker: false, ai_autopilot: true, template_subject: '' } as SequenceStep,
            { delay_hours: 48, message_template: '{{firstName}}, just checking in! 📱\n\nI know things get busy. I\'d love to show you how our AI handles lead qualification automatically.\n\nWorth a conversation?', channel: 'whatsapp', ai_icebreaker: false, ai_autopilot: true, template_subject: '' } as SequenceStep,
            { delay_hours: 72, message_template: 'Hi {{firstName}},\n\nI\'ll leave this here - no pressure! 😊\n\nIf lead automation becomes a priority for {{company}}, feel free to reach out.\n\nHave a great day!', channel: 'whatsapp', ai_icebreaker: false, ai_autopilot: false, template_subject: '' } as SequenceStep
        ]
    },
    {
        id: 'meeting-onboarding',
        name: 'Meeting After Onboarding',
        description: '5-step email sequence to onboard new clients after a successful meeting booking.',
        trigger_type: 'meeting_booked',
        lead_type: 'all_leads',
        channelType: 'email',
        icon: 'calendar',
        tags: ['onboarding', 'meeting', 'welcome'],
        steps: [
            { delay_hours: 0, message_template: 'Hi {{firstName}},\n\nGreat speaking with you! 🎉\n\nI\'m excited to help {{company}} transform your lead management process.\n\nNext steps:\n1. I\'ve attached our onboarding guide\n2. We\'ll send calendar invite shortly\n3. Looking forward to our deep-dive session\n\nBest,\n{{senderName}}', channel: 'email', ai_icebreaker: false, ai_autopilot: false, template_subject: 'Welcome to Jumpix, {{firstName}}! 🚀' } as SequenceStep,
            { delay_hours: 24, message_template: 'Hi {{firstName}},\n\nQuick check-in! 📋\n\nHave you reviewed the onboarding materials?\n\nResources:\n• Getting Started Guide\n• Best Practices PDF\n• Video Tutorial Library\n\nQuestions? Just reply!', channel: 'email', ai_icebreaker: false, ai_autopilot: false, template_subject: 'Your Jumpix resources are ready' } as SequenceStep,
            { delay_hours: 72, message_template: '{{firstName}},\n\nYour account setup is almost complete! ✨\n\nI\'ve prepared a custom configuration for {{company}}.\n\nReady for our kickoff call? Reply with your preferred time!', channel: 'email', ai_icebreaker: false, ai_autopilot: false, template_subject: 'Ready for your Jumpix kickoff?' } as SequenceStep,
            { delay_hours: 168, message_template: 'Hi {{firstName}},\n\nWeek 1 check-in! 📊\n\nSharing early insights from your account setup. Our support team is standing by if you need help.\n\nCheers,\n{{senderName}}', channel: 'email', ai_icebreaker: false, ai_autopilot: false, template_subject: 'Week 1 check-in & insights' } as SequenceStep,
            { delay_hours: 336, message_template: '{{firstName}},\n\nCongratulations on your first month! 🎊\n\nI\'d love to hear about your experience and optimize your results further.\n\nCan we schedule a 15-minute success review?\n\nBest,\n{{senderName}}', channel: 'email', ai_icebreaker: false, ai_autopilot: false, template_subject: 'Month 1 success review' } as SequenceStep
        ]
    },
    {
        id: 'reengagement-30d',
        name: 'Re-engagement (30 Day Inactive)',
        description: '3-step sequence to win back leads who have been inactive for 30 days.',
        trigger_type: 'no_response',
        lead_type: 'all_leads',
        channelType: 'email',
        icon: 'refresh-cw',
        tags: ['re-engagement', 'win-back', 'inactive'],
        steps: [
            { delay_hours: 0, message_template: 'Hi {{firstName}},\n\nI noticed it has been a while since we last connected about {{company}}.\n\nA lot has changed! We have launched new AI features that might be exactly what you need.\n\nInterested in a quick update call?\n\nBest,\n{{senderName}}', channel: 'email', ai_icebreaker: true, ai_autopilot: false, template_subject: 'Something new for {{company}}' } as SequenceStep,
            { delay_hours: 120, message_template: '{{firstName}},\n\nWe have helped companies 10x their qualified leads in the past month alone - {{company}} could see similar results.\n\nCan I show you what is possible in a 10-minute demo?\n\nBest,\n{{senderName}}', channel: 'email', ai_icebreaker: false, ai_autopilot: false, template_subject: 'Do not miss this opportunity' } as SequenceStep,
            { delay_hours: 168, message_template: 'Hi {{firstName}},\n\nFinal note from me.\n\nI will remove you from active follow-ups, but I am always here if {{company}} needs help.\n\nMy direct calendar: [Link]\n\nWishing you the best,\n{{senderName}}', channel: 'email', ai_icebreaker: false, ai_autopilot: false, template_subject: 'Final note - keeping the door open' } as SequenceStep
        ]
    },
    {
        id: 'quick-demo-invite',
        name: 'Quick Demo Invite',
        description: '4-step mixed channel sequence to quickly schedule a demo with interested leads.',
        trigger_type: 'now',
        lead_type: 'all_leads',
        channelType: 'mixed',
        icon: 'zap',
        tags: ['demo', 'fast-track', 'mixed-channel'],
        steps: [
            { delay_hours: 0, message_template: 'Hi {{firstName}},\n\nThanks for your interest in Jumpix! 🚀\n\nI would love to show you how we can help {{company}} automate your lead management in just 15 minutes.\n\nClick here to book a time that works for you: [Calendar Link]\n\nTalk soon!\n{{senderName}}', channel: 'email', ai_icebreaker: false, ai_autopilot: false, template_subject: 'Your Jumpix demo is ready to book' } as SequenceStep,
            { delay_hours: 4, message_template: 'Hi {{firstName}}! 👋\n\nJust sent you an email about scheduling a quick demo for {{company}}.\n\nWant to book it right now? Takes just 30 seconds: [Link]\n\nLooking forward to showing you around!', channel: 'whatsapp', ai_icebreaker: false, ai_autopilot: true, template_subject: '' } as SequenceStep,
            { delay_hours: 24, message_template: '{{firstName}},\n\nStill thinking it over?\n\nHere is what you will see in the demo:\n✓ How AI qualifies leads automatically\n✓ WhatsApp and email automation setup\n✓ Integration with your existing CRM\n✓ Real ROI calculations for {{company}}\n\nBook your spot: [Calendar Link]\n\nBest,\n{{senderName}}', channel: 'email', ai_icebreaker: false, ai_autopilot: false, template_subject: 'What you will see in your demo' } as SequenceStep,
            { delay_hours: 48, message_template: 'Hi {{firstName}},\n\nLast call for the demo! 📅\n\nI have 2 spots left this week. If you are serious about scaling {{company}} lead process, let us chat.\n\nBook here: [Calendar Link]\n\nOr just reply with "INTERESTED" and I will hold a spot for you.\n\n{{senderName}}', channel: 'email', ai_icebreaker: false, ai_autopilot: false, template_subject: '2 demo spots left this week' } as SequenceStep
        ]
    },
    {
        id: 'crm-welcome',
        name: 'CRM Integration Welcome',
        description: '3-step welcome sequence for leads coming from HubSpot CRM integration.',
        trigger_type: 'hubspot_lead',
        lead_type: 'all_leads',
        channelType: 'email',
        icon: 'database',
        tags: ['crm', 'hubspot', 'welcome', 'integration'],
        steps: [
            { delay_hours: 0, message_template: 'Welcome {{firstName}}! 🎉\n\nI see you are already using HubSpot - that is great! Jumpix integrates seamlessly with your existing setup.\n\nHere is what happens next:\n1. We will sync your HubSpot contacts automatically\n2. Our AI starts qualifying new leads immediately\n3. You get a unified view of all conversations\n\nQuestions? Just reply!\n\n{{senderName}}', channel: 'email', ai_icebreaker: false, ai_autopilot: false, template_subject: 'Welcome! Your HubSpot integration is ready' } as SequenceStep,
            { delay_hours: 48, message_template: 'Hi {{firstName}},\n\nHow is your first day with Jumpix + HubSpot going?\n\nPro tip: Set up lead scoring rules to automatically prioritize hot prospects from your HubSpot pipeline.\n\nNeed help? Book a quick setup call: [Link]\n\nBest,\n{{senderName}}', channel: 'email', ai_icebreaker: false, ai_autopilot: false, template_subject: 'HubSpot + Jumpix pro tip' } as SequenceStep,
            { delay_hours: 168, message_template: '{{firstName}},\n\nWeek 1 check-in! 📊\n\nYour HubSpot integration should be running smoothly by now. I would love to hear:\n• How is the lead quality?\n• Any issues with the sync?\n• Ready to explore advanced features?\n\nReply and let me know how it is going!\n\n{{senderName}}', channel: 'email', ai_icebreaker: false, ai_autopilot: false, template_subject: 'How is your HubSpot integration?' } as SequenceStep
        ]
    }
];

export function getTemplateById(id: string): SequenceTemplate | undefined {
    return sequenceTemplates.find(t => t.id === id);
}

export function getAllSequenceTemplates(): SequenceTemplate[] {
    return sequenceTemplates;
}

// AI Training Industry Templates
export type IndustryTemplate = {
    id: string
    name: string
    emoji: string
    knowledge_base: string
    qualification_questions: string[]
    brand_voice: 'professional' | 'friendly' | 'casual'
    faq_items: FAQItem[]
    forbidden_topics: string[]
    mandatory_rules: string[]
}

export const INDUSTRY_TEMPLATES: IndustryTemplate[] = [
    {
        id: 'real_estate',
        name: 'Real Estate',
        emoji: '🏠',
        brand_voice: 'professional',
        knowledge_base: `We are a real estate agency helping clients buy, sell, and rent properties. Our team of experienced agents provides personalized service to find the perfect home or investment property. We cover residential and commercial properties across the region. Our services include property valuation, market analysis, negotiation support, and end-to-end transaction management.`,
        qualification_questions: [
            'Are you looking to buy, sell, or rent a property?',
            'What is your approximate budget range?',
            'What type of property are you interested in (apartment, house, commercial)?',
            'What is your preferred location or neighborhood?',
            'What is your ideal timeline for this transaction?',
        ],
        faq_items: [
            { question: 'How long does the buying process take?', answer: 'Typically 4–8 weeks from offer acceptance to closing, depending on financing and due diligence.' },
            { question: 'Do you charge a commission?', answer: 'Our standard commission is 3% of the sale price, payable at closing. We offer flexible terms for high-value properties.' },
            { question: 'Can I schedule a property viewing?', answer: 'Absolutely! Book a viewing via our calendar and one of our agents will guide you through the property.' },
        ],
        forbidden_topics: [],
        mandatory_rules: ['Always mention that a free property valuation is available', 'Refer legal questions to our legal partner team'],
    },
    {
        id: 'saas',
        name: 'SaaS / Software',
        emoji: '💻',
        brand_voice: 'friendly',
        knowledge_base: `We provide a cloud-based software solution that helps businesses automate workflows, manage customers, and grow revenue. Our platform offers a 14-day free trial with no credit card required. We have three pricing tiers: Starter ($49/mo), Growth ($99/mo), and Enterprise (custom). All plans include onboarding support and 24/7 uptime monitoring. We integrate with Slack, HubSpot, Salesforce, and 50+ other tools.`,
        qualification_questions: [
            'What is the size of your team?',
            'Which tools are you currently using to manage this workflow?',
            'What is the main problem you are trying to solve?',
            'Do you have a budget approved for this type of solution?',
            'When are you looking to get started?',
        ],
        faq_items: [
            { question: 'Is there a free trial?', answer: 'Yes! 14-day free trial, no credit card required. You get full access to all Starter features.' },
            { question: 'Can I cancel anytime?', answer: 'Absolutely. No long-term contracts — cancel from your dashboard at any time.' },
            { question: 'Do you offer enterprise pricing?', answer: 'Yes, our Enterprise plan is fully customized. Book a call with our sales team for a tailored quote.' },
        ],
        forbidden_topics: ['specific competitor comparisons'],
        mandatory_rules: ['Always mention the 14-day free trial', 'Direct pricing questions to the pricing page or offer a demo call'],
    },
    {
        id: 'ecommerce',
        name: 'E-Commerce',
        emoji: '🛒',
        brand_voice: 'friendly',
        knowledge_base: `We are an online store selling high-quality products directly to consumers. We offer free shipping on orders over $50. Our return policy allows returns within 30 days of delivery for a full refund. We ship worldwide with estimated delivery times of 3–7 business days domestically and 7–14 days internationally. Customer satisfaction is our top priority and our support team is available 7 days a week.`,
        qualification_questions: [
            'What product or category are you looking for?',
            'Are you shopping for yourself or as a gift?',
            'Do you have any specific requirements (size, color, budget)?',
        ],
        faq_items: [
            { question: 'What is your return policy?', answer: '30-day hassle-free returns. Just initiate a return from your account and we send a prepaid label.' },
            { question: 'How long does shipping take?', answer: '3–7 business days domestically, 7–14 days internationally. Express options available at checkout.' },
            { question: 'Is my payment secure?', answer: 'Yes, we use 256-bit SSL encryption and accept all major credit cards and PayPal.' },
        ],
        forbidden_topics: [],
        mandatory_rules: ['Mention the 30-day return guarantee in any conversation about product quality', 'For large orders, offer a discount code'],
    },
    {
        id: 'consulting',
        name: 'Consulting',
        emoji: '📊',
        brand_voice: 'professional',
        knowledge_base: `We are a management and strategy consulting firm helping businesses solve complex challenges and achieve sustainable growth. Our team of 20+ senior consultants has expertise in digital transformation, operations, finance, and organizational design. We work with SMEs and Fortune 500 companies globally. Our engagement model starts with a free 45-minute discovery call followed by a tailored proposal.`,
        qualification_questions: [
            'What specific challenge or goal is your company facing right now?',
            'What is the size of your organization (revenue / number of employees)?',
            'Have you worked with a consulting firm before? What was the experience like?',
            'What is your decision-making timeline?',
            'Do you have an approved budget for external consulting support?',
        ],
        faq_items: [
            { question: 'How do you charge for engagements?', answer: 'We offer project-based and retainer pricing. Typical projects range from $5K–$50K+ depending on scope and duration.' },
            { question: 'How long does an engagement take?', answer: 'Discovery: 1–2 weeks. Full strategy engagement: 4–12 weeks. Implementation support: ongoing.' },
            { question: 'Do you sign NDAs?', answer: 'Absolutely. We sign mutual NDAs before any discovery conversation.' },
        ],
        forbidden_topics: ['naming specific past clients without approval'],
        mandatory_rules: ['Always offer the free 45-minute discovery call', 'Mention our NDA policy to build trust'],
    },
    {
        id: 'clinic',
        name: 'Clinic / Healthcare',
        emoji: '🏥',
        brand_voice: 'professional',
        knowledge_base: `We are a private medical clinic offering general practice, specialist consultations, and preventive health check-ups. Our clinic is open Monday–Saturday 09:00–18:00. Appointments can be booked online or by phone. We accept most major insurance providers. All consultations are confidential. For emergencies, we direct patients to the nearest emergency room.`,
        qualification_questions: [
            'What type of consultation or service are you looking for?',
            'Is this for yourself or a family member?',
            'Do you have insurance coverage, or will this be a self-pay visit?',
            'Is this an urgent matter or routine check-up?',
        ],
        faq_items: [
            { question: 'Do you accept insurance?', answer: 'Yes, we accept most major insurance plans. Please bring your insurance card to your appointment.' },
            { question: 'How do I book an appointment?', answer: 'You can book online through our website or by messaging us here. We typically have availability within 2–3 days.' },
            { question: 'What are your hours?', answer: 'We are open Monday–Saturday 09:00–18:00. Emergency contacts are available 24/7.' },
        ],
        forbidden_topics: ['diagnosing conditions', 'prescribing medications'],
        mandatory_rules: ['Never provide medical diagnoses — always recommend booking a consultation', 'For emergencies, direct to the nearest emergency room immediately'],
    },
    {
        id: 'restaurant',
        name: 'Restaurant / Food',
        emoji: '🍽️',
        brand_voice: 'friendly',
        knowledge_base: `We are a restaurant offering a unique dining experience with freshly prepared dishes using locally sourced ingredients. We are open Tuesday–Sunday 12:00–22:00. Reservations are recommended for weekends. We cater to dietary needs including vegetarian, vegan, and gluten-free options. Private dining rooms are available for events and corporate dinners.`,
        qualification_questions: [
            'How many guests will be dining?',
            'Do any guests have dietary restrictions or allergies?',
            'Is this a special occasion (birthday, anniversary, corporate event)?',
            'What date and time are you considering?',
        ],
        faq_items: [
            { question: 'Do you take reservations?', answer: 'Yes! Walk-ins are welcome but reservations are strongly recommended for Friday–Sunday. Book via our website or here.' },
            { question: 'Do you have vegetarian/vegan options?', answer: 'Absolutely. We have a full section of vegetarian and vegan dishes. Just let your server know and we will accommodate.' },
            { question: 'Can you host private events?', answer: 'Yes, we have a private dining room for up to 40 guests. Contact us to discuss menus and pricing for your event.' },
        ],
        forbidden_topics: [],
        mandatory_rules: ['Always mention private dining availability for groups over 10', 'Highlight any current specials or seasonal menu items'],
    },
    {
        id: 'education',
        name: 'Education / Training',
        emoji: '🎓',
        brand_voice: 'friendly',
        knowledge_base: `We are an educational institution offering professional training courses, certifications, and workshops. Our programs are available both online and in-person. We work with individuals and corporate clients. All courses come with a certificate of completion and lifetime access to course materials. We offer group discounts for teams of 5 or more.`,
        qualification_questions: [
            'What skill or topic are you looking to learn?',
            'Are you looking for individual training or a team program?',
            'What is your current experience level in this area?',
            'What is your preferred format — online, in-person, or hybrid?',
            'Do you need the training to fit around a work schedule?',
        ],
        faq_items: [
            { question: 'Do you offer certificates?', answer: 'Yes! All our courses include an accredited certificate of completion, recognized by major employers in the field.' },
            { question: 'Can I access the course after it ends?', answer: 'Absolutely. You get lifetime access to all course materials and recordings after enrollment.' },
            { question: 'Do you offer group discounts?', answer: 'Yes, teams of 5+ receive a 20% discount. Contact us for larger team pricing and custom corporate programs.' },
        ],
        forbidden_topics: [],
        mandatory_rules: ['Always mention the certificate of completion', 'Highlight group discounts for any team inquiries'],
    },
    {
        id: 'financial',
        name: 'Financial Services',
        emoji: '💰',
        brand_voice: 'professional',
        knowledge_base: `We are a licensed financial advisory firm offering investment planning, tax optimization, retirement planning, and wealth management services. Our advisors are certified (CFP/CFA) and regulated. Initial consultations are free. We work with individuals, families, and small business owners. All advice is personalized and based on your unique financial situation.`,
        qualification_questions: [
            'What is your primary financial goal at this time (investment, retirement, tax planning)?',
            'What is your approximate investable asset range?',
            'Do you currently work with a financial advisor?',
            'What is your investment risk tolerance (conservative, balanced, aggressive)?',
            'What is your target timeline for achieving this goal?',
        ],
        faq_items: [
            { question: 'Is my first consultation free?', answer: 'Yes, your initial 30-minute discovery consultation is completely free and non-binding.' },
            { question: 'How are you regulated?', answer: 'We are fully licensed and regulated by the relevant financial authority. All advisors hold CFP or CFA designations.' },
            { question: 'How do you charge?', answer: 'We operate on a fee-only basis — no commissions. Fees are transparent and agreed upon before engagement.' },
        ],
        forbidden_topics: ['specific stock tips or guaranteed returns'],
        mandatory_rules: ['Always clarify that past performance does not guarantee future results', 'Direct all compliance questions to our compliance officer'],
    },
]
