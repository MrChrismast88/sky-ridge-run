// Sky Ridge Run — the valley. A winding mountain valley with a river, a
// runway at its head and snow-capped ridges on both sides. The terrain
// height function drives both the picture and the crash checks.
import { CONFIG } from './config.js';
import { makeFbm1D, mulberry32 } from './random.js';

export class Terrain {
  constructor(seed) {
    this.seed = seed;
    this.centerNoise = makeFbm1D(seed + 11, 3);
    this.floorNoise = makeFbm1D(seed + 23, 4);
    this.ridgeNoise = makeFbm1D(seed + 47, 3);
    this.cloudRand = mulberry32(seed + 77);
    this.clouds = [];
    for (let i = 0; i < 26; i++) {
      this.clouds.push({
        x: (this.cloudRand() - 0.5) * 9000,
        y: 1500 + this.cloudRand() * 2200,
        z: this.cloudRand() * 9000,
        size: 260 + this.cloudRand() * 520,
        speed: 6 + this.cloudRand() * 10,
      });
    }
    // Where the runway sits, in world z, after the last ring.
    this.runwayStart = CONFIG.ringSpacing * CONFIG.ringCount + 5200;
    this.runwayEnd = this.runwayStart + CONFIG.runwayLength;
  }

  // Lateral offset of the valley centre at distance z (feet).
  valleyCenter(z) {
    return this.centerNoise(z * 0.00012) * 1500;
  }

  // Height of the valley floor at distance z (feet).
  valleyFloor(z) {
    return 40 + (this.floorNoise(z * 0.00035) * 0.5 + 0.5) * 130;
  }

  // Full terrain height at (x, z). Gentle inside the valley, steep rock
  // walls and snowy peaks outside it.
  heightAt(x, z) {
    const cx = this.valleyCenter(z);
    const dx = Math.abs(x - cx);
    const half = CONFIG.valleyHalfWidth;
    const floor = this.valleyFloor(z);
    if (dx <= half) return floor;
    const over = (dx - half) / 900;
    const ridge = this.ridgeNoise(z * 0.0004 + dx * 0.0006);
    return floor + over * over * 900 + (ridge * 0.5 + 0.5) * 420 * over;
  }

  // Project a world point into screen space. Returns null behind camera.
  project(x, y, z, cam, view) {
    const dz = z - cam.z;
    if (dz < 30) return null;
    const scale = view.focal / dz;
    const sx = view.cx + (x - cam.x) * scale + view.yawShift * (dz / 9000);
    const sy = view.horizon - (y - cam.y) * scale;
    return { x: sx, y: sy, scale };
  }

