import createNextIntlPlugin from 'next-intl/plugin';
import type { NextConfig } from 'next';

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
    output: 'standalone',
    compress: true,
    eslint: {
        ignoreDuringBuilds: false,
    },
    // Keep heavy server-only packages out of the client bundle
    serverExternalPackages: [
        'googleapis',
        'google-auth-library',
        'nodemailer',
        'twilio',
        'exceljs',
        'mammoth',
        'pdf-parse',
        'imapflow',
        '@paddle/paddle-node-sdk',
        'canvas',
        'redis',
    ],
    experimental: {
        // Merge small CSS chunks into one to reduce render-blocking requests
        cssChunking: true,
        optimizePackageImports: [
            'lucide-react',
            'date-fns',
            'framer-motion',
            '@tanstack/react-table',
            '@radix-ui/react-avatar',
            '@radix-ui/react-checkbox',
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-label',
            '@radix-ui/react-navigation-menu',
            '@radix-ui/react-progress',
            '@radix-ui/react-radio-group',
            '@radix-ui/react-select',
            '@radix-ui/react-separator',
            '@radix-ui/react-slot',
            '@radix-ui/react-switch',
            '@radix-ui/react-tabs',
            '@radix-ui/react-toggle',
            '@radix-ui/react-toggle-group',
            '@radix-ui/react-tooltip',
            'recharts',
            '@dnd-kit/core',
            '@dnd-kit/sortable',
            'sonner',
            'vaul',
            '@tiptap/react',
            '@tiptap/starter-kit',
        ],
    },
    compiler: {
        removeConsole: process.env.NODE_ENV === 'production'
            ? { exclude: ['error', 'warn'] }
            : false,
    },
    images: {
        formats: ['image/avif', 'image/webp'],
        minimumCacheTTL: 60 * 60 * 24 * 365, // 1 yıl
        deviceSizes: [640, 750, 828, 1080, 1200, 1920],
        imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'cdn.flyonui.com',
            },
            {
                protocol: 'https',
                hostname: 'i.pravatar.cc',
                port: '',
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: '**.supabase.co',
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: 'cdn.simpleicons.org',
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: 'api.producthunt.com',
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: 'findly.tools',
                pathname: '/**',
            },
        ],
        qualities: [75, 90, 95, 100],
    },
    async headers() {
        return [
            {
                // Static assets - long cache
                source: '/_next/static/:path*',
                headers: [
                    {
                        key: 'Cache-Control',
                        value: 'public, max-age=31536000, immutable',
                    },
                ],
            },
            {
                // Images
                source: '/_next/image',
                headers: [
                    {
                        key: 'Cache-Control',
                        value: 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=604800',
                    },
                ],
            },
            {
                // Public pages - moderate cache
                source: '/((?!api|admin|_next).*)',
                headers: [
                    {
                        key: 'X-Content-Type-Options',
                        value: 'nosniff',
                    },
                    {
                        key: 'X-Frame-Options',
                        value: 'DENY',
                    },
                    {
                        key: 'Permissions-Policy',
                        value: 'camera=(), microphone=(), geolocation=(), xr-spatial-tracking=(self "https://challenges.cloudflare.com")',
                    },
                ],
            },
        ];
    },
};


export default withNextIntl(nextConfig);
