// Lab scenario "Text Validation": a required-field error, a success message and a dynamic
// transaction message (negative and positive paths of one business flow).
import data from '../../data/text-validation.json' with { type: 'json' };
import { expect, test } from '../fixtures.js';

test.describe('Text Validation: fund transfer form', { tag: '@regression' }, () => {
  test.beforeEach(async ({ textValidationPage }) => {
    await textValidationPage.open();
    await expect(textValidationPage.formHeading).toHaveText('Fund Transfer');
  });

  test('an empty account number shows the required-field error', async ({ textValidationPage }) => {
    await textValidationPage.submitAccountNumber('');
    await expect(textValidationPage.accountNumberError).toHaveText(data.messages.required);
    await expect(textValidationPage.accountNumberSuccess).toBeHidden();
  });

  // Also @smoke: the main business flow of this page. Tags add up: describe @regression + test @smoke.
  test('a valid account number is verified and the transfer completes', { tag: '@smoke' }, async ({ textValidationPage, qaLog }) => {
    await textValidationPage.submitAccountNumber(data.validAccountNumber);
    await expect(textValidationPage.accountNumberSuccess).toHaveText(data.messages.verified);
    await expect(textValidationPage.accountNumberError).toBeHidden();
    await expect(textValidationPage.accountNumber).toHaveAttribute('aria-invalid', 'false');

    await expect(textValidationPage.transferButton).toBeEnabled();
    await textValidationPage.transferFunds();
    // Dynamic text: the transaction number changes on every run, so match a pattern.
    await expect(textValidationPage.transactionMessage).toHaveText(new RegExp(data.transactionPattern));
    qaLog.info('transfer completed', { message: await textValidationPage.transactionMessage.textContent() });
  });
});
