import nodemailer from 'nodemailer';
import { NextResponse } from 'next/server';
import QRCode from 'qrcode';

export async function POST(req: Request) {
  try {
    const { email, gameLink } = await req.json();

    if (!email || !gameLink) {
      return NextResponse.json({ error: 'Email and game link are required' }, { status: 400 });
    }

    // Generate QR code as a data URL
    const qrCodeDataUrl = await QRCode.toDataURL(gameLink);

    // Set up Nodemailer transporter
    const transporter = nodemailer.createTransport({
      service: 'Gmail', // Replace with your email provider
      auth: {
        user: process.env.EMAIL_USER, // Your email address
        pass: process.env.EMAIL_PASS, // Your email password or app-specific password
      },
    });

    // Send email
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Join the Game - QR Code',
      html: `
        <p>Scan the QR code below to join the game:</p>
        <img src="${qrCodeDataUrl}" alt="QR Code" />
        <p>Or use this link: <a href="${gameLink}">${gameLink}</a></p>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error sending email:', error);
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }
}
