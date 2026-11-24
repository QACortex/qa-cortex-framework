// INCORRECT composition (userDrops): qaSecretsCheck must fail the worker before this test runs.
import { userDrops as test } from './fixtures.js';

test('userDrops: must never run', ({ qaSecretStore, qaLog }) => {
  // If the check did not stop this, the secret would be logged unredacted.
  console.log('QAC_WRONG_RAN userDrops');
  qaLog.info(`QAC_WRONG_RAN userDrops ${qaSecretStore.get('adminPassword').reveal()}`);
});
