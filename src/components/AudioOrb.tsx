import React, { useEffect, useRef } from 'react';
import { VoiceAnimationStyle } from '../types';
import { voiceEngine } from '../services/voice';

export type OrbVisualState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'connecting';

interface AudioOrbProps {
  state: OrbVisualState;
  style?: VoiceAnimationStyle;
  size?: number;
  className?: string;
  onClick?: () => void;
}

export const AudioOrb: React.FC<AudioOrbProps> = ({
  state,
  style = 'jarvis',
  size = 280,
  className = '',
  onClick,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const phaseRef = useRef<number>(0);
  const smoothedEnergyRef = useRef<number>(0.05);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.scale(dpr, dpr);

    const render = () => {
      ctx.clearRect(0, 0, size, size);

      const centerX = size / 2;
      const centerY = size / 2;

      // Extract real audio levels from VoiceEngine
      let targetEnergy = 0.05;
      let freqArray: Uint8Array = new Uint8Array(64);

      if (state === 'speaking') {
        const vol = voiceEngine.getPlaybackVolume();
        const freqData = voiceEngine.getPlaybackFrequencyData();
        freqArray = freqData.slice(0, 64);
        targetEnergy = Math.max(0.15, vol * 1.6);
      } else if (state === 'listening') {
        const vol = voiceEngine.getMicVolume();
        const micData = voiceEngine.getMicFrequencyData();
        freqArray = micData.slice(0, 64);
        targetEnergy = Math.max(0.08, vol * 1.8);
      } else if (state === 'thinking') {
        targetEnergy = 0.35 + Math.sin(phaseRef.current * 3.5) * 0.15;
      } else if (state === 'connecting') {
        targetEnergy = 0.2 + Math.sin(phaseRef.current * 2) * 0.1;
      } else {
        // Idle gentle breathing
        targetEnergy = 0.06 + Math.sin(phaseRef.current * 0.8) * 0.03;
      }

      // Smooth energy with damping for organic fluid motion
      smoothedEnergyRef.current += (targetEnergy - smoothedEnergyRef.current) * 0.18;
      const energy = smoothedEnergyRef.current;

      const speed =
        state === 'thinking'
          ? 0.06
          : state === 'speaking'
          ? 0.045
          : state === 'connecting'
          ? 0.04
          : 0.02;
      phaseRef.current += speed;
      const phase = phaseRef.current;

      // ==========================================
      // STYLE 1: JARVIS CORE
      // ==========================================
      if (style === 'jarvis') {
        const outerRadius = size * 0.44;
        const midRadius = size * 0.36;
        const innerRadius = size * 0.24;

        // Ambient radial glow
        const glowGrad = ctx.createRadialGradient(
          centerX,
          centerY,
          innerRadius * 0.8,
          centerX,
          centerY,
          outerRadius * (1 + energy * 0.25),
        );
        glowGrad.addColorStop(0, 'rgba(214, 177, 94, 0.08)');
        glowGrad.addColorStop(0.7, 'rgba(214, 177, 94, 0.14)');
        glowGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(centerX, centerY, outerRadius * (1 + energy * 0.25), 0, Math.PI * 2);
        ctx.fill();

        // Counter-rotating outer technical notched ring
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(-phase * 0.6);
        ctx.beginPath();
        ctx.arc(0, 0, outerRadius * (1 + energy * 0.08), 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(214, 177, 94, ${0.25 + energy * 0.4})`;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 12, 1, 12]);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();

        // Mid orbital gold ring with rotation
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(phase * 0.8);
        ctx.beginPath();
        ctx.arc(0, 0, midRadius * (1 + energy * 0.1), 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(240, 213, 138, ${0.45 + energy * 0.35})`;
        ctx.lineWidth = 2;
        ctx.setLineDash([18, 8, 4, 8]);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();

        // Thinking scanning arc
        if (state === 'thinking' || state === 'connecting') {
          ctx.save();
          ctx.translate(centerX, centerY);
          ctx.rotate(phase * 3);
          ctx.beginPath();
          ctx.arc(0, 0, midRadius * 1.05, 0, Math.PI * 0.75);
          ctx.strokeStyle = '#D6B15E';
          ctx.lineWidth = 3;
          ctx.shadowColor = '#D6B15E';
          ctx.shadowBlur = 12;
          ctx.stroke();
          ctx.restore();
        }

        // Precision tick marks around inner core
        const tickCount = 24;
        for (let i = 0; i < tickCount; i++) {
          const angle = (i * Math.PI * 2) / tickCount + phase * 0.2;
          const tickLen = i % 4 === 0 ? 6 : 3;
          const r1 = innerRadius + 6;
          const r2 = r1 + tickLen;
          ctx.beginPath();
          ctx.moveTo(centerX + Math.cos(angle) * r1, centerY + Math.sin(angle) * r1);
          ctx.lineTo(centerX + Math.cos(angle) * r2, centerY + Math.sin(angle) * r2);
          ctx.strokeStyle = 'rgba(214, 177, 94, 0.4)';
          ctx.lineWidth = 1.2;
          ctx.stroke();
        }

        // Inner Charcoal Core
        const coreGrad = ctx.createRadialGradient(
          centerX,
          centerY,
          0,
          centerX,
          centerY,
          innerRadius,
        );
        coreGrad.addColorStop(0, '#151515');
        coreGrad.addColorStop(0.85, '#0a0a0a');
        coreGrad.addColorStop(1, '#1b1b1b');

        ctx.beginPath();
        ctx.arc(centerX, centerY, innerRadius, 0, Math.PI * 2);
        ctx.fillStyle = coreGrad;
        ctx.fill();

        ctx.strokeStyle = `rgba(214, 177, 94, ${0.7 + energy * 0.3})`;
        ctx.lineWidth = 2;
        ctx.shadowColor = '#D6B15E';
        ctx.shadowBlur = 8 + energy * 12;
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Central responsive waveform bars
        const barCount = 7;
        const barWidth = 3.5;
        const maxBarHeight = innerRadius * 1.1;
        const spacing = 6;
        const totalW = barCount * barWidth + (barCount - 1) * spacing;
        const startX = centerX - totalW / 2;

        for (let i = 0; i < barCount; i++) {
          const distFromCenter = Math.abs(i - (barCount - 1) / 2);
          const heightMult = 1 - (distFromCenter / (barCount / 2)) * 0.5;
          const sample = freqArray[i * 4] || 40;
          const dynamicVal = state === 'idle'
            ? 0.2 + Math.sin(phase * 1.5 + i * 0.7) * 0.1
            : (sample / 255) * 1.4;

          const barHeight = Math.max(7, maxBarHeight * heightMult * Math.min(1.25, dynamicVal + 0.15));
          const x = startX + i * (barWidth + spacing);
          const y = centerY - barHeight / 2;

          const barGrad = ctx.createLinearGradient(x, y, x, y + barHeight);
          barGrad.addColorStop(0, '#F0D58A');
          barGrad.addColorStop(0.5, '#D6B15E');
          barGrad.addColorStop(1, '#9C7B33');

          ctx.fillStyle = barGrad;
          ctx.beginPath();
          ctx.roundRect(x, y, barWidth, barHeight, barWidth / 2);
          ctx.fill();
        }
      }

      // ==========================================
      // STYLE 2: AURORA WAVES
      // ==========================================
      else if (style === 'aurora') {
        const baseRadius = size * 0.32;

        // Ambient fluid aura
        const auraGrad = ctx.createRadialGradient(
          centerX,
          centerY,
          baseRadius * 0.5,
          centerX,
          centerY,
          size * 0.46,
        );
        auraGrad.addColorStop(0, 'rgba(240, 213, 138, 0.08)');
        auraGrad.addColorStop(0.5, 'rgba(214, 177, 94, 0.12)');
        auraGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = auraGrad;
        ctx.beginPath();
        ctx.arc(centerX, centerY, size * 0.46, 0, Math.PI * 2);
        ctx.fill();

        // 4 Multi-layered sinusoidal fluid ribbon waves
        const waveCount = 4;
        for (let w = 0; w < waveCount; w++) {
          ctx.beginPath();
          const wavePhase = phase * (1.2 + w * 0.2) + (w * Math.PI) / 2;
          const waveAmp = (12 + energy * 28) * (1 - w * 0.15);
          const points = 72;

          for (let p = 0; p <= points; p++) {
            const angle = (p / points) * Math.PI * 2;
            const freqIndex = Math.floor((p / points) * 32);
            const freqMod = (freqArray[freqIndex] || 30) / 255;
            const harmonic = Math.sin(angle * (3 + w) + wavePhase) * waveAmp * (0.8 + freqMod * 0.6);
            const r = baseRadius * (0.85 + w * 0.12) + harmonic;

            const px = centerX + Math.cos(angle) * r;
            const py = centerY + Math.sin(angle) * r;

            if (p === 0) {
              ctx.moveTo(px, py);
            } else {
              ctx.lineTo(px, py);
            }
          }
          ctx.closePath();

          // Elegant metallic gold gradients
          const alpha = 0.35 + (1 - w * 0.18) * (0.2 + energy * 0.4);
          ctx.strokeStyle = w % 2 === 0
            ? `rgba(240, 213, 138, ${alpha})`
            : `rgba(214, 177, 94, ${alpha})`;
          ctx.lineWidth = 2.2 - w * 0.3;
          ctx.stroke();
        }

        // Central luminous champagne orb
        const orbGrad = ctx.createRadialGradient(
          centerX,
          centerY,
          0,
          centerX,
          centerY,
          baseRadius * 0.65,
        );
        orbGrad.addColorStop(0, '#1c1b18');
        orbGrad.addColorStop(0.7, '#121210');
        orbGrad.addColorStop(1, '#080808');

        ctx.beginPath();
        ctx.arc(centerX, centerY, baseRadius * 0.65, 0, Math.PI * 2);
        ctx.fillStyle = orbGrad;
        ctx.fill();

        ctx.strokeStyle = `rgba(214, 177, 94, ${0.65 + energy * 0.35})`;
        ctx.lineWidth = 2.5;
        ctx.shadowColor = '#D6B15E';
        ctx.shadowBlur = 10 + energy * 15;
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Subtle center particle breathing
        ctx.beginPath();
        ctx.arc(centerX, centerY, 6 + energy * 8, 0, Math.PI * 2);
        ctx.fillStyle = '#F0D58A';
        ctx.shadowColor = '#F0D58A';
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // ==========================================
      // STYLE 3: PULSE SPECTRUM
      // ==========================================
      else {
        const innerRadius = size * 0.28;
        const maxBarLength = size * 0.17;
        const totalBars = 36;

        // Soft center backdrop
        const specGlow = ctx.createRadialGradient(
          centerX,
          centerY,
          innerRadius * 0.7,
          centerX,
          centerY,
          innerRadius + maxBarLength * 1.1,
        );
        specGlow.addColorStop(0, 'rgba(214, 177, 94, 0.05)');
        specGlow.addColorStop(0.7, 'rgba(214, 177, 94, 0.12)');
        specGlow.addColorStop(1, 'transparent');
        ctx.fillStyle = specGlow;
        ctx.beginPath();
        ctx.arc(centerX, centerY, innerRadius + maxBarLength * 1.1, 0, Math.PI * 2);
        ctx.fill();

        // 360-degree radial spectrum bars
        for (let i = 0; i < totalBars; i++) {
          const angle = (i * Math.PI * 2) / totalBars + phase * 0.15;
          const freqIndex = Math.floor((i / totalBars) * 32);
          const sample = freqArray[freqIndex] || 35;

          let val = 0.2;
          if (state === 'speaking') {
            val = (sample / 255) * 1.35;
          } else if (state === 'listening') {
            val = (sample / 255) * 1.5;
          } else if (state === 'thinking') {
            val = 0.3 + Math.sin(phase * 4 + i * 0.5) * 0.25;
          } else {
            val = 0.15 + Math.sin(phase * 1.2 + i * 0.35) * 0.08;
          }

          const barLen = Math.max(4, maxBarLength * Math.min(1.2, val + 0.1));
          const rStart = innerRadius;
          const rEnd = rStart + barLen;

          const x1 = centerX + Math.cos(angle) * rStart;
          const y1 = centerY + Math.sin(angle) * rStart;
          const x2 = centerX + Math.cos(angle) * rEnd;
          const y2 = centerY + Math.sin(angle) * rEnd;

          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);

          // User listening (champagne) vs JOSA speaking (metallic gold)
          const color = state === 'listening'
            ? `rgba(240, 213, 138, ${0.5 + val * 0.5})`
            : `rgba(214, 177, 94, ${0.5 + val * 0.5})`;

          ctx.strokeStyle = color;
          ctx.lineWidth = 3;
          ctx.lineCap = 'round';
          ctx.stroke();
        }

        // Inner Core Ring & Disc
        const centerGrad = ctx.createRadialGradient(
          centerX,
          centerY,
          0,
          centerX,
          centerY,
          innerRadius,
        );
        centerGrad.addColorStop(0, '#151515');
        centerGrad.addColorStop(0.85, '#0a0a0a');
        centerGrad.addColorStop(1, '#181818');

        ctx.beginPath();
        ctx.arc(centerX, centerY, innerRadius - 2, 0, Math.PI * 2);
        ctx.fillStyle = centerGrad;
        ctx.fill();

        ctx.strokeStyle = 'rgba(214, 177, 94, 0.8)';
        ctx.lineWidth = 2.5;
        ctx.shadowColor = '#D6B15E';
        ctx.shadowBlur = 10 + energy * 12;
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Concentric acoustic rings in center
        ctx.beginPath();
        ctx.arc(centerX, centerY, innerRadius * 0.55 * (1 + energy * 0.1), 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(240, 213, 138, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(centerX, centerY, 5 + energy * 6, 0, Math.PI * 2);
        ctx.fillStyle = '#D6B15E';
        ctx.fill();
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [state, style, size]);

  return (
    <div
      onClick={onClick}
      className={`relative flex items-center justify-center select-none transition-transform hover:scale-[1.02] active:scale-[0.98] ${className}`}
      style={{ width: size, height: size }}
    >
      <canvas ref={canvasRef} className="block pointer-events-none" />

      {state !== 'idle' && (
        <div
          className={`absolute rounded-full pointer-events-none transition-all duration-700 ${
            state === 'speaking'
              ? 'animate-ping bg-[#D6B15E]/10'
              : state === 'listening'
              ? 'animate-pulse bg-[#F0D58A]/15'
              : 'animate-pulse bg-[#D6B15E]/10'
          }`}
          style={{ width: size * 0.86, height: size * 0.86 }}
        />
      )}
    </div>
  );
};
