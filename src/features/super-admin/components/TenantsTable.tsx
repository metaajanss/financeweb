'use client';

import { useState } from 'react';
import { Search, Shield, Ban, Loader2, CheckCircle2, Settings } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { updateTenantStatus, getImpersonationLink } from '@/features/super-admin';
import { toast } from 'sonner';
import { useRouter } from '@/i18n/navigation';
import EditPlanModal from './EditPlanModal';

interface TenantsTableProps {
    initialTenants: any[];
}

export default function TenantsTable({ initialTenants }: TenantsTableProps) {
    const router = useRouter();
    const [tenants, setTenants] = useState<any[]>(initialTenants);
    const [searchQuery, setSearchQuery] = useState('');
    const [planFilter, setPlanFilter] = useState('All Plans');
    const [statusFilter, setStatusFilter] = useState('All Statuses');
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [editPlanTenant, setEditPlanTenant] = useState<any | null>(null);

    const handleToggleStatus = async (id: string, currentStatus: string) => {
        const newStatus = currentStatus === 'Active' ? 'Suspended' : 'Active';
        setProcessingId(id);
        const result = await updateTenantStatus(id, newStatus);
        if (result.success) {
            setTenants(prev => prev.map(t => t.id === id ? { ...t, status: newStatus } : t));
            toast.success(`Tenant ${newStatus === 'Active' ? 'activated' : 'suspended'} successfully`);
        } else {
            toast.error('Failed to update tenant status');
        }
        setProcessingId(null);
    };

    const handleImpersonate = async (tenant: any) => {
        setProcessingId(`impersonate-${tenant.id}`);
        const result = await getImpersonationLink({ 
            accountId: tenant.id, 
            origin: window.location.origin 
        });
        
        if (result.success && result.link) {
            toast.promise(
                new Promise((resolve, reject) => {
                    const newWindow = window.open(result.link, '_blank');
                    if (newWindow) {
                        resolve(true);
                    } else {
                        reject(new Error('Pop-up blocker detected'));
                    }
                }),
                {
                    loading: `Creating secure tunnel for ${result.userName || 'Account'}...`,
                    success: `Accessing ${result.userName}'s workspace...`,
                    error: (err) => err.message === 'Pop-up blocker detected' 
                        ? 'Pop-up blocked! Please allow pop-ups for this site.'
                        : 'Failed to establish impersonation session.'
                }
            );
        } else {
            toast.error(result.error || 'Identity verification failed.');
        }
        setProcessingId(null);
    };

    const filteredTenants = tenants.filter(tenant => {
        const matchesSearch =
            tenant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            tenant.email.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesPlan = planFilter === 'All Plans' || tenant.plan === planFilter.toLowerCase();
        const matchesStatus = statusFilter === 'All Statuses' || tenant.status === statusFilter;

        return matchesSearch && matchesPlan && matchesStatus;
    });

    return (
        <div className="rounded-3xl border border-border overflow-hidden bg-card text-card-foreground shadow-2xl">
            {/* Toolbar */}
            <div className="p-6 border-b border-border flex flex-wrap gap-4 bg-muted/30">
                <div className="relative flex-1 min-w-[300px] group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary transition-colors" size={18} />
                    <input
                        type="text"
                        placeholder="Search by company name or email..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-background text-foreground pl-12 pr-4 py-3 rounded-2xl border border-input focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 transition-all text-sm font-medium"
                    />
                </div>
                <Select value={planFilter} onValueChange={setPlanFilter}>
                    <SelectTrigger className="w-[180px] h-12 bg-background border-input rounded-2xl text-foreground font-bold text-xs uppercase tracking-wider focus:ring-primary/50 transition-all">
                        <SelectValue placeholder="All Plans" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border text-popover-foreground rounded-xl">
                        <SelectItem value="All Plans" className="text-xs font-bold uppercase tracking-wider">All Plans</SelectItem>
                        <SelectItem value="Free" className="text-xs font-bold uppercase tracking-wider">Free</SelectItem>
                        <SelectItem value="Starter" className="text-xs font-bold uppercase tracking-wider">Starter</SelectItem>
                        <SelectItem value="Growth" className="text-xs font-bold uppercase tracking-wider">Growth</SelectItem>
                        <SelectItem value="Pro" className="text-xs font-bold uppercase tracking-wider">Pro</SelectItem>
                        <SelectItem value="Business" className="text-xs font-bold uppercase tracking-wider">Business</SelectItem>
                    </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[180px] h-12 bg-background border-input rounded-2xl text-foreground font-bold text-xs uppercase tracking-wider focus:ring-primary/50 transition-all">
                        <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border text-popover-foreground rounded-xl">
                        <SelectItem value="All Statuses" className="text-xs font-bold uppercase tracking-wider">All Statuses</SelectItem>
                        <SelectItem value="Active" className="text-xs font-bold uppercase tracking-wider">Active</SelectItem>
                        <SelectItem value="Suspended" className="text-xs font-bold uppercase tracking-wider">Suspended</SelectItem>
                        <SelectItem value="Cancelled" className="text-xs font-bold uppercase tracking-wider">Cancelled</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-muted/50 text-[10px] uppercase tracking-[0.2em] text-foreground font-black">
                            <th className="px-8 py-5">Company / Identity</th>
                            <th className="px-8 py-5">Access Tier</th>
                            <th className="px-8 py-5">Status</th>
                            <th className="px-8 py-5">Joined</th>
                            <th className="px-8 py-5">MRR</th>
                            <th className="px-8 py-5 text-right">Command Center</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {filteredTenants.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-8 py-20 text-center text-muted-foreground font-black uppercase tracking-[0.2em] text-xs">
                                    No matching tenant records found in database.
                                </td>
                            </tr>
                        ) : (
                            filteredTenants.map(tenant => (
                                <tr key={tenant.id} className="hover:bg-muted/30 transition-all group">
                                    <td className="px-8 py-6">
                                        <div className="font-black text-foreground group-hover:text-primary transition-colors">{tenant.name}</div>
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                            <div className="text-[10px] text-slate-400 font-mono italic">{tenant.email}</div>
                                            {tenant.isGoogle && (
                                                <div title="Google Login Authenticated" className="flex items-center">
                                                    <svg className="w-3 h-3" viewBox="0 0 24 24">
                                                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                                                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                                                    </svg>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <span className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-[0.15em] border transition-all shadow-md bg-black text-white ${
                                            tenant.plan === 'business' ? 'border-primary' :
                                            tenant.plan === 'pro' ? 'border-primary/60' :
                                            tenant.plan === 'growth' ? 'border-blue-500/60' :
                                            tenant.plan === 'starter' ? 'border-emerald-500/60' :
                                            'border-slate-700'
                                        }`}>
                                            {tenant.plan.charAt(0).toUpperCase() + tenant.plan.slice(1)}
                                        </span>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-2">
                                            <span className={`w-2 h-2 rounded-full ring-2 ring-offset-2 ring-offset-background ${tenant.status === 'Active' ? 'bg-green-500 ring-green-500/20 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-red-500 ring-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.5)]'}`}></span>
                                            <span className={`text-[10px] font-black uppercase tracking-widest ${tenant.status === 'Active' ? 'text-green-500' : 'text-red-500'}`}>{tenant.status}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-[10px] text-foreground font-black uppercase tracking-wider">{tenant.joined}</td>
                                    <td className="px-8 py-6 font-black text-foreground text-sm">{tenant.revenue}</td>
                                    <td className="px-8 py-6 text-right">
                                        <div className="flex items-center justify-end gap-2.5 transition-all">
                                            <button 
                                                onClick={() => handleImpersonate(tenant)}
                                                disabled={processingId === `impersonate-${tenant.id}`}
                                                title="Global Impersonation" 
                                                className="p-2.5 bg-background hover:bg-primary/20 rounded-xl text-primary border border-primary/20 hover:border-primary/40 transition-all shadow-sm active:scale-90"
                                            >
                                                {processingId === `impersonate-${tenant.id}` ? <Loader2 size={16} className="animate-spin" /> : <Shield size={16} />}
                                            </button>
                                            <button 
                                                onClick={() => setEditPlanTenant(tenant)}
                                                title="Assign Plan" 
                                                className="p-2.5 bg-background hover:bg-primary/20 rounded-xl text-primary border border-primary/20 hover:border-primary/40 transition-all shadow-sm active:scale-90"
                                            >
                                                <Settings size={16} />
                                            </button>
                                            <button 
                                                onClick={() => handleToggleStatus(tenant.id, tenant.status)}
                                                disabled={processingId === tenant.id}
                                                title={tenant.status === 'Active' ? 'Force Suspend' : 'Activate Account'} 
                                                className={`p-2.5 rounded-xl transition-all border shadow-sm active:scale-90 ${
                                                    tenant.status === 'Active' 
                                                    ? 'bg-red-500/10 hover:bg-red-500/20 text-red-500 border-red-500/20 hover:border-red-500/40' 
                                                    : 'bg-green-500/10 hover:bg-green-500/20 text-green-500 border-green-500/20 hover:border-green-500/40'
                                                }`}
                                            >
                                                {processingId === tenant.id ? (
                                                    <Loader2 size={16} className="animate-spin" />
                                                ) : (
                                                    tenant.status === 'Active' ? <Ban size={16} /> : <CheckCircle2 size={16} />
                                                )}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            <div className="p-6 border-t border-border flex items-center justify-between text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground bg-muted/10">
                <span>RECORD: {filteredTenants.length} / {tenants.length} LOADED</span>
                <div className="flex gap-2">
                    <button className="px-5 py-2 border border-border rounded-xl hover:bg-muted transition-all disabled:opacity-30 disabled:cursor-not-allowed" disabled>Prev</button>
                    <button className="px-5 py-2 border border-border rounded-xl hover:bg-muted transition-all disabled:opacity-30 disabled:cursor-not-allowed" disabled>Next</button>
                </div>
            </div>

            {editPlanTenant && (
                <EditPlanModal 
                    tenant={editPlanTenant} 
                    onClose={() => setEditPlanTenant(null)} 
                    onSuccess={(id, newPlan) => {
                        setTenants(prev => prev.map(t => t.id === id ? { ...t, plan: newPlan } : t));
                        router.refresh();
                    }}
                />
            )}
        </div>
    );
}
