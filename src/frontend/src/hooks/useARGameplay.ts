import { useCallback, useEffect, useRef, useState } from "react";

const CLUE_DIRECTIONS = [
  { azimuth: 0, elevation: 20 },
  { azimuth: 90, elevation: 35 },
  { azimuth: 180, elevation: -15 },
  { azimuth: 270, elevation: 5 },
  { azimuth: 45, elevation: 30 },
  { azimuth: 135, elevation: -20 },
  { azimuth: 225, elevation: 15 },
  { azimuth: 315, elevation: 40 },
  { azimuth: 60, elevation: -10 },
  { azimuth: 240, elevation: 25 },
];

const H_FOV = 60;
const V_FOV = 40;

export function useARGameplay(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  clueIndex: number,
  isActive: boolean,
  onFound: () => void,
): { orientationGranted: boolean | null } {
  const [orientationGranted, setOrientationGranted] = useState<boolean | null>(
    null,
  );

  const roomNorthRef = useRef<number | null>(null);
  const azimuthRef = useRef(0);
  const elevationRef = useRef(0);
  const foundRef = useRef(false);
  const foundTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef(performance.now());
  const onFoundRef = useRef(onFound);
  onFoundRef.current = onFound;

  // Reset found flag when clue changes
  // biome-ignore lint/correctness/useExhaustiveDependencies: clueIndex triggers reset of mutable refs
  useEffect(() => {
    foundRef.current = false;
    if (foundTimerRef.current) {
      clearTimeout(foundTimerRef.current);
      foundTimerRef.current = null;
    }
  }, [clueIndex]);

  const handleOrientation = useCallback((e: DeviceOrientationEvent) => {
    const alpha = e.alpha;
    const beta = e.beta;
    if (alpha === null || beta === null) return;

    if (roomNorthRef.current === null) {
      roomNorthRef.current = alpha;
    }

    azimuthRef.current = (alpha - roomNorthRef.current + 360) % 360;
    elevationRef.current = 90 - beta; // 0 when pointing forward, positive = up
  }, []);

  // Request orientation permission (iOS) and start listening
  useEffect(() => {
    if (!isActive) return;

    const startListening = () => {
      window.addEventListener("deviceorientation", handleOrientation, true);
      setOrientationGranted(true);
    };

    // Check if DeviceOrientationEvent exists at all
    if (typeof window.DeviceOrientationEvent === "undefined") {
      setOrientationGranted(false);
      return;
    }

    // iOS 13+ requires explicit permission
    const DOE =
      window.DeviceOrientationEvent as typeof DeviceOrientationEvent & {
        requestPermission?: () => Promise<"granted" | "denied">;
      };

    if (typeof DOE.requestPermission === "function") {
      DOE.requestPermission()
        .then((result) => {
          if (result === "granted") {
            startListening();
          } else {
            setOrientationGranted(false);
          }
        })
        .catch(() => setOrientationGranted(false));
    } else {
      // Non-iOS — just start listening; check if we actually get events
      startListening();
      // If no event fires in 2s, mark as unavailable
      const checkTimer = setTimeout(() => {
        if (roomNorthRef.current === null) {
          setOrientationGranted(false);
        }
      }, 2000);
      return () => {
        clearTimeout(checkTimer);
        window.removeEventListener(
          "deviceorientation",
          handleOrientation,
          true,
        );
      };
    }

    return () => {
      window.removeEventListener("deviceorientation", handleOrientation, true);
    };
  }, [isActive, handleOrientation]);

  // Drawing loop
  useEffect(() => {
    if (!isActive || orientationGranted !== true) return;

    startTimeRef.current = performance.now();

    function draw() {
      const canvas = canvasRef.current;
      if (!canvas) {
        rafRef.current = requestAnimationFrame(draw);
        return;
      }

      // Sync canvas size each frame
      if (
        canvas.width !== canvas.offsetWidth ||
        canvas.height !== canvas.offsetHeight
      ) {
        canvas.width = canvas.offsetWidth || 1;
        canvas.height = canvas.offsetHeight || 1;
      }

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        rafRef.current = requestAnimationFrame(draw);
        return;
      }

      const w = canvas.width;
      const h = canvas.height;
      if (w <= 1 || h <= 1) {
        rafRef.current = requestAnimationFrame(draw);
        return;
      }

      ctx.clearRect(0, 0, w, h);

      const t = (performance.now() - startTimeRef.current) / 1000;
      const pulse = Math.sin(t * 3); // -1..1

      const target = CLUE_DIRECTIONS[clueIndex % CLUE_DIRECTIONS.length];
      const relAz = azimuthRef.current;
      const relEl = elevationRef.current;

      // Angular deltas
      const dAz = ((target.azimuth - relAz + 180 + 360) % 360) - 180;
      const dEl = target.elevation - relEl;
      const angDist = Math.sqrt(dAz * dAz + dEl * dEl);

      // Detection
      if (angDist < 20 && !foundRef.current) {
        foundRef.current = true;
        foundTimerRef.current = setTimeout(() => {
          onFoundRef.current();
        }, 300);
      }

      // Screen mapping
      const screenX = w / 2 + (dAz / H_FOV) * w;
      const screenY = h / 2 - (dEl / V_FOV) * h;

      const inViewX = Math.abs(dAz) < H_FOV * 1.5;
      const inViewY = Math.abs(dEl) < V_FOV * 1.5;

      if (inViewX && inViewY) {
        // Draw glowing treasure marker
        drawTreasureMarker(ctx, screenX, screenY, pulse, w, h);
      } else {
        // Draw directional arrow
        drawDirectionalArrow(ctx, dAz, dEl, angDist, w, h);
      }

      rafRef.current = requestAnimationFrame(draw);
    }

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        ctx?.clearRect(0, 0, canvas.width, canvas.height);
      }
    };
  }, [isActive, orientationGranted, canvasRef, clueIndex]);

  return { orientationGranted };
}

