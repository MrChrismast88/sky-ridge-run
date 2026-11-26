// Sky Ridge Run — the game itself. States: menu, flying, crashed and
// landed. The loop steps physics, checks rings and terrain, and draws
// sky, ridges, ground, rings, aircraft and HUD every frame.
import { CONFIG } from './config.js';
import { Terrain } from './terrain.js';
import { Plane } from './plane.js';
import { Rings } from './rings.js';
import { Hud } from './hud.js';
import { SoundEngine } from './audio.js';
import { Input } from './input.js';
import { readShotParams, applyShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

export class Game {
  constructor(seed) {
    this.seed = seed;
    this.terrain = new Terrain(seed);
    this.plane = new Plane();
    this.rings = new Rings(seed, this.terrain);
    this.hud = new Hud();
    this.sound = new SoundEngine();
    this.input = new Input(canvas);
    this.state = 'menu';
    this.viewMode = 'chase';
    this.score = 0;
    this.ringsPassed = 0;
    this.time = 0;
    this.message = '';
    this.messageAge = 99;
    this.crashReason = '';
    this.paused = false;
    this.lowPassStreak = 0;
    this.lastBeep = 0;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    this.view = {
      width: canvas.width,
      height: canvas.height,
      cx: canvas.width / 2,
      horizon: canvas.height * 0.44,
      focal: CONFIG.focalLength,
      yawShift: 0,
    };
  }

  startFlight() {
    this.terrain = new Terrain(this.seed);
    this.plane = new Plane();
    this.rings = new Rings(this.seed, this.terrain);
    this.score = 0;
    this.ringsPassed = 0;
    this.time = 0;
    this.message = 'TAKE OFF — THROTTLE UP, PITCH UP AT 120 KT';
    this.messageAge = 0;
    this.crashReason = '';
    this.state = 'flying';
    this.sound.ensure();
  }

  missionText() {
    if (this.state === 'menu') return 'SKY RIDGE RUN';
    if (this.ringsPassed < CONFIG.ringCount) {
      return `SORTIE 1 — FLY THE RINGS · ${this.ringsPassed}/${CONFIG.ringCount}`;
    }
    return 'SORTIE 2 — LAND ON THE RUNWAY';
  }

  formatClock() {
    const total = Math.floor(this.time);
    const m = String(Math.floor(total / 60)).padStart(2, '0');
    const s = String(total % 60).padStart(2, '0');
    return `${m}:${s}`;
  }

  update(dt) {
    if (this.paused) return;
    this.time += dt;
    this.messageAge += dt;
    const plane = this.plane;

    if (this.state === 'flying') {
      const prevZ = plane.z;
      const steering = this.input.steering();
      plane.update(steering, dt, this.terrain.heightAt(plane.x, plane.z));
      this.sound.update(plane.throttle, plane.speed, !plane.onGround);

      // Ring crossing.
      const cross = this.rings.checkCrossing(plane, prevZ);
      if (cross) {
        if (cross.hit) {
          this.ringsPassed = this.rings.passedCount;
          this.score += CONFIG.pointsPerRing;
          plane.addFuel(CONFIG.fuelPerRing);
          this.message = `RING ${cross.ring.index + 1} — +${CONFIG.pointsPerRing} PTS · +${CONFIG.fuelPerRing} FUEL`;
          this.messageAge = 0;
          this.sound.ringChime();
          if (plane.y < this.terrain.heightAt(plane.x, plane.z) + 130) {
            this.score += CONFIG.lowPassBonus;
            this.message += ` · LOW PASS +${CONFIG.lowPassBonus}`;
          }
          if (this.ringsPassed === CONFIG.ringCount) {
            this.message = 'ALL RINGS CLEAR — FINAL APPROACH, LAND ON THE RUNWAY';
            this.messageAge = 0;
          }
        } else {
          this.message = `RING ${cross.ring.index + 1} MISSED`;
          this.messageAge = 0;
        }
      }

      // Terrain.
      const ground = this.terrain.heightAt(plane.x, plane.z);
      const clearance = plane.y - ground;
      if (clearance < 90 && !plane.onGround && this.time - this.lastBeep > 0.9) {
        this.lastBeep = this.time;
        this.sound.warningBeep();
      }
      const onRunway =
        plane.z > this.terrain.runwayStart &&
        plane.z < this.terrain.runwayEnd &&
        Math.abs(plane.x - this.terrain.valleyCenter(plane.z)) < CONFIG.runwayWidth / 2;
      if (!plane.onGround && plane.y <= ground + CONFIG.terrainClearance) {
        if (onRunway && plane.speed < 245 && Math.abs(plane.pitch) < 12) {
          this.land();
        } else if (onRunway) {
          this.crash('TOO FAST FOR THE RUNWAY');
        } else if (plane.y < ground) {
          // Actually below the terrain surface — a real impact.
          this.crash('TERRAIN IMPACT');
        }
        // Otherwise the plane is skimming just above the valley floor:
        // the pull-up warning is enough.
      }
      // Out of fuel: glide until the ground decides.
      if (plane.fuel <= 0 && plane.y - ground < 60 && !plane.onGround) {
        this.crash('OUT OF FUEL');
      }
      // Valley walls: flying into the high ridges ends the flight.
      if (Math.abs(plane.x - this.terrain.valleyCenter(plane.z)) > CONFIG.valleyHalfWidth + 700) {
        this.crash('FLEW INTO THE RIDGE');
      }
    }
  }

  land() {
    const plane = this.plane;
    plane.onGround = true;
    plane.y = this.terrain.heightAt(plane.x, plane.z);
    const timeBonus = Math.max(0, Math.round((150 - this.time) * 12));
    this.score += CONFIG.landingBonus + timeBonus + Math.round(plane.hull) * 5;
    this.state = 'landed';
    this.message = '';
    this.sound.fanfare();
    this.sound.update(0, 0, false);
  }

  crash(reason) {
    this.crashReason = reason;
    this.state = 'crashed';
    this.plane.damage(100);
    this.sound.crash();
    this.sound.update(0, 0, false);
  }

  camera() {
    const plane = this.plane;
    if (this.state === 'menu') {
      // High, pulled-back cinematic camera for the title screen: sky,
      // ridges and the valley ahead, with the jet waiting on it. The
      // near plane is pushed out so the river does not fill the frame.
      return { x: plane.x, y: 420, z: plane.z - 900, heading: 0, near: 500 };
    }
    return {
      x: plane.x,
      y: plane.y + 10,
      z: plane.z - 46,
      heading: plane.heading,
    };
  }

  render() {
    const view = this.view;
    const plane = this.plane;
    const cam = this.camera();
    view.yawShift = -plane.heading * 3.2;
    view.horizon = view.height * 0.44 - plane.pitch * 1.4;

    this.terrain.drawSky(ctx, view, this.time);
    this.terrain.drawRidges(ctx, view, cam);
    this.terrain.drawClouds(ctx, view, cam, 0.016);
    this.terrain.drawSun(ctx, view, this.time);
    this.terrain.drawGround(ctx, view, cam);
    this.rings.draw(ctx, view, cam, this.time);

    if (this.state === 'menu') {
      plane.drawChase(ctx, view);
      this.drawMenu();
    } else if (this.viewMode === 'cockpit') {
      plane.drawCockpit(ctx, view);
    } else {
      plane.drawChase(ctx, view);
    }

    if (this.state !== 'menu') {
      const ground = this.terrain.heightAt(plane.x, plane.z);
      this.hud.draw(ctx, view, {
        plane,
        score: this.score,
        ringsPassed: this.ringsPassed,
        ringTotal: CONFIG.ringCount,
        mission: this.missionText(),
        message: this.message,
        messageAge: this.messageAge,
        clock: this.formatClock(),
        time: this.time,
        terrainWarning: !plane.onGround && plane.y - ground < 90,
      });
    }
    if (this.state === 'crashed') this.drawEndScreen(false);
    if (this.state === 'landed') this.drawEndScreen(true);
    if (this.paused && this.state === 'flying') this.drawPaused();
  }

  drawMenu() {
    const w = this.view.width;
    const h = this.view.height;
    ctx.save();
    ctx.fillStyle = 'rgba(6, 12, 24, 0.28)';
    ctx.fillRect(0, 0, w, h);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd65a';
    ctx.shadowColor = '#ff9d2e';
    ctx.shadowBlur = 26;
    ctx.font = 'bold 72px system-ui, sans-serif';
    ctx.fillText('SKY RIDGE RUN', w / 2, h * 0.30);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#eaf2ff';
    ctx.font = '24px system-ui, sans-serif';
    ctx.fillText('A dawn flight down a mountain valley — rings, fuel and one runway home.', w / 2, h * 0.30 + 44);
    ctx.fillStyle = '#9fe8ff';
    ctx.font = '19px system-ui, sans-serif';
    const lines = [
      'SORTIE 1 — Fly through all 10 glowing rings. Each ring pays 1,000 points and fuel.',
      'SORTIE 2 — Land on the runway. Gentle, slow and on the centre line wins the day.',
      'Watch the ridges: the valley walls are rock. Watch the gauge: an empty tank glides.',
      '',
      'Arrows / WASD — pitch and bank · Shift / Ctrl — throttle · Space — brake',
      'Mouse — steer · Wheel — throttle · C — cockpit view · M — sound · R — restart',
    ];
    lines.forEach((line, i) => ctx.fillText(line, w / 2, h * 0.44 + i * 30));
    const pulse = 0.6 + 0.4 * Math.sin(this.time * 3);
    ctx.globalAlpha = pulse;
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 26px system-ui, sans-serif';
    ctx.fillText('PRESS ENTER OR CLICK TO FLY', w / 2, h * 0.44 + lines.length * 30 + 26);
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(220, 235, 255, 0.6)';
    ctx.font = '15px system-ui, sans-serif';
    ctx.fillText('Best score wins a place on the board · built with plain canvas, no libraries', w / 2, h - 24);
    ctx.restore();
  }

  drawEndScreen(landed) {
    const w = this.view.width;
    const h = this.view.height;
    ctx.save();
    ctx.fillStyle = 'rgba(6, 12, 24, 0.55)';
    ctx.fillRect(0, h * 0.24, w, h * 0.42);
    ctx.textAlign = 'center';
    if (landed) {
      ctx.fillStyle = '#7de38b';
      ctx.shadowColor = '#7de38b';
      ctx.shadowBlur = 22;
      ctx.font = 'bold 54px system-ui, sans-serif';
      ctx.fillText('LANDED — SORTIE COMPLETE', w / 2, h * 0.36);
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#eaf2ff';
      ctx.font = '22px system-ui, sans-serif';
      ctx.fillText(`Rings ${this.ringsPassed}/${CONFIG.ringCount} · Time ${this.formatClock()} · Hull ${Math.round(this.plane.hull)}%`, w / 2, h * 0.44);
    } else {
      ctx.fillStyle = '#ff5a4d';
      ctx.shadowColor = '#ff5a4d';
      ctx.shadowBlur = 22;
      ctx.font = 'bold 54px system-ui, sans-serif';
      ctx.fillText('CRASHED — ' + this.crashReason, w / 2, h * 0.36);
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#eaf2ff';
      ctx.font = '22px system-ui, sans-serif';
      ctx.fillText(`Rings ${this.ringsPassed}/${CONFIG.ringCount} · Distance ${Math.round(this.plane.z).toLocaleString('en-US')} ft · Time ${this.formatClock()}`, w / 2, h * 0.44);
    }
    ctx.fillStyle = '#ffd65a';
    ctx.font = 'bold 30px system-ui, sans-serif';
    ctx.fillText(`FINAL SCORE  ${this.score.toLocaleString('en-US')}`, w / 2, h * 0.53);
    ctx.fillStyle = '#eaf2ff';
    ctx.font = '20px system-ui, sans-serif';
    ctx.fillText('Press R to fly again', w / 2, h * 0.60);
    ctx.restore();
  }

  drawPaused() {
    const w = this.view.width;
    const h = this.view.height;
    ctx.save();
    ctx.fillStyle = 'rgba(6, 12, 24, 0.5)';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 44px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PAUSED', w / 2, h / 2);
    ctx.font = '20px system-ui, sans-serif';
    ctx.fillText('Press P to resume', w / 2, h / 2 + 40);
    ctx.restore();
  }

  handleKeys() {
    const input = this.input;
    if (input.wasPressed('enter') || input.wasPressed(' ')) {
      if (this.state === 'menu') this.startFlight();
    }
    if (input.wasPressed('r')) {
      if (this.state !== 'menu') this.startFlight();
    }
    if (input.wasPressed('p') && this.state === 'flying') this.paused = !this.paused;
    if (input.wasPressed('c')) this.viewMode = this.viewMode === 'chase' ? 'cockpit' : 'chase';
    if (input.wasPressed('m')) {
      this.sound.ensure();
      this.sound.setMuted(!this.sound.muted);
    }
    if (input.mouseDown && this.state === 'menu') this.startFlight();
  }

  frame(now) {
    const dt = Math.min(0.05, (now - (this.lastNow ?? now)) / 1000 || 0.016);
    this.lastNow = now;
    this.handleKeys();
    this.update(dt);
    this.render();
    this.input.endFrame();
  }
}

// Boot: a ?shot= scene is a frozen photogenic moment for screenshots;
// otherwise the menu waits for the player.
const { shot, seed } = readShotParams();
const game = new Game(seed);
if (shot) applyShot(game, shot);
let raf = (now) => {
  game.frame(now);
  requestAnimationFrame(raf);
};
requestAnimationFrame(raf);
