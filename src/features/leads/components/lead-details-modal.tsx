'use client';

import { X, Mail, Phone, Building, Calendar, Tag, Instagram, Globe } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';

interface LeadDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    lead: any;
    onEdit: () => void;
}

export function LeadDetailsModal({ isOpen, onClose, lead, onEdit }: LeadDetailsModalProps) {
    if (!isOpen || !lead) return null;

    const statusColors: Record<string, string> = {
        new: 'bg-gradient-to-r from-blue-600/20 to-indigo-600/20 text-blue-400 border-blue-500/30 shadow-blue-500/10 ring-1 ring-blue-500/10',
        contacted: 'bg-gradient-to-r from-amber-600/20 to-yellow-600/20 text-amber-400 border-amber-500/30 shadow-amber-500/10 ring-1 ring-amber-500/10',
        qualified: 'bg-gradient-to-r from-emerald-600/20 to-teal-600/20 text-emerald-400 border-emerald-500/30 shadow-emerald-500/10 ring-1 ring-emerald-500/10',
        booked: 'bg-gradient-to-r from-violet-600/20 to-fuchsia-600/20 text-violet-400 border-violet-500/30 shadow-violet-500/10 ring-1 ring-violet-500/10',
        unqualified: 'bg-gradient-to-r from-rose-600/20 to-red-600/20 text-rose-400 border-rose-500/30 shadow-rose-500/10 ring-1 ring-rose-500/10'
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div className="relative w-full max-w-2xl mx-4 bg-surface border border-border rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between p-6 border-b border-border sticky top-0 bg-surface z-10">
                    <h2 className="text-2xl font-bold">Lead Details</h2>
                    <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <h3 className="text-2xl font-bold">{lead.first_name} {lead.last_name}</h3>
                                {lead.language && (
                                    <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] rounded-full border border-primary/20 uppercase font-black flex items-center gap-1">
                                        <Globe size={10} />
                                        {lead.language}
                                    </span>
                                )}
                            </div>
                            <p className="text-muted-foreground">{lead.company || 'No company'}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border ${statusColors[lead.status] || statusColors.new}`}>
                            {lead.status}
                        </span>
                    </div>

                    {/* Contact Info */}
                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="flex items-center gap-3 p-4 bg-background rounded-lg border border-border">
                            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                                <Mail size={20} className="text-primary" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Email</p>
                                <p className="font-medium">{lead.email}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-4 bg-background rounded-lg border border-border">
                            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                                <Phone size={20} className="text-primary" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Phone</p>
                                <p className="font-medium">{lead.phone || 'N/A'}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-4 bg-background rounded-lg border border-border">
                            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                                <Building size={20} className="text-primary" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Company</p>
                                <p className="font-medium">{lead.company || 'N/A'}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-4 bg-background rounded-lg border border-border">
                            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                                <Tag size={20} className="text-primary" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground mb-1">Source</p>
                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-black uppercase tracking-[0.1em] border transition-all duration-300 shadow-sm ${lead.source?.toLowerCase()?.includes('whatsapp') ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-emerald-500/10' :
                                    lead.source?.toLowerCase()?.includes('instagram') ? 'bg-pink-500/10 text-pink-400 border-pink-500/20 shadow-pink-500/10' :
                                        lead.source?.toLowerCase()?.includes('tiktok') ? 'bg-zinc-100 text-zinc-800 border-zinc-300 shadow-zinc-500/10 dark:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-700' :
                                            lead.source?.toLowerCase()?.includes('email') || lead.source?.toLowerCase()?.includes('gmail') ? 'bg-rose-500/10 text-rose-400 border-rose-500/20 shadow-rose-500/10' :
                                                lead.source === 'Google Ads' || lead.source?.toLowerCase()?.includes('google ads') ? 'bg-white text-zinc-900 border-zinc-200 shadow-sm' :
                                                    lead.source?.toLowerCase()?.includes('widget') ? 'bg-primary/10 text-primary border-primary/20 shadow-primary/10' :
                                                        'bg-zinc-800/50 text-muted-foreground border-white/5'
                                    }`}>
                                    {lead.source?.toLowerCase()?.includes('whatsapp') && <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.414 0 .018 5.394 0 12.03a11.854 11.854 0 001.532 5.795L0 24l6.305-1.654a11.846 11.846 0 005.733 1.482h.005c6.634 0 12.032-5.396 12.035-12.032a11.8 11.8 0 00-3.411-8.505z" /></svg>}
                                    {lead.source?.toLowerCase()?.includes('instagram') && <Instagram size={12} />}
                                    {lead.source?.toLowerCase()?.includes('tiktok') && <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M19.589 6.686a4.793 4.793 0 0 1-3.97-1.561 4.795 4.795 0 0 1-1.236-3.184h-3.987v11.339a4.444 4.444 0 0 1-4.487 4.411 4.444 4.444 0 0 1-4.487-4.411 4.444 4.444 0 0 1 4.487-4.411c.153 0 .304.01.455.027v4.14a.76.76 0 0 0-.455-.145 1.178 1.178 0 0 0-1.196 1.176 1.178 1.178 0 0 0 1.196 1.176 1.178 1.178 0 0 0 1.196-1.176V0h4.293a8.163 8.163 0 0 0 3.12 6.015 8.163 8.163 0 0 0 5.07 1.761v3.91a11.944 11.944 0 0 1-4.81-1.238l.006 1.637-.006-.002v.002z" /></svg>}
                                    {(lead.source === 'Google Ads' || lead.source?.toLowerCase()?.includes('google ads')) && (
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path fill="#34A853" d="M3.9998 22.9291C1.7908 22.9291 0 21.1383 0 18.9293s1.7908-3.9998 3.9998-3.9998 3.9998 1.7908 3.9998 3.9998-1.7908 3.9998-3.9998 3.9998z" />
                                            <path fill="#4285F4" d="M23.4641 16.9287L15.4632 3.072C14.3586 1.1587 11.9121.5028 9.9988 1.6074S7.4295 5.1585 8.5341 7.0718l8.0009 13.8567c1.1046 1.9133 3.5511 2.5679 5.4644 1.4646 1.9134-1.1046 2.568-3.5511 1.4647-5.4644z" />
                                            <path fill="#FBBC04" d="M7.5137 4.8438L1.5645 15.1484A4.5 4.5 0 0 1 4 14.4297c2.5597-.0075 4.6248 2.1585 4.4941 4.7148l3.2168-5.5723-3.6094-6.25c-.4499-.7793-.6322-1.6394-.5878-2.4784z" />
                                        </svg>
                                    )}
                                    {lead.source || 'MANUAL'}
                                </span>
                                {(lead.source?.toLowerCase()?.includes('gmail') || lead.source?.toLowerCase()?.includes('email')) && lead.metadata?.source_email && (
                                    <p className="text-[11px] text-muted-foreground mt-1 font-mono">{lead.metadata.source_email}</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Metadata */}
                    <div className="p-4 bg-background rounded-lg border border-border">
                        <div className="flex items-center gap-2 mb-2">
                            <Calendar size={16} className="text-muted-foreground" />
                            <p className="text-sm font-medium">Timeline</p>
                        </div>
                        <div className="space-y-1 text-sm text-muted-foreground">
                            <p>Created: {new Date(lead.created_at).toLocaleString()}</p>
                            {lead.updated_at && <p>Last Updated: {new Date(lead.updated_at).toLocaleString()}</p>}
                            <p className="flex items-center gap-2 mt-1">
                                <span className="font-medium text-foreground">Language:</span> 
                                <span className="px-1.5 py-0.5 bg-primary/10 text-primary text-[10px] rounded border border-primary/20 uppercase font-bold">
                                    {lead.language || 'en'}
                                </span>
                            </p>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4 border-t border-border">
                        <Button variant="outline" onClick={onClose} className="flex-1">
                            Close
                        </Button>
                        <Button onClick={() => { onEdit(); onClose(); }} className="flex-1">
                            Edit Lead
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
