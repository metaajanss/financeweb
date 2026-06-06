import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const adsFilePath = path.join(process.cwd(), 'ads-config.json');

export async function GET() {
    try {
        if (fs.existsSync(adsFilePath)) {
            const data = fs.readFileSync(adsFilePath, 'utf-8');
            const config = JSON.parse(data);
            return new Response(config.adsTxt || '', {
                headers: {
                    'Content-Type': 'text/plain; charset=utf-8',
                },
            });
        }
        return new Response('', {
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
            },
        });
    } catch (error) {
        return new Response('', { status: 500 });
    }
}
