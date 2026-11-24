// Lab scenario "Check Box": default states, single selection and Select All / Deselect All.
import data from '../../data/check-box.json' with { type: 'json' };
import { expect, test } from '../fixtures.js';

test.describe('Check Box', () => {
  test.beforeEach(async ({ checkBoxPage }) => {
    await checkBoxPage.open();
    await expect(checkBoxPage.heading).toBeVisible();
  });

  test('shows every category with its default state; the premium category is unavailable', async ({ checkBoxPage }) => {
    await expect(checkBoxPage.checkboxes).toHaveCount(data.total);
    for (const { name, checkedByDefault } of data.categories) {
      const box = checkBoxPage.category(name);
      await expect(box, name).toBeEnabled();
      await expect(box, name).toBeChecked({ checked: checkedByDefault });
    }
    const premium = checkBoxPage.category(data.unavailable);
    await expect(premium).toBeDisabled();
    await expect(premium).not.toBeChecked();
  });

  test('checks and unchecks single categories', async ({ checkBoxPage }) => {
    const books = checkBoxPage.category('Books');
    await books.check();
    await expect(books).toBeChecked();

    const electronics = checkBoxPage.category('Electronics');
    await electronics.uncheck();
    await expect(electronics).not.toBeChecked();
  });

  test('Select All checks every available category; Deselect All clears them', async ({ checkBoxPage, qaLog }) => {
    await checkBoxPage.selectAll();
    for (const { name } of data.categories) await expect(checkBoxPage.category(name), name).toBeChecked();
    await expect(checkBoxPage.category(data.unavailable)).not.toBeChecked();
    qaLog.info('all available categories selected', { count: data.categories.length });

    await checkBoxPage.deselectAll();
    for (const { name } of data.categories) await expect(checkBoxPage.category(name), name).not.toBeChecked();
  });
});
