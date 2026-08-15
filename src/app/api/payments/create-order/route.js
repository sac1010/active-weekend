import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';

export async function POST(request) {
  try {
    const { amount, bookingId } = await request.json();

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    // Sandbox Simulation fallback
    if (!keyId || keyId.includes('your_key_id') || !keySecret || keySecret.includes('your_key_secret')) {
      console.log('ActiveWeekend: Running payments in sandbox simulated mode.');
      return NextResponse.json({
        success: true,
        isSimulated: true,
        orderId: `sim_order_${Math.random().toString(36).substring(2, 15)}`,
        amount: amount,
        currency: 'INR'
      });
    }

    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret
    });

    const options = {
      amount: amount * 100, // Razorpay amount in paise (₹150 = 15000 paise)
      currency: 'INR',
      receipt: `receipt_${bookingId}`,
      payment_capture: 1 // Automatically capture payment
    };

    const order = await razorpay.orders.create(options);

    return NextResponse.json({
      success: true,
      isSimulated: false,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency
    });
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
