// Rate-limiting par COMPTE (email/userId), en complément du @Throttle par IP.
// @Throttle ne protège que contre un attaquant depuis une seule IP — un
// botnet distribué peut tourner sur des IPs différentes tout en visant
// toujours le même compte (brute-force d'un code OTP à 6 chiffres, ou spam
// de messages chat). En mémoire (pas de Redis en place) : suffisant pour une
// seule instance Render: un redémarrage réinitialise les compteurs, ce qui
// est acceptable pour ce niveau de protection.
class AccountRateLimiter {
  private hits = new Map<string, number[]>();

  constructor(private windowMs: number, private max: number) {}

  // true si la limite est dépassée (requête à rejeter)
  isLimited(key: string): boolean {
    const now = Date.now();
    const arr = (this.hits.get(key) ?? []).filter(t => now - t < this.windowMs);
    if (arr.length >= this.max) {
      this.hits.set(key, arr);
      return true;
    }
    arr.push(now);
    this.hits.set(key, arr);
    return false;
  }

  reset(key: string): void {
    this.hits.delete(key);
  }
}

// 5 demandes de code OTP par compte / 15 min
export const otpRequestLimiter = new AccountRateLimiter(15 * 60 * 1000, 5);
// 8 tentatives de vérification de code par compte / 15 min
export const otpVerifyLimiter  = new AccountRateLimiter(15 * 60 * 1000, 8);
// 60 messages chat par compte / minute
export const chatSendLimiter   = new AccountRateLimiter(60 * 1000, 60);
