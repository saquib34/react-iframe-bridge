import { SecurityManager } from '../src/utils/security';

describe('SecurityManager', () => {
  it('should validate allowed origins', () => {
    const security = new SecurityManager({
      allowedOrigins: ['https://example.com', '*.stripe.com']
    });

    expect(security.validateOrigin('https://example.com')).toBe(true);
    expect(security.validateOrigin('https://js.stripe.com')).toBe(true);
    expect(security.validateOrigin('https://malicious.com')).toBe(false);
  });
});
