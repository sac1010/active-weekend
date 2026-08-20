import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { to, type, eventTitle, eventDate, eventTime, venueName, locality } = await request.json();

    if (!to) {
      return NextResponse.json({ error: 'Recipient email is required.' }, { status: 400 });
    }

    const key = process.env.RESEND_API_KEY;
    const fromEmail = process.env.EMAIL_FROM || 'ActiveWeekend <onboarding@resend.dev>';

    // Build subject and HTML template based on type
    let subject = '';
    let htmlContent = '';

    const formattedDate = new Date(eventDate).toLocaleDateString('en-IN', {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });

    const emailHeaderStyle = `
      background-color: #090d16;
      padding: 30px;
      text-align: center;
      border-bottom: 2px solid #10b981;
    `;

    const emailBodyStyle = `
      background-color: #0d1527;
      color: #f8fafc;
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      padding: 30px;
      line-height: 1.6;
    `;

    const emailCardStyle = `
      background-color: #1e293b;
      border: 1px solid #334155;
      border-radius: 12px;
      padding: 20px;
      margin: 20px 0;
    `;

    const buttonStyle = `
      display: inline-block;
      background-color: #10b981;
      color: #090d16;
      font-weight: bold;
      padding: 12px 24px;
      border-radius: 8px;
      text-decoration: none;
      margin-top: 15px;
    `;

    if (type === 'join') {
      subject = `Squad Roster Joined: ${eventTitle} 🏸`;
      htmlContent = `
        <div style="${emailBodyStyle}">
          <div style="${emailHeaderStyle}">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px;">ActiveWeekend</h1>
            <p style="color: #10b981; margin: 5px 0 0 0; font-size: 14px; font-weight: bold; letter-spacing: 1px;">CONNECT. PLAY. EXPLORE.</p>
          </div>
          
          <div style="padding: 20px 0;">
            <h2 style="color: #10b981;">Roster Registration Confirmed!</h2>
            <p>Hey there,</p>
            <p>You have successfully joined the squad roster for <strong>${eventTitle}</strong>. Here are the session details for your active weekend:</p>
            
            <div style="${emailCardStyle}">
              <p style="margin: 5px 0;">📅 <strong>Date:</strong> ${formattedDate}</p>
              <p style="margin: 5px 0;">⏰ <strong>Time:</strong> ${eventTime}</p>
              <p style="margin: 5px 0;">📍 <strong>Venue:</strong> ${venueName}</p>
              <p style="margin: 5px 0;">🗺️ <strong>Locality:</strong> ${locality}, Bangalore</p>
            </div>
            
            <p>The coordination chat room for this event is now unlocked for you. Feel free to connect with the host and fellow players to plan transport or split cost details.</p>
            
            <div style="text-align: center;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://activeweekend.in'}" style="${buttonStyle}">Open ActiveWeekend</a>
            </div>
          </div>
          
          <hr style="border: 0; border-top: 1px solid #1e293b; margin: 30px 0;" />
          <p style="font-size: 11px; color: #64748b; text-align: center; margin: 0;">
            You are receiving this email because you registered for an event on ActiveWeekend.
            <br />
            Bangalore's #1 Free Community Events Platform.
          </p>
        </div>
      `;
    } else if (type === 'host') {
      subject = `Event Published: ${eventTitle} is Live! 🚀`;
      htmlContent = `
        <div style="${emailBodyStyle}">
          <div style="${emailHeaderStyle}">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px;">ActiveWeekend</h1>
            <p style="color: #10b981; margin: 5px 0 0 0; font-size: 14px; font-weight: bold; letter-spacing: 1px;">CONNECT. PLAY. EXPLORE.</p>
          </div>
          
          <div style="padding: 20px 0;">
            <h2 style="color: #10b981;">Event Successfully Hosted!</h2>
            <p>Hey there,</p>
            <p>Your event <strong>${eventTitle}</strong> has been successfully published on ActiveWeekend Bangalore. Other members can now browse and join your squad roster.</p>
            
            <div style="${emailCardStyle}">
              <p style="margin: 5px 0;">📅 <strong>Date:</strong> ${formattedDate}</p>
              <p style="margin: 5px 0;">⏰ <strong>Time:</strong> ${eventTime}</p>
              <p style="margin: 5px 0;">📍 <strong>Venue:</strong> ${venueName}</p>
              <p style="margin: 5px 0;">🗺️ <strong>Locality:</strong> ${locality}, Bangalore</p>
            </div>
            
            <h3 style="color: #ffffff; font-size: 14px; margin-top: 20px;">Hosting Checkpoints:</h3>
            <ul style="padding-left: 20px;">
              <li>Watch out for chat messages from players joining your roster.</li>
              <li>Once the event completes, upload a group photo in the app to claim your +30 TrustPoints.</li>
              <li>Encourage players to join on time to avoid no-show penalties.</li>
            </ul>
            
            <div style="text-align: center;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://activeweekend.in'}" style="${buttonStyle}">View Hosted Event</a>
            </div>
          </div>
          
          <hr style="border: 0; border-top: 1px solid #1e293b; margin: 30px 0;" />
          <p style="font-size: 11px; color: #64748b; text-align: center; margin: 0;">
            You are receiving this email because you hosted an event on ActiveWeekend.
            <br />
            Bangalore's #1 Free Community Events Platform.
          </p>
        </div>
      `;
    } else if (type === 'leave') {
      subject = `Roster Update: Left ${eventTitle}`;
      htmlContent = `
        <div style="${emailBodyStyle}">
          <div style="${emailHeaderStyle}">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px;">ActiveWeekend</h1>
            <p style="color: #10b981; margin: 5px 0 0 0; font-size: 14px; font-weight: bold; letter-spacing: 1px;">CONNECT. PLAY. EXPLORE.</p>
          </div>
          
          <div style="padding: 20px 0;">
            <h2 style="color: #f43f5e;">You Left the Squad Roster</h2>
            <p>Hey there,</p>
            <p>This email confirms that you have left the squad roster for <strong>${eventTitle}</strong> scheduled for ${formattedDate} at ${eventTime}.</p>
            
            <p style="color: #94a3b8; font-size: 12px; font-style: italic;">
              Note: Canceling bookings within 6 hours of the event start time incurs a -30 TrustPoints penalty to protect community reliability.
            </p>
            
            <div style="text-align: center;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://activeweekend.in'}" style="${buttonStyle}">Explore Other Squads</a>
            </div>
          </div>
          
          <hr style="border: 0; border-top: 1px solid #1e293b; margin: 30px 0;" />
          <p style="font-size: 11px; color: #64748b; text-align: center; margin: 0;">
            You are receiving this email because you updated your event registration on ActiveWeekend.
          </p>
        </div>
      `;
    } else {
      return NextResponse.json({ error: 'Invalid notification type.' }, { status: 400 });
    }

    // If Resend API key is missing or is placeholder, fall back to console logging
    if (!key || key.includes('your_key_here') || key === '') {
      console.log(`\n========================================\n[SIMULATED EMAIL TRANSACTION]`);
      console.log(`FROM: ${fromEmail}`);
      console.log(`TO: ${to}`);
      console.log(`SUBJECT: ${subject}`);
      console.log(`----------------------------------------`);
      console.log(`Content type: ${type}`);
      console.log(`Event details: ${eventTitle} | ${eventDate} | ${eventTime}`);
      console.log(`========================================\n`);

      return NextResponse.json({
        success: true,
        isSimulated: true,
        message: 'Email logged in terminal (sandbox/development mode).'
      });
    }

    // Call Resend REST API (avoids any extra package installation, 100% clean & free)
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [to],
        subject: subject,
        html: htmlContent
      })
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error('Resend API Error:', responseData);
      throw new Error(responseData.message || 'Resend request failed.');
    }

    return NextResponse.json({
      success: true,
      isSimulated: false,
      id: responseData.id
    });

  } catch (error) {
    console.error('Email route error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
