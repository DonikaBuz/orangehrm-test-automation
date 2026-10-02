import { strict as assert } from "node:assert";
import type { Locator, Page } from "playwright";

export class LoginPage {
  readonly username: Locator;
  readonly password: Locator;
  readonly loginButton: Locator;
  readonly dashboardHeading: Locator;

  constructor(private readonly page: Page) {
    this.username = page.getByRole("textbox", { name: "Username" });
    this.password = page.getByRole("textbox", { name: "Password" });
    this.loginButton = page.getByRole("button", { name: "Login" });
    this.dashboardHeading = page.getByRole("heading", { name: "Dashboard" });
  }

  async open(): Promise<void> {
    await this.page.goto("/web/index.php/auth/login");
    await this.username.waitFor({ state: "visible" });
  }

  async login(username: string, password: string): Promise<void> {
    await this.username.fill(username);
    await this.password.fill(password);
    await this.loginButton.click();
    await this.dashboardHeading.waitFor({ state: "visible" });
    assert.match(this.page.url(), /\/web\/index\.php\/dashboard\/index$/);
  }
}
