'use client';

import { useState, useEffect, useCallback } from 'react';
import { Bell, X, Info, CheckCircle2, AlertTriangle } from 'lucide-react';
import { getNotifications, markNotificationAsRead, markAllNotificationsAsRead, type Notification } from '@/features/notifications/server/actions';
import { createClient } from '@/core/db/client';

export function NotificationPopover() {
    const [show, setShow] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);

    const fetchNotifications = useCallback(async () => {
        const notifs = await getNotifications();
        setNotifications(notifs || []);
        setUnreadCount((notifs || []).filter(n => !n.read).length);
    }, []);

    useEffect(() => {
        fetchNotifications();

        const supabase = createClient();
        let active = true;
        let channel: ReturnType<typeof supabase.channel> | null = null;

        supabase.auth.getUser().then(({ data }) => {
            if (!active || !data.user) return;

            channel = supabase
                .channel('notifications-changes')
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'notifications',
                        filter: `user_id=eq.${data.user.id}`,
                    },
                    () => { if (active) fetchNotifications(); }
                )
                .subscribe();
        });

        return () => {
            active = false;
            if (channel) supabase.removeChannel(channel);
        };
    }, [fetchNotifications]);

    const handleRead = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        await markNotificationAsRead(id);
        fetchNotifications();
    };

    const handleMarkAll = async () => {
        await markAllNotificationsAsRead();
        fetchNotifications();
        setShow(false);
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'success': return <CheckCircle2 size={16} className="text-emerald-500" />;
            case 'warning': return <AlertTriangle size={16} className="text-amber-500" />;
            case 'error': return <X size={16} className="text-red-500" />;
            default: return <Info size={16} className="text-blue-500" />;
        }
    };

    const timeAgo = (date: string) => {
        const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
        if (seconds < 60) return `az önce`;
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}dk önce`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}saat önce`;
        return Math.floor(hours / 24) + " gün önce";
    };

    return (
        <div className="relative">
            <button
                onClick={() => setShow(!show)}
                className="p-2 rounded-lg hover:bg-zinc-100 text-zinc-600 hover:text-zinc-900 transition-colors relative"
            >
                <Bell size={20} />
                {unreadCount > 0 && (
                    <span className="absolute top-2 right-2 w-2 h-2 bg-indigo-600 rounded-full ring-2 ring-white"></span>
                )}
            </button>

            {show && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setShow(false)} />
                    <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-zinc-200 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="p-3 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-zinc-900">Bildirimler</span>
                                {unreadCount > 0 && (
                                    <span className="bg-indigo-600 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                                        {unreadCount}
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                {unreadCount > 0 && (
                                    <button onClick={handleMarkAll} className="text-[10px] text-indigo-600 hover:underline font-bold">
                                        Tümünü okundu say
                                    </button>
                                )}
                                <button onClick={() => setShow(false)} className="text-zinc-400 hover:text-zinc-600 transition-colors">
                                    <X size={14} />
                                </button>
                            </div>
                        </div>
                        <div className="max-h-[350px] overflow-y-auto custom-scrollbar">
                            {notifications.length === 0 ? (
                                <div className="p-10 text-center flex flex-col items-center gap-2">
                                    <div className="w-10 h-10 rounded-full bg-zinc-50 flex items-center justify-center">
                                        <Bell size={20} className="text-zinc-300" />
                                    </div>
                                    <span className="text-xs text-zinc-400 font-medium">Henüz bildirim yok</span>
                                </div>
                            ) : (
                                notifications.map((n) => (
                                    <div
                                        key={n.id}
                                        onClick={(e) => !n.read && handleRead(n.id, e)}
                                        className={`p-4 border-b border-zinc-50 transition-colors cursor-pointer flex gap-3 ${n.read ? 'opacity-60 grayscale-[0.5]' : 'bg-indigo-50/30 hover:bg-indigo-50/50'}`}
                                    >
                                        <div className="mt-1 flex-shrink-0">{getIcon(n.type)}</div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className={`text-sm leading-tight ${n.read ? 'font-medium text-zinc-600' : 'font-bold text-zinc-900'}`}>{n.title}</div>
                                                {!n.read && <div className="w-2 h-2 rounded-full bg-indigo-600 mt-1.5 flex-shrink-0" />}
                                            </div>
                                            <div className="text-xs text-zinc-500 mt-1 line-clamp-2 leading-relaxed">{n.message}</div>
                                            <div className="text-[10px] text-zinc-400 mt-2 font-medium">{timeAgo(n.created_at)}</div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                        {notifications.length > 0 && (
                            <div className="p-2 border-t border-zinc-100 bg-zinc-50/30 text-center">
                                <button className="text-[10px] text-zinc-500 font-semibold hover:text-zinc-900 transition-colors">
                                    Tümünü Gör
                                </button>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
