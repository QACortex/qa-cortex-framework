import type { Locator, Page } from '@playwright/test';
import { ScenarioMenu } from '../components/scenario-menu.js';

/** Lab scenario "Text Box": an editable, a read-only and a disabled text field. */
export class TextBoxPage {
  /** Relative to baseURL (the selected QA Cortex profile). */
  static readonly path = '#/elements/text-box';

  readonly menu: ScenarioMenu;
  readonly heading: Locator;
  readonly formHeading: Locator;
  readonly fullName: Locator;
  /** Read-only: focusable and copyable, but not editable. */
  readonly employeeId: Locator;
  /** Disabled: not reachable through normal user actions. */
  readonly companyName: Locator;

  constructor(readonly page: Page) {
    this.menu = new ScenarioMenu(page);
    this.heading = page.getByRole('heading', { level: 1, name: 'Text Box', exact: true });
    this.formHeading = page.getByRole('heading', { name: 'User Information Form', exact: true });
    this.fullName = page.getByRole('textbox', { name: 'Full Name' });
    this.employeeId = page.getByLabel('Employee ID (Read-Only)');
    this.companyName = page.getByLabel('Company Name (Disabled)');
  }

  async open(): Promise<void> {
    await this.page.goto(TextBoxPage.path);
  }
}
