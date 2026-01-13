import { useRef, useEffect } from 'react';

interface LSDVisualizerProps {
  frequencyData: Uint8Array | null;
  isPlaying: boolean;
}

// Frequency band configuration with unique colors for each
const FREQUENCY_BANDS = [
  { name: 'Sub-Bass', start: 0, end: 3, hue: 280, color: '#9333ea' },      // Purple - deep rumble
  { name: 'Bass', start: 3, end: 8, hue: 220, color: '#3b82f6' },          // Blue - punch
  { name: 'Low Mids', start: 8, end: 16, hue: 180, color: '#06b6d4' },     // Cyan - body
  { name: 'Mids', start: 16, end: 40, hue: 120, color: '#22c55e' },        // Green - vocals
  { name: 'High Mids', start: 40, end: 80, hue: 60, color: '#eab308' },    // Yellow - clarity
  { name: 'Presence', start: 80, end: 120, hue: 30, color: '#f97316' },    // Orange - attack
  { name: 'Brilliance', start: 120, end: 180, hue: 0, color: '#ef4444' },  // Red - sparkle
  { name: 'Air', start: 180, end: 255, hue: 320, color: '#ec4899' },       // Pink - shimmer
];

// Helper function to get average of frequency range
const getAverage = (data: Uint8Array, start: number, end: number): number => {
  const slice = Array.from(data).slice(start, Math.min(end, data.length));
  if (slice.length === 0) return 0;
  return slice.reduce((a, b) => a + b, 0) / slice.length;
};

// Get all 8 frequency band levels
const getAllBandLevels = (data: Uint8Array): number[] => {
  return FREQUENCY_BANDS.map(band => getAverage(data, band.start, band.end) / 255);
};

