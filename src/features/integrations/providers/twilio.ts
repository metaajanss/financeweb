'use server';

import 'server-only';
import { createClient } from '@/core/db/server';
import { getAccountId } from '@/features/settings';

/**
 * Initiates the Twilio WhatsApp Sender verification process.
 * This sends a 6-digit OTP to the provided WhatsApp number.
 */
export async function initiateTwilioWhatsAppVerification(phoneNumber: string, profileName: string, verificationMethod: 'sms' | 'voice' = 'sms') {
    try {
        const accountId = await getAccountId();
        if (!accountId) throw new Error('Not authenticated');

        if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
            throw new Error('Twilio credentials are not configured on the server.');
        }
        if (!process.env.META_WHATSAPP_BUSINESS_ACCOUNT_ID) {
            throw new Error('META_WHATSAPP_BUSINESS_ACCOUNT_ID is not configured on the server.');
        }

        // Normalize phone number to E.164.
        // NOTE: Short-form detection (05xx / 5xx) is Turkey-specific (+90).
        // International users must provide a fully qualified E.164 number (e.g. +447911123456).
        let normalized = phoneNumber.replace(/[^0-9]/g, '');
        if (normalized.startsWith('0') && normalized.length === 11) {
            normalized = '90' + normalized.substring(1);
        } else if (normalized.startsWith('5') && normalized.length === 10) {
            normalized = '90' + normalized;
        }

        const formattedPhone = `+${normalized}`;

        const auth = Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64');

        const response = await fetch(`https://messaging.twilio.com/v2/Channels/Senders`, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                sender_id: `whatsapp:${formattedPhone}`,
                profile: { name: profileName },
                config: {
                    waba_id: process.env.META_WHATSAPP_BUSINESS_ACCOUNT_ID,
                    verification_method: verificationMethod
                }
            })
        });

        const result = await response.json();

        if (!response.ok) {
            console.error('Twilio Sender Init Error Detail:', result);
            throw new Error(result.message || 'Failed to initiate WhatsApp verification. Ensure the number is not already active in another app.');
        }

        // Store pending integration in DB
        const supabase = await createClient();
        const { error } = await supabase
            .from('integrations')
            .upsert({
                account_id: accountId,
                provider: 'twilio',
                status: 'disconnected', // Using disconnected since pending_verification is not in the DB enum
                config: {
                    from: formattedPhone,
                    sid: result.sid,
                    profile_name: profileName,
                    pending: true
                }
            }, { onConflict: 'account_id,provider' });

        if (error) throw error;

        return { success: true, sid: result.sid };

    } catch (error: any) {
        console.error('initiateTwilioWhatsAppVerification Error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Finalizes the Twilio WhatsApp Sender verification using the OTP code.
 */
export async function finalizeTwilioWhatsAppVerification(sid: string, otpCode: string) {
    try {
        const accountId = await getAccountId();
        if (!accountId) throw new Error('Not authenticated');

        const auth = Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64');
        
        const response = await fetch(`https://messaging.twilio.com/v2/Channels/Senders/${sid}`, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                config: {
                    verification_code: otpCode
                }
            })
        });

        const result = await response.json();

        if (!response.ok) {
            console.error('Twilio Sender Finalize Error:', result);
            throw new Error(result.message || 'Verification code incorrect or expired');
        }

        // Update integration to connected
        const supabase = await createClient();
        
        // Fetch current to keep the from number
        const { data: current } = await supabase
            .from('integrations')
            .select('config')
            .eq('account_id', accountId)
            .eq('provider', 'twilio')
            .single();

        const { error } = await supabase
            .from('integrations')
            .update({
                status: 'connected',
                config: {
                    ...(current?.config as object || {}),
                    pending: false,
                    last_verified: new Date().toISOString()
                }
            })
            .eq('account_id', accountId)
            .eq('provider', 'twilio');

        if (error) throw error;

        return { success: true };

    } catch (error: any) {
        console.error('finalizeTwilioWhatsAppVerification Error:', error);
        return { success: false, error: error.message };
    }
}
