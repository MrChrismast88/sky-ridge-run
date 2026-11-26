// Sky Ridge Run — screenshot scenes. ?shot=start|play|cockpit|end (with
// an optional &seed=) drops the game into a fixed, photogenic moment so
// the screenshots are real renders of the game's own code, framed well.
// Normal players never pass ?shot=, so this changes nothing for them.
export function readShotParams() {
  const params = new URLSearchParams(window.location.search);
  const shot = params.get('shot');
  const seed = Number(params.get('seed') || '7');
  return { shot, seed: Number.isFinite(seed) ? seed : 7 };
}

// Place the plane and the world for one screenshot scene.
export function applyShot(game, shot) {
  const plane = game.plane;
  const rings = game.rings;
  if (shot === 'start') {
    game.state = 'menu';
    plane.reset(0, 0, 0);
    plane.speed = 0;
    plane.throttle = 0;
    plane.onGround = true;
    return;
  }
  if (shot === 'play') {
    game.state = 'flying';
    // Mid-valley, lined up on the next ring, wings level.
    const ring = rings.list[2];
    plane.reset(ring.x - 260, ring.y - 40, ring.z - 2400);
    plane.heading = 0;
    plane.pitch = 1;
    plane.roll = -6;
    plane.speed = 235;
    plane.throttle = 68;
    plane.onGround = false;
    game.score = 2000;
    game.ringsPassed = 2;
    rings.nextIndex = 2;
    rings.passedCount = 2;
    rings.list[0].passed = true;
    rings.list[1].passed = true;
    game.time = 14.5;
    return;
  }
  if (shot === 'cockpit') {
    game.state = 'flying';
    game.viewMode = 'cockpit';
    const ring = rings.list[4];
    plane.reset(ring.x + 140, ring.y + 60, ring.z - 1900);
    plane.heading = -4;
    plane.pitch = 2;
    plane.roll = 9;
    plane.speed = 248;
    plane.throttle = 72;
    plane.onGround = false;
    game.score = 4000;
    game.ringsPassed = 4;
    rings.nextIndex = 4;
    rings.passedCount = 4;
    for (let i = 0; i < 4; i++) rings.list[i].passed = true;
    game.time = 31.2;
    return;
  }
  if (shot === 'end') {
    game.state = 'flying';
    // Final approach: low over the runway threshold, gear down in spirit.
    const terrain = game.terrain;
    const z = terrain.runwayStart - 1500;
    plane.reset(terrain.valleyCenter(z), 340, z);
    plane.heading = 0;
    plane.pitch = -4;
    plane.roll = 0;
    plane.speed = 158;
    plane.throttle = 42;
    plane.onGround = false;
    game.score = 11500;
    game.ringsPassed = 10;
    rings.nextIndex = 10;
    rings.passedCount = 10;
    for (const r of rings.list) r.passed = true;
    game.time = 96.4;
    game.message = 'FINAL APPROACH — RUNWAY AHEAD';
    game.messageAge = 0;
    return;
  }
}