const LSDVisualizer: React.FC<LSDVisualizerProps> = ({ frequencyData, isPlaying }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const timeRef = useRef(0);
  const hueOffsetRef = useRef(0);
  const particlesRef = useRef<Array<{x: number, y: number, vx: number, vy: number, band: number, life: number}>>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const resizeCanvas = () => {
      const container = canvas.parentElement;
      if (container) {
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const draw = () => {
      const width = canvas.width;
      const height = canvas.height;
      const centerX = width / 2;
      const centerY = height / 2;
      const maxRadius = Math.min(width, height) * 0.45;

      // Smooth fade effect with slight blur trail
      ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
      ctx.fillRect(0, 0, width, height);

      timeRef.current += 0.016;
      hueOffsetRef.current += 0.3;

      if (frequencyData && isPlaying) {
        const bands = getAllBandLevels(frequencyData);

        // ============================================
        // LAYER 1: Background Gradient Pulse (Sub-Bass)
        // ============================================
        const subBassLevel = bands[0];
        if (subBassLevel > 0.1) {
          const pulseRadius = maxRadius * (0.8 + subBassLevel * 0.4);
          const bgGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, pulseRadius);
          bgGradient.addColorStop(0, `hsla(280, 100%, 20%, ${subBassLevel * 0.3})`);
          bgGradient.addColorStop(0.5, `hsla(280, 80%, 10%, ${subBassLevel * 0.2})`);
          bgGradient.addColorStop(1, 'transparent');
          ctx.fillStyle = bgGradient;
          ctx.fillRect(0, 0, width, height);
        }

        // ============================================
        // LAYER 2: Concentric Ripples (Bass) - Blue rings
        // ============================================
        const bassLevel = bands[1];
        const numRipples = 6;
        for (let i = 0; i < numRipples; i++) {
          const ripplePhase = (timeRef.current * 2 + i * 0.8) % 3;
          const rippleRadius = 30 + ripplePhase * maxRadius * 0.4 + bassLevel * 40;
          const rippleAlpha = Math.max(0, (1 - ripplePhase / 3) * bassLevel * 0.8);
          
          ctx.beginPath();
          ctx.arc(centerX, centerY, rippleRadius, 0, Math.PI * 2);
          ctx.strokeStyle = `hsla(220, 100%, 60%, ${rippleAlpha})`;
          ctx.lineWidth = 3 + bassLevel * 8;
          ctx.stroke();
          
          // Inner glow
          if (bassLevel > 0.3) {
            ctx.shadowColor = '#3b82f6';
            ctx.shadowBlur = 15 * bassLevel;
            ctx.stroke();
            ctx.shadowBlur = 0;
          }
        }

        // ============================================
        // LAYER 3: Rotating Hexagons (Low Mids) - Cyan geometric
        // ============================================
        const lowMidsLevel = bands[2];
        const numHexagons = 3;
        for (let h = 0; h < numHexagons; h++) {
          const hexRadius = 60 + h * 50 + lowMidsLevel * 30;
          const hexRotation = timeRef.current * (0.3 + h * 0.1) * (h % 2 === 0 ? 1 : -1);
          const hexAlpha = 0.4 + lowMidsLevel * 0.4;
          
          ctx.beginPath();
          for (let i = 0; i < 6; i++) {
            const angle = hexRotation + (i * Math.PI * 2) / 6;
            const wobble = Math.sin(timeRef.current * 3 + i) * lowMidsLevel * 10;
            const x = centerX + Math.cos(angle) * (hexRadius + wobble);
            const y = centerY + Math.sin(angle) * (hexRadius + wobble);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.closePath();
          ctx.strokeStyle = `hsla(180, 100%, 50%, ${hexAlpha})`;
          ctx.lineWidth = 2 + lowMidsLevel * 3;
          ctx.stroke();
          
          // Fill with gradient on high levels
          if (lowMidsLevel > 0.5) {
            const hexGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, hexRadius);
            hexGrad.addColorStop(0, `hsla(180, 100%, 50%, ${lowMidsLevel * 0.1})`);
            hexGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = hexGrad;
            ctx.fill();
          }
        }

        // ============================================
        // LAYER 4: Vocal Waves (Mids) - Green sine waves
        // ============================================
        const midsLevel = bands[3];
        const numWaves = 5;
        for (let w = 0; w < numWaves; w++) {
          const waveOffset = (w / numWaves) * Math.PI * 2;
          const waveAmplitude = 20 + midsLevel * 60;
          const waveY = centerY + (w - 2) * 25;
          
          ctx.beginPath();
          for (let x = 0; x <= width; x += 3) {
            const normalX = (x - width / 2) / (width / 2);
            const falloff = Math.cos(normalX * Math.PI / 2);
            const y = waveY + Math.sin(x * 0.03 + timeRef.current * 4 + waveOffset) * waveAmplitude * falloff;
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.strokeStyle = `hsla(120, 80%, 50%, ${0.3 + midsLevel * 0.5 - w * 0.05})`;
          ctx.lineWidth = 2 + midsLevel * 2;
          ctx.stroke();
        }

        // ============================================
        // LAYER 5: Clarity Starbursts (High Mids) - Yellow spikes
        // ============================================
        const highMidsLevel = bands[4];
        const numSpikes = 16;
        const spikeBaseRadius = 80;
        const spikeLength = 40 + highMidsLevel * 100;
        
        for (let i = 0; i < numSpikes; i++) {
          const spikeAngle = (i / numSpikes) * Math.PI * 2 + timeRef.current * 0.5;
          const pulseOffset = Math.sin(timeRef.current * 6 + i * 0.5) * highMidsLevel * 20;
          
          const innerX = centerX + Math.cos(spikeAngle) * spikeBaseRadius;
          const innerY = centerY + Math.sin(spikeAngle) * spikeBaseRadius;
          const outerX = centerX + Math.cos(spikeAngle) * (spikeBaseRadius + spikeLength + pulseOffset);
          const outerY = centerY + Math.sin(spikeAngle) * (spikeBaseRadius + spikeLength + pulseOffset);
          
          // Main spike line
          const gradient = ctx.createLinearGradient(innerX, innerY, outerX, outerY);
          gradient.addColorStop(0, `hsla(60, 100%, 50%, ${0.8 * highMidsLevel})`);
          gradient.addColorStop(1, `hsla(60, 100%, 70%, 0)`);
          
          ctx.beginPath();
          ctx.moveTo(innerX, innerY);
          ctx.lineTo(outerX, outerY);
          ctx.strokeStyle = gradient;
          ctx.lineWidth = 2 + highMidsLevel * 4;
          ctx.stroke();
          
          // Spike tip glow
          if (highMidsLevel > 0.4) {
            ctx.beginPath();
            ctx.arc(outerX, outerY, 3 + highMidsLevel * 6, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(60, 100%, 70%, ${highMidsLevel * 0.8})`;
            ctx.fill();
          }
        }

        // ============================================
        // LAYER 6: Attack Triangles (Presence) - Orange rotating
        // ============================================
        const presenceLevel = bands[5];
        const numTriangles = 8;
        for (let t = 0; t < numTriangles; t++) {
          const triAngle = (t / numTriangles) * Math.PI * 2 + timeRef.current * 1.2;
          const triDist = 100 + Math.sin(timeRef.current * 2 + t) * 30 + presenceLevel * 50;
          const triSize = 15 + presenceLevel * 25;
          const triX = centerX + Math.cos(triAngle) * triDist;
          const triY = centerY + Math.sin(triAngle) * triDist;
          const triRotation = timeRef.current * 3 + t;
          
          ctx.save();
          ctx.translate(triX, triY);
          ctx.rotate(triRotation);
          
          ctx.beginPath();
          for (let i = 0; i < 3; i++) {
            const angle = (i * Math.PI * 2) / 3 - Math.PI / 2;
            const x = Math.cos(angle) * triSize;
            const y = Math.sin(angle) * triSize;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.closePath();
          
          ctx.fillStyle = `hsla(30, 100%, 50%, ${0.3 + presenceLevel * 0.5})`;
          ctx.fill();
          ctx.strokeStyle = `hsla(30, 100%, 70%, ${0.6 + presenceLevel * 0.4})`;
          ctx.lineWidth = 2;
          ctx.stroke();
          
          ctx.restore();
        }

        // ============================================
        // LAYER 7: Sparkle Particles (Brilliance) - Red dots
        // ============================================
        const brillianceLevel = bands[6];
        const MAX_PARTICLES = 100;
        
        // Spawn new particles (with cap to prevent memory issues)
        if (brillianceLevel > 0.2 && Math.random() < brillianceLevel && particlesRef.current.length < MAX_PARTICLES) {
          const angle = Math.random() * Math.PI * 2;
          const dist = 50 + Math.random() * maxRadius * 0.6;
          particlesRef.current.push({
            x: centerX + Math.cos(angle) * dist,
            y: centerY + Math.sin(angle) * dist,
            vx: (Math.random() - 0.5) * 3,
            vy: (Math.random() - 0.5) * 3,
            band: 6,
            life: 1.0
          });
        }
        
        // Update and draw particles
        particlesRef.current = particlesRef.current.filter(p => {
          p.x += p.vx;
          p.y += p.vy;
          p.life -= 0.02;
          
          if (p.life > 0) {
            const size = 2 + p.life * 5 + brillianceLevel * 4;
            ctx.beginPath();
            ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(0, 100%, 60%, ${p.life * brillianceLevel})`;
            ctx.fill();
            
            // Glow effect
            ctx.beginPath();
            ctx.arc(p.x, p.y, size * 2, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(0, 100%, 70%, ${p.life * brillianceLevel * 0.3})`;
            ctx.fill();
            return true;
          }
          return false;
        });

        // ============================================
        // LAYER 8: Air Shimmer (Air) - Pink aurora
        // ============================================
        const airLevel = bands[7];
        if (airLevel > 0.1) {
          const numAuroraStrands = 12;
          for (let a = 0; a < numAuroraStrands; a++) {
            const auroraAngle = (a / numAuroraStrands) * Math.PI * 2;
            const auroraPhase = timeRef.current * 0.5 + a * 0.3;
            
            ctx.beginPath();
            for (let r = maxRadius * 0.3; r < maxRadius; r += 5) {
              const wobble = Math.sin(r * 0.05 + auroraPhase) * 20 * airLevel;
              const angle = auroraAngle + Math.sin(r * 0.02 + timeRef.current) * 0.2;
              const x = centerX + Math.cos(angle) * r + wobble;
              const y = centerY + Math.sin(angle) * r;
              
              if (r === maxRadius * 0.3) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
            }
            
            const auroraHue = (320 + a * 10 + timeRef.current * 20) % 360;
            ctx.strokeStyle = `hsla(${auroraHue}, 80%, 60%, ${airLevel * 0.4})`;
            ctx.lineWidth = 3 + airLevel * 5;
            ctx.lineCap = 'round';
            ctx.stroke();
          }
        }

        // ============================================
        // CENTER ORB - Combines all frequencies
        // ============================================
        const totalLevel = bands.reduce((a, b) => a + b, 0) / 8;
        const orbRadius = 25 + totalLevel * 40;
        
        // Multi-layer gradient orb
        for (let layer = 3; layer >= 0; layer--) {
          const layerRadius = orbRadius * (1 + layer * 0.3);
          const orbGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, layerRadius);
          const layerHue = (hueOffsetRef.current * 2 + layer * 60) % 360;
          
          orbGradient.addColorStop(0, `hsla(${layerHue}, 100%, 80%, ${0.9 - layer * 0.2})`);
          orbGradient.addColorStop(0.5, `hsla(${(layerHue + 60) % 360}, 100%, 50%, ${0.5 - layer * 0.1})`);
          orbGradient.addColorStop(1, 'transparent');
          
          ctx.beginPath();
          ctx.arc(centerX, centerY, layerRadius, 0, Math.PI * 2);
          ctx.fillStyle = orbGradient;
          ctx.fill();
        }

        // ============================================
        // FREQUENCY BAND INDICATORS (Bottom)
        // ============================================
        const indicatorHeight = 30;
        const indicatorY = height - indicatorHeight - 10;
        const indicatorWidth = (width - 40) / 8;
        
        bands.forEach((level, i) => {
          const band = FREQUENCY_BANDS[i];
          const x = 20 + i * indicatorWidth;
          const barHeight = level * indicatorHeight;
          
          // Bar background
          ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
          ctx.fillRect(x, indicatorY, indicatorWidth - 4, indicatorHeight);
          
          // Active bar
          const barGradient = ctx.createLinearGradient(x, indicatorY + indicatorHeight, x, indicatorY + indicatorHeight - barHeight);
          barGradient.addColorStop(0, `hsla(${band.hue}, 100%, 40%, 0.8)`);
          barGradient.addColorStop(1, `hsla(${band.hue}, 100%, 60%, 1)`);
          ctx.fillStyle = barGradient;
          ctx.fillRect(x, indicatorY + indicatorHeight - barHeight, indicatorWidth - 4, barHeight);
          
          // Glow on high levels
          if (level > 0.6) {
            ctx.shadowColor = band.color;
            ctx.shadowBlur = 10;
            ctx.fillRect(x, indicatorY + indicatorHeight - barHeight, indicatorWidth - 4, barHeight);
            ctx.shadowBlur = 0;
          }
        });

      } else {
        // ============================================
        // IDLE ANIMATION - Ambient breathing rings
        // ============================================
        const numIdleRings = 8;
        for (let i = 0; i < numIdleRings; i++) {
          const band = FREQUENCY_BANDS[i];
          const breathe = Math.sin(timeRef.current * 0.5 + i * 0.5) * 0.5 + 0.5;
          const radius = 40 + i * 25 + breathe * 15;
          
          ctx.beginPath();
          ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
          ctx.strokeStyle = `hsla(${band.hue}, 70%, 50%, ${0.2 + breathe * 0.2})`;
          ctx.lineWidth = 2 + breathe;
          ctx.stroke();
        }

        // Idle center glow
        const idleGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 50);
        const idleHue = (hueOffsetRef.current * 0.5) % 360;
        idleGradient.addColorStop(0, `hsla(${idleHue}, 80%, 60%, 0.6)`);
        idleGradient.addColorStop(0.5, `hsla(${(idleHue + 40) % 360}, 70%, 50%, 0.3)`);
        idleGradient.addColorStop(1, 'transparent');
        ctx.beginPath();
        ctx.arc(centerX, centerY, 50, 0, Math.PI * 2);
        ctx.fillStyle = idleGradient;
        ctx.fill();
        
        // Idle text
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Load audio to visualize', centerX, centerY + 80);
      }

      animationFrameRef.current = requestAnimationFrame(draw);
    };

    // Start animation
    animationFrameRef.current = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [frequencyData, isPlaying]);

  return (
    <div className="w-full h-80 bg-black rounded-lg overflow-hidden relative">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
      />
      <div className="absolute top-2 left-2 text-xs text-white/40">
        LSD Visualizer
      </div>
      <div className="absolute top-2 right-2 flex gap-1">
        {FREQUENCY_BANDS.map((band, i) => (
          <div
            key={i}
            className="w-2 h-2 rounded-full opacity-60"
            style={{ backgroundColor: band.color }}
            title={band.name}
          />
        ))}
      </div>
    </div>
  );
};

export default LSDVisualizer;
