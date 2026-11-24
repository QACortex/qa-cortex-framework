// A user's spec using configFixtures() through their own test.extend() (see fixtures.ts).
import { test as base, mergeTests } from '@playwright/test';
import { expect, expectedProfile, test } from './fixtures.js';
import { loadCount } from './qa.config.js';

/** First qaConfig seen in this worker process (module state is per worker). */
let firstSeen: unknown;

for (let i = 0; i < 4; i++) {
  test(`qaConfig is typed, frozen, loaded once and shared in the worker #${i}`, ({ qaConfig: cfg, qaProfile }, testInfo) => {
    const profile = expectedProfile(testInfo.project.name);
    expect(cfg.profile).toBe(profile);
    expect(cfg.app.tenant).toBe(profile === 'staging' ? 'acme-staging' : 'acme');
    expect(qaProfile).toBe(testInfo.project.name === 'staging' ? 'staging' : undefined);
    expect(Object.isFrozen(cfg)).toBe(true);

    firstSeen ??= cfg;
    expect(cfg).toBe(firstSeen); // same object for every test in this worker
    expect(loadCount()).toBe(1); // the fixture loaded the config exactly once in this worker
    console.log(`QAC_FIXTURE project=${testInfo.project.name} worker=${testInfo.workerIndex} profile=${cfg.profile} loads=${loadCount()}`);
  });
}

// A further test-scoped fixture that depends on qaConfig by name: the pattern future
// QA Cortex modules (logger, test data) will use.
const withGreeting = test.extend<{ greeting: string }>({
  greeting: async ({ qaConfig: cfg }, use) => {
    await use(`hello ${cfg.app.tenant}`);
  },
});

withGreeting('a dependent fixture receives qaConfig', ({ greeting }, testInfo) => {
  expect(greeting).toBe(expectedProfile(testInfo.project.name) === 'staging' ? 'hello acme-staging' : 'hello acme');
});

// mergeTests() with an unrelated fixture set.
const other = base.extend<{ answer: number }>({ answer: [42, { option: true }] });
const merged = mergeTests(test, other);

merged('works with mergeTests()', ({ qaConfig: cfg, answer }) => {
  expect(answer).toBe(42);
  expect(cfg.baseURL).toMatch(/^http/);
});
