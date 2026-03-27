import { useEffect, useRef } from "react";

export function useAROverlay(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  clueIndex: number,
  isActive: boolean,
) {
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef(performance.now());

  useEffect(() => {
    if (!isActive) return;

    // Seeded position — never changes for a given clue
    const xPct = 20 + ((clueIndex * 137) % 60);
    const yPct = 30 + ((clueIndex * 97) % 40);

    startTimeRef.current = performance.now();

    function draw() {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Sync canvas size to element size once
      if (
        canvas.width !== canvas.offsetWidth ||
        canvas.height !== canvas.offsetHeight
      ) {
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
      }

      const w = canvas.width;
      const h = canvas.height;
      if (w === 0 || h === 0) {
        rafRef.current = requestAnimationFrame(draw);
        return;
      }

      ctx.clearRect(0, 0, w, h);

      const x = (xPct / 100) * w;
      const y = (yPct / 100) * h;
      const t = (performance.now() - startTimeRef.current) / 1000;
      const pulse = 0.5 + 0.5 * Math.sin(t * 3); // 0..1 oscillation

      // Shadow ellipse beneath ("on the floor")
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(x, y + 32, 28, 10, 0, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(0,0,0,${0.2 + pulse * 0.1})`;
      ctx.fill();
      ctx.restore();

      // Outer glow ring
      const outerR = 28 + pulse * 6;
      const glowGrad = ctx.createRadialGradient(
        x,
        y,
        outerR * 0.4,
        x,
        y,
        outerR,
      );
      glowGrad.addColorStop(0, `rgba(255,200,60,${0.15 + pulse * 0.15})`);
      glowGrad.addColorStop(1, "rgba(255,200,60,0)");
      ctx.beginPath();
      ctx.arc(x, y, outerR, 0, Math.PI * 2);
      ctx.fillStyle = glowGrad;
      ctx.fill();

      // Target reticle rings
      [20, 14].forEach((r, i) => {
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.strokeStyle =
          i === 0
            ? `rgba(255,200,60,${0.7 + pulse * 0.3})`
            : `rgba(255,255,255,${0.85 + pulse * 0.15})`;
        ctx.lineWidth = i === 0 ? 2 : 1.5;
        ctx.stroke();
      });

      // Center dot
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,200,60,${0.9 + pulse * 0.1})`;
      ctx.fill();

      // Crosshair lines
      ctx.save();
      ctx.strokeStyle = `rgba(255,255,255,${0.6 + pulse * 0.3})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x - 22, y);
      ctx.lineTo(x - 10, y);
      ctx.moveTo(x + 10, y);
      ctx.lineTo(x + 22, y);
      ctx.moveTo(x, y - 22);
      ctx.lineTo(x, y - 10);
      ctx.moveTo(x, y + 10);
      ctx.lineTo(x, y + 22);
      ctx.stroke();
      ctx.restore();

      // "?" bubble
      const bx = x + 18;
      const by = y - 26;
      const br = 12;
      ctx.beginPath();
      ctx.arc(bx, by, br, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,200,60,${0.88 + pulse * 0.12})`;
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.9)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Bubble tail
      ctx.beginPath();
      ctx.moveTo(bx - 4, by + br - 2);
      ctx.lineTo(bx - 10, by + br + 5);
      ctx.lineTo(bx + 2, by + br - 4);
      ctx.fillStyle = `rgba(255,200,60,${0.88 + pulse * 0.12})`;
      ctx.fill();

      ctx.font = "bold 13px sans-serif";
      ctx.fillStyle = "rgba(60,30,0,0.9)";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("?", bx, by);

      rafRef.current = requestAnimationFrame(draw);
    }

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      // Clear canvas on cleanup
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        ctx?.clearRect(0, 0, canvas.width, canvas.height);
      }
    };
  }, [canvasRef, clueIndex, isActive]);
}
