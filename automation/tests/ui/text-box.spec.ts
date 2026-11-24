// Lab scenario "Text Box": editable, read-only and disabled fields (page object fixture + JSON data).
import data from '../../data/text-box.json' with { type: 'json' };
import { expect, test } from '../fixtures.js';

test.describe('Text Box', { tag: '@regression' }, () => {
  test.beforeEach(async ({ textBoxPage }) => {
    await textBoxPage.open();
    await expect(textBoxPage.formHeading).toBeVisible();
  });

  // Data-driven: one test per name in data/text-box.json.
  for (const fullName of data.fullNames) {
    test(`accepts and clears the full name "${fullName}"`, async ({ textBoxPage }) => {
      const field = textBoxPage.fullName;
      await expect(field).toBeEditable();

      await field.fill(fullName);
      await expect(field).toHaveValue(fullName);

      await field.clear();
      await expect(field).toHaveValue('');
    });
  }

  test('distinguishes a read-only field from a disabled one', async ({ textBoxPage }) => {
    // Read-only: enabled, but not editable (toBeDisabled() would fail here).
    await expect(textBoxPage.employeeId).toBeVisible();
    await expect(textBoxPage.employeeId).not.toBeEditable();
    await expect(textBoxPage.employeeId).toHaveAttribute('readonly', '');
    await expect(textBoxPage.employeeId).toHaveValue(data.employeeId);

    // Disabled: not reachable through normal user actions.
    await expect(textBoxPage.companyName).toBeDisabled();
    await expect(textBoxPage.companyName).toHaveValue(data.companyName);
  });
});