function drawTreasureMarker(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  pulse: number,
  _w: number,
  _h: number,
) {
  const outerR = 42 + pulse * 8;
  const innerR = 24 + pulse * 3;

  // Outer glow
  const glow = ctx.createRadialGradient(x, y, innerR * 0.3, x, y, outerR);
  glow.addColorStop(0, `rgba(255,200,60,${0.35 + pulse * 0.15})`);
  glow.addColorStop(0.6, `rgba(255,160,0,${0.18 + pulse * 0.1})`);
  glow.addColorStop(1, "rgba(255,120,0,0)");
  ctx.beginPath();
  ctx.arc(x, y, outerR, 0, Math.PI * 2);
  ctx.fillStyle = glow;
  ctx.fill();

  // Pulsing ring
  ctx.beginPath();
  ctx.arc(x, y, innerR + 4, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(255,220,80,${0.8 + pulse * 0.2})`;
  ctx.lineWidth = 3;
  ctx.stroke();

  // Inner gold circle
  const grad = ctx.createRadialGradient(
    x - innerR * 0.25,
    y - innerR * 0.25,
    innerR * 0.1,
    x,
    y,
    innerR,
  );
  grad.addColorStop(0, "rgba(255,240,120,1)");
  grad.addColorStop(0.6, "rgba(255,180,30,1)");
  grad.addColorStop(1, "rgba(200,100,0,1)");
  ctx.beginPath();
  ctx.arc(x, y, innerR, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();

  // Border
  ctx.beginPath();
  ctx.arc(x, y, innerR, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(255,255,255,0.9)";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Star emoji
  ctx.font = `bold ${innerR * 1.2}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("⭐", x, y);

  // "TREASURE" label
  ctx.font = "bold 13px sans-serif";
  ctx.fillStyle = "rgba(255,240,100,0.95)";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.shadowColor = "rgba(0,0,0,0.8)";
  ctx.shadowBlur = 6;
  ctx.fillText("TREASURE", x, y + innerR + 8);
  ctx.shadowBlur = 0;
}

function drawDirectionalArrow(
  ctx: CanvasRenderingContext2D,
  dAz: number,
  dEl: number,
  angDist: number,
  w: number,
  h: number,
) {
  // Angle in screen coords: dAz positive = right, dEl positive = up
  const angle = Math.atan2(-dEl, dAz); // screen y is flipped

  const margin = 60;
  const radius = Math.min(w, h) / 2 - margin;
  const cx = w / 2 + Math.cos(angle) * radius;
  const cy = h / 2 + Math.sin(angle) * radius;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);

  // Arrow body
  const arrowSize = 28;
  ctx.beginPath();
  ctx.moveTo(arrowSize, 0);
  ctx.lineTo(-arrowSize * 0.5, -arrowSize * 0.55);
  ctx.lineTo(-arrowSize * 0.2, 0);
  ctx.lineTo(-arrowSize * 0.5, arrowSize * 0.55);
  ctx.closePath();

  // Gradient fill
  const arrowGrad = ctx.createLinearGradient(-arrowSize, 0, arrowSize, 0);
  arrowGrad.addColorStop(0, "rgba(255,120,0,0.9)");
  arrowGrad.addColorStop(1, "rgba(255,220,0,0.95)");
  ctx.fillStyle = arrowGrad;
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.9)";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.restore();

  // Distance label
  const labelX = cx;
  const labelY = cy + (cy > h / 2 ? -45 : 35);
  ctx.font = "bold 15px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(0,0,0,0.9)";
  ctx.shadowBlur = 6;
  ctx.fillStyle = "rgba(255,230,80,1)";
  ctx.fillText(`${Math.round(angDist)}°`, labelX, labelY);
  ctx.shadowBlur = 0;

  // "Turn" hint
  ctx.font = "bold 12px sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.8)";
  ctx.fillText("turn →", labelX, labelY + 18);
}
