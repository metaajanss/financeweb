'use client';

import { X } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { useState, useEffect } from 'react';
import { createLead } from '@/features/leads/server/actions';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';

interface AddLeadModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    initialStatus?: string;
}

export function AddLeadModal({ isOpen, onClose, onSuccess, initialStatus = 'new' }: AddLeadModalProps) {
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        company: '',
        source: 'manual',
        status: initialStatus,
        language: 'en'
    });

    // Update status when initialStatus changes (modal opens for a specific column)
    useEffect(() => {
        if (isOpen) {
            setFormData(prev => ({ ...prev, status: initialStatus }));
        }
    }, [isOpen, initialStatus]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const result = await createLead(formData);

            if (result.error) {
                setError(result.error);
                return;
            }

            onSuccess();
            onClose();
            setFormData({ first_name: '', last_name: '', email: '', phone: '', company: '', source: 'manual', status: initialStatus, language: 'en' });
        } catch (err: any) {
            setError(err.message || 'Failed to create lead');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div className="relative w-full max-w-md mx-4 bg-surface border border-border rounded-2xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between p-6 border-b border-border">
                    <h2 className="text-2xl font-bold">Add New Lead</h2>
                    <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="p-3 rounded-lg bg-red-500/10 text-red-400 text-sm border border-red-500/20">
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-2">First Name *</label>
                            <input
                                type="text"
                                required
                                value={formData.first_name}
                                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                                className="w-full p-3 rounded-lg bg-background border border-border focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2">Last Name *</label>
                            <input
                                type="text"
                                required
                                value={formData.last_name}
                                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                                className="w-full p-3 rounded-lg bg-background border border-border focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">Email *</label>
                        <input
                            type="email"
                            required
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="w-full p-3 rounded-lg bg-background border border-border focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">Phone</label>
                        <input
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/[^0-9+]/g, '') })}
                            className="w-full p-3 rounded-lg bg-background border border-border focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">Company</label>
                        <input
                            type="text"
                            value={formData.company}
                            onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                            className="w-full p-3 rounded-lg bg-background border border-border focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">Source</label>
                        <Select
                            value={formData.source}
                            onValueChange={(value) => setFormData({ ...formData, source: value })}
                        >
                            <SelectTrigger className="w-full p-3 h-[46px] rounded-lg bg-background border-border focus:ring-2 focus:ring-primary focus:border-primary outline-none">
                                <SelectValue placeholder="Select Source" />
                            </SelectTrigger>
                            <SelectContent className="bg-background border-border text-foreground">
                                <SelectItem value="manual">Manual</SelectItem>
                                <SelectItem value="website">Website</SelectItem>
                                <SelectItem value="referral">Referral</SelectItem>
                                <SelectItem value="social">Social Media</SelectItem>
                                <SelectItem value="instagram">Instagram</SelectItem>
                                <SelectItem value="tiktok">TikTok</SelectItem>
                                <SelectItem value="email">Email Campaign</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">Initial Status</label>
                        <Select
                            value={formData.status}
                            onValueChange={(value) => setFormData({ ...formData, status: value })}
                        >
                            <SelectTrigger className="w-full p-3 h-[46px] rounded-lg bg-background border-border focus:ring-2 focus:ring-primary focus:border-primary outline-none">
                                <SelectValue placeholder="Select Status" />
                            </SelectTrigger>
                            <SelectContent className="bg-background border-border text-foreground">
                                <SelectItem value="new">New Lead</SelectItem>
                                <SelectItem value="contacted">Contacted</SelectItem>
                                <SelectItem value="qualified">Qualified</SelectItem>
                                <SelectItem value="booked">Meeting Booked</SelectItem>
                                <SelectItem value="unqualified">Unqualified/Closed</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">Preferred Language</label>
                        <Select
                            value={formData.language}
                            onValueChange={(value) => setFormData({ ...formData, language: value })}
                        >
                            <SelectTrigger className="w-full p-3 h-[46px] rounded-lg bg-background border-border focus:ring-2 focus:ring-primary focus:border-primary outline-none">
                                <SelectValue placeholder="Select Language" />
                            </SelectTrigger>
                            <SelectContent className="bg-background border-border text-foreground">
                                <SelectItem value="en">English (EN)</SelectItem>
                                <SelectItem value="tr">Turkish (TR)</SelectItem>
                                <SelectItem value="de">German (DE)</SelectItem>
                                <SelectItem value="fr">French (FR)</SelectItem>
                                <SelectItem value="es">Spanish (ES)</SelectItem>
                                <SelectItem value="it">Italian (IT)</SelectItem>
                                <SelectItem value="pt">Portuguese (PT)</SelectItem>
                                <SelectItem value="ru">Russian (RU)</SelectItem>
                                <SelectItem value="zh">Chinese (ZH)</SelectItem>
                                <SelectItem value="ja">Japanese (JA)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading} className="flex-1">
                            {loading ? 'Creating...' : 'Create Lead'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
