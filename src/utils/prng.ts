/**
 * Seedable, deterministic pseudo-random number generator (Mulberry32).
 * Ensures identical simulation runs when given the same seed.
 */
export class SeededPRNG {
  private state: number;

  constructor(seed: number = 42) {
    this.state = seed >>> 0;
  }

  /**
   * Returns a pseudo-random float in [0, 1).
   */
  next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Samples a Poisson distributed integer with parameter lambda (mean).
   * Uses Knuth's algorithm for lambda < 30.
   */
  poisson(lambda: number): number {
    if (lambda <= 0) return 0;
    if (lambda > 30) {
      // Gaussian approximation with continuity correction for large lambda
      const u1 = Math.max(1e-10, this.next());
      const u2 = this.next();
      const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
      const val = Math.round(lambda + Math.sqrt(lambda) * z);
      return Math.max(0, val);
    }
    const L = Math.exp(-lambda);
    let k = 0;
    let p = 1.0;
    do {
      k++;
      p *= this.next();
    } while (p > L);
    return k - 1;
  }
}
