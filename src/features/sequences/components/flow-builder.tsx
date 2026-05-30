'use client';

import * as React from 'react';
import {
    Zap, Mail, MessageSquare, Linkedin, Phone, Sparkles,
    GitBranch, BrainCircuit, Trash2, ArrowLeft, MousePointer2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import { type Sequence, type SequenceStep, updateSequence, createSequence } from '@/features/sequences';
import { getLeadSources, getLeadGroups, type LeadGroup } from '@/features/leads';
import { generateSequenceAIContent } from '@/features/sequences';
import { FlowNodeComp, Connector, PaletteItem } from './parts/FlowComponents';
import { EmailEditorModal } from './parts/EmailEditorModal';

type FlowNodeData = {
    id: string;
    type: 'trigger' | 'email' | 'whatsapp' | 'linkedin' | 'task' | 'condition';
    title: string;
    iconType: string;
    parentId?: string;
    branch?: 'yes' | 'no';
    settings: any;
};

export interface FlowBuilderProps {
    onBack: () => void;
    initialData?: Sequence | null;
    templateData?: { name: string; trigger_type: string; lead_type: string; steps: SequenceStep[] } | null;
}

// Helper to generate initial nodes from data or defaults
const getInitialNodes = (t: any, initialData: any, templateData: any): FlowNodeData[] => {
    // Case 1: Load from templateData (When choosing a template)
    if (templateData && templateData.steps) {
        const hasVisualLayout = templateData.steps.some((s: any) => s.parentId || s.type);
        if (hasVisualLayout) {
            return templateData.steps.map((step: any) => ({
                id: step.id || `step_${Math.random().toString(36).substr(2, 5)}`,
                type: step.type || (step.channel === 'email' ? 'email' : 'whatsapp'),
                title: step.type === 'email' ? t('email') : step.type === 'whatsapp' ? t('whatsapp') : step.type === 'condition' ? t('condition') : step.type === 'task' ? t('task') : step.type === 'trigger' ? t('trigger') : t('email'),
                iconType: step.type === 'email' ? 'mail' : step.type === 'whatsapp' ? 'whatsapp' : step.type === 'condition' ? 'sparkles' : step.type === 'task' ? 'phone' : 'zap',
                parentId: step.parentId,
                branch: step.branch,
                settings: step.settings || { ...step }
            }));
        }

        const nodes: FlowNodeData[] = [
            { id: 'trigger_1', type: 'trigger', title: t('trigger'), iconType: 'zap', settings: { source: templateData.lead_type || 'all_leads', trigger_type: templateData.trigger_type || 'no_response' } }
        ];

        templateData.steps.forEach((step: any, idx: number) => {
            nodes.push({
                id: `step_${idx}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                type: step.channel === 'email' ? 'email' : step.channel === 'whatsapp' ? 'whatsapp' : (step.channel as any),
                title: step.channel === 'email' ? t('email') : step.channel === 'whatsapp' ? t('whatsapp') : step.channel === 'condition' ? t('condition') : t('task'),
                iconType: step.channel === 'email' ? 'mail' : step.channel === 'whatsapp' ? 'whatsapp' : step.channel === 'condition' ? 'sparkles' : 'phone',
                settings: {
                    delay_hours: step.delay_hours,
                    message_template: step.message_template,
                    template_subject: step.template_subject || '',
                    message_template_b: step.message_template_b || '',
                    template_subject_b: step.template_subject_b || '',
                    ab_test_enabled: !!step.ab_test_enabled,
                    active_variant: 'a',
                    ai_autopilot: !!step.ai_autopilot,
                    ai_icebreaker: !!step.ai_icebreaker
                }
            });
        });

        return nodes;
    }

    // Case 2: Load from initialData (When editing existing sequence)
    if (initialData) {
        if (initialData.steps && Array.isArray(initialData.steps)) {
            const hasVisualLayout = initialData.steps.some((s: any) => s.parentId || s.type);
            if (hasVisualLayout) {
                return initialData.steps.map((step: any) => ({
                    id: step.id || `step_${Math.random().toString(36).substr(2, 5)}`,
                    type: step.type || (step.channel === 'email' ? 'email' : 'whatsapp'),
                    title: step.type === 'email' ? t('email') : step.type === 'whatsapp' ? t('whatsapp') : step.type === 'condition' ? t('condition') : step.type === 'task' ? t('task') : step.type === 'trigger' ? t('trigger') : t('email'),
                    iconType: step.type === 'email' ? 'mail' : step.type === 'whatsapp' ? 'whatsapp' : step.type === 'condition' ? 'sparkles' : step.type === 'task' ? 'phone' : 'zap',
                    parentId: step.parentId,
                    branch: step.branch,
                    settings: step.settings || { ...step }
                }));
            }
        }

        const nodes: FlowNodeData[] = [
            { id: 'trigger_1', type: 'trigger', title: t('trigger'), iconType: 'zap', settings: { source: initialData.lead_type || 'all_leads', trigger_type: initialData.trigger_type || 'no_response' } }
        ];

        if (initialData.steps) {
            initialData.steps.forEach((step: any, idx: number) => {
                nodes.push({
                    id: `step_${idx}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                    type: step.channel === 'email' ? 'email' : step.channel === 'whatsapp' ? 'whatsapp' : (step.channel as any),
                    title: step.channel === 'email' ? t('email') : step.channel === 'whatsapp' ? t('whatsapp') : step.channel === 'condition' ? t('condition') : t('task'),
                    iconType: step.channel === 'email' ? 'mail' : step.channel === 'whatsapp' ? 'whatsapp' : step.channel === 'condition' ? 'sparkles' : 'phone',
                    settings: {
                        delay_hours: step.delay_hours,
                        message_template: step.message_template,
                        template_subject: step.template_subject || '',
                        message_template_b: step.message_template_b || '',
                        template_subject_b: step.template_subject_b || '',
                        ab_test_enabled: !!step.ab_test_enabled,
                        active_variant: 'a',
                        from_gmail_id: step.from_gmail_id || undefined,
                        ai_autopilot: !!step.ai_autopilot,
                        ai_icebreaker: !!step.ai_icebreaker
                    }
                });
            });
        }

        return nodes;
    }

    // Case 3: Default empty nodes (When creating from scratch)
    return [
        { id: 'trigger_1', type: 'trigger', title: t('trigger'), iconType: 'zap', settings: { source: 'all_leads', trigger_type: 'no_response' } },
        { id: 'step_1', type: 'email', title: t('email'), iconType: 'mail', settings: { 
            delay_hours: 0, 
            message_template: 'Hello {{firstName}},\n\nI would like to discuss partnership opportunities.', 
            message_template_b: '',
            template_subject: '',
            template_subject_b: '',
            ab_test_enabled: false,
            active_variant: 'a',
            ai_autopilot: false, 
            ai_icebreaker: false 
        } }
    ];
};

