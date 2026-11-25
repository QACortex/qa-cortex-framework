# Acceptance checklist: first use of the starter project

A step-by-step check for a new user, from cloning the repository to reading reports. Every step
lists the exact commands and the expected result. The commands work in PowerShell and in Bash
unless a step shows both.

It adds one new page object, one JSON data file and one test for the **Radio Button** page of the
[QA Cortex Test Automation Lab](https://qacortex.com/lab-app/#/elements/radio-button), which
the sample tests do not cover yet.

Allow about 20 minutes. The first setup downloads about 45 MB of npm packages and Chromium
(about 750 MB on disk).

## 1. Prerequisites

```powershell
node --version
```
```powershell
git --version
```

- [ ] Node.js is **v22.18.0 or later**.
- [ ] Git is installed.
- [ ] https://qacortex.com/lab-app/ opens in your browser.

## 2. Clone, install and configure

```powershell
git clone https://github.com/QACortex/qa-cortex-framework.git
```
```powershell
cd qa-cortex-framework/automation
```
```powershell
npm run setup
```

- [ ] The last line is `Setup complete. Next: npm test`.
- [ ] `.env` exists in `automation/`, created from `.env.example`. Its placeholder values work as they are.
- [ ] `git status` shows no changed files: setup changes nothing that Git tracks.

## 3. Run the sample tests

```powershell
npm test
```
```powershell
npm run test:smoke
```

- [ ] `npm test`: the first line shows `[qa-cortex] profile=local baseURL=https://qacortex.com/lab-app/`; the result is **22 passed**.
- [ ] `npm run test:smoke`: **6 passed**.
- [ ] Optional: `npm run test:headed -- tests/ui/check-box.spec.ts` shows the browser at work.

## 4. Create a page object

Create `pages/radio-button.page.ts`:

```ts
import type { Locator, Page } from '@playwright/test';
import { ScenarioMenu } from '../components/scenario-menu.js';

/** Lab scenario "Radio Button": delivery and payment choices. */
export class RadioButtonPage {
  static readonly path = '#/elements/radio-button';

  readonly menu: ScenarioMenu;
  readonly heading: Locator;
  readonly radios: Locator;

  constructor(readonly page: Page) {
    this.menu = new ScenarioMenu(page);
    this.heading = page.getByRole('heading', { level: 1, name: 'Radio Button', exact: true });
    this.radios = page.getByRole('radio');
  }

  async open(): Promise<void> {
    await this.page.goto(RadioButtonPage.path);
  }

  /** A group of choices, for example "Delivery Method". */
  group(name: string): Locator {
    return this.page.getByRole('group', { name });
  }

  /** The radio button labelled exactly `name`, for example "Bank Transfer". */
  option(name: string): Locator {
    return this.page.getByRole('radio', { name, exact: true });
  }
}
```

- [ ] The file is saved. (It is checked in step 7.)

## 5. Create JSON test data

Create `data/radio-button.json`:

```json
{
  "total": 8,
  "groups": [
    { "name": "Delivery Method", "options": 4 },
    { "name": "Payment Method", "options": 4 }
  ],
  "selectedByDefault": "Standard Delivery",
  "choices": ["Bank Transfer", "Credit Card"],
  "unavailable": "Same-Day Delivery (Unavailable)"
}
```

- [ ] The file is saved.

## 6. Register a page object fixture

In `tests/fixtures.ts`, make three additions:

1. Next to the other page imports:

   ```ts
   import { RadioButtonPage } from '../pages/radio-button.page.js';
   ```

2. In the `PageFixtures` type:

   ```ts
   radioButtonPage: RadioButtonPage;
   ```

3. In the `.extend<PageFixtures>({ ... })` object:

   ```ts
   radioButtonPage: ({ page }, use) => use(new RadioButtonPage(page)),
   ```

- [ ] The file is saved.

## 7. Create and run a new test

Create `tests/ui/radio-button.spec.ts`:

```ts
// Lab scenario "Radio Button": groups, the default choice, data-driven selection, a disabled option.
import data from '../../data/radio-button.json' with { type: 'json' };
import { expect, test } from '../fixtures.js';

test.describe('Radio Button', { tag: '@regression' }, () => {
  test.beforeEach(async ({ radioButtonPage }) => {
    await radioButtonPage.open();
    await expect(radioButtonPage.heading).toBeVisible();
  });

  test('shows both groups with their options and the default choice', { tag: '@smoke' }, async ({ radioButtonPage }) => {
    await expect(radioButtonPage.radios).toHaveCount(data.total);
    for (const group of data.groups) {
      await expect(radioButtonPage.group(group.name).getByRole('radio'), group.name).toHaveCount(group.options);
    }
    await expect(radioButtonPage.option(data.selectedByDefault)).toBeChecked();
  });

  // Data-driven: one test per choice in data/radio-button.json.
  for (const choice of data.choices) {
    test(`selects "${choice}"`, async ({ radioButtonPage, qaLog }) => {
      const option = radioButtonPage.option(choice);
      await expect(option).not.toBeChecked();
      await option.check();
      await expect(option).toBeChecked();
      qaLog.info('payment method selected', { choice });
    });
  }

  test('an unavailable option cannot be selected', async ({ radioButtonPage }) => {
    const unavailable = radioButtonPage.option(data.unavailable);
    await expect(unavailable).toBeDisabled();
    await expect(unavailable).not.toBeChecked();
  });
});
```

Check and run it:

```powershell
npm run typecheck
```
```powershell
npm run lint
```
```powershell
npm test -- tests/ui/radio-button.spec.ts
```
```powershell
npm run test:smoke
```

- [ ] `typecheck` and `lint` finish without errors.
- [ ] The new spec: **4 passed**: the groups test, `selects "Bank Transfer"`, `selects "Credit Card"` and the unavailable option.
- [ ] `npm run test:smoke`: **7 passed** (the new groups test is also `@smoke`).
- [ ] The terminal shows `[info] payment method selected {"choice":"Bank Transfer"}`.
- [ ] Optional, another browser: `npx playwright install firefox`, then `npx playwright test --project=firefox tests/ui/radio-button.spec.ts`: **4 passed**.

## 8. Review the HTML report

```powershell
npm test -- tests/ui/radio-button.spec.ts
```
```powershell
npm run report
```

- [ ] The report opens in your browser and lists the 4 tests with their `@regression` (and `@smoke`) tags.
- [ ] Open `selects "Bank Transfer"`: the **Attachments** section has `qa-cortex-log.jsonl` with the log line from the test.
- [ ] Close the report server with Ctrl+C.

## 9. Review the Allure report

```powershell
npm run allure:generate
```
```powershell
npm run allure:open
```

- [ ] `allure:generate` writes `allure-report/`.
- [ ] The Allure report opens on `http://127.0.0.1:<port>` and shows the 4 tests as passed, with `regression` and `smoke` tags.
- [ ] The **Environment** panel shows `profile`, `baseURL`, `preset` and `node`.
- [ ] Close the server with Ctrl+C.

## 10. See a failure report (optional)

1. In `data/radio-button.json`, change `"total": 8` to `"total": 9` and save.
2. Run:

   ```powershell
   npm test -- tests/ui/radio-button.spec.ts
   ```
   ```powershell
   npm run report
   ```

- [ ] The groups test **fails** with `toHaveCount` expecting 9 and receiving 8; the run exits with an error.
- [ ] In the HTML report, the failed test has a **screenshot**, a **video**, a **trace** (open it to step through the test) and the error context.
- [ ] Change `"total"` back to `8`; the spec passes again.

## 11. Clean up (optional)

To remove what you added in steps 4 to 7:

```powershell
git checkout -- tests/fixtures.ts
```
```powershell
Remove-Item pages/radio-button.page.ts, data/radio-button.json, tests/ui/radio-button.spec.ts
```
```bash
rm pages/radio-button.page.ts data/radio-button.json tests/ui/radio-button.spec.ts
```

- [ ] `git status` shows no changed files again.

## Result

| Step | Passed | Notes |
|---|---|---|
| 1. Prerequisites | ☐ | |
| 2. Install and configure | ☐ | |
| 3. Sample tests | ☐ | |
| 4–6. Page object, data, fixture | ☐ | |
| 7. New test | ☐ | |
| 8. HTML report | ☐ | |
| 9. Allure report | ☐ | |
| 10. Failure report (optional) | ☐ | |

If a step fails, see [Troubleshooting](../README.md#troubleshooting).
