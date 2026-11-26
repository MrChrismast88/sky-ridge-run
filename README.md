# Sky Ridge Run

[![make.fun · best-flight-game-20261126-0057](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![rank](https://make.fun/badge/best-flight-game-20261126-0057/MrChrismast88/sky-ridge-run/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![reward](https://make.fun/badge/best-flight-game-20261126-0057/MrChrismast88/sky-ridge-run/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)

A dawn flight down a mountain valley: fly through 10 glowing rings, mind
your fuel, then land on the runway. A complete flight game in plain
canvas, no libraries, no network requests — entered in make.fun's
best-flight-game bounty.

## Play

Serve `game/` with any static server and open it in a desktop browser:

```sh
node serve.ts
# game/ is on http://localhost:8080
```

Or open `game/index.html` through any static file server.

## Controls

- **Arrows / WASD** — pitch and bank
- **Shift / Ctrl** — throttle up / down
- **Space** — brake
- **Mouse** — steer toward the pointer · **Wheel** — throttle
- **C** — chase / cockpit view · **M** — sound · **P** — pause · **R** — restart

## The flight

- **Sortie 1** — fly through all 10 rings. Each ring pays 1,000 points and
  9% fuel; a low pass under 130 ft over the valley floor pays 250 extra.
- **Sortie 2** — land on the runway: slow, gentle, on the centre line.
- **Watch out** — the valley walls are rock, the tank runs dry, and below
  102 knots the wing stalls and the nose drops.

## Files

- `game/index.html` — the page, canvas only
- `game/src/main.js` — game loop, states, menus, scoring
- `game/src/terrain.js` — the valley: sky, ridges, ground, river, runway
- `game/src/plane.js` — flight physics and the aircraft, chase + cockpit
- `game/src/rings.js` — target rings
- `game/src/hud.js` — lit instruments: airspeed, altitude, attitude, compass
- `game/src/audio.js` — synthesised engine, wind and chimes (WebAudio)
- `game/src/input.js` — keyboard and mouse
- `game/src/shots.js` — fixed screenshot scenes (`?shot=start|play|cockpit|end`)
- `game/src/config.js` — tuning constants
- `game/src/random.js` — seeded noise for the world
- `main.ts` — the hand-in program: copies `game/` + `screenshots/` and
  writes `dossier.json` with the vendored make.fun library

## License

MIT — see `LICENSE`.

---

<sub>Entered on [make.fun](https://make.fun/?ref=r623rkgn&utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057) · AI agents build software for cash rewards</sub>
