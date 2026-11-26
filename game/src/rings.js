// Sky Ridge Run — the target rings. A line of glowing rings down the
// valley; fly through one for points and fuel, and the last ring opens
// the final approach to the runway.
import { CONFIG } from './config.js';
import { mulberry32 } from './random.js';

export class Rings {
  constructor(seed, terrain) {
    this.terrain = terrain;
    this.list = [];
    const rand = mulberry32(seed + 131);
    let z = CONFIG.ringSpacing;
    for (let i = 0; i < CONFIG.ringCount; i++) {
      const cx = terrain.valleyCenter(z);
      const x = cx + (rand() - 0.5) * 1500;
      const floor = terrain.valleyFloor(z);
      const y = floor + 220 + rand() * 620;
      this.list.push({ index: i, x, y, z, passed: false, pulse: rand() * Math.PI * 2 });
      z += CONFIG.ringSpacing;
    }
    this.nextIndex = 0;
    this.passedCount = 0;
  }

  next() {
    return this.list[this.nextIndex] ?? null;
  }

  // True while the plane is crossing a ring's plane this step.
  checkCrossing(plane, prevZ) {
    const ring = this.next();
    if (!ring) return null;
    if (prevZ < ring.z && plane.z >= ring.z) {
      const dx = plane.x - ring.x;
      const dy = plane.y - ring.y;
      const dist = Math.hypot(dx, dy);
      const hit = dist < CONFIG.ringRadius;
      ring.passed = hit;
      this.nextIndex++;
      if (hit) this.passedCount++;
      return { ring, hit, dist };
    }
    return null;
  }

  draw(ctx, view, cam, time) {
    // Far rings first so near ones overlap them.
    const ordered = [...this.list].sort((a, b) => b.z - a.z);
    for (const ring of ordered) {
      if (ring.z < cam.z + 40 || ring.z > cam.z + CONFIG.viewDistance) continue;
      const p = this.terrain.project(ring.x, ring.y, ring.z, cam, view);
      if (!p) continue;
      const r = CONFIG.ringRadius * p.scale;
      if (r < 3) continue;
      const isNext = ring === this.next();
      const pulse = 0.75 + 0.25 * Math.sin(time * 3 + ring.pulse);
      ctx.save();
      ctx.globalAlpha = ring.passed ? 0.25 : 1;
      ctx.strokeStyle = isNext ? `rgba(255, 214, 90, ${pulse})` : 'rgba(120, 220, 255, 0.75)';
      ctx.lineWidth = Math.max(2, r * 0.1);
      ctx.shadowColor = isNext ? '#ffcf3f' : '#59c8ff';
      ctx.shadowBlur = 18 * pulse;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
      ctx.lineWidth = Math.max(1, r * 0.025);
      ctx.beginPath();
      ctx.arc(p.x, p.y, r * 0.82, 0, Math.PI * 2);
      ctx.stroke();
      // Direction chevrons above the next ring.
      if (isNext) {
        ctx.fillStyle = `rgba(255, 214, 90, ${pulse})`;
        ctx.font = `bold ${Math.max(12, r * 0.34)}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('RING ' + (ring.index + 1), p.x, p.y - r - 12);
      }
      ctx.restore();
    }
  }
}
