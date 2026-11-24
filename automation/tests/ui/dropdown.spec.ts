// Lab scenario "Dropdown (HTML Select)": selection by label, value and index, and multiple select.
import data from '../../data/dropdown.json' with { type: 'json' };
import { expect, test } from '../fixtures.js';

test.describe('Dropdown (HTML Select)', () => {
  test.beforeEach(async ({ dropdownPage }) => {
    await dropdownPage.open();
    await expect(dropdownPage.heading).toBeVisible();
    await expect(dropdownPage.selects).toHaveCount(3);
  });

  // Data-driven: one test per city in data/dropdown.json.
  for (const city of data.cities) {
    test(`selects the city "${city.label}" by its visible text`, async ({ dropdownPage }) => {
      await expect(dropdownPage.city).toHaveValue('');
      await dropdownPage.city.selectOption({ label: city.label });
      await expect(dropdownPage.city).toHaveValue(city.value);
    });
  }

  test('selects an account by value, then by index', async ({ dropdownPage }) => {
    const { account } = data;
    await dropdownPage.account.selectOption(account.value);
    await expect(dropdownPage.account).toHaveValue(account.value);
    await expect(dropdownPage.selectedAccount).toContainText(`${account.value} Bal`);
    await expect(dropdownPage.chosenAccountOption()).toHaveText(new RegExp(`^${account.value} Bal - \\$[\\d,]+\\.\\d{2}$`));

    await dropdownPage.account.selectOption({ index: account.byIndex.index });
    await expect(dropdownPage.account).toHaveValue(account.byIndex.value);
  });

  test('selects several programming languages and changes the selection', async ({ dropdownPage }) => {
    await expect(dropdownPage.languages).toHaveAttribute('multiple', '');
    await expect(dropdownPage.languages).toHaveValues(data.languages.default);

    for (const selection of data.languages.selections) {
      await dropdownPage.languages.selectOption(selection.select);
      await expect(dropdownPage.languages).toHaveValues(selection.values ?? selection.select);
      await expect(dropdownPage.selectedLanguages).toHaveText(selection.shown);
    }
  });
});
