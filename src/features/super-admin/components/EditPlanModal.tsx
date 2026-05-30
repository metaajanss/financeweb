'use client';

import { useState } from 'react';
import { Settings, X, Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { assignAccountPlan } from '@/features/super-admin';
import { toast } from 'sonner';

interface EditPlanModalProps {
    tenant: any;
    onClose: () => void;
    onSuccess: (id: string, newPlan: string) => void;
}

export default function EditPlanModal({ tenant, onClose, onSuccess }: EditPlanModalProps) {
    const [newPlan, setNewPlan] = useState(tenant.plan || 'free');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleUpdatePlan = async () => {
        if (!newPlan) return;
        
        setIsSubmitting(true);
        const result = await assignAccountPlan(tenant.id, newPlan);
        
        if (result.success) {
            toast.success(`Plan updated to ${newPlan} successfully`);
            onSuccess(tenant.id, newPlan);
            onClose();
        } else {
            toast.error(result.error || 'Failed to update tenant plan');
        }
        setIsSubmitting(false);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-slate-900 text-white p-8 rounded-3xl w-full max-w-md border border-white/10 shadow-2xl relative overflow-hidden">
                <button 
                    onClick={onClose}
                    className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-all"
                >
                    <X size={16} />
                </button>
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-primary/20 rounded-2xl border border-primary/20">
                        <Settings className="text-primary" size={24} />
                    </div>
                    <div>
                        <h3 className="text-lg font-black tracking-tight uppercase">Update Tenant <span className="text-primary">Plan</span></h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Core Configuration</p>
                    </div>
                </div>

                <div className="p-5 bg-white/5 rounded-2xl border border-white/5 mb-8">
                    <p className="text-xs text-slate-300">Target Account:</p>
                    <p className="text-base font-black text-white mt-0.5">{tenant.name}</p>
                </div>
                
                <div className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Subscription Tier</label>
                        <Select value={newPlan} onValueChange={setNewPlan}>
                            <SelectTrigger className="w-full h-14 bg-black border-white/10 rounded-2xl focus:ring-primary/50 text-white font-black uppercase tracking-wider text-xs">
                                <SelectValue placeholder="Select plan" />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-950 border-white/10 rounded-2xl">
                                <SelectItem value="free" className="text-xs font-black uppercase tracking-widest py-3 text-white">Free</SelectItem>
                                <SelectItem value="starter" className="text-xs font-black uppercase tracking-widest py-3 text-white">Starter</SelectItem>
                                <SelectItem value="growth" className="text-xs font-black uppercase tracking-widest py-3 text-white">Growth</SelectItem>
                                <SelectItem value="pro" className="text-xs font-black uppercase tracking-widest py-3 text-white">Pro</SelectItem>
                                <SelectItem value="business" className="text-xs font-black uppercase tracking-widest py-3 text-white">Business</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <button 
                        onClick={handleUpdatePlan}
                        disabled={isSubmitting}
                        className="w-full h-14 btn-primary-gradient font-black uppercase tracking-[0.2em] text-xs rounded-2xl transition-all shadow-lg flex items-center justify-center gap-3 active:scale-[0.98]"
                    >
                        {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                        Confirm Deployment
                    </button>
                </div>
            </div>
        </div>
    );
}
