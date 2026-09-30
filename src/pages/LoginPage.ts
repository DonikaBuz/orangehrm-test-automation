import { strict as assert } from "node:assert";
import type { Locator, Page } from "playwright";

import { config } from "../config/env.js";

export class LoginPage {
  readonly page: Page;
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly forgotPasswordLink: Locator;
  readonly loginForm: Locator;

  constructor(page: Page) {
    this.page = page;
    this.usernameInput = page.locator('input[name="username"]');
    this.passwordInput = page.locator('input[name="password"]');
    this.loginButton = page.locator('button[type="submit"]');
    this.forgotPasswordLink = page.getByRole("link", {
      name: /forgot your password/i,
    });
    this.loginForm = page.locator("form").first();
  }

  async open(): Promise<void> {
    await this.page.goto(`${config.baseUrl}/web/index.php/auth/login`, {
      waitUntil: "networkidle",
      timeout: config.navigationTimeout,
    });

    await this.usernameInput.waitFor({
      state: "visible",
      timeout: config.actionTimeout,
    });
  }

  async login(username: string, password: string): Promise<void> {
    await this.usernameInput.waitFor({
      state: "visible",
      timeout: config.actionTimeout,
    });

    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }

  async verifySuccessfulLogin(): Promise<void> {
    await this.page.waitForURL(/\/web\/index\.php\/dashboard\/index$/, {
      timeout: config.navigationTimeout,
    });

    assert.ok(
      /\/web\/index\.php\/dashboard\/index$/.test(this.page.url()),
      "Expected to land on the OrangeHRM dashboard after a successful login.",
    );
  }

  async loginAndVerify(username: string, password: string): Promise<void> {
    await this.open();
    await this.login(username, password);
    await this.verifySuccessfulLogin();
  }
}
