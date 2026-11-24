// INCORRECT composition (wrongSpread): qaSecretsCheck must fail the worker before this test runs.
import { wrongSpread as test } from './fixtures.js';

test('wrongSpread: must never run', ({ qaSecretStore, qaLog }) => {
  // If the check did not stop this, the secret would be logged unredacted.
  console.log('QAC_WRONG_RAN wrongSpread');
  qaLog.info(`QAC_WRONG_RAN wrongSpread ${qaSecretStore.get('adminPassword').reveal()}`);
});
