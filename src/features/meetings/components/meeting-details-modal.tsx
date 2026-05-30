'use client';

import { X, Calendar, Clock, Video, Phone, MapPin, Link as LinkIcon, User, FileBarChart, Bot } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import type { Meeting } from '@/features/meetings';
import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';
import MeetingReportSection from '@/features/meetings/components/meeting-report-section';

interface MeetingDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    meeting: Meeting | null;
}

export function MeetingDetailsModal({ isOpen, onClose, meeting }: MeetingDetailsModalProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!isOpen || !meeting || !mounted) return null;

    const aiStatusConfig: Record<string, { label: string; classes: string; pulse?: boolean }> = {
        pending:           { label: 'Scheduled',      classes: 'bg-gray-100 text-gray-600 border-gray-200' },
        joining:           { label: 'Joining...',     classes: 'bg-yellow-100 text-yellow-700 border-yellow-200', pulse: true },
        in_call:           { label: 'In Meeting',     classes: 'bg-green-100 text-green-700 border-green-200' },
        recording:         { label: 'Recording',      classes: 'bg-red-100 text-red-700 border-red-200', pulse: true },
        stopped:           { label: 'Left',           classes: 'bg-gray-100 text-gray-500 border-gray-200' },
        failed:            { label: 'Failed',         classes: 'bg-red-100 text-red-600 border-red-200' },
        completed:         { label: 'Completed',      classes: 'bg-blue-100 text-blue-700 border-blue-200' },
        analysis_complete: { label: 'Analysis Ready', classes: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
        cancelled:         { label: 'Cancelled',      classes: 'bg-gray-100 text-gray-400 border-gray-200' },
    };

    const statusColors: Record<string, string> = {
        scheduled: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        completed: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
        cancelled: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
        no_show: 'bg-amber-500/10 text-amber-400 border-amber-500/20'
    };

    const typeIcons: Record<string, React.ReactNode> = {
        video: <Video size={16} />,
        phone: <Phone size={16} />,
        'in-person': <MapPin size={16} />
    };

    const formatTime = (dateString: string) => {
        return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    };

    const modalContent = (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div className="relative w-full max-w-lg mx-4 bg-surface border border-border rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between p-6 border-b border-border sticky top-0 bg-surface z-10">
                    <h2 className="text-xl font-bold">Meeting Details</h2>
                    <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Header: Title and Status */}
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <h3 className="text-2xl font-bold">{meeting.title || 'Untitled Meeting'}</h3>
                            <div className="flex items-center gap-2 mt-2 text-muted-foreground">
                                <span className="flex items-center gap-1.5 text-sm bg-muted/20 px-2.5 py-1 rounded-md">
                                    {typeIcons[meeting.meeting_type || 'video']}
                                    <span className="capitalize">{meeting.meeting_type || 'Meeting'}</span>
                                </span>
                            </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border whitespace-nowrap uppercase tracking-wider ${statusColors[meeting.status || 'scheduled'] || statusColors.scheduled}`}>
                            {(meeting.status || 'scheduled').replace('_', ' ')}
                        </span>
                    </div>

                    {/* Time & Date */}
                    <div className="flex items-center gap-4 p-4 bg-background rounded-xl border border-border">
                        <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                            <Calendar size={24} className="text-primary" />
                        </div>
                        <div className="flex-1">
                            <p className="font-semibold text-foreground">{formatDate((meeting.start_time || meeting.scheduled_at) as string || new Date().toISOString())}</p>
                            <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1.5">
                                    <Clock size={14} />
                                    {formatTime((meeting.start_time || meeting.scheduled_at) as string || new Date().toISOString())}
                                    {' - '}
                                    {meeting.end_time ? formatTime(meeting.end_time) : `${meeting.duration_minutes} min`}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Participant (Lead) */}
                    {meeting.lead && (
                        <div>
                            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Participant</h4>
                            <div className="flex items-center gap-3 p-4 bg-background rounded-xl border border-border">
                                <div className="w-10 h-10 bg-muted/20 rounded-full flex items-center justify-center">
                                    <User size={20} className="text-muted-foreground" />
                                </div>
                                <div>
                                    <p className="font-semibold">{meeting.lead.first_name} {meeting.lead.last_name}</p>
                                    <p className="text-sm text-muted-foreground">{meeting.lead.email}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Description */}
                    {meeting.description && (
                        <div>
                            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Description</h4>
                            <div className="p-4 bg-background rounded-xl border border-border text-sm leading-relaxed whitespace-pre-wrap">
                                {meeting.description}
                            </div>
                        </div>
                    )}

                    {/* Location / Link */}
                    {(meeting.location || meeting.meeting_link) && (
                        <div>
                            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Location</h4>
                            <div className="p-4 bg-background rounded-xl border border-border flex items-center gap-3">
                                {meeting.meeting_link ? (
                                    <>
                                        <LinkIcon size={18} className="text-primary" />
                                        <a href={meeting.meeting_link} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline font-medium truncate">
                                            {meeting.meeting_link}
                                        </a>
                                    </>
                                ) : (
                                    <>
                                        <MapPin size={18} className="text-muted-foreground" />
                                        <span className="text-sm">{meeting.location}</span>
                                    </>
                                )}
                            </div>
                        </div>
                    )}

                    {/* AI Avatar Status */}
                    {meeting.ai_avatar_status && meeting.ai_avatar_status !== 'cancelled' && (() => {
                        const cfg = aiStatusConfig[meeting.ai_avatar_status!] ?? { label: meeting.ai_avatar_status!, classes: 'bg-gray-100 text-gray-500 border-gray-200' };
                        return (
                            <div>
                                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <Bot size={16} className="text-violet-500" />
                                    AI Avatar
                                </h4>
                                <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-semibold ${cfg.classes}`}>
                                    {cfg.pulse ? (
                                        <span className="relative flex h-2 w-2">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-current" />
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-current" />
                                        </span>
                                    ) : (
                                        <Bot size={14} />
                                    )}
                                    {cfg.label}
                                </div>
                            </div>
                        );
                    })()}

                    {/* Meeting Report (only for completed meetings or when a recording exists) */}
                    {(meeting.status === 'completed' || meeting.recording_url) && (
                        <div>
                            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                                <FileBarChart size={16} className="text-primary" />
                                Toplantı Raporu
                            </h4>
                            <MeetingReportSection meetingId={meeting.id} />
                        </div>
                    )}
                </div>

                <div className="p-6 border-t border-border flex justify-end gap-3 bg-muted/5">
                    <Button variant="outline" onClick={onClose}>
                        Close
                    </Button>
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
}

