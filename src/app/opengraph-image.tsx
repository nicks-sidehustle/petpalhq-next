import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'PetPalHQ — Expert Pet Gear Reviews';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 60,
          background: '#92400e',
          color: 'white',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ fontSize: 80, fontWeight: 'bold', marginBottom: 20 }}>
          🐾 PetPalHQ
        </div>
        <div style={{ fontSize: 32, opacity: 0.9 }}>
          Expert Pet Gear Reviews &amp; Buying Guides
        </div>
      </div>
    ),
    { ...size }
  );
}
