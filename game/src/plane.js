// Sky Ridge Run — the aircraft. Arcade flight physics (throttle, pitch,
// bank-to-turn, stall) and the vector-drawn jet, in chase view and in
// cockpit view.
import { CONFIG } from './config.js';

export class Plane {
  constructor() {
    this.reset(0, 260, 0);
  }

  reset(x, altitude, z) {
    this.x = x;
    this.y = altitude;
    this.z = z;
    this.heading = 0; // degrees, 0 = straight down the valley
    this.pitch = 0; // degrees, + = nose up
    this.roll = 0; // degrees, + = bank right
    this.speed = 150; // knots
    this.throttle = CONFIG.cruiseThrottle;
    this.verticalSpeed = 0; // ft/s
    this.fuel = CONFIG.fuelStart;
    this.hull = 100;
    this.stalled = false;
    this.onGround = true;
  }

  // One physics step. Input: { pitch: -1..1, roll: -1..1, throttleDelta,
  // brake } plus dt seconds and the terrain height under the aircraft.
  // Returns nothing; state is read by the game.
  update(input, dt, groundY = 0) {
    this.throttle = Math.max(0, Math.min(100, this.throttle + input.throttleDelta * dt * 38));
    if (input.brake) this.throttle = Math.max(0, this.throttle - 55 * dt);
    const targetSpeed = CONFIG.minSpeed + (this.throttle / 100) * (CONFIG.maxSpeed - CONFIG.minSpeed);
    const accel = this.onGround ? 55 : 26;
    this.speed += Math.max(-accel * dt, Math.min(accel * dt, targetSpeed - this.speed));
    if (this.speed < 40 && this.onGround && this.throttle > 40) this.speed = 40;

    this.stalled = !this.onGround && this.speed < CONFIG.stallSpeed;
    const targetRoll = input.roll * CONFIG.maxRoll;
    this.roll += (targetRoll - this.roll) * Math.min(1, dt * 3.2);
    const targetPitch = this.stalled
      ? -9
      : input.pitch * (input.pitch > 0 ? CONFIG.maxPitchUp : -CONFIG.maxPitchDown);
    this.pitch += (targetPitch - this.pitch) * Math.min(1, dt * 2.4);

    // Bank to turn: heading follows the roll, faster at speed.
    const turnRate = (this.roll / CONFIG.maxRoll) * 26 * (this.speed / 220);
    this.heading += turnRate * dt;
    const headingRad = (this.heading * Math.PI) / 180;
    const forward = this.speed * 1.68781; // knots -> ft/s
    this.z += Math.cos(headingRad) * forward * dt;
    this.x += Math.sin(headingRad) * forward * dt;

    const climb = Math.sin((this.pitch * Math.PI) / 180) * forward * CONFIG.climbRate;
    this.verticalSpeed = climb;
    this.y += climb * dt;
    if (this.y < 0) this.y = 0;

    // Takeoff: fast enough and pitched up, leave the ground.
    if (this.onGround && this.speed > 118 && this.pitch > 4) this.onGround = false;
    if (this.onGround) this.y = groundY;

    // Fuel burns with throttle; empty tank means the engine quits.
    if (!this.onGround) {
      this.fuel -= CONFIG.fuelBurnPerSecond * (0.35 + this.throttle / 100) * dt;
      if (this.fuel <= 0) {
        this.fuel = 0;
        this.throttle = 0;
      }
    }
  }

  addFuel(amount) {
    this.fuel = Math.min(100, this.fuel + amount);
  }

  damage(amount) {
    this.hull = Math.max(0, this.hull - amount);
  }

