import type { Locator, Page } from '@playwright/test';
import { ScenarioMenu } from '../components/scenario-menu.js';

/** Lab scenario "Dropdown (HTML Select)": a simple, a dynamic and a multiple select. */
export class DropdownPage {
  static readonly path = '#/elements/dropdown-html-select';

  readonly menu: ScenarioMenu;
  readonly heading: Locator;
  readonly selects: Locator;
  readonly city: Locator;
  readonly account: Locator;
  /** The account shown after choosing one ("<number> Bal - $<amount>"). */
  readonly selectedAccount: Locator;
  readonly languages: Locator;
  readonly selectedLanguages: Locator;

  constructor(readonly page: Page) {
    this.menu = new ScenarioMenu(page);
    this.heading = page.getByRole('heading', { level: 1, name: 'Dropdown (HTML Select)', exact: true });
    this.selects = page.locator('select');
    this.city = page.getByLabel('Choose a City', { exact: true });
    this.account = page.getByLabel('Choose From Account', { exact: true });
    this.selectedAccount = page.getByTestId('selected-account');
    this.languages = page.getByLabel('Choose Programming Languages', { exact: true });
    this.selectedLanguages = page.getByTestId('selected-languages');
  }

  async open(): Promise<void> {
    await this.page.goto(DropdownPage.path);
  }

  /** The option element currently chosen in the account dropdown. */
  chosenAccountOption(): Locator {
    return this.account.locator('option:checked');
  }
}
