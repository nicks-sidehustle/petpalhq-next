import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'PetPalHQ — Pet gear, through expert consensus';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#1e3a6e',
          color: '#fdfaf3',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'serif',
          padding: '60px',
        }}
      >
        <div
          style={{
            fontSize: 96,
            fontWeight: 'bold',
            marginBottom: 24,
            letterSpacing: '-0.02em',
            display: 'flex',
          }}
        >
          <span style={{ color: '#fdfaf3' }}>PetPal</span>
          <span style={{ color: '#2db8c5' }}>HQ</span>
        </div>
        <div
          style={{
            fontSize: 36,
            color: '#fdfaf3',
            opacity: 0.85,
            textAlign: 'center',
            marginBottom: 32,
          }}
        >
          Pet gear, through expert consensus
        </div>
        <div
          style={{
            display: 'flex',
            gap: 24,
            fontSize: 22,
            color: '#fdfaf3',
            opacity: 0.7,
          }}
        >
          <span>Aquarium</span>
          <span style={{ color: '#f29c3a' }}>·</span>
          <span>Reptile</span>
          <span style={{ color: '#f29c3a' }}>·</span>
          <span>Birds</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
