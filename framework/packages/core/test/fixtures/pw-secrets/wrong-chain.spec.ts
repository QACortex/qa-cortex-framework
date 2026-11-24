// INCORRECT composition (wrongChain): qaSecretsCheck must fail the worker before this test runs.
import { wrongChain as test } from './fixtures.js';

test('wrongChain: must never run', ({ qaSecretStore, qaLog }) => {
  // If the check did not stop this, the secret would be logged unredacted.
  console.log('QAC_WRONG_RAN wrongChain');
  qaLog.info(`QAC_WRONG_RAN wrongChain ${qaSecretStore.get('adminPassword').reveal()}`);
});
