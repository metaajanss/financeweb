'use client';

import { X } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { useState } from 'react';
import { updateLead } from '@/features/leads/server/actions';

interface EditLeadModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    lead: any;
}

export function EditLeadModal({ isOpen, onClose, onSuccess, lead }: EditLeadModalProps) {
    const [formData, setFormData] = useState({
        first_name: lead?.first_name || '',
        last_name: lead?.last_name || '',
        email: lead?.email || '',
        phone: lead?.phone || '',
        company: lead?.company || '',
        language: lead?.language || 'en'
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            await updateLead(lead.id, formData);
            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err.message || 'Failed to update lead');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen || !lead) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div className="relative w-full max-w-md mx-4 bg-surface border border-border rounded-2xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between p-6 border-b border-border">
                    <h2 className="text-2xl font-bold">Edit Lead</h2>
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
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
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
                        <label className="block text-sm font-medium mb-2">Language</label>
                        <select
                            value={formData.language}
                            onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                            className="w-full p-3 rounded-lg bg-background border border-border focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                        >
                            <option value="en">English (EN)</option>
                            <option value="tr">Turkish (TR)</option>
                            <option value="de">German (DE)</option>
                            <option value="fr">French (FR)</option>
                            <option value="es">Spanish (ES)</option>
                            <option value="it">Italian (IT)</option>
                            <option value="pt">Portuguese (PT)</option>
                            <option value="ru">Russian (RU)</option>
                            <option value="zh">Chinese (ZH)</option>
                            <option value="ja">Japanese (JA)</option>
                        </select>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading} className="flex-1">
                            {loading ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
