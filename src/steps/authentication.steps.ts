import { strict as assert } from "node:assert";
import { Given, Then, When } from "@cucumber/cucumber";

import { getAccount, resolveAccountName } from "../config/accounts.js";
import type { OrangeHrmWorld } from "../support/world.js";

Given("I open the OrangeHRM login page", async function (this: OrangeHrmWorld) {
  const accountName = resolveAccountName("administrator");
  const session = await this.sessionManager.sessionFor(accountName);
  this.selectedAccount = accountName;
  await session.loginPage.open();
});

Given(
  "I am logged in as {string}",
  async function (this: OrangeHrmWorld, accountValue: string) {
    await loginAs.call(this, accountValue);
  },
);

When(
  "I log in as {string}",
  async function (this: OrangeHrmWorld, accountValue: string) {
    await loginAs.call(this, accountValue);
  },
);

Then("I should see the dashboard", function (this: OrangeHrmWorld) {
  const session = this.sessionManager.authenticatedSession();
  assert.match(session.page.url(), /\/web\/index\.php\/dashboard\/index$/);
});

async function loginAs(
  this: OrangeHrmWorld,
  accountValue: string,
): Promise<void> {
  const accountName = resolveAccountName(accountValue);
  const session = await this.sessionManager.sessionFor(accountName);
  this.selectedAccount = accountName;
  const account = getAccount(accountName);

  if (!session.page.url().endsWith("/auth/login")) {
    await session.loginPage.open();
  }
  await session.loginPage.login(account.username, account.password);
  this.sessionManager.markAuthenticated(accountName);
  if (this.traceEnabled) {
    await this.sessionManager.startTracing(accountName);
  }
  this.log(`Authenticated actor=${accountName}`);
}
