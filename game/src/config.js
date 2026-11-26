// Sky Ridge Run — tuning constants. One place for every number that shapes
// how the game feels: speeds, fuel, rings, terrain and scoring.
export const CONFIG = {
  // World (feet, degrees, knots)
  valleyHalfWidth: 1900,
  ringSpacing: 2600,
  ringCount: 10,
  ringRadius: 130,
  runwayLength: 5200,
  runwayWidth: 130,
  terrainClearance: 18,
  // Aircraft performance
  minSpeed: 85,
  maxSpeed: 330,
  stallSpeed: 102,
  cruiseThrottle: 62,
  climbRate: 1.0,
  rollRate: 95,
  maxRoll: 62,
  maxPitchUp: 17,
  maxPitchDown: -13,
  // Fuel (percent)
  fuelStart: 100,
  fuelBurnPerSecond: 0.62,
  fuelPerRing: 9,
  // Scoring
  pointsPerRing: 1000,
  landingBonus: 2500,
  lowPassBonus: 250,
  // Rendering
  focalLength: 520,
  viewDistance: 9000,
  stripCount: 46,
};