  drawSky(ctx, view, time) {
    const sky = ctx.createLinearGradient(0, 0, 0, view.horizon * 1.15);
    sky.addColorStop(0, '#1a3a63');
    sky.addColorStop(0.5, '#4a7ab0');
    sky.addColorStop(0.78, '#b8d0e8');
    sky.addColorStop(1, '#dfe9f2');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, view.width, view.horizon * 1.15 + 2);
  }

  // The sun, drawn after the clouds so it is never hidden behind one.
  drawSun(ctx, view, time) {
    const sunX = view.width * 0.68 + Math.sin(time * 0.02) * 8;
    const sunY = view.horizon * 0.55;
    const glow = ctx.createRadialGradient(sunX, sunY, 4, sunX, sunY, 190);
    glow.addColorStop(0, 'rgba(255, 236, 180, 0.95)');
    glow.addColorStop(0.25, 'rgba(255, 190, 110, 0.55)');
    glow.addColorStop(1, 'rgba(255, 170, 90, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(sunX - 200, sunY - 200, 400, 400);
    ctx.fillStyle = '#fff3c4';
    ctx.beginPath();
    ctx.arc(sunX, sunY, 30, 0, Math.PI * 2);
    ctx.fill();
  }

  drawRidges(ctx, view, cam) {
    // Two far silhouette layers, scrolling slowly with heading.
    const layers = [
      { amp: 170, base: 0.16, color: '#6d81a3', parallax: 0.25 },
      { amp: 260, base: 0.30, color: '#55688a', parallax: 0.5 },
    ];
    for (const layer of layers) {
      ctx.fillStyle = layer.color;
      ctx.beginPath();
      ctx.moveTo(0, view.horizon + 2);
      const step = 26;
      for (let sx = 0; sx <= view.width + step; sx += step) {
        const world = (sx + cam.x * layer.parallax + cam.heading * 22) * 0.004;
        const n = this.ridgeNoise(world);
        const y = view.horizon - layer.base * view.height - (n * 0.5 + 0.5) * layer.amp;
        ctx.lineTo(sx, y);
      }
      ctx.lineTo(view.width, view.horizon + 2);
      ctx.closePath();
      ctx.fill();
      // Snow caps: a lighter stroke along the ridge tops.
      ctx.strokeStyle = 'rgba(240, 246, 255, 0.55)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let sx = 0; sx <= view.width + step; sx += step) {
        const world = (sx + cam.x * layer.parallax + cam.heading * 22) * 0.004;
        const n = this.ridgeNoise(world);
        const y = view.horizon - layer.base * view.height - (n * 0.5 + 0.5) * layer.amp;
        if (sx === 0) ctx.moveTo(sx, y);
        else ctx.lineTo(sx, y);
      }
      ctx.stroke();
    }
  }

  drawClouds(ctx, view, cam, dt) {
    ctx.fillStyle = 'rgba(255, 250, 240, 0.85)';
    for (const cloud of this.clouds) {
      cloud.z -= cloud.speed * dt;
      if (cloud.z < cam.z + 40) cloud.z += 9000;
      const p = this.project(cloud.x, cloud.y, cloud.z, cam, view);
      if (!p) continue;
      const r = cloud.size * p.scale;
      if (r < 2) continue;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, r, r * 0.36, 0, 0, Math.PI * 2);
      ctx.ellipse(p.x - r * 0.55, p.y + r * 0.08, r * 0.62, r * 0.28, 0, 0, Math.PI * 2);
      ctx.ellipse(p.x + r * 0.55, p.y + r * 0.06, r * 0.58, r * 0.26, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Ground strips, far to near. Each strip is a quad across the valley;
  // its colour follows the floor height, and the river and runway are
  // painted into the strips they cross.
  drawGround(ctx, view, cam) {
    // Base fill below the horizon: any ground the strips do not reach
    // (when the plane flies off the valley centre) still reads as land,
    // never as the page's dark background.
    ctx.fillStyle = '#a8b89a';
    ctx.fillRect(0, view.horizon, view.width, view.height - view.horizon);
    const strips = CONFIG.stripCount;
    const zNear = cam.z + (cam.near ?? 60);
    const zFar = cam.z + CONFIG.viewDistance;
    for (let i = strips - 1; i >= 0; i--) {
      const t0 = i / strips;
      const t1 = (i + 1) / strips;
      // Perspective spacing: near strips are deep, far strips thin.
      const z0 = zNear + (zFar - zNear) * t0 * t0;
      const z1 = zNear + (zFar - zNear) * t1 * t1;
      const cx0 = this.valleyCenter(z0);
      const cx1 = this.valleyCenter(z1);
      const half = CONFIG.valleyHalfWidth;
      const floor0 = this.valleyFloor(z0);
      const floor1 = this.valleyFloor(z1);
      const p00 = this.project(cx0 - half, floor0, z0, cam, view);
      const p01 = this.project(cx0 + half, floor0, z0, cam, view);
      const p10 = this.project(cx1 - half, floor1, z1, cam, view);
      const p11 = this.project(cx1 + half, floor1, z1, cam, view);
      if (!p00 || !p01 || !p10 || !p11) continue;
      // Patchwork fields: the strip's tint follows the floor noise, so
      // the valley reads as meadows and ploughed fields, not flat paint.
      // Far strips haze toward the sky for aerial perspective.
      const patch = this.floorNoise(z0 * 0.002) * 0.5 + 0.5;
      const shade = 0.82 + 0.18 * ((i % 2 === 0) ? 1 : 0.86);
      const haze = (1 - i / strips) * 0.55;
      const mix = (c, h) => Math.round(c * (1 - h) + h * 218);
      const red = mix((58 + patch * 34) * shade, haze);
      const green = mix((92 + patch * 10) * shade, haze);
      const blue = mix((44 + patch * 8) * shade, haze);
      ctx.fillStyle = `rgb(${red}, ${green}, ${blue})`;
      ctx.beginPath();
      ctx.moveTo(p00.x, p00.y);
      ctx.lineTo(p01.x, p01.y);
      ctx.lineTo(p11.x, p11.y);
      ctx.lineTo(p10.x, p10.y);
      ctx.closePath();
      ctx.fill();
      // Tree dots on the near strips for texture, kept off the river.
      if (i < 10) {
        const treeRand = mulberry32(this.seed + i * 31);
        ctx.fillStyle = 'rgba(22, 58, 28, 0.9)';
        for (let t = 0; t < 5; t++) {
          const tx = cx0 - half + treeRand() * half * 2;
          if (Math.abs(tx - cx0) < 160) continue;
          const ty = floor0 + 1;
          const tp = this.project(tx, ty, z0, cam, view);
          if (!tp) continue;
          const tr = Math.max(2, 8 * tp.scale);
          ctx.beginPath();
          ctx.moveTo(tp.x, tp.y - tr * 1.6);
          ctx.lineTo(tp.x - tr, tp.y);
          ctx.lineTo(tp.x + tr, tp.y);
          ctx.closePath();
          ctx.fill();
        }
      }
      // River ribbon, meandering down the valley centre.
      const riverHalf = 20;
      const meander0 = Math.sin(z0 * 0.0008) * 150;
      const meander1 = Math.sin(z1 * 0.0008) * 150;
      const r00 = this.project(cx0 + meander0 - riverHalf, floor0 + 1, z0, cam, view);
      const r01 = this.project(cx0 + meander0 + riverHalf, floor0 + 1, z0, cam, view);
      const r10 = this.project(cx1 + meander1 - riverHalf, floor1 + 1, z1, cam, view);
      const r11 = this.project(cx1 + meander1 + riverHalf, floor1 + 1, z1, cam, view);
      if (r00 && r01 && r10 && r11) {
        ctx.fillStyle = 'rgba(48, 96, 132, 0.88)';
        ctx.beginPath();
        ctx.moveTo(r00.x, r00.y);
        ctx.lineTo(r01.x, r01.y);
        ctx.lineTo(r11.x, r11.y);
        ctx.lineTo(r10.x, r10.y);
        ctx.closePath();
        ctx.fill();
      }
      // Runway strip, with centre dashes, once it is in range.
      if (z1 > this.runwayStart && z0 < this.runwayEnd) {
        const rw = CONFIG.runwayWidth / 2;
        const a = this.project(cx0 - rw, floor0 + 2, z0, cam, view);
        const b = this.project(cx0 + rw, floor0 + 2, z0, cam, view);
        const c = this.project(cx1 + rw, floor1 + 2, z1, cam, view);
        const d = this.project(cx1 - rw, floor1 + 2, z1, cam, view);
        if (a && b && c && d) {
          ctx.fillStyle = '#3a3f46';
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.lineTo(c.x, c.y);
          ctx.lineTo(d.x, d.y);
          ctx.closePath();
          ctx.fill();
          const dash = Math.floor(z0 / 420) % 2 === 0;
          if (dash) {
            const m0 = this.project(cx0, floor0 + 3, z0, cam, view);
            const m1 = this.project(cx1, floor1 + 3, z1, cam, view);
            if (m0 && m1) {
              ctx.strokeStyle = 'rgba(255, 255, 240, 0.9)';
              ctx.lineWidth = Math.max(1, 3 * m0.scale);
              ctx.beginPath();
              ctx.moveTo(m0.x, m0.y);
              ctx.lineTo(m1.x, m1.y);
              ctx.stroke();
            }
          }
        }
      }
    }
  }
}
