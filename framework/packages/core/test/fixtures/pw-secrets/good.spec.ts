// Correct compositions. Runs in every project (profiles local and staging).
import { chained, expect, merged, secretsOnly, spread, userAdds } from './fixtures.js';

for (const [name, test] of [
  ['chained', chained],
  ['spread', spread],
  ['merged', merged],
  ['userAdds', userAdds],
] as const) {
  test(`${name}: secrets follow the config profile and are redacted in qaLog`, ({ qaConfig, qaSecretStore, qaSecrets, qaLog }) => {
    expect(qaSecretStore.profile).toBe(qaConfig.profile);
    // Compare as booleans: Playwright records assertion values in traces and reports (ADR 0003),
    // so a secret must never be an argument of expect().
    const token = qaSecretStore.find('apiToken');
    const expectedToken = process.env[qaConfig.profile === 'staging' ? 'QAC_TEST_STAGING_TOKEN' : 'QAC_TEST_LOCAL_TOKEN'];
    expect(token !== undefined && token.reveal() === expectedToken, 'apiToken is the profile-specific value').toBe(true);

    // Optional secret: present only when the outer test sets QAC_TEST_BASIC_AUTH.
    const basic = qaSecretStore.find('basicAuth');
    expect(basic === undefined ? process.env.QAC_TEST_BASIC_AUTH === undefined : basic.reveal() === process.env.QAC_TEST_BASIC_AUTH).toBe(true);
    expect(qaSecrets).toHaveLength((basic ? 3 : 2) + (name === 'userAdds' ? 1 : 0));

    const admin = qaSecretStore.get('adminPassword');
    qaLog.info(`QAC_SECRETS ${name} revealed=${admin.reveal()} token=${token?.reveal() ?? ''} basic=${basic?.reveal() ?? 'unset'}`, {
      admin,
      nested: { value: admin.reveal() },
    });
  });
}

secretsOnly('secretsOnly: works without the logger', ({ qaSecretStore, qaSecrets }) => {
  expect(qaSecretStore.names()).toContain('adminPassword');
  expect(qaSecrets.length).toBeGreaterThanOrEqual(2);
  console.log(`QAC_SECRETS secretsOnly names=${qaSecretStore.names().join(',')}`);
});
