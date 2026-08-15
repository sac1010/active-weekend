import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-project-id.supabase.co';
const supabaseAdminKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';
const supabaseAdmin = createClient(supabaseUrl, supabaseAdminKey);

export async function POST(request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-razorpay-signature');
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!signature || !webhookSecret) {
      console.warn('ActiveWeekend: Webhook secret or signature header missing. Skipping webhook validation.');
      return NextResponse.json({ success: true, message: 'Skipped signature checks (dev mode).' });
    }

    // Cryptographic validation of the webhook payload from Razorpay
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    if (expectedSignature !== signature) {
      return NextResponse.json(
        { success: false, error: 'Invalid webhook signature.' },
        { status: 400 }
      );
    }

    const payload = JSON.parse(rawBody);
    const eventName = payload.event;

    // Handle payment.captured event
    if (eventName === 'payment.captured') {
      const paymentEntity = payload.payload.payment.entity;
      const orderId = paymentEntity.order_id;
      const paymentId = paymentEntity.id;
      const receipt = paymentEntity.description; // e.g. receipt_booking_id

      if (receipt && receipt.startsWith('receipt_')) {
        const bookingId = receipt.replace('receipt_', '');

        // Securely update database status
        const { data: booking } = await supabaseAdmin
          .from('bookings')
          .update({
            payment_status: 'Escrow_Held',
            payment_ref: paymentId
          })
          .eq('id', bookingId)
          .select('event_id, user_id')
          .single();

        if (booking) {
          const { data: event } = await supabaseAdmin
            .from('events')
            .select('title, host_id')
            .eq('id', booking.event_id)
            .single();

          if (event) {
            // Notify Host
            await supabaseAdmin.from('notifications').insert({
              user_id: event.host_id,
              title: 'Booking Confirmed (Webhook) 🏸',
              message: `Payment confirmed for "${event.title}".`
            });

            // Notify Guest
            await supabaseAdmin.from('notifications').insert({
              user_id: booking.user_id,
              title: 'Match Slot Booked! 🎉',
              message: `Your booking for "${event.title}" is confirmed.`
            });
          }
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error handling webhook:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
