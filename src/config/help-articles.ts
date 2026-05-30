import { Rocket, Sparkles, Workflow, Settings, GitBranch, MessageSquare, Users, CreditCard, ShieldCheck } from 'lucide-react';

export const HELP_ARTICLES = [
    {
        id: 'getting-started-0',
        categoryId: 'getting-started',
        title: 'How to connect WhatsApp Business',
        content: `To connect your WhatsApp Business account through our managed services, follow these steps:
1. Go to Account Settings in this dashboard and select Integrations.
2. Select WhatsApp from the active channels list.
3. Enter your business phone number (must be capable of receiving SMS/WhatsApp for verification).
4. Enter the verification code sent to your number.
5. Once verified, your service will be automatically activated.

Note: Your number will be registered under our enterprise WhatsApp Business API. If the number is already active on a WhatsApp mobile app, you should delete that mobile account first.`
    },
    {
        id: 'getting-started-1',
        categoryId: 'getting-started',
        title: 'Importing your first lead list (CSV)',
        content: `You can bulk-import leads using a CSV file. Follow these requirements for a smooth import:
- Required Columns: name, phone (in E.164 format: +1234567890).
- Optional Columns: email, company, tags.
- File Format: Must be .csv (UTF-8 encoding recommended).

Go to the Leads page and click Import Leads to upload your file.`
    },
    {
        id: 'ai-training-0',
        categoryId: 'ai-training',
        title: 'Writing an effective Knowledge Base',
        content: `The Knowledge Base is the brain of your AI. To make it effective:
- Be Specific: Instead of "we offer support", write "support is available Mon-Fri, 9am-6pm via email".
- Pricing Clarity: List your packages and what they include clearly.
- Objection Handling: Include common questions and the correct answers.
- Brand Tone: Use language that reflects your company's style.

Update your knowledge base in AI Core Training.`
    },
    {
        id: 'pipeline-0',
        categoryId: 'pipeline',
        title: 'Understanding pipeline stages',
        content: `Your sales pipeline is divided into stages to track the lead journey:
- New: Leads just captured, no AI interaction yet.
- Contacted: AI has initiated or responded to a message.
- Qualified: Lead has expressed interest or met criteria.
- Meeting Scheduled: A conversion event (e.g., booked call).
- Closed: Deal won or lost.

You can drag and drop leads between stages in the Pipeline view.`
    },
    {
        id: 'integrations-0',
        categoryId: 'integrations',
        title: 'Connecting Meta Lead Ads',
        content: `Connect your Facebook & Instagram Lead Ads to capture prospects instantly:
1. Go to System Integrations.
2. Click Connect on the Meta integration.
3. Grant permissions to access your Business Pages and Ad Accounts.
4. Select the Lead Forms you want to sync.

New leads from these forms will automatically appear in your pipeline with the source "Meta Ads".`
    },
    {
        id: 'sequences-0',
        categoryId: 'sequences',
        title: 'Creating a follow-up sequence',
        content: `Automated sequences ensure no lead falls through the cracks:
1. Navigate to Sequences.
2. Click Create New Sequence.
3. Define the trigger (e.g., "Lead Inactivity for 24 hours").
4. Add steps: 1. Send WhatsApp Message, 2. Wait 2 days, 3. Send Email.
5. Activate the sequence for specific tags or pipeline stages.`
    },
    {
        id: 'whatsapp-widget-0',
        categoryId: 'whatsapp-widget',
        title: 'Generating the widget snippet',
        content: `To add the WhatsApp Button to your website:
1. Go to WhatsApp Widget settings.
2. Configure the button text, color, and automatic welcome message.
3. Copy the generated <script> tag.
4. Paste it into the <head> or just before the closing </body> tag of your website.`
    },
    {
        id: 'team-routing-0',
        categoryId: 'team-routing',
        title: 'Inviting new team members',
        content: `Add your colleagues to the dashboard:
1. Go to Team & Routing.
2. Click Invite Member.
3. Enter their email address and select a role (Admin or Agent).
4. They will receive an email to set up their account.`
    },
    {
        id: 'billing-subscription-0',
        categoryId: 'billing-subscription',
        title: 'Viewing your current plan & usage',
        content: `Keep track of your subscription limits:
- Check the Billing page for real-time usage bars.
- Conversations: Number of unique monthly chats.
- Leads: Total prospects stored in your database.
- AI Agents: Number of active automated bots.`
    },
    {
        id: 'privacy-security-0',
        categoryId: 'privacy-security',
        title: 'How lead data is processed',
        content: `We prioritize data security and HIPAA/GDPR compliance:
- Data is encrypted at rest and in transit (SSL/TLS).
- We never sell lead data to third parties.
- You have full control over data retention in Privacy Settings.
- Database is hosted on secure enterprise-grade infrastructure.`
    }
];

export const HELP_CATEGORIES = [
    {
        id: 'getting-started',
        title: 'Getting Started',
        icon: Rocket,
        description: 'Connect your first channel, import leads, and send your first AI-powered message in minutes.',
        color: 'text-blue-500 bg-blue-500/10'
    },
    {
        id: 'ai-training',
        title: 'AI Training & Configuration',
        icon: Sparkles,
        description: 'Teach the AI your brand voice, business context, and autonomous behavior settings.',
        color: 'text-purple-500 bg-purple-500/10'
    },
    {
        id: 'pipeline',
        title: 'Pipeline & Lead Management',
        icon: Workflow,
        description: 'Manage your sales pipeline, track lead stages, and understand conversion metrics.',
        color: 'text-violet-500 bg-violet-500/10'
    },
    {
        id: 'integrations',
        title: 'Integrations',
        icon: Settings,
        description: 'Connect CRMs, ad platforms, calendar, and productivity tools to automate your workflow.',
        color: 'text-orange-500 bg-orange-500/10'
    },
    {
        id: 'sequences',
        title: 'Sequences & Automation',
        icon: GitBranch,
        description: 'Build retargeting sequences and automations that run without manual effort.',
        color: 'text-pink-500 bg-pink-500/10'
    },
    {
        id: 'whatsapp-widget',
        title: 'WhatsApp Widget',
        icon: MessageSquare,
        description: 'Embed the WhatsApp chat widget on your website to capture leads 24/7.',
        color: 'text-emerald-500 bg-emerald-500/10'
    },
    {
        id: 'team-routing',
        title: 'Team & Routing',
        icon: Users,
        description: 'Add team members, assign roles, and set up intelligent lead routing rules.',
        color: 'text-sky-500 bg-sky-500/10'
    },
    {
        id: 'billing-subscription',
        title: 'Billing & Subscription',
        icon: CreditCard,
        description: 'Manage your plan, upgrade or downgrade, and understand usage limits.',
        color: 'text-amber-500 bg-amber-500/10'
    },
    {
        id: 'privacy-security',
        title: 'Privacy & Security',
        icon: ShieldCheck,
        description: 'Everything about data protection, GDPR compliance, and account security.',
        color: 'text-rose-500 bg-rose-500/10'
    },
];
