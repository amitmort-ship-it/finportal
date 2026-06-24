import { useEffect, useState } from 'react';

const LOGO_URL = 'https://media.base44.com/images/public/69c2ce93ab0a8ed34c65a4a8/34451277e_1.png';

export default function SplashScreen({ onDone }) {
  const [phase, setPhase] = useState('building'); // building → logo → fade
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Animate progress bar (building phase)
    const interval = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          clearInterval(interval);
          return 100;
        }
        return p + 2;
      });
    }, 30);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (progress >= 100) {
      const t1 = setTimeout(() => setPhase('logo'), 200);
      const t2 = setTimeout(() => setPhase('fade'), 1800);
      const t3 = setTimeout(() => onDone(), 2300);
      return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
    }
  }, [progress, onDone]);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white"
      style={{
        opacity: phase === 'fade' ? 0 : 1,
        transition: 'opacity 0.5s ease',
      }}
    >
      {/* House SVG animation */}
      <div className="relative w-40 h-40 mb-6">
        <svg viewBox="0 0 160 160" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          {/* Ground */}
          <line x1="20" y1="130" x2="140" y2="130" stroke="#e2e8f0" strokeWidth="2" />

          {/* Left wall — grows upward */}
          <rect
            x="30" y="130" width="30" height="50"
            fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1"
            style={{
              transformOrigin: '30px 130px',
              transform: `scaleY(${Math.min(progress / 60, 1)})`,
              transformBox: 'fill-box',
              transition: 'transform 0.1s linear',
            }}
          />

          {/* Right wall */}
          <rect
            x="100" y="130" width="30" height="50"
            fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1"
            style={{
              transformOrigin: '100px 130px',
              transform: `scaleY(${Math.min(Math.max((progress - 20) / 60, 0), 1)})`,
              transformBox: 'fill-box',
              transition: 'transform 0.1s linear',
            }}
          />

          {/* Middle wall / body */}
          <rect
            x="30" y="80" width="100" height="50"
            fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1"
            style={{
              opacity: progress > 40 ? 1 : 0,
              transition: 'opacity 0.3s ease',
            }}
          />

          {/* Door */}
          <rect
            x="68" y="100" width="24" height="30"
            fill="#6366f1" rx="2"
            style={{
              opacity: progress > 70 ? 1 : 0,
              transition: 'opacity 0.3s ease',
            }}
          />

          {/* Window left */}
          <rect
            x="38" y="90" width="18" height="14"
            fill="#bfdbfe" stroke="#93c5fd" strokeWidth="1" rx="1"
            style={{
              opacity: progress > 75 ? 1 : 0,
              transition: 'opacity 0.3s ease',
            }}
          />

          {/* Window right */}
          <rect
            x="104" y="90" width="18" height="14"
            fill="#bfdbfe" stroke="#93c5fd" strokeWidth="1" rx="1"
            style={{
              opacity: progress > 75 ? 1 : 0,
              transition: 'opacity 0.3s ease',
            }}
          />

          {/* Roof — slides down */}
          <polygon
            points="80,40 20,80 140,80"
            fill="#3730a3"
            style={{
              opacity: progress > 55 ? 1 : 0,
              transform: progress > 55 ? 'translateY(0)' : 'translateY(-20px)',
              transition: 'opacity 0.4s ease, transform 0.4s ease',
            }}
          />

          {/* Chimney */}
          <rect
            x="105" y="50" width="10" height="22"
            fill="#4f46e5"
            style={{
              opacity: progress > 80 ? 1 : 0,
              transition: 'opacity 0.3s ease',
            }}
          />

          {/* Smoke puffs */}
          {progress >= 100 && (
            <>
              <circle cx="110" cy="42" r="5" fill="#e2e8f0" style={{ animation: 'smokeRise 1.5s infinite ease-out' }} />
              <circle cx="115" cy="34" r="4" fill="#e2e8f0" style={{ animation: 'smokeRise 1.5s 0.4s infinite ease-out' }} />
            </>
          )}
        </svg>
      </div>

      {/* Progress bar */}
      {phase === 'building' && (
        <div className="w-48 h-1.5 bg-slate-100 rounded-full overflow-hidden mb-6">
          <div
            className="h-full bg-indigo-600 rounded-full transition-all duration-75"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Logo fade-in */}
      <div
        style={{
          opacity: phase === 'logo' || phase === 'fade' ? 1 : 0,
          transform: phase === 'logo' || phase === 'fade' ? 'scale(1)' : 'scale(0.85)',
          transition: 'opacity 0.5s ease, transform 0.5s ease',
        }}
      >
        <img
          src={LOGO_URL}
          alt="עמית ייעוץ ופיננסים"
          className="w-36 h-auto"
          draggable={false}
        />
      </div>

      <style>{`
        @keyframes smokeRise {
          0% { opacity: 0.7; transform: translateY(0) scale(1); }
          100% { opacity: 0; transform: translateY(-18px) scale(1.6); }
        }
      `}</style>
    </div>
  );
}