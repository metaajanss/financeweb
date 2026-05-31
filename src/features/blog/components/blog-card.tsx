'use client';

import { Link } from '@/i18n/navigation';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Clock, User, ChevronRight } from 'lucide-react';
import Image from 'next/image';
import { motion } from 'framer-motion';

interface BlogCardProps {
    post: {
        id: string;
        title: string;
        slug: string;
        excerpt: string;
        featured_image_url?: string;
        created_at: string;
        reading_time_minutes?: number;
        profiles?: { full_name: string };
    };
    locale: string;
}

export function BlogCard({ post, locale }: BlogCardProps) {
    const dateLocale = locale === 'tr' ? tr : undefined;
    
    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="group relative h-full flex flex-col bg-card rounded-3xl border border-border/50 overflow-hidden hover:border-primary/30 transition-all duration-500 shadow-sm hover:shadow-[0_20px_40px_rgba(var(--primary-rgb),0.1)]"
        >
            {/* Image Section */}
            <Link href={`/blog/${post.slug}`} className="block relative h-52 overflow-hidden">
                {post.featured_image_url ? (
                    <Image 
                        src={post.featured_image_url}
                        alt={post.title}
                        fill
                        className="object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary/20 to-purple-900/20 flex items-center justify-center">
                        <FileText size={40} className="text-primary/30" />
                    </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </Link>

            {/* Content Section */}
            <div className="p-6 flex flex-col flex-grow">
                <div className="flex items-center gap-3 mb-4">
                    <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-500">
                        <Clock size={12} />
                        {post.reading_time_minutes || '5'} Min Read
                    </div>
                    <span className="w-1 h-1 rounded-full bg-border" />
                    <div className="text-[10px] font-black uppercase tracking-widest text-primary">
                        {format(new Date(post.created_at), 'd MMM yyyy', { locale: dateLocale })}
                    </div>
                </div>

                <Link href={`/blog/${post.slug}`} className="block group/title">
                    <h3 className="text-xl font-black text-foreground mb-3 leading-tight group-hover/title:text-primary transition-colors">
                        {post.title}
                    </h3>
                </Link>

                <p className="text-slate-400 text-sm line-clamp-3 mb-6 leading-relaxed">
                    {post.excerpt}
                </p>

                <div className="mt-auto pt-6 border-t border-border/50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-secondary border border-border flex items-center justify-center overflow-hidden">
                            <User size={12} className="text-slate-500" />
                        </div>
                        <span className="text-[10px] font-bold text-slate-500">{post.profiles?.full_name || 'Payoff Lab Team'}</span>
                    </div>

                    <Link href={`/blog/${post.slug}`} className="flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.2em] text-primary group/more">
                        Read Story
                        <ChevronRight size={14} className="group-hover/more:translate-x-1 transition-transform" />
                    </Link>
                </div>
            </div>
        </motion.div>
    );
}

const FileText = ({ className, size }: { className?: string, size?: number }) => (
    <svg 
        xmlns="http://www.w3.org/2000/svg" 
        width={size} 
        height={size} 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        className={className}
    >
        <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>
    </svg>
);
