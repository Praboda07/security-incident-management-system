
import React, { useEffect, useRef } from "react";
import "./DigitalGlobe.css";

function DigitalGlobe() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrame;
    let width = 0;
    let height = 0;
    let rotation = 0;
    let particles = [];

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    function resizeCanvas() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      width = window.innerWidth;
      height = window.innerHeight;

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const count = Math.min(
        1800,
        Math.max(650, Math.floor((width * height) / 650))
      );

      particles = [];

      // Generate points on a spherical surface.
      for (let i = 0; i < count; i++) {
        const y = 1 - (2 * (i + 0.5)) / count;
        const ringRadius = Math.sqrt(1 - y * y);
        const angle = i * Math.PI * (3 - Math.sqrt(5));

        particles.push({
          x: Math.cos(angle) * ringRadius,
          y,
          z: Math.sin(angle) * ringRadius,
          flicker: Math.random() * Math.PI * 2,
          size: 0.35 + Math.random() * 1.15,
        });
      }
    }

    function drawGlobe() {
      ctx.clearRect(0, 0, width, height);

      // Dark background.
      ctx.fillStyle = "#080b10";
      ctx.fillRect(0, 0, width, height);

      // Subtle blue glow behind the globe.
      const glowX = width * 0.5;
      const glowY = height * 0.48;
      const glowRadius = Math.min(width, height) * 0.65;

      const glow = ctx.createRadialGradient(
        glowX,
        glowY,
        0,
        glowX,
        glowY,
        glowRadius
      );

      glow.addColorStop(0, "rgba(20, 48, 75, 0.20)");
      glow.addColorStop(0.55, "rgba(12, 28, 48, 0.10)");
      glow.addColorStop(1, "rgba(0, 0, 0, 0)");

      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, width, height);

      const radius = Math.min(width * 0.43, height * 0.56);
      const centerX = width * 0.5;
      const centerY = height * 0.48;
      const cosR = Math.cos(rotation);
      const sinR = Math.sin(rotation);

      const projected = particles.map((particle) => {
        const x = particle.x * cosR - particle.z * sinR;
        const z = particle.x * sinR + particle.z * cosR;

        const perspective = 2.7 / (2.7 - z * 0.35);

        return {
          x: centerX + x * radius * perspective,
          y: centerY + particle.y * radius * perspective,
          z,
          size: particle.size * perspective,
          flicker: particle.flicker,
        };
      });

      // Faint curved latitude and longitude lines.
      ctx.save();
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(100, 150, 190, 0.11)";
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.beginPath();
      ctx.ellipse(
        centerX,
        centerY,
        radius,
        radius * 0.34,
        0,
        0,
        Math.PI * 2
      );
      ctx.strokeStyle = "rgba(110, 160, 200, 0.09)";
      ctx.stroke();

      ctx.beginPath();
      ctx.ellipse(
        centerX,
        centerY,
        radius * 0.52,
        radius,
        0,
        0,
        Math.PI * 2
      );
      ctx.strokeStyle = "rgba(110, 160, 200, 0.08)";
      ctx.stroke();
      ctx.restore();

      // Draw the moving digital particles.
      for (const point of projected) {
        const depth = (point.z + 1) / 2;
        const shimmer =
          0.55 + 0.45 * Math.sin(point.flicker + rotation * 2);

        const alpha = (0.12 + depth * 0.58) * shimmer;

        ctx.beginPath();
        ctx.arc(
          point.x,
          point.y,
          Math.max(0.3, point.size),
          0,
          Math.PI * 2
        );

        ctx.fillStyle = `rgba(142, 185, 219, ${alpha})`;
        ctx.fill();

        if (depth > 0.83 && shimmer > 0.9) {
          ctx.beginPath();
          ctx.arc(
            point.x,
            point.y,
            point.size * 2.8,
            0,
            Math.PI * 2
          );

          ctx.fillStyle = `rgba(110, 180, 230, ${alpha * 0.12})`;
          ctx.fill();
        }
      }

      // Dark vignette for a cinematic appearance.
      const vignette = ctx.createRadialGradient(
        centerX,
        centerY,
        radius * 0.4,
        centerX,
        centerY,
        Math.max(width, height) * 0.72
      );

      vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
      vignette.addColorStop(1, "rgba(0, 0, 0, 0.68)");

      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, width, height);

      if (!reducedMotion) {
        rotation += 0.0018;
        animationFrame = window.requestAnimationFrame(drawGlobe);
      }
    }

    resizeCanvas();
    drawGlobe();

    window.addEventListener("resize", resizeCanvas);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", resizeCanvas);
    };
  }, []);

  return (
    <div className="digital-globe-background" aria-hidden="true">
      <canvas ref={canvasRef} />
      <div className="digital-globe-scanlines" />
    </div>
  );
}

export default DigitalGlobe;
