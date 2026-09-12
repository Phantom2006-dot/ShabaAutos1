import { Request, Response } from 'express';
import { Webhook } from 'svix';
import { getDatabaseService } from '../database/index';
import { normalizeNigerianPhone } from '../utils/phone';
import { UserRole } from '../models/types';

export async function handleClerkWebhook(req: Request, res: Response) {
  const signingSecret = process.env.CLERK_WEBHOOK_SIGNING_SECRET;

  if (!signingSecret || signingSecret.includes('placeholder')) {
    // If not configured, check if we're in demo mode
    if (process.env.DEMO_MODE === 'true' || process.env.NODE_ENV !== 'production') {
      console.warn('[Clerk Webhook] Signing secret not configured. Skipping live signature verification in demo mode.');
      return res.status(200).json({ success: true, message: 'Webhook received (demo mode - signature unverified)' });
    }
    return res.status(500).json({ success: false, message: 'CLERK_WEBHOOK_SIGNING_SECRET is not configured' });
  }

  const svixId = req.headers['svix-id'] as string;
  const svixTimestamp = req.headers['svix-timestamp'] as string;
  const svixSignature = req.headers['svix-signature'] as string;

  if (!svixId || !svixTimestamp || !svixSignature) {
    return res.status(400).json({
      success: false,
      message: 'Missing Svix verification headers',
      code: 'INVALID_WEBHOOK_HEADERS',
    });
  }

  // Raw body is required by Svix
  const rawBody = (req as any).rawBody || JSON.stringify(req.body);

  let event: any;
  try {
    const wh = new Webhook(signingSecret);
    event = wh.verify(rawBody, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    });
  } catch (err: any) {
    console.error('[Clerk Webhook Verification Error]:', err.message);
    return res.status(400).json({
      success: false,
      message: 'Webhook signature verification failed',
      code: 'WEBHOOK_VERIFICATION_FAILED',
    });
  }

  const dbService = getDatabaseService();
  const eventType = event.type;
  const data = event.data;

  try {
    switch (eventType) {
      case 'user.created':
      case 'user.updated': {
        const clerkId = data.id;
        const primaryEmail = data.email_addresses?.find((e: any) => e.id === data.primary_email_address_id)?.email_address
          || data.email_addresses?.[0]?.email_address
          || '';

        const primaryPhone = data.phone_numbers?.find((p: any) => p.id === data.primary_phone_number_id)?.phone_number
          || data.phone_numbers?.[0]?.phone_number
          || '';

        const normPhone = primaryPhone ? normalizeNigerianPhone(primaryPhone).normalized || primaryPhone : '';

        const fullName = [data.first_name, data.last_name].filter(Boolean).join(' ').trim()
          || data.username
          || 'Valued Customer';

        // Server-side role assignment only! Default to customer
        const role: UserRole = data.public_metadata?.role || 'customer';

        await dbService.users.upsertClerkUser({
          clerkId,
          email: primaryEmail,
          fullName,
          phone: normPhone,
          avatarUrl: data.image_url,
          role,
        });

        break;
      }

      case 'user.deleted': {
        const clerkId = data.id;
        if (clerkId && dbService.users.deleteByClerkId) {
          await dbService.users.deleteByClerkId(clerkId);
        }
        break;
      }

      default:
        // Acknowledge other Clerk events
        break;
    }

    return res.status(200).json({ success: true, event: eventType });
  } catch (err: any) {
    console.error(`[Clerk Webhook ${eventType} Processing Error]:`, err);
    return res.status(500).json({
      success: false,
      message: `Failed to process webhook event ${eventType}`,
      error: err.message,
    });
  }
}
