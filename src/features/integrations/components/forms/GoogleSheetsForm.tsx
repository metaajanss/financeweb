'use client';

import { Loader2, Zap } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { getSpreadsheetSheetsAction, listSpreadsheetsAction } from '@/features/settings';
import { useToast } from '@/shared/components/ui/toast';

interface GoogleSheetsFormProps {
    integrationId: string;
    spreadsheets: any[];
    setSpreadsheets: (v: any[]) => void;
    sheets: string[];
    setSheets: (v: string[]) => void;
    selectedSpreadsheetId: string;
    setSelectedSpreadsheetId: (v: string) => void;
    selectedSheetName: string;
    setSelectedSheetName: (v: string) => void;
    fieldMapping: any;
    setFieldMapping: (v: any) => void;
    autoExport: boolean;
    setAutoExport: (v: boolean) => void;
    autoImport: boolean;
    setAutoImport: (v: boolean) => void;
    fetchingSpreadsheets: boolean;
    setFetchingSpreadsheets: (v: boolean) => void;
    sheetsError: string | null;
    setSheetsError: (v: string | null) => void;
    syncing: boolean;
    onSync: () => void;
}

export function GoogleSheetsForm({ integrationId, spreadsheets, setSpreadsheets, sheets, setSheets, selectedSpreadsheetId, setSelectedSpreadsheetId, selectedSheetName, setSelectedSheetName, fieldMapping, setFieldMapping, autoExport, setAutoExport, autoImport, setAutoImport, fetchingSpreadsheets, setFetchingSpreadsheets, sheetsError, setSheetsError, syncing, onSync }: GoogleSheetsFormProps) {
    const { showToast } = useToast();

    const retryFetch = async () => {
        setFetchingSpreadsheets(true);
        setSheetsError(null);
        try {
            const result = await listSpreadsheetsAction(integrationId);
            if (result.error) { setSheetsError(result.error); return; }
            setSpreadsheets((result as any).files || []);
            if (selectedSpreadsheetId) {
                const sheetList = await getSpreadsheetSheetsAction(integrationId, selectedSpreadsheetId);
                if (Array.isArray(sheetList)) setSheets(sheetList.filter((s): s is string => !!s));
            }
        } catch { setSheetsError('Could not connect to server.'); }
        finally { setFetchingSpreadsheets(false); }
    };

    const onSpreadsheetChange = async (id: string) => {
        setSelectedSpreadsheetId(id);
        setSelectedSheetName('');
        if (id) {
            try {
                const sheetList = await getSpreadsheetSheetsAction(integrationId, id);
                if (Array.isArray(sheetList)) setSheets(sheetList.filter((s): s is string => !!s));
            } catch { showToast('Error loading sheets', 'error'); }
        }
    };

    return (
        <div className="space-y-6">
            <div className="space-y-4">
                <label className="text-sm font-medium">Select Spreadsheet</label>
                <select value={selectedSpreadsheetId} onChange={(e) => onSpreadsheetChange(e.target.value)} className="w-full p-3 rounded-lg bg-background border border-border focus:ring-2 focus:ring-primary outline-none">
                    <option value="">-- Choose a Spreadsheet --</option>
                    {spreadsheets.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                {fetchingSpreadsheets && (
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground animate-pulse mt-2">
                        <Loader2 size={10} className="animate-spin" /><span>Loading spreadsheets from your Google Drive...</span>
                    </div>
                )}
                {sheetsError && (
                    <div className="space-y-2 mt-2">
                        <p className="text-[10px] text-rose-500">{sheetsError}</p>
                        <Button size="sm" variant="outline" className="h-7 text-[10px] px-3" onClick={retryFetch}>Retry Fetching Spreadsheets</Button>
                    </div>
                )}
                {!fetchingSpreadsheets && !sheetsError && spreadsheets.length === 0 && (
                    <p className="text-[10px] text-muted-foreground mt-2">No spreadsheets found in your account.</p>
                )}
            </div>

            <div className="space-y-4">
                <label className="text-sm font-medium">Select Sheet</label>
                <select value={selectedSheetName} onChange={(e) => setSelectedSheetName(e.target.value)} disabled={!selectedSpreadsheetId || sheets.length === 0} className="w-full p-3 rounded-lg bg-background border border-border focus:ring-2 focus:ring-primary outline-none disabled:opacity-50">
                    <option value="">-- Choose a Sheet --</option>
                    {sheets.map((name) => <option key={name} value={name}>{name}</option>)}
                </select>
            </div>

            <div className="space-y-4 pt-4 border-t border-border">
                <label className="text-xs font-black uppercase tracking-widest text-primary">Field Mapping (Column Letters)</label>
                <div className="grid grid-cols-2 gap-4">
                    {Object.keys(fieldMapping).map(field => (
                        <div key={field} className="space-y-1">
                            <label className="text-[10px] font-bold uppercase text-muted">{field.replace('_', ' ')}</label>
                            <input type="text" value={fieldMapping[field]} onChange={(e) => setFieldMapping({ ...fieldMapping, [field]: e.target.value.toUpperCase() })} placeholder="A" className="w-full p-2 rounded bg-background border border-border text-center font-mono" />
                        </div>
                    ))}
                </div>
            </div>

            <div className="space-y-3 pt-4 border-t border-border">
                <label className="flex items-center gap-3 p-3 rounded-xl border border-border bg-background/50 cursor-pointer hover:bg-surface-hover transition-colors">
                    <input type="checkbox" checked={autoExport} onChange={(e) => setAutoExport(e.target.checked)} className="w-4 h-4 rounded border-border text-primary focus:ring-primary" />
                    <div><p className="text-sm font-bold">Auto Export (Payoff Lab → Sheet)</p><p className="text-[10px] text-muted">Automatically add new leads as rows.</p></div>
                </label>
                <label className="flex items-center gap-3 p-3 rounded-xl border border-border bg-background/50 cursor-pointer hover:bg-surface-hover transition-colors">
                    <input type="checkbox" checked={autoImport} onChange={(e) => setAutoImport(e.target.checked)} className="w-4 h-4 rounded border-border text-primary focus:ring-primary" />
                    <div><p className="text-sm font-bold">Auto Import (Sheet → Payoff Lab)</p><p className="text-[10px] text-muted">Sync data from Sheet back to Payoff Lab.</p></div>
                </label>
            </div>

            {autoImport && (
                <div className="p-3 bg-primary/5 rounded-xl border border-primary/10 space-y-2">
                    <div className="flex items-center justify-between">
                        <p className="text-[10px] font-black uppercase text-primary">Manual Sync</p>
                        <Button size="sm" variant="ghost" className="h-7 text-[10px]" onClick={onSync} disabled={syncing}>
                            {syncing ? <Loader2 size={12} className="animate-spin mr-1" /> : <Zap size={12} className="mr-1" />}Sync Now
                        </Button>
                    </div>
                    <p className="text-[9px] text-muted">Use this to force an update if Auto-Import is not triggering.</p>
                </div>
            )}
        </div>
    );
}
