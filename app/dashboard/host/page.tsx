'use client';

import { useState } from 'react';
import Image from 'next/image';

export default function HostDashboard() {
  const [qrCode, setQrCode] = useState<string | null>(null);

  async function generateQrCode(gameId: string) {
    try {
      const res = await fetch(`/api/games/${gameId}/qrcode`);
      const data = await res.json();

      if (data.qrCode) {
        setQrCode(data.qrCode);
      } else {
        alert('Failed to generate QR code');
      }
    } catch (error) {
      console.error('Error generating QR code:', error);
      alert('An error occurred while generating the QR code.');
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Host Dashboard</h1>
      <button
        onClick={() => generateQrCode('exampleGameId')}
        className="bg-blue-500 text-white px-4 py-2 rounded"
      >
        Generate QR Code
      </button>
      {qrCode && (
        <div className="mt-4">
          <Image
            src={qrCode}
            alt="QR Code for the game"
            width={300}
            height={300}
            className="border rounded"
          />
        </div>
      )}
    </div>
  );
}
