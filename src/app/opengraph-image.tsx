import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Loyal & Found — Pet Gear, Thoughtfully Tested';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#FDF9F2',
          color: '#2A2520',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'Georgia, serif',
        }}
      >
        <div
          style={{
            fontSize: 72,
            fontWeight: 500,
            marginBottom: 16,
            letterSpacing: '-0.02em',
            display: 'flex',
            alignItems: 'baseline',
            gap: 12,
          }}
        >
          <span>Loyal</span>
          <span style={{ fontStyle: 'italic', color: '#B5472E' }}>&amp;</span>
          <span>Found</span>
        </div>
        <div
          style={{
            fontSize: 28,
            color: '#5C5248',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}
        >
          Pet gear, thoughtfully tested
        </div>
        {/* Tier indicator */}
        <div
          style={{
            display: 'flex',
            gap: 24,
            marginTop: 40,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 18,
              color: '#5B7C4A',
            }}
          >
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: 3,
                background: '#5B7C4A',
              }}
            />
            Budget
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 18,
              color: '#7A8970',
            }}
          >
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: 3,
                background: '#7A8970',
              }}
            />
            Sweet Spot
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 18,
              color: '#D4A155',
            }}
          >
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: 3,
                background: '#D4A155',
              }}
            />
            Splurge
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
