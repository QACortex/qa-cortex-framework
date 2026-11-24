// Consumer secrets: one synthetic value, set by the driver (run-consumer.mjs) for every run.
import { defineSecrets } from '@qa-cortex/core/secrets';

export const secretsDef = defineSecrets({
  compatSecret: { env: 'QAC_COMPAT_SECRET' },
  notSet: { env: 'QAC_COMPAT_NOT_SET', optional: true },
});
