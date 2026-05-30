import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// For demo purposes, we save ads configuration to a local JSON file.
// In a real production app, this should be saved to Supabase or another database.
const adsFilePath = path.join(process.cwd(), 'ads-config.json');

export async function GET() {
    try {
        if (fs.existsSync(adsFilePath)) {
            const data = fs.readFileSync(adsFilePath, 'utf-8');
            return NextResponse.json(JSON.parse(data));
        }
        return NextResponse.json({ adsCode: '', adsTxt: '' });
    } catch (error) {
        return NextResponse.json({ adsCode: '', adsTxt: '' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        fs.writeFileSync(adsFilePath, JSON.stringify(body, null, 2));
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ success: false, error: 'Failed to save' }, { status: 500 });
    }
}
