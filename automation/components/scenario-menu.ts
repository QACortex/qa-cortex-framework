import type { Locator, Page } from '@playwright/test';

/**
 * The lab's "Scenarios" sidebar, present on every page. A component, not a base class: page
 * objects that need it hold one (composition), and tests reach it as `somePage.menu`.
 *
 * Scenarios are grouped in collapsible categories ("Elements", "Widgets", ...). The category of
 * the current page is open; others are collapsed, so their links do not exist until expanded.
 */
export class ScenarioMenu {
  readonly root: Locator;

  constructor(page: Page) {
    this.root = page.getByRole('complementary', { name: 'Scenarios' });
  }

  /** A category button. Its accessible name is "<category> <count> <+|−>", so match the start. */
  category(name: string): Locator {
    return this.root.getByRole('button', { name: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} \\d`) });
  }

  /** The menu entry with exactly this text, for example "Text Box". */
  link(name: string): Locator {
    return this.root.getByRole('link', { name, exact: true });
  }

  /** Expands a category unless it is already open (a click on an open category closes it). */
  async expand(category: string): Promise<void> {
    const button = this.category(category);
    if ((await button.getAttribute('aria-expanded')) !== 'true') await button.click();
  }

  /** Opens a scenario through the menu, as a user would: expand its category, click its link. */
  async open(category: string, name: string): Promise<void> {
    await this.expand(category);
    await this.link(name).click();
  }
}