export function FlowBuilder({ onBack, initialData, templateData }: FlowBuilderProps) {

    const t = useTranslations('Sequences.builder');
    const params = useParams();
    const locale = params.locale as string;
    const [name, setName] = React.useState(templateData?.name || initialData?.name || t('defaultName'));
    const [sources, setSources] = React.useState<string[]>([]);
    const [groups, setGroups] = React.useState<LeadGroup[]>([]);
    const [gmailAccounts, setGmailAccounts] = React.useState<{ id: string; email: string; is_primary: boolean; label?: string }[]>([]);

    const [nodes, setNodes] = React.useState<FlowNodeData[]>(getInitialNodes(t, initialData, templateData));

    // Sync state if props change (though key in parent should handle this)
    React.useEffect(() => {
        setNodes(getInitialNodes(t, initialData, templateData));
        setName(templateData?.name || initialData?.name || t('defaultName'));
    }, [templateData, initialData, t]);
    const [selectedNodeId, setSelectedNodeId] = React.useState<string | null>(null);
    const [isSaving, setIsSaving] = React.useState(false);
    const [isAiGenerating, setIsAiGenerating] = React.useState(false);
    const [isEmailEditorOpen, setIsEmailEditorOpen] = React.useState(false);

    const activeNode = nodes.find(n => n.id === selectedNodeId);

    const handleAIGenerate = async (type: 'icebreaker' | 'optimize') => {
        if (!activeNode) return;
        
        setIsAiGenerating(true);
        try {
            const currentContent = (activeNode.settings?.ab_test_enabled && activeNode.settings?.active_variant === 'b') 
                ? (activeNode.settings?.message_template_b || '') 
                : (activeNode.settings?.message_template || '');

            const res = await generateSequenceAIContent(type, {
                content: currentContent,
                channel: activeNode.type as any,
                leadName: 'Lead', 
                companyName: 'Lead Şirketi',
                locale: locale
            });

            if (res.success && res.content) {
                const field = (activeNode.settings?.ab_test_enabled && activeNode.settings?.active_variant === 'b') 
                    ? 'message_template_b' 
                    : 'message_template';
                
                const newContent = type === 'icebreaker' ? res.content + "\n\n" + currentContent : res.content;
                updateActiveNodeSetting(field, newContent);
                toast.success(t('toastAiSuccess'));
            } else {
                toast.error(res.error || t('toastAiError'));
            }
        } catch (_err) {
            toast.error(t('toastError'));
        } finally {
            setIsAiGenerating(false);
        }
    };

    React.useEffect(() => {
        const fetchData = async () => {
            try {
                const [sData, gData] = await Promise.all([
                    getLeadSources(),
                    getLeadGroups()
                ]);
                setSources(sData);
                setGroups(gData || []);

                // Load connected Gmail integrations for the from-account selector
                const { getIntegrations } = await import('@/features/settings');
                const integrations = await getIntegrations();
                const gmails = (integrations as any[])
                    .filter(i => i.provider === 'gmail' && i.status === 'connected')
                    .map(i => ({ id: i.id, email: i.config?.email || i.id, is_primary: !!i.is_primary, label: i.label }));
                setGmailAccounts(gmails);
            } catch (err) {
                console.error('Data fetch error:', err);
            }
        };
        fetchData();
    }, []);

    const updateActiveNodeSetting = (key: string, value: any) => {
        if (!selectedNodeId) return;
        setNodes(nodes.map((n) => {
            if (n.id === selectedNodeId) {
                return { ...n, settings: { ...n.settings, [key]: value } };
            }
            return n;
        }));
    };

    const renderNode = (node: FlowNodeData, index: number) => {
        let IconComponent = <Zap size={18} />;
        if (node.iconType === 'mail') IconComponent = <Mail className="text-blue-500" size={18} />;
        if (node.iconType === 'linkedin') IconComponent = <Linkedin className="text-blue-600" size={18} />;
        if (node.iconType === 'phone') IconComponent = <Phone className="text-slate-500" size={18} />;
        if (node.iconType === 'branch') IconComponent = <GitBranch className="text-indigo-500" size={18} />;
        if (node.iconType === 'zap') IconComponent = <Zap className="text-amber-500" size={18} />;
        if (node.iconType === 'whatsapp') IconComponent = <MessageSquare className="text-emerald-500" size={18} />;
        if (node.iconType === 'sparkles') IconComponent = <Sparkles className="text-amber-500" size={18} />;

        const yesNodes = nodes.filter(n => n.parentId === node.id && n.branch === 'yes');
        const noNodes = nodes.filter(n => n.parentId === node.id && n.branch === 'no');

        return (
            <div key={node.id} className="flex flex-col items-center">
                <FlowNodeComp
                    type={node.type}
                    title={node.title}
                    icon={IconComponent}
                    ai={node.settings?.ai_autopilot}
                    ab={node.settings?.ab_test_enabled}
                    active={selectedNodeId === node.id}
                    onClick={() => setSelectedNodeId(node.id)}
                />
                
                {node.type === 'condition' ? (
                    <div className="flex flex-col items-center w-full">
                        <Connector 
                            isCondition 
                            yesLabel={t('branchYes')}
                            noLabel={t('branchNo')}
                            onYesClick={() => handleAddStep(index, 'email', 'mail', t('email'), node.id, 'yes')} 
                            onNoClick={() => handleAddStep(index, 'email', 'mail', t('email'), node.id, 'no')} 
                        />
                        <div className="flex justify-between w-full max-w-[850px] gap-24 mt-4">
                            <div className="flex flex-col items-center flex-1 border-r border-slate-100 dark:border-slate-800/50 pr-4">
                                {yesNodes.map((child, childIdx) => renderNode(child, childIdx))}
                            </div>
                            <div className="flex flex-col items-center flex-1 pl-4">
                                {noNodes.map((child, childIdx) => renderNode(child, childIdx))}
                            </div>
                        </div>
                    </div>
                ) : (
                    <Connector onAddClick={() => handleAddStep(index, 'email', 'mail', t('email'))} />
                )}
            </div>
        );
    };

    const handleAddStep = (indexContext: number, type: FlowNodeData['type'], iconType: string, title: string, parentId?: string, branch?: 'yes' | 'no') => {
        const newNode: FlowNodeData = {
            id: `step_${Date.now()}`,
            type,
            title,
            iconType,
            settings: { 
                delay_hours: 24, 
                message_template: '', 
                message_template_b: '',
                template_subject: '',
                template_subject_b: '',
                ab_test_enabled: false,
                active_variant: 'a',
                ai_autopilot: false, 
                ai_icebreaker: false 
            },
            parentId,
            branch
        };
        
        const newNodes = [...nodes];
        if (parentId) {
            const branchNodes = nodes.filter(n => n.parentId === parentId && n.branch === branch);
            if (branchNodes.length > 0) {
                const lastIdx = nodes.findIndex(n => n.id === branchNodes[branchNodes.length - 1].id);
                newNodes.splice(lastIdx + 1, 0, newNode);
            } else {
                const parentIdx = nodes.findIndex(n => n.id === parentId);
                newNodes.splice(parentIdx + 1, 0, newNode);
            }
        } else {
            newNodes.splice(indexContext + 1, 0, newNode);
        }
        
        setNodes(newNodes);
        setSelectedNodeId(newNode.id);
    };

    const handleDeleteNode = (id: string) => {
        setNodes(nodes.filter((n) => n.id !== id));
        if (selectedNodeId === id) setSelectedNodeId(null);
    };

    const handleSave = async (is_active: boolean) => {
        setIsSaving(true);
        try {
            const emailAndWhatsappNodes = nodes.filter((n) => n.type === 'email' || n.type === 'whatsapp');
            const emptyTemplate = emailAndWhatsappNodes.find(n => !n.settings.message_template?.trim());
            if (emptyTemplate) {
                toast.error(t('toastEmptyTemplate'));
                setIsSaving(false);
                return;
            }

            const stepsToSave: SequenceStep[] = nodes.map((n) => ({
                id: n.id,
                type: n.type as any,
                delay_hours: Number(n.settings?.delay_hours) || 0,
                message_template: n.settings?.message_template || '',
                template_subject: n.type === 'email' ? (n.settings?.template_subject || '') : undefined,
                message_template_b: n.settings?.ab_test_enabled ? n.settings?.message_template_b : undefined,
                template_subject_b: (n.type === 'email' && n.settings?.ab_test_enabled) ? (n.settings?.template_subject_b || '') : undefined,
                ab_test_enabled: !!n.settings?.ab_test_enabled,
                channel: (n.type === 'trigger' ? 'email' : n.type) as any,
                from_gmail_id: n.settings?.from_gmail_id || undefined,
                ai_autopilot: !!n.settings?.ai_autopilot,
                ai_icebreaker: !!n.settings?.ai_icebreaker,
                parentId: n.parentId,
                branch: n.branch,
                settings: n.settings
            }));

            const payload = {
                name: name,
                trigger_type: nodes[0]?.settings?.trigger_type || 'no_response',
                lead_type: nodes[0]?.settings?.source || 'all_leads',
                steps: stepsToSave,
                is_active
            };

            let res;
            if (initialData?.id) {
                res = await updateSequence(initialData.id, payload);
            } else {
                res = await createSequence(payload);
            }

            if (res?.error) {
                toast.error(`Error: ${res.error}`);
            } else {
                toast.success(is_active ? t('toastSuccess') : t('toastDraft'));
                onBack();
            }
        } catch (err: any) {
            toast.error(t('toastError') + ': ' + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveDraft = () => handleSave(false);
    const handlePublish = () => handleSave(true);

    return (
        <div className="fixed inset-0 z-[100] flex flex-col bg-[#f8fafc] dark:bg-[#090a0c]">
            <header className="h-14 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f1115] flex items-center justify-between px-6 z-30 relative">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                        <ArrowLeft size={20} />
                    </button>
                    <div className="flex flex-col">
                        <input value={name} onChange={e => setName(e.target.value)} className="text-sm font-bold text-slate-900 dark:text-white bg-transparent outline-none ring-0 w-64 hover:border-b hover:border-slate-300 dark:hover:border-slate-700 focus:border-b focus:border-slate-400" />
                        <span className="text-[10px] text-slate-400">{t('drafting')}</span>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={handleSaveDraft} className="text-sm font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white px-3 py-1.5 transition-colors">{t('actions.saveDraft')}</button>
                    <button disabled={isSaving} onClick={handlePublish} className="btn-primary-gradient px-4 py-1.5 rounded-lg text-sm font-bold disabled:opacity-50">
                        {isSaving ? t('published') + '...' : t('actions.publish')}
                    </button>
                </div>
            </header>

            <div className="flex-1 flex relative overflow-hidden">
                <aside className="w-64 border-r border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#0f1115] p-5 flex flex-col gap-6 z-20 overflow-y-auto hidden md:flex">
                    <div>
                        <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">{t('palette')}</h3>
                        <div className="space-y-3">
                            <PaletteItem onClick={() => handleAddStep(nodes.length - 1, 'email', 'mail', t('email'))} icon={<Mail size={16} />} title={t('email')} desc={t('emailDesc')} ai />
                            <PaletteItem onClick={() => handleAddStep(nodes.length - 1, 'whatsapp', 'whatsapp', t('whatsapp'))} icon={<MessageSquare size={16} />} title={t('whatsapp')} desc={t('whatsappDesc')} />
                            <PaletteItem onClick={() => handleAddStep(nodes.length - 1, 'condition', 'sparkles', t('condition'))} icon={<Sparkles size={16} />} title={t('condition')} desc={t('conditionDesc')} />
                            <PaletteItem onClick={() => handleAddStep(nodes.length - 1, 'task', 'phone', t('task'))} icon={<Phone size={16} />} title={t('task')} desc={t('taskDesc')} />
                        </div>
                    </div>
                </aside>

                <div className="flex-1 relative overflow-auto bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:20px_20px] flex flex-col items-center py-20 z-0">
                    {nodes.filter(n => !n.parentId).map((node, index) => renderNode(node, index))}
                    <div className="h-24"></div>
                </div>

                <aside className="w-80 border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f1115] p-6 shadow-2xl z-20 overflow-y-auto">
                    {activeNode ? (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <h3 className="font-bold text-slate-900 dark:text-white uppercase text-xs">
                                    {activeNode.type === 'trigger' ? t('trigger') : activeNode.title}
                                </h3>
                                {activeNode.type !== 'trigger' && (
                                    <button onClick={() => handleDeleteNode(activeNode.id)} className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors">
                                        <Trash2 size={16} />
                                    </button>
                                )}
                            </div>

                            {activeNode.type === 'trigger' && (
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('triggerLabel')}</label>
                                        <select
                                            value={activeNode.settings?.trigger_type || 'no_response'}
                                            onChange={(e) => updateActiveNodeSetting('trigger_type', e.target.value)}
                                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-bold"
                                        >
                                            <option value="now">{t('triggerNow')}</option>
                                            <option value="no_response">{t('triggerNoResponse')}</option>
                                            <option value="instant">{t('triggerInstant')}</option>
                                            <option value="lead_created">{t('triggerCreated')}</option>
                                            <option value="meeting_booked">{t('triggerMeeting')}</option>
                                            <option value="custom">{t('triggerCustom')}</option>
                                            <option value="hubspot_lead">{t('triggerHubspot')}</option>
                                            <option value="salesforce_lead">{t('triggerSalesforce')}</option>
                                            <option value="pipedrive_lead">{t('triggerPipedrive')}</option>
                                            <option value="zoho_lead">{t('triggerZoho')}</option>
                                        </select>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('targetLabel')}</label>
                                        <select 
                                            value={activeNode.settings?.source || 'all_leads'} 
                                            onChange={(e) => updateActiveNodeSetting('source', e.target.value)}
                                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-bold"
                                        >
                                            <option value="all_leads">{t('targetAll')}</option>
                                            {sources.map(s => <option key={s} value={`source:${s}`}>{s}</option>)}
                                            {groups.map(g => <option key={g.id} value={`group:${g.id}`}>{g.name}</option>)}
                                        </select>
                                    </div>
                                </div>
                            )}

                            {(activeNode.type === 'email' || activeNode.type === 'whatsapp') && (
                                <div className="space-y-6">
                                    {/* A/B Testing Toggle */}
                                    <div className="p-4 bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <GitBranch size={16} className="text-amber-500" />
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-bold uppercase tracking-widest">{t('abTestLabel')}</span>
                                                    <span className="text-[10px] text-slate-500 font-medium">{t('abTestDesc')}</span>
                                                </div>
                                            </div>
                                            <input 
                                                type="checkbox" 
                                                checked={!!activeNode.settings?.ab_test_enabled} 
                                                onChange={e => updateActiveNodeSetting('ab_test_enabled', e.target.checked)} 
                                                className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500" 
                                            />
                                        </div>

                                        {activeNode.settings?.ab_test_enabled && (
                                            <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                                                <button 
                                                    onClick={() => updateActiveNodeSetting('active_variant', 'a')}
                                                    className={`flex-1 py-1.5 text-[10px] font-bold rounded-md transition-all ${activeNode.settings?.active_variant !== 'b' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500'}`}
                                                >
                                                    {t('variantALabel')}
                                                </button>
                                                <button 
                                                    onClick={() => updateActiveNodeSetting('active_variant', 'b')}
                                                    className={`flex-1 py-1.5 text-[10px] font-bold rounded-md transition-all ${activeNode.settings?.active_variant === 'b' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500'}`}
                                                >
                                                    {t('variantBLabel')}
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {activeNode.type === 'email' && (
                                        <>
                                            {/* Gmail account selector — only shown when multiple accounts connected */}
                                            {gmailAccounts.length > 1 && (
                                                <div className="space-y-2">
                                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Gönderen Hesap</label>
                                                    <select
                                                        value={activeNode.settings?.from_gmail_id || ''}
                                                        onChange={e => updateActiveNodeSetting('from_gmail_id', e.target.value || undefined)}
                                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-medium"
                                                    >
                                                        <option value="">Birincil hesap (varsayılan)</option>
                                                        {gmailAccounts.map(acc => (
                                                            <option key={acc.id} value={acc.id}>
                                                                {acc.label || acc.email}{acc.is_primary ? ' ★' : ''}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            )}
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                                                    {activeNode.settings?.active_variant === 'b' ? t('subjectBLabel') : t('subjectLabel')}
                                                </label>
                                                <input
                                                    type="text"
                                                    value={(activeNode.settings?.active_variant === 'b' ? activeNode.settings?.template_subject_b : activeNode.settings?.template_subject) || ''}
                                                    onChange={e => updateActiveNodeSetting(activeNode.settings?.active_variant === 'b' ? 'template_subject_b' : 'template_subject', e.target.value)}
                                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none"
                                                    placeholder={t('subjectPlaceholder')}
                                                />
                                            </div>
                                        </>
                                    )}

                                    <div className="p-4 bg-primary/10 dark:bg-primary/20 rounded-xl space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <BrainCircuit size={16} className="text-primary" />
                                                <span className="text-xs font-bold uppercase tracking-widest">AI Icebreaker</span>
                                            </div>
                                            <input type="checkbox" checked={!!activeNode.settings?.ai_icebreaker} onChange={e => updateActiveNodeSetting('ai_icebreaker', e.target.checked)} className="w-4 h-4 rounded text-primary focus:ring-primary" />
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Sparkles size={16} className="text-amber-500" />
                                                <span className="text-xs font-bold uppercase tracking-widest">AI Autopilot</span>
                                            </div>
                                            <input type="checkbox" checked={!!activeNode.settings?.ai_autopilot} onChange={e => updateActiveNodeSetting('ai_autopilot', e.target.checked)} className="w-4 h-4 rounded text-amber-500" />
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                                                {activeNode.settings?.active_variant === 'b' ? t('templateBLabel') : t('templateLabel')}
                                            </label>
                                            <div className="flex gap-2">
                                                <button onClick={() => handleAIGenerate('icebreaker')} disabled={isAiGenerating} className="px-2 py-1 bg-primary/10 text-primary rounded text-[10px] font-bold uppercase tracking-widest hover:bg-primary/20">{t('btnIcebreaker')}</button>
                                                <button onClick={() => handleAIGenerate('optimize')} disabled={isAiGenerating} className="px-2 py-1 bg-amber-50 text-amber-600 rounded text-[10px] font-bold uppercase tracking-widest hover:bg-amber-100">{t('btnOptimize')}</button>
                                            </div>
                                        </div>

                                        {/* Content preview card */}
                                        <div
                                            onClick={() => setIsEmailEditorOpen(true)}
                                            className="relative group cursor-pointer w-full min-h-[120px] max-h-[200px] overflow-hidden bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 text-sm font-medium transition-all hover:border-primary/40 hover:shadow-md hover:shadow-primary/5"
                                        >
                                            {/* Rendered preview or placeholder */}
                                            {(() => {
                                                const val = (activeNode.settings?.active_variant === 'b'
                                                    ? activeNode.settings?.message_template_b
                                                    : activeNode.settings?.message_template) || '';
                                                if (!val) {
                                                    return (
                                                        <span className="text-slate-400 italic text-xs">{t('templatePlaceholder')}</span>
                                                    );
                                                }
                                                // If HTML content, render it; otherwise plain text
                                                const isHtml = val.trim().startsWith('<');
                                                return isHtml ? (
                                                    <div
                                                        className="prose prose-xs dark:prose-invert max-w-none text-slate-700 dark:text-slate-300 pointer-events-none select-none"
                                                        dangerouslySetInnerHTML={{ __html: val }}
                                                    />
                                                ) : (
                                                    <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap text-xs leading-relaxed">{val}</p>
                                                );
                                            })()}

                                            {/* Hover overlay */}
                                            <div className="absolute inset-0 bg-gradient-to-t from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-end justify-center pb-3">
                                                <span className="px-3 py-1.5 btn-primary-gradient text-white text-[11px] font-bold rounded-lg shadow-lg">
                                                    ✏️ Şablonu Düzenle
                                                </span>
                                            </div>
                                        </div>

                                        {/* Open editor button */}
                                        <button
                                            type="button"
                                            onClick={() => setIsEmailEditorOpen(true)}
                                            className="w-full py-2 rounded-xl border border-dashed border-primary/30 text-primary text-xs font-bold hover:bg-primary/5 transition-colors flex items-center justify-center gap-2"
                                        >
                                            <span>✏️</span>
                                            <span>{activeNode.type === 'email' ? 'Email Editörünü Aç' : 'Mesaj Editörünü Aç'}</span>
                                        </button>
                                    </div>

                                    <div className="space-y-4">
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('delayLabel')}</label>
                                        <input
                                            type="number"
                                            value={activeNode.settings?.delay_hours || 0}
                                            onChange={e => updateActiveNodeSetting('delay_hours', parseInt(e.target.value) || 0)}
                                            className="w-24 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-bold"
                                        />
                                    </div>
                                </div>
                            )}

                            {activeNode.type === 'condition' && (
                                <div className="space-y-4">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('controlLabel')}</label>
                                    <select
                                        value={activeNode.settings?.condition_type || 'replied'}
                                        onChange={e => updateActiveNodeSetting('condition_type', e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold"
                                    >
                                        <option value="replied">{t('controlReplied')}</option>
                                        <option value="opened">{t('controlOpened')}</option>
                                    </select>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-40">
                            <MousePointer2 size={32} className="mb-4 text-slate-300" />
                            <h4 className="text-sm font-bold uppercase tracking-widest mb-2">{t('selectionPlaceholder')}</h4>
                            <p className="text-xs text-slate-500 leading-relaxed font-medium">{t('selectionDesc')}</p>
                        </div>
                    )}
                </aside>
            </div>

            {/* Email / WhatsApp rich text editor modal */}
            {activeNode && (activeNode.type === 'email' || activeNode.type === 'whatsapp') && (
                <EmailEditorModal
                    isOpen={isEmailEditorOpen}
                    onClose={() => setIsEmailEditorOpen(false)}
                    channel={activeNode.type}
                    variantLabel={
                        activeNode.settings?.ab_test_enabled
                            ? (activeNode.settings?.active_variant === 'b' ? 'Variant B' : 'Variant A')
                            : undefined
                    }
                    initialContent={
                        (activeNode.settings?.active_variant === 'b'
                            ? activeNode.settings?.message_template_b
                            : activeNode.settings?.message_template) || ''
                    }
                    onApply={(html) => {
                        const field = (activeNode.settings?.ab_test_enabled && activeNode.settings?.active_variant === 'b')
                            ? 'message_template_b'
                            : 'message_template';
                        updateActiveNodeSetting(field, html);
                    }}
                />
            )}
        </div>
    );
}
