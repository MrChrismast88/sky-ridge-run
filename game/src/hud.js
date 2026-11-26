// Sky Ridge Run — the HUD. Lit instruments: altitude, airspeed and
// heading tapes, an artificial horizon, fuel and hull gauges, throttle,
// score and mission text. Everything a pilot reads at a glance.
export class Hud {
  draw(ctx, view, state) {
    const { plane, score, ringsPassed, ringTotal, mission, message, messageAge } = state;
    const w = view.width;
    const h = view.height;
    ctx.save();
    ctx.textBaseline = 'alphabetic';

    // --- Top bar: score, rings, mission, clock.
    ctx.fillStyle = 'rgba(8, 16, 30, 0.55)';
    ctx.fillRect(0, 0, w, 46);
    ctx.fillStyle = '#ffd65a';
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`SCORE ${score.toLocaleString('en-US')}`, 16, 31);
    ctx.fillStyle = '#9fe8ff';
    ctx.font = 'bold 18px system-ui, sans-serif';
    ctx.fillText(`RINGS ${ringsPassed}/${ringTotal}`, 220, 30);
    ctx.fillStyle = '#e8eef7';
    ctx.font = '16px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(mission, w / 2, 29);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#9fe8ff';
    ctx.fillText(state.clock, w - 16, 29);

    // --- Left tape: airspeed + throttle.
    this.drawTape(ctx, 16, h * 0.30, 150, 'AIRSPEED', Math.round(plane.speed), 'KT', '#9fe8ff');
    this.drawGauge(ctx, 16, h * 0.30 + 170, 150, 14, plane.throttle / 100, 'THR', '#ffb84d');
    this.drawGauge(ctx, 16, h * 0.30 + 196, 150, 14, plane.fuel / 100, 'FUEL', plane.fuel < 25 ? '#ff5a4d' : '#7de38b');
    this.drawGauge(ctx, 16, h * 0.30 + 222, 150, 14, plane.hull / 100, 'HULL', '#c9a7ff');

    // --- Right tape: altitude + vertical speed.
    this.drawTape(ctx, w - 166, h * 0.30, 150, 'ALTITUDE', Math.round(plane.y), 'FT', '#ffd65a');
    const vs = Math.round(plane.verticalSpeed);
    ctx.fillStyle = 'rgba(8, 16, 30, 0.6)';
    const vsText = `${vs >= 0 ? '+' : ''}${vs} FT/MIN`;
    ctx.font = 'bold 17px system-ui, sans-serif';
    const vsW = ctx.measureText(vsText).width + 16;
    ctx.fillRect(w - 91 - vsW / 2, h * 0.30 + 148, vsW, 26);
    ctx.fillStyle = vs >= 0 ? '#7de38b' : '#ff9d5c';
    ctx.textAlign = 'center';
    ctx.fillText(vsText, w - 91, h * 0.30 + 167);

    // --- Bottom centre: artificial horizon.
    this.drawAttitude(ctx, w / 2, h - 100, 72, plane);
    // --- Compass tape under the top bar, clear of the attitude gauge.
    this.drawCompass(ctx, w / 2, 66, 300, plane.heading);

    // --- Stall / terrain / fuel warnings.
    let warn = null;
    if (plane.stalled) warn = 'STALL — NOSE DOWN, ADD POWER';
    else if (state.terrainWarning) warn = 'TERRAIN — PULL UP';
    else if (plane.fuel < 25 && plane.fuel > 0) warn = 'LOW FUEL';
    else if (plane.fuel <= 0) warn = 'FUEL EMPTY — GLIDING';
    if (warn) {
      const blink = Math.floor(state.time * 3) % 2 === 0;
      ctx.fillStyle = blink ? '#ff5a4d' : '#ffb84d';
      ctx.font = 'bold 24px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.shadowColor = '#ff5a4d';
      ctx.shadowBlur = 16;
      ctx.fillText(warn, w / 2, 128);
      ctx.shadowBlur = 0;
    }

