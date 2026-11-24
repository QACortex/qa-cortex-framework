// Lab navigation: the reusable ScenarioMenu component, data-driven from data/scenarios.json.
// One test per scenario (native parameterisation: a loop that declares tests).
import { ScenarioMenu } from '../../components/scenario-menu.js';
import data from '../../data/scenarios.json' with { type: 'json' };
import { expect, test } from '../fixtures.js';

test.describe('Lab navigation through the Scenarios menu', { tag: '@smoke' }, () => {
  for (const scenario of data.scenarios) {
    test(`opens "${scenario.menu}"`, async ({ page, qaConfig, qaLog }) => {
      const menu = new ScenarioMenu(page);
      await page.goto('./'); // the lab's overview page, from the selected profile's baseURL

      await menu.open(scenario.category, scenario.menu);
      qaLog.info('opened scenario from the menu', { category: scenario.category, scenario: scenario.menu, profile: qaConfig.profile });

      await expect(page).toHaveURL(new URL(scenario.path, qaConfig.baseURL).href);
      await expect(page.getByRole('heading', { level: 1, name: scenario.heading, exact: true })).toBeVisible();
      await expect(page).toHaveTitle(`${scenario.heading} | ${qaConfig.site.titleContains}`);
    });
  }
});
