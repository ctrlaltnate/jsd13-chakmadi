import React, { useRef, useEffect } from 'react';

export default function TugCanvas({
  ropePos = 0, // -100 to +100
  teamRedCount = 1,
  teamBlueCount = 1,
  winnerTeam = null,
  cheerParticles = [],
  onPullClick = null,
  playerTeam = null,
  isInteractive = false
}) {
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);
  const targetRopePosRef = useRef(ropePos);
  const currentRopePosRef = useRef(ropePos);
  const clickRipplesRef = useRef([]);

  useEffect(() => {
    targetRopePosRef.current = ropePos;
  }, [ropePos]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let tick = 0;

    const render = () => {
      tick++;

      // Silky-smooth 60fps/120fps frame interpolation (lerp)
      currentRopePosRef.current += (targetRopePosRef.current - currentRopePosRef.current) * 0.22;
      const smoothRope = currentRopePosRef.current;

      const width = canvas.width;
      const height = canvas.height;

      // Clear with dark retro arena background
      ctx.fillStyle = '#111522';
      ctx.fillRect(0, 0, width, height);

      // 1. Draw 8-Bit Bleachers / Crowd Background
      ctx.fillStyle = '#181e30';
      ctx.fillRect(0, 0, width, height * 0.45);

      // Crowd silhouettes (pixel heads bobbing)
      const crowdCols = Math.floor(width / 24);
      for (let i = 0; i < crowdCols; i++) {
        const bob = Math.sin((tick + i * 15) * 0.08) * 3;
        const x = i * 24 + 4;
        const y = height * 0.35 + bob;
        // pixel head
        ctx.fillStyle = i % 2 === 0 ? '#263152' : '#334155';
        ctx.fillRect(x, y, 14, 14);
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(x + 2, y + 4, 3, 3);
        ctx.fillRect(x + 9, y + 4, 3, 3);
      }

      // 2. Arena Floor (Dirt / Wood platform)
      const groundY = height * 0.76;
      ctx.fillStyle = '#451a03';
      ctx.fillRect(0, groundY, width, height - groundY);

      // Floor plank lines
      ctx.fillStyle = '#291002';
      for (let y = groundY; y < height; y += 12) {
        ctx.fillRect(0, y, width, 2);
      }

      // 3. Center Danger Mud Pit / Hazard Zone
      const centerX = width / 2;
      const pitWidth = Math.min(180, width * 0.28);
      const pitLeft = centerX - pitWidth / 2;
      const pitRight = centerX + pitWidth / 2;

      // Mud Pit depression
      ctx.fillStyle = '#1c0a02';
      ctx.fillRect(pitLeft, groundY + 4, pitWidth, height - groundY);

      // Hazard Warning stripes along pit edge
      const stripeW = 8;
      for (let s = pitLeft; s < pitRight; s += stripeW * 2) {
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(s, groundY, stripeW, 4);
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(s + stripeW, groundY, stripeW, 4);
      }

      // Center boundary goal posts / markers
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(pitLeft - 4, groundY - 24, 6, 24);
      ctx.fillRect(pitRight - 2, groundY - 24, 6, 24);

      // Center line flag pole
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(centerX - 2, groundY - 40, 4, 40);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(centerX + 2, groundY - 38, 12, 8);

      // 4. Calculate dynamic rope marker position
      // -100 maps to pitLeft (Red wins), +100 maps to pitRight (Blue wins)
      const maxDisplacement = (width * 0.38);
      const ropeMarkerX = centerX + (smoothRope / 100) * maxDisplacement;
      const ropeY = groundY - 32;

      // 5. Draw 8-Bit Rope
      const leftAnchorX = Math.max(30, centerX - width * 0.44 + (smoothRope / 100) * 40);
      const rightAnchorX = Math.min(width - 30, centerX + width * 0.44 + (smoothRope / 100) * 40);

      // Calculate rope sag based on tension (faster movement or near center = more taut)
      const sag = Math.max(2, 10 - Math.abs(smoothRope) * 0.08 + Math.sin(tick * 0.3) * 1.5);

      ctx.beginPath();
      ctx.moveTo(leftAnchorX, ropeY);
      ctx.quadraticCurveTo(ropeMarkerX, ropeY + sag, rightAnchorX, ropeY);
      ctx.lineWidth = 8;
      ctx.strokeStyle = '#d97706';
      ctx.stroke();

      // Rope texture / weave pattern
      ctx.setLineDash([6, 4]);
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#78350f';
      ctx.stroke();
      ctx.setLineDash([]); // reset

      // 6. Draw Center Red & Yellow Marker Ribbon
      ctx.save();
      ctx.translate(ropeMarkerX, ropeY + sag * 0.5);
      
      // Floating ribbon oscillation
      const ribbonFlutter = Math.sin(tick * 0.25) * 4;

      // Golden ring / knot
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(-6, -6, 12, 12);
      ctx.fillStyle = '#ca8a04';
      ctx.fillRect(-4, -4, 8, 8);

      // Hanging red ribbon
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.moveTo(-5, 4);
      ctx.lineTo(5, 4);
      ctx.lineTo(8 + ribbonFlutter, 30);
      ctx.lineTo(0 + ribbonFlutter, 24);
      ctx.lineTo(-8 + ribbonFlutter, 30);
      ctx.closePath();
      ctx.fill();

      // "FLAG" label
      ctx.font = '8px "Press Start 2P"';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText('▼', 0, -10);

      ctx.restore();

      // 7. Draw Team Red Characters (Left side, pulling left)
      const redCount = Math.min(6, Math.max(1, Math.ceil(teamRedCount / 2)));
      const redBaseX = leftAnchorX;

      for (let i = 0; i < redCount; i++) {
        const charX = redBaseX - (i * 32) - 10;
        const isLosing = winnerTeam === 'blue' || smoothRope > 85;
        const strain = Math.sin((tick + i * 20) * 0.3) * 3;
        drawPixelTugger(ctx, charX, groundY, 'red', strain, isLosing, tick);
      }

      // 8. Draw Team Blue Characters (Right side, pulling right)
      const blueCount = Math.min(6, Math.max(1, Math.ceil(teamBlueCount / 2)));
      const blueBaseX = rightAnchorX;

      for (let i = 0; i < blueCount; i++) {
        const charX = blueBaseX + (i * 32) + 10;
        const isLosing = winnerTeam === 'red' || smoothRope < -85;
        const strain = Math.sin((tick + i * 20 + 10) * 0.3) * 3;
        drawPixelTugger(ctx, charX, groundY, 'blue', strain, isLosing, tick);
      }

      // 9. Floating Spectator Cheer Particles
      if (cheerParticles && cheerParticles.length > 0) {
        cheerParticles.forEach((p) => {
          ctx.font = '20px sans-serif';
          ctx.fillText(p.emote, p.x, p.y);
        });
      }

      // 10. Expanding Click/Tap Ripples & Floating Feedback
      if (clickRipplesRef.current.length > 0) {
        clickRipplesRef.current.forEach((r) => {
          r.radius += 3.2;
          r.opacity -= 0.05;
          ctx.save();
          ctx.beginPath();
          ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
          ctx.strokeStyle = r.team === 'red' ? '#ef4444' : r.team === 'blue' ? '#38bdf8' : '#fbbf24';
          ctx.lineWidth = 3.5;
          ctx.globalAlpha = Math.max(0, r.opacity);
          ctx.stroke();

          // Floating text effect
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 11px "Press Start 2P", monospace';
          ctx.textAlign = 'center';
          ctx.fillText('⚡+1 PULL!', r.x, r.y - r.radius - 4);
          ctx.restore();
        });
        clickRipplesRef.current = clickRipplesRef.current.filter((r) => r.opacity > 0);
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [ropePos, teamRedCount, teamBlueCount, winnerTeam, cheerParticles]);

  // Helper to draw an 8-bit retro gladiator tugging
  function drawPixelTugger(ctx, x, groundY, team, strain, isTumbling, tick) {
    ctx.save();
    ctx.translate(x, groundY);

    if (isTumbling) {
      // Fallen over animation
      ctx.rotate(team === 'red' ? 1.2 : -1.2);
      ctx.fillStyle = team === 'red' ? '#ef4444' : '#3b82f6';
      ctx.fillRect(-12, -20, 24, 16);
      // dizzy eyes
      ctx.fillStyle = '#fff';
      ctx.font = '10px "Press Start 2P"';
      ctx.fillText('X X', -8, -10);
      ctx.restore();
      return;
    }

    const dir = team === 'red' ? 1 : -1;
    // Pulling lean angle (backwards)
    const lean = dir * (strain > 0 ? 0.25 : 0.18);
    ctx.rotate(lean);

    // Dust particles under feet
    if (Math.abs(strain) > 2) {
      ctx.fillStyle = '#d97706';
      ctx.fillRect(dir * 8 + (Math.sin(tick) * 4), -4, 4, 4);
      ctx.fillRect(dir * 14 + (Math.cos(tick) * 4), -2, 3, 3);
    }

    // Legs (wide braced stance)
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-12, -14, 6, 14); // back leg
    ctx.fillRect(6, -14, 6, 14);  // front leg

    // Boots
    ctx.fillStyle = '#000';
    ctx.fillRect(-14, -4, 8, 4);
    ctx.fillRect(4, -4, 8, 4);

    // Body / Armor
    ctx.fillStyle = team === 'red' ? '#dc2626' : '#2563eb';
    ctx.fillRect(-10, -32, 20, 20);

    // Belt / Trim
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(-10, -18, 20, 4);

    // Arms gripping rope
    ctx.fillStyle = '#fbcfe8'; // skin
    ctx.fillRect(dir * -2, -26, 16 * dir, 6);
    // Hands
    ctx.fillStyle = '#f472b6';
    ctx.fillRect(dir * 10, -28, 6 * dir, 8);

    // Head
    ctx.fillStyle = '#fbcfe8';
    ctx.fillRect(-8, -44, 16, 14);

    // Team Headband
    ctx.fillStyle = team === 'red' ? '#ef4444' : '#3b82f6';
    ctx.fillRect(-9, -42, 18, 4);
    // Headband tail fluttering
    const flutter = Math.sin(tick * 0.4) * 3;
    ctx.fillRect(-dir * 9, -42, -dir * 10, 4 + flutter);

    // Determined Face
    ctx.fillStyle = '#000';
    // Gritted teeth
    ctx.fillRect(dir * 2, -34, 4, 2);
    // Eye
    ctx.fillRect(dir * 3, -39, 3, 3);

    // Sweat drop when straining hard
    if (strain > 1.5) {
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(-dir * 8, -48, 3, 4);
    }

    ctx.restore();
  }

  // Handle interactive clicks or taps anywhere on the canvas arena
  const handlePointerDown = (e) => {
    if (!isInteractive || !onPullClick) return;
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const canvas = canvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;

      clickRipplesRef.current.push({
        x,
        y,
        radius: 8,
        opacity: 1.0,
        team: playerTeam
      });
    }
    onPullClick();
  };

  return (
    <div
      onPointerDown={handlePointerDown}
      className={`relative w-full overflow-hidden border-2 sm:border-3 border-[#3b4261] bg-[#0c0e17] pixel-card shrink-0 select-none touch-none ${
        isInteractive ? 'cursor-pointer active:scale-[0.995] transition-transform' : ''
      }`}
    >
      <canvas
        ref={canvasRef}
        width={800}
        height={260}
        className="w-full h-[115px] xs:h-[130px] sm:h-[160px] md:h-[180px] block touch-none"
      />
      {/* Direction Indicators */}
      <div className="absolute top-1.5 left-2 flex items-center gap-1 font-pixel text-[9px] sm:text-xs text-red-400 bg-black/70 px-1.5 py-0.5 border border-red-500/50 pointer-events-none">
        <span>◀ RED</span>
      </div>
      <div className="absolute top-1.5 right-2 flex items-center gap-1 font-pixel text-[9px] sm:text-xs text-blue-400 bg-black/70 px-1.5 py-0.5 border border-blue-500/50 pointer-events-none">
        <span>BLUE ▶</span>
      </div>

      {/* Arena Click Hint Badge */}
      {isInteractive && (
        <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 bg-black/80 px-2 py-0.5 border border-yellow-500/60 font-ui text-[10px] sm:text-xs text-yellow-300 font-bold pointer-events-none animate-pulse">
          👆 แตะหรือคลิกที่สนามเพื่อดึงได้เช่นกัน!
        </div>
      )}
    </div>
  );
}
