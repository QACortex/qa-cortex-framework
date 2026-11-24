// Per-file profile override with test.use(). Playwright requires worker-scoped options like
// qaProfile to be set at the TOP LEVEL of a file (or in the config), not inside describe().
import { expect, test } from './fixtures.js';

test.use({ qaProfile: 'staging' });

test('test.use({ qaProfile }) overrides the profile for this file', ({ qaConfig: cfg, qaProfile }) => {
  expect(qaProfile).toBe('staging');
  expect(cfg.profile).toBe('staging');
  expect(cfg.app.tenant).toBe('acme-staging');
});
