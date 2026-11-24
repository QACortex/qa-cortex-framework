// INCORRECT composition (wrongMerge): qaSecretsCheck must fail the worker before this test runs.
import { wrongMerge as test } from './fixtures.js';

test('wrongMerge: must never run', ({ qaSecretStore, qaLog }) => {
  // If the check did not stop this, the secret would be logged unredacted.
  console.log('QAC_WRONG_RAN wrongMerge');
  qaLog.info(`QAC_WRONG_RAN wrongMerge ${qaSecretStore.get('adminPassword').reveal()}`);
});
