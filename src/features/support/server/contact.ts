'use server';

import { createClient } from '@/core/db/server';

export async function sendContactMessage(formData: FormData) {
    const _supabase = await createClient();

    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const message = formData.get('message') as string;
    const token = formData.get('token') as string;

    if (!name || !email || !message) {
        return { success: false, message: 'Please fill in all fields.' };
    }

    // Verify Turnstile Token
    if (!token) {
        return { success: false, message: 'Captcha token is missing.' };
    }

    try {
        const verifyResponse = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `secret=${process.env.TURNSTILE_SECRET_KEY || '1x0000000000000000000000000000000AA'}&response=${token}`,
        });

        const verifyData = await verifyResponse.json();
        if (!verifyData.success) {
            return { success: false, message: 'Captcha verification failed. Please try again.' };
        }
    } catch (error) {
        console.error('Turnstile verification error:', error);
        return { success: false, message: 'Error verifying captcha.' };
    }

    // In a real app, you would send an email via Resend/SendGrid or save to a 'contact_messages' table.
    // For now, we will simulate a successful submission.

    // Optional: Save to a database table if you have one, e.g. 'inquiries'
    /*
    const { error } = await supabase.from('inquiries').insert({
        name,
        email,
        message,
        status: 'new'
    });

    if (error) return { success: false, message: 'Failed to send message.' };
    */

    return { success: true, message: 'Message sent successfully! We will get back to you soon.' };
}
