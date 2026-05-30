'use client';

import { X, Upload, FileText, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { useState, useRef } from 'react';
import { createLeadsBulk } from '@/features/leads/server/actions';

interface ImportLeadsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function ImportLeadsModal({ isOpen, onClose, onSuccess }: ImportLeadsModalProps) {
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [preview, setPreview] = useState<any[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const parseFile = async (file: File): Promise<any[]> => {
        const ExcelJS = (await import('exceljs')).default;
        const workbook = new ExcelJS.Workbook();
        const arrayBuffer = await file.arrayBuffer();
        
        if (file.name.endsWith('.csv')) {
            const text = new TextDecoder().decode(arrayBuffer);
            
            // Simple CSV parser for browser context
            const lines = text.split(/\r?\n/);
            const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
            const data: any[] = [];
            
            for (let i = 1; i < lines.length; i++) {
                if (!lines[i].trim()) continue;
                // Basic CSV split ignoring commas inside quotes for now, but simple for this use case
                const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
                const row: any = {};
                headers.forEach((header, index) => {
                    row[header] = values[index];
                });
                data.push(row);
            }
            return data;
        } else {
            await workbook.xlsx.load(arrayBuffer);
            const worksheet = workbook.getWorksheet(1);
            if (!worksheet) return [];

            const data: any[] = [];
            const headers: string[] = [];

            const extractValue = (val: any) => {
                if (val === null || val === undefined) return '';
                if (typeof val === 'object') {
                    if (val.richText) return val.richText.map((rt: any) => rt.text).join('');
                    if (val.text) return val.text;
                    if (val.hyperlink) return val.hyperlink;
                    if (val instanceof Date) return val.toISOString();
                }
                return val;
            };

            worksheet.getRow(1).eachCell((cell, colNumber) => {
                const headerVal = extractValue(cell.value);
                headers[colNumber] = headerVal ? headerVal.toString().trim() : `column${colNumber}`;
            });

            worksheet.eachRow((row, rowNumber) => {
                if (rowNumber === 1) return; // Skip header
                const rowData: any = {};
                headers.forEach((header, colNumber) => {
                    if (header) {
                        const cell = row.getCell(colNumber);
                        rowData[header] = extractValue(cell.value);
                    }
                });
                data.push(rowData);
            });
            return data;
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            if (!selectedFile.name.endsWith('.xlsx') && !selectedFile.name.endsWith('.csv')) {
                setError('Please upload an Excel (.xlsx) or CSV file.');
                return;
            }
            setFile(selectedFile);
            setError(null);

            try {
                const data = await parseFile(selectedFile);
                setPreview(data.slice(0, 5));
            } catch (err) {
                console.error('Error parsing file for preview:', err);
                setError('Failed to preview file. Please check the format.');
            }
        }
    };

    const handleSubmit = async () => {
        if (!file) return;

        setLoading(true);
        setError(null);

        try {
            const data = await parseFile(file);

            if (data.length === 0) {
                setError('The file is empty.');
                setLoading(false);
                return;
            }

            const result = await createLeadsBulk(data as any[]);

            if (result.error) {
                setError(result.error);
            } else {
                onSuccess();
                onClose();
                setFile(null);
                setPreview([]);
            }
        } catch (err: any) {
            setError(err.message || 'Failed to parse file');
        } finally {
            setLoading(false);
        }
    };

    const downloadTemplate = async () => {
        const ExcelJS = (await import('exceljs')).default;
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Template');
        
        worksheet.columns = [
            { header: 'first_name', key: 'first_name', width: 20 },
            { header: 'last_name', key: 'last_name', width: 20 },
            { header: 'email', key: 'email', width: 30 },
            { header: 'phone', key: 'phone', width: 20 },
            { header: 'company', key: 'company', width: 25 },
        ];

        worksheet.addRow({
            first_name: 'John',
            last_name: 'Doe',
            email: 'john@example.com',
            phone: '+1234567890',
            company: 'Example Inc'
        });

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = window.URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = 'leads-import-template.xlsx';
        anchor.click();
        window.URL.revokeObjectURL(url);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div className="relative w-full max-w-2xl mx-4 bg-surface border border-border rounded-2xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between p-6 border-b border-border">
                    <h2 className="text-2xl font-bold">Import Leads</h2>
                    <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {error && (
                        <div className="p-4 rounded-xl bg-red-500/10 text-red-400 text-sm border border-red-500/20 flex gap-3 items-start">
                            <AlertCircle size={18} className="mt-0.5 shrink-0" />
                            <p>{error}</p>
                        </div>
                    )}

                    <div className="flex flex-col md:flex-row gap-6">
                        {/* Left: Instructions & Template */}
                        <div className="flex-1 space-y-4">
                            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Instructions</h3>
                            <ul className="space-y-2 text-sm text-foreground/80 list-disc pl-4">
                                <li>Use the official template for best results.</li>
                                <li>Required columns: <b>first_name, email</b>.</li>
                                <li>Optional: last_name, phone, company.</li>
                            </ul>

                            <Button
                                variant="outline"
                                className="w-full h-12 rounded-xl border-2 border-emerald-500/20 bg-emerald-500/5 text-emerald-600 hover:bg-emerald-500/10 hover:border-emerald-500/40 transition-all font-bold gap-2 group"
                                onClick={downloadTemplate}
                            >
                                <FileText size={18} className="group-hover:scale-110 transition-transform" />
                                Download Template
                            </Button>
                        </div>

                        {/* Right: Upload Area */}
                        <div className="flex-[1.5]">
                            <div
                                className={`border-2 border-dashed rounded-2xl p-8 h-full flex flex-col items-center justify-center transition-colors cursor-pointer min-h-[180px] ${file ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-border hover:border-emerald-500/30 hover:bg-emerald-500/5'}`}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileChange}
                                    accept=".xlsx, .csv"
                                    className="hidden"
                                />

                                {file ? (
                                    <div className="text-center">
                                        <div className="w-12 h-12 bg-emerald-500/20 text-emerald-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                                            <CheckCircle2 size={24} />
                                        </div>
                                        <p className="text-sm font-medium mb-1 truncate max-w-[200px] text-emerald-700">{file.name}</p>
                                        <p className="text-xs text-emerald-600/70">{(file.size / 1024).toFixed(1)} KB</p>
                                    </div>
                                ) : (
                                    <div className="text-center">
                                        <div className="w-12 h-12 bg-emerald-500/10 text-emerald-600 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform shadow-sm">
                                            <Upload size={24} />
                                        </div>
                                        <p className="text-sm font-medium mb-1 text-foreground">Select or drop file</p>
                                        <p className="text-xs text-muted-foreground">Excel or CSV</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {preview.length > 0 && (
                        <div className="space-y-3">
                            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Data Preview (First {preview.length} rows)</h3>
                            <div className="overflow-x-auto border border-border rounded-xl">
                                <table className="w-full text-sm">
                                    <thead className="bg-muted/50 text-left border-b border-border">
                                        <tr>
                                            {Object.keys(preview[0]).map((key) => (
                                                <th key={key} className="p-3 font-semibold">{key}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {preview.map((row, i) => (
                                            <tr key={i} className="hover:bg-muted/30 transition-colors">
                                                {Object.values(row).map((val: any, j) => (
                                                    <td key={j} className="p-3 max-w-[200px] truncate">{val?.toString() || ''}</td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <p className="text-xs text-muted-foreground italic">
                                * Please ensure your column names are similar to: first_name, last_name, email, phone, company.
                            </p>
                        </div>
                    )}

                    <div className="flex gap-4">
                        <Button variant="outline" onClick={onClose} className="flex-1 h-12 rounded-xl" disabled={loading}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={!file || loading}
                            className="flex-[2] h-12 rounded-xl bg-emerald-600 text-white font-bold shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Uploading...
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 className="mr-2 h-4 w-4" />
                                    Import {preview.length || ''} Leads
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
