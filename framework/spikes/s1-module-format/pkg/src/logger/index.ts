// Second subpath with a type-only dependency on Playwright (a peer, never bundled).
import type { TestInfo } from '@playwright/test';

export function logTo(testInfo: Pick<TestInfo, 'annotations'>, message: string): void {
  testInfo.annotations.push({ type: 'qa-cortex-log', description: message });
}
