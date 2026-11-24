import type { Locator, Page } from '@playwright/test';
import { ScenarioMenu } from '../components/scenario-menu.js';

/** Lab scenario "Check Box": product category filters with Select All and Deselect All. */
export class CheckBoxPage {
  static readonly path = '#/elements/check-box';

  readonly menu: ScenarioMenu;
  readonly heading: Locator;
  readonly checkboxes: Locator;
  readonly selectAllButton: Locator;
  readonly deselectAllButton: Locator;

  constructor(readonly page: Page) {
    this.menu = new ScenarioMenu(page);
    this.heading = page.getByRole('heading', { level: 1, name: 'Check Box', exact: true });
    this.checkboxes = page.getByRole('checkbox');
    this.selectAllButton = page.getByRole('button', { name: 'Select All', exact: true });
    this.deselectAllButton = page.getByRole('button', { name: 'Deselect All', exact: true });
  }

  async open(): Promise<void> {
    await this.page.goto(CheckBoxPage.path);
  }

  /** The checkbox labelled exactly `name`, for example "Books". */
  category(name: string): Locator {
    return this.page.getByRole('checkbox', { name, exact: true });
  }

  async selectAll(): Promise<void> {
    await this.selectAllButton.click();
  }

  async deselectAll(): Promise<void> {
    await this.deselectAllButton.click();
  }
}
