import type { Locator, Page } from '@playwright/test';
import { ScenarioMenu } from '../components/scenario-menu.js';

/** Lab scenario "Text Validation": a fund transfer form with required-field and success messages. */
export class TextValidationPage {
  static readonly path = '#/elements/text-validation';

  readonly menu: ScenarioMenu;
  readonly heading: Locator;
  readonly formHeading: Locator;
  readonly accountNumber: Locator;
  readonly submitButton: Locator;
  readonly accountNumberError: Locator;
  readonly accountNumberSuccess: Locator;
  readonly transferButton: Locator;
  readonly transactionMessage: Locator;

  constructor(readonly page: Page) {
    this.menu = new ScenarioMenu(page);
    this.heading = page.getByRole('heading', { level: 1, name: 'Text Validation', exact: true });
    this.formHeading = page.getByRole('heading', { name: 'Fund Transfer', exact: true });
    this.accountNumber = page.getByRole('textbox', { name: 'Account Number *', exact: true });
    this.submitButton = page.getByRole('button', { name: 'Submit', exact: true });
    this.accountNumberError = page.getByTestId('account-number-error');
    this.accountNumberSuccess = page.getByTestId('account-number-success');
    this.transferButton = page.getByRole('button', { name: 'Transfer' });
    this.transactionMessage = page.getByTestId('transaction-message');
  }

  async open(): Promise<void> {
    await this.page.goto(TextValidationPage.path);
  }

  /** Enters the account number (an empty string leaves the field empty) and submits it. */
  async submitAccountNumber(accountNumber: string): Promise<void> {
    if (accountNumber !== '') await this.accountNumber.fill(accountNumber);
    await this.submitButton.click();
  }

  async transferFunds(): Promise<void> {
    await this.transferButton.click();
  }
}