    // --- Transient centre message (ring hit, sortie complete...).
    if (message && messageAge < 2.4) {
      ctx.globalAlpha = Math.min(1, (2.4 - messageAge) / 0.6);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 30px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.shadowColor = '#59c8ff';
      ctx.shadowBlur = 18;
      ctx.fillText(message, w / 2, h * 0.42);
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  drawTape(ctx, x, y, width, label, value, unit, color) {
    ctx.fillStyle = 'rgba(8, 16, 30, 0.6)';
    ctx.fillRect(x, y, width, 150);
    ctx.strokeStyle = 'rgba(160, 200, 240, 0.5)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, width, 150);
    ctx.fillStyle = '#c8d8ee';
    ctx.font = '12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, x + width / 2, y + 18);
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 10;
    ctx.font = 'bold 34px system-ui, sans-serif';
    ctx.fillText(String(value), x + width / 2, y + 66);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#c8d8ee';
    ctx.font = '14px system-ui, sans-serif';
    ctx.fillText(unit, x + width / 2, y + 92);
    // Tick marks.
    ctx.strokeStyle = 'rgba(200, 216, 238, 0.5)';
    for (let i = 0; i < 5; i++) {
      const ty = y + 112 + i * 7;
      ctx.beginPath();
      ctx.moveTo(x + 14, ty);
      ctx.lineTo(x + width - 14, ty);
      ctx.stroke();
    }
  }

  drawGauge(ctx, x, y, width, height, frac, label, color) {
    ctx.fillStyle = 'rgba(8, 16, 30, 0.6)';
    ctx.fillRect(x, y, width, height);
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
    ctx.fillRect(x + 2, y + 2, Math.max(0, (width - 4) * frac), height - 4);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#e8eef7';
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(label, x + 4, y + height - 3);
    ctx.textAlign = 'right';
    ctx.fillText(`${Math.round(frac * 100)}%`, x + width - 4, y + height - 3);
  }

  drawAttitude(ctx, cx, cy, r, plane) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();
    ctx.translate(cx, cy);
    ctx.rotate((-plane.roll * Math.PI) / 180);
    const pitchPx = (plane.pitch / 20) * r;
    ctx.fillStyle = '#2f6db3';
    ctx.fillRect(-r, -r - pitchPx, r * 2, r + pitchPx);
    ctx.fillStyle = '#7a5a34';
    ctx.fillRect(-r, -pitchPx, r * 2, r + pitchPx);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-r, -pitchPx);
    ctx.lineTo(r, -pitchPx);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 1;
    for (const d of [-30, -15, 15, 30]) {
      const yy = -pitchPx + (d / 20) * r;
      ctx.beginPath();
      ctx.moveTo(-r * 0.4, yy);
      ctx.lineTo(r * 0.4, yy);
      ctx.stroke();
    }
    ctx.restore();
    // Fixed wings marker + bezel.
    ctx.strokeStyle = '#ffd65a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx - r - 8, cy);
    ctx.lineTo(cx - 12, cy);
    ctx.moveTo(cx + 12, cy);
    ctx.lineTo(cx + r + 8, cy);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(200, 216, 238, 0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#c8d8ee';
    ctx.font = '11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('ATTITUDE', cx, cy + r + 14);
  }

  drawCompass(ctx, cx, y, width, heading) {
    const norm = ((heading % 360) + 360) % 360;
    ctx.fillStyle = 'rgba(8, 16, 30, 0.6)';
    ctx.fillRect(cx - width / 2, y - 16, width, 26);
    ctx.strokeStyle = 'rgba(160, 200, 240, 0.5)';
    ctx.strokeRect(cx - width / 2, y - 16, width, 26);
    const names = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    ctx.font = '12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    for (let d = -60; d <= 60; d += 15) {
      const deg = Math.round(norm + d);
      const px = cx + (d / 60) * (width / 2);
      const wrapped = ((deg % 360) + 360) % 360;
      ctx.fillStyle = d === 0 ? '#ffd65a' : '#c8d8ee';
      const label = wrapped % 45 === 0 ? names[Math.round(wrapped / 45) % 8] : String(wrapped);
      ctx.fillText(label, px, y + 2);
    }
    ctx.fillStyle = '#ffd65a';
    ctx.beginPath();
    ctx.moveTo(cx - 5, y - 20);
    ctx.lineTo(cx + 5, y - 20);
    ctx.lineTo(cx, y - 12);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#e8eef7';
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.fillText(`HDG ${String(Math.round(norm)).padStart(3, '0')}°`, cx, y + 26);
  }
}
