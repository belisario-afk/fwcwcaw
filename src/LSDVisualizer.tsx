import { useRef, useEffect } from 'react';

interface LSDVisualizerProps {
  frequencyData: Uint8Array | null;
  isPlaying: boolean;
}

// Helper function to get average of frequency range
const getAverage = (data: Uint8Array, start: number, end: number): number => {
  const slice = Array.from(data).slice(start, Math.min(end, data.length));
  if (slice.length === 0) return 0;
  return slice.reduce((a, b) => a + b, 0) / slice.length;
};

const LSDVisualizer: React.FC<LSDVisualizerProps> = ({ frequencyData, isPlaying }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const timeRef = useRef(0);
  const hueOffsetRef = useRef(0);

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

      // Fade effect with trail
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
      ctx.fillRect(0, 0, width, height);

      timeRef.current += 0.02;
      hueOffsetRef.current += 0.5;

      if (frequencyData && isPlaying) {
        // Get frequency band averages
        const bass = getAverage(frequencyData, 0, 10);
        const lowMid = getAverage(frequencyData, 10, 30);
        const mid = getAverage(frequencyData, 30, 80);
        const highMid = getAverage(frequencyData, 80, 150);
        const high = getAverage(frequencyData, 150, 255);

        // Psychedelic spiral rings
        const numRings = 12;
        for (let i = 0; i < numRings; i++) {
          const ringProgress = i / numRings;
          const baseRadius = 50 + ringProgress * Math.min(width, height) * 0.4;
          const freqInfluence = (bass / 255) * 30 + (mid / 255) * 20;
          const radius = baseRadius + freqInfluence * Math.sin(timeRef.current * 2 + i * 0.5);

          const hue = (hueOffsetRef.current + ringProgress * 360 + timeRef.current * 50) % 360;
          const saturation = 80 + (highMid / 255) * 20;
          const lightness = 40 + (high / 255) * 30;

          ctx.beginPath();
          const segments = 64;
          for (let j = 0; j <= segments; j++) {
            const angle = (j / segments) * Math.PI * 2;
            const wobble = Math.sin(angle * 8 + timeRef.current * 3 + i) * (lowMid / 255) * 15;
            const x = centerX + Math.cos(angle) * (radius + wobble);
            const y = centerY + Math.sin(angle) * (radius + wobble);
            if (j === 0) {
              ctx.moveTo(x, y);
            } else {
              ctx.lineTo(x, y);
            }
          }
          ctx.closePath();
          ctx.strokeStyle = `hsla(${hue}, ${saturation}%, ${lightness}%, ${0.6 - ringProgress * 0.4})`;
          ctx.lineWidth = 2 + (bass / 255) * 3;
          ctx.stroke();
        }

        // Kaleidoscope triangles
        const numTriangles = 6;
        const triangleAngleStep = (Math.PI * 2) / numTriangles;
        for (let i = 0; i < numTriangles; i++) {
          const angle = triangleAngleStep * i + timeRef.current * 0.5;
          const triangleRadius = 80 + (mid / 255) * 100;
          const hue = (hueOffsetRef.current + i * 60 + timeRef.current * 30) % 360;

          ctx.beginPath();
          for (let j = 0; j < 3; j++) {
            const triAngle = angle + (j * Math.PI * 2) / 3;
            const x = centerX + Math.cos(triAngle) * triangleRadius;
            const y = centerY + Math.sin(triAngle) * triangleRadius;
            if (j === 0) {
              ctx.moveTo(x, y);
            } else {
              ctx.lineTo(x, y);
            }
          }
          ctx.closePath();
          ctx.strokeStyle = `hsla(${hue}, 100%, 50%, ${0.4 + (highMid / 255) * 0.3})`;
          ctx.lineWidth = 1 + (high / 255) * 2;
          ctx.stroke();
        }

        // Pulsing center orb
        const orbRadius = 30 + (bass / 255) * 50;
        const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, orbRadius);
        const orbHue = (hueOffsetRef.current * 2 + timeRef.current * 100) % 360;
        gradient.addColorStop(0, `hsla(${orbHue}, 100%, 70%, 0.9)`);
        gradient.addColorStop(0.5, `hsla(${(orbHue + 60) % 360}, 100%, 50%, 0.5)`);
        gradient.addColorStop(1, `hsla(${(orbHue + 120) % 360}, 100%, 30%, 0)`);
        ctx.beginPath();
        ctx.arc(centerX, centerY, orbRadius, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        // Fractal-like rays emanating from center
        const numRays = 16;
        for (let i = 0; i < numRays; i++) {
          const rayAngle = (i / numRays) * Math.PI * 2 + timeRef.current * 0.3;
          const rayLength = 100 + (lowMid / 255) * 150 + Math.sin(timeRef.current * 2 + i) * 30;
          const rayHue = (hueOffsetRef.current + i * 22.5 + timeRef.current * 20) % 360;

          ctx.beginPath();
          ctx.moveTo(centerX, centerY);
          const endX = centerX + Math.cos(rayAngle) * rayLength;
          const endY = centerY + Math.sin(rayAngle) * rayLength;
          ctx.lineTo(endX, endY);
          ctx.strokeStyle = `hsla(${rayHue}, 100%, 60%, ${0.3 + (high / 255) * 0.4})`;
          ctx.lineWidth = 1 + (bass / 255) * 2;
          ctx.stroke();

          // Ray tip circles
          if (high > 100) {
            ctx.beginPath();
            ctx.arc(endX, endY, 3 + (high / 255) * 5, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${rayHue}, 100%, 70%, 0.7)`;
            ctx.fill();
          }
        }

        // Floating particles
        const numParticles = 20;
        for (let i = 0; i < numParticles; i++) {
          const particleTime = timeRef.current + i * 0.5;
          const particleAngle = (i / numParticles) * Math.PI * 2 + particleTime * 0.2;
          const particleRadius = 100 + Math.sin(particleTime * 1.5) * 80 + (mid / 255) * 50;
          const x = centerX + Math.cos(particleAngle) * particleRadius;
          const y = centerY + Math.sin(particleAngle) * particleRadius;
          const size = 2 + (highMid / 255) * 6 + Math.sin(particleTime * 3) * 2;
          const particleHue = (hueOffsetRef.current + i * 18 + timeRef.current * 40) % 360;

          ctx.beginPath();
          ctx.arc(x, y, Math.max(1, size), 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${particleHue}, 100%, 60%, ${0.5 + (high / 255) * 0.5})`;
          ctx.fill();
        }

        // Morphing blob shapes
        const numBlobs = 4;
        for (let b = 0; b < numBlobs; b++) {
          const blobAngle = (b / numBlobs) * Math.PI * 2 + timeRef.current * 0.1;
          const blobDist = 120 + Math.sin(timeRef.current + b) * 40;
          const blobX = centerX + Math.cos(blobAngle) * blobDist;
          const blobY = centerY + Math.sin(blobAngle) * blobDist;
          const blobSize = 20 + (bass / 255) * 30;
          const blobHue = (hueOffsetRef.current + b * 90 + timeRef.current * 60) % 360;

          ctx.beginPath();
          const blobPoints = 8;
          for (let p = 0; p <= blobPoints; p++) {
            const pointAngle = (p / blobPoints) * Math.PI * 2;
            const wobbleAmount = Math.sin(pointAngle * 3 + timeRef.current * 4 + b) * (lowMid / 255) * 15;
            const px = blobX + Math.cos(pointAngle) * (blobSize + wobbleAmount);
            const py = blobY + Math.sin(pointAngle) * (blobSize + wobbleAmount);
            if (p === 0) {
              ctx.moveTo(px, py);
            } else {
              ctx.lineTo(px, py);
            }
          }
          ctx.closePath();
          ctx.fillStyle = `hsla(${blobHue}, 80%, 50%, 0.3)`;
          ctx.fill();
          ctx.strokeStyle = `hsla(${blobHue}, 100%, 60%, 0.6)`;
          ctx.lineWidth = 2;
          ctx.stroke();
        }

      } else {
        // Idle animation when not playing
        const numIdleRings = 5;
        for (let i = 0; i < numIdleRings; i++) {
          const radius = 50 + i * 30 + Math.sin(timeRef.current + i * 0.5) * 10;
          const hue = (hueOffsetRef.current + i * 72) % 360;
          ctx.beginPath();
          ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
          ctx.strokeStyle = `hsla(${hue}, 70%, 50%, ${0.3 - i * 0.05})`;
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        // Idle center
        const idleGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 40);
        idleGradient.addColorStop(0, `hsla(${hueOffsetRef.current % 360}, 80%, 60%, 0.5)`);
        idleGradient.addColorStop(1, `hsla(${(hueOffsetRef.current + 60) % 360}, 80%, 40%, 0)`);
        ctx.beginPath();
        ctx.arc(centerX, centerY, 40, 0, Math.PI * 2);
        ctx.fillStyle = idleGradient;
        ctx.fill();
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
    <div className="w-full h-64 bg-black rounded-lg overflow-hidden relative">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
      />
      <div className="absolute bottom-2 left-2 text-xs text-white/50">
        LSD Visualizer
      </div>
    </div>
  );
};

export default LSDVisualizer;