  // Chase view: a vector jet seen from behind and slightly above,
  // banking with the roll and sliding with the pitch.
  drawChase(ctx, view) {
    const cx = view.cx;
    const cy = view.height * 0.66 + this.pitch * 1.6;
    const s = view.height / 720;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((this.roll * Math.PI) / 180);
    ctx.scale(s, s);
    // Afterburner glow.
    if (this.throttle > 55 && !this.onGround) {
      const flame = 26 + Math.random() * 22 + (this.throttle - 55) * 0.5;
      const grad = ctx.createLinearGradient(0, 26, 0, 26 + flame);
      grad.addColorStop(0, 'rgba(255, 220, 120, 0.95)');
      grad.addColorStop(0.5, 'rgba(255, 120, 40, 0.8)');
      grad.addColorStop(1, 'rgba(255, 80, 20, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(-13, 26);
      ctx.lineTo(0, 26 + flame);
      ctx.lineTo(13, 26);
      ctx.closePath();
      ctx.fill();
    }
    // Tail, wings, fuselage, canopy — slate blue with amber trim.
    ctx.fillStyle = '#2c3e55';
    ctx.beginPath();
    ctx.moveTo(-7, -34);
    ctx.lineTo(-13, -58);
    ctx.lineTo(-4, -52);
    ctx.lineTo(0, -62);
    ctx.lineTo(4, -52);
    ctx.lineTo(13, -58);
    ctx.lineTo(7, -34);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#7d94b5';
    ctx.beginPath();
    ctx.moveTo(-86, 6);
    ctx.lineTo(-16, -12);
    ctx.lineTo(-10, 8);
    ctx.lineTo(-14, 26);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(86, 6);
    ctx.lineTo(16, -12);
    ctx.lineTo(10, 8);
    ctx.lineTo(14, 26);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#e8b23a';
    ctx.fillRect(-86, 4, 12, 3);
    ctx.fillRect(74, 4, 12, 3);
    const body = ctx.createLinearGradient(0, -62, 0, 34);
    body.addColorStop(0, '#dfe9f5');
    body.addColorStop(0.55, '#9fb2cc');
    body.addColorStop(1, '#5d7396');
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.moveTo(0, -64);
    ctx.quadraticCurveTo(13, -30, 12, 4);
    ctx.quadraticCurveTo(11, 26, 0, 32);
    ctx.quadraticCurveTo(-11, 26, -12, 4);
    ctx.quadraticCurveTo(-13, -30, 0, -64);
    ctx.closePath();
    ctx.fill();
    // Canopy.
    ctx.fillStyle = '#17324e';
    ctx.beginPath();
    ctx.ellipse(0, -30, 7, 15, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(160, 220, 255, 0.65)';
    ctx.beginPath();
    ctx.ellipse(-2, -34, 3, 8, -0.3, 0, Math.PI * 2);
    ctx.fill();
    // Twin exhausts.
    ctx.fillStyle = '#1d2733';
    ctx.fillRect(-8, 26, 6, 6);
    ctx.fillRect(2, 26, 6, 6);
    ctx.restore();
  }

  // Cockpit view: canopy frame, nose, and the top of the instrument
  // panel. The HUD instruments are drawn by hud.js on top.
  drawCockpit(ctx, view) {
    const w = view.width;
    const h = view.height;
    ctx.save();
    // Canopy frame arc.
    ctx.strokeStyle = '#1d2733';
    ctx.lineWidth = 26;
    ctx.beginPath();
    ctx.moveTo(0, h * 0.42);
    ctx.quadraticCurveTo(w * 0.5, h * 0.16, w, h * 0.42);
    ctx.stroke();
    // Centre strut of the canopy frame.
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(w * 0.5, h * 0.16);
    ctx.lineTo(w * 0.5, h * 0.30);
    ctx.stroke();
    // Nose: narrow, dark and short, so it reads as the aircraft's nose
    // poking into view, not as a hill on the horizon.
    const nose = ctx.createLinearGradient(0, h * 0.72, 0, h);
    nose.addColorStop(0, '#5d7396');
    nose.addColorStop(1, '#2c3a4f');
    ctx.fillStyle = nose;
    ctx.beginPath();
    ctx.moveTo(w * 0.5 - 74, h);
    ctx.quadraticCurveTo(w * 0.5 - 34, h * 0.78, w * 0.5, h * 0.72);
    ctx.quadraticCurveTo(w * 0.5 + 34, h * 0.78, w * 0.5 + 74, h);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#e8b23a';
    ctx.fillRect(w * 0.5 - 74, h - 8, 148, 4);
    // Panel brow.
    ctx.fillStyle = '#141c28';
    ctx.beginPath();
    ctx.moveTo(0, h);
    ctx.lineTo(0, h * 0.86);
    ctx.quadraticCurveTo(w * 0.5, h * 0.78, w, h * 0.86);
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}
