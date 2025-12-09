'use client';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(to bottom right, #fef2f2, #fee2e2)'
        }}>
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <h1 style={{ fontSize: '3.75rem', fontWeight: 'bold', color: '#991b1b', marginBottom: '1rem' }}>
              Error
            </h1>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#b91c1c', marginBottom: '0.5rem' }}>
              Something went wrong!
            </h2>
            <p style={{ color: '#dc2626', marginBottom: '1.5rem' }}>
              {error.message || 'An unexpected error occurred'}
            </p>
            <button
              onClick={() => reset()}
              style={{
                display: 'inline-block',
                backgroundColor: '#dc2626',
                color: 'white',
                padding: '0.75rem 1.5rem',
                borderRadius: '0.5rem',
                border: 'none',
                cursor: 'pointer'
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#b91c1c'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#dc2626'}
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
