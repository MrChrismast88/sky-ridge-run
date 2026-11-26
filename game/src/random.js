// Seeded random numbers and smooth value noise, so the valley, the rings
// and the weather look the same every run of a given seed.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 1D value noise: smooth interpolation between hashed lattice points.
export function makeNoise1D(seed) {
  const rand = mulberry32(seed);
  const lattice = new Float32Array(512);
  for (let i = 0; i < lattice.length; i++) lattice[i] = rand() * 2 - 1;
  const hash = (i) => lattice[((i % 512) + 512) % 512];
  const fade = (t) => t * t * (3 - 2 * t);
  return function noise(x) {
    const xi = Math.floor(x);
    const xf = x - xi;
    return hash(xi) * (1 - fade(xf)) + hash(xi + 1) * fade(xf);
  };
}

// Fractal sum of a few octaves of 1D noise, in roughly [-1, 1].
export function makeFbm1D(seed, octaves = 4) {
  const noises = [];
  for (let o = 0; o < octaves; o++) noises.push(makeNoise1D(seed + o * 1013));
  return function fbm(x) {
    let sum = 0;
    let amp = 1;
    let total = 0;
    for (let o = 0; o < octaves; o++) {
      sum += noises[o](x * Math.pow(2, o)) * amp;
      total += amp;
      amp *= 0.5;
    }
    return sum / total;
  };
}
