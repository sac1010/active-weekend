import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Admin client to bypass RLS for payment status updates
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-project-id.supabase.co';
const supabaseAdminKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';
const supabaseAdmin = createClient(supabaseUrl, supabaseAdminKey);

export async function POST(request) {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, bookingId, userEmail } = await request.json();

    // Check for simulated order
    const isSimulated = razorpayOrderId?.startsWith('sim_order_');
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!isSimulated) {
      if (!keySecret || keySecret.includes('your_key_secret')) {
        return NextResponse.json(
          { success: false, error: 'Razorpay Secret Key not configured on server.' },
          { status: 500 }
        );
      }

      // Cryptographic signature validation
      const generatedSignature = crypto
        .createHmac('sha256', keySecret)
        .update(`${razorpayOrderId}|${razorpayPaymentId}`)
        .digest('hex');

      if (generatedSignature !== razorpaySignature) {
        return NextResponse.json(
          { success: false, error: 'Payment signature validation failed.' },
          { status: 400 }
        );
      }
    }

    const finalPaymentId = isSimulated ? `sim_pay_${Math.random().toString(36).substring(2, 10)}` : razorpayPaymentId;

    // Securely update the booking status to Escrow_Held
    const { data: booking, error: bookingError } = await supabaseAdmin
      .from('bookings')
      .update({
        payment_status: 'Escrow_Held',
        payment_ref: finalPaymentId
      })
      .eq('id', bookingId)
      .select('event_id, user_id')
      .single();

    if (bookingError) throw bookingError;

    // Send notifications to both guest and host
    // 1. Fetch event title and host_id
    const { data: event } = await supabaseAdmin
      .from('events')
      .select('title, host_id')
      .eq('id', booking.event_id)
      .single();

    if (event) {
      // Notify Host
      await supabaseAdmin.from('notifications').insert({
        user_id: event.host_id,
        title: 'New Booking (Paid) 🏸',
        message: `A guest has joined your match "${event.title}" via Razorpay. payment status: Escrow_Held.`
      });

      // Notify Guest
      await supabaseAdmin.from('notifications').insert({
        user_id: booking.user_id,
        title: 'Booking Confirmed! 🎉',
        message: `Your payment was successful. You are officially confirmed for "${event.title}".`
      });
    }

    return NextResponse.json({
      success: true,
      paymentId: finalPaymentId,
      message: 'Payment verified and booking confirmed.'
    });
  } catch (error) {
    console.error('Error verifying payment signature:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
