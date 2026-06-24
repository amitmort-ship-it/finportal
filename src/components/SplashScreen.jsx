import { useEffect, useState } from 'react';

const LOGO_URL = 'https://media.base44.com/images/public/69c2ce93ab0a8ed34c65a4a8/34451277e_1.png';
const BG_URL = 'https://media.base44.com/images/public/69c2ce93ab0a8ed34c65a4a8/3edc5346a_generated_image.png';

const ghostIcons = [
  { top: '8%', left: '12%', size: 52, delay: '0s', type: 0 },
  { top: '14%', left: '55%', size: 44, delay: '0.3s', type: 1 },
  { top: '35%', left: '4%', size: 60, delay: '0.6s', type: 2 },
  { top: '72%', left: '6%', size: 52, delay: '0.9s', type: 0 },
  { top: '80%', left: '72%', size: 60, delay: '0.2s', type: 1 },
  { top: '88%', left: '38%', size: 48, delay: '0.5s', type: 2 },
];

function GhostIcon({ type, size }) {
  const s = size * 0.45;
  if (type === 0) return (
    <svg viewBox="0 0 24 24" fill="none" stroke="rgba(180,160,255,0.7)" strokeWidth="1.5" width={s} height={s}>
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
    </svg>
  );
  if (type === 1) return (
    <svg viewBox="0 0 24 24" fill="none" stroke="rgba(180,160,255,0.7)" strokeWidth="1.5" width={s} height={s}>
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  );
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="rgba(180,160,255,0.7)" strokeWidth="1.5" width={s} height={s}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v4l3 3" />
    </svg>
  );
}

export default function SplashScreen({ onDone }) {
  const [phase, setPhase] = useState('loading');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(p => {
        if (p >= 100) { clearInterval(interval); return 100; }
        return p + 2;
      });
    }, 30);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (progress >= 100) {
      const t1 = setTimeout(() => setPhase('show'), 200);
      const t2 = setTimeout(() => setPhase('fade'), 1800);
      const t3 = setTimeout(() => onDone(), 2400);
      return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
    }
  }, [progress, onDone]);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      opacity: phase === 'fade' ? 0 : 1,
      transition: 'opacity 0.6s ease',
      background: '#0D0B2A',
      backgroundImage: `url(${BG_URL})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden',
    }}>
      <style>{`
        @keyframes splashSpinRing { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes splashSpinReverse { from { transform: rotate(0deg); } to { transform: rotate(-360deg); } }
        @keyframes splashOrbPulse { 0%,100%{opacity:.7;transform:scale(1);} 50%{opacity:1;transform:scale(1.06);} }
        @keyframes splashFloat { 0%{opacity:0;transform:translateY(18px);} 100%{opacity:1;transform:translateY(0);} }
        @keyframes splashDot { 0%,80%,100%{opacity:.3;transform:scale(.8);} 40%{opacity:1;transform:scale(1);} }
      `}</style>

      {/* Floating ghost icons */}
      {ghostIcons.map((item, i) => (
        <div key={i} style={{
          position: 'absolute', top: item.top, left: item.left,
          width: item.size, height: item.size, borderRadius: 16,
          background: 'rgba(255,255,255,0.06)',
          backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: `splashFloat 0.8s ${item.delay} both`,
        }}>
          <GhostIcon type={item.type} size={item.size} />
        </div>
      ))}

      {/* Center orb + glass card */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 32 }}>

        {/* Glow orb */}
        <div style={{
          position: 'absolute', width: 280, height: 280, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0,220,255,0.18) 0%, rgba(180,0,255,0.22) 55%, transparent 75%)',
          animation: 'splashOrbPulse 3s ease-in-out infinite',
          filter: 'blur(2px)',
        }} />

        {/* Spinning ring 1 */}
        <div style={{
          position: 'absolute', width: 270, height: 270, borderRadius: '50%',
          border: '2.5px solid transparent',
          backgroundImage: 'linear-gradient(#0D0B2A, #0D0B2A), conic-gradient(from 0deg, #00E5FF, #BF00FF, #FF00AA, #00E5FF)',
          backgroundOrigin: 'border-box', backgroundClip: 'padding-box, border-box',
          animation: 'splashSpinRing 3s linear infinite',
        }} />

        {/* Spinning ring 2 */}
        <div style={{
          position: 'absolute', width: 295, height: 295, borderRadius: '50%',
          border: '1.5px solid transparent',
          backgroundImage: 'linear-gradient(#0D0B2A, #0D0B2A), conic-gradient(from 180deg, rgba(0,229,255,0.3), rgba(191,0,255,0.3), rgba(0,229,255,0.3))',
          backgroundOrigin: 'border-box', backgroundClip: 'padding-box, border-box',
          animation: 'splashSpinReverse 5s linear infinite',
        }} />

        {/* Frosted glass card */}
        <div style={{
          position: 'relative', zIndex: 2,
          width: 230, height: 230, borderRadius: 28,
          background: 'rgba(255,255,255,0.08)',
          backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.18)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.15)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24,
        }}>
          <img
            src={LOGO_URL}
            alt="עמית ייעוץ ופיננסים"
            style={{ width: 80, height: 'auto', filter: 'drop-shadow(0 0 12px rgba(100,160,255,0.6))' }}
            draggable={false}
          />
          <div style={{ textAlign: 'center', direction: 'rtl' }}>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 18, lineHeight: 1.3, fontFamily: 'Heebo, sans-serif' }}>
              עמית ייעוץ ופיננסים
            </div>
            <div style={{ color: 'rgba(180,200,255,0.8)', fontSize: 13, marginTop: 4, fontFamily: 'Heebo, sans-serif' }}>
              ניהול משכנתאות
            </div>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{
        width: 200, height: 3, background: 'rgba(255,255,255,0.1)',
        borderRadius: 99, overflow: 'hidden', marginBottom: 16,
      }}>
        <div style={{
          height: '100%', width: `${progress}%`,
          background: 'linear-gradient(90deg, #00E5FF, #BF00FF)',
          borderRadius: 99, transition: 'width 0.07s linear',
          boxShadow: '0 0 8px rgba(0,229,255,0.7)',
        }} />
      </div>

      {/* Loading dots */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, direction: 'rtl' }}>
        <span style={{ color: 'rgba(180,200,255,0.7)', fontSize: 14, fontFamily: 'Heebo, sans-serif' }}>טוען</span>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: 5, height: 5, borderRadius: '50%',
            background: 'rgba(0,229,255,0.8)',
            animation: `splashDot 1.2s ${i * 0.2}s ease-in-out infinite`,
          }} />
        ))}
      </div>
    </div>
  );
}