// Config for the guard tests: one ordinary profile and one production profile.
import { defineQaConfig } from '@qa-cortex/core/config';

export const qaConfig = defineQaConfig({
  base: { baseURL: 'http://127.0.0.1:9/' },
  profiles: {
    local: {},
    production: { production: true },
  },
});
