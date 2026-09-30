import { strict as assert } from "node:assert";

import { Given, Then, When } from "@cucumber/cucumber";

import { administratorAccount } from "../config/accounts.js";
import type { OrangeHrmWorld } from "../support/world.js";

Given("I open the OrangeHRM login page", async function (this: OrangeHrmWorld) {
  const session = await this.sessionManager.getOrCreateSession("administrator");
  this.selectedAccount = "administrator";
  await session.loginPage.open();
});

When(
  "I log in with the administrator account",
  async function (this: OrangeHrmWorld) {
    const session = await this.sessionManager.switchAccount("administrator");
    await session.loginPage.login(
      administratorAccount.username,
      administratorAccount.password,
    );
    await session.loginPage.verifySuccessfulLogin();
  },
);

Then("I should be on the dashboard", function (this: OrangeHrmWorld) {
  const session = this.sessionManager.getActiveSession();

  assert.ok(session, "No active session was created for the current scenario.");
  assert.ok(
    /\/web\/index\.php\/dashboard\/index$/.test(session.page.url()),
    "Expected the active user to be on the OrangeHRM dashboard.",
  );
});
