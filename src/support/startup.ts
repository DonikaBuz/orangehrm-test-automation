import {
  Before,
  BeforeAll,
  AfterStep,
  setDefaultTimeout,
  type ITestCaseHookParameter,
} from "@cucumber/cucumber";
import { mkdir } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";

import { config } from "../config/env.js";
import { SessionManager } from "./session-manager.js";
import type { OrangeHrmWorld } from "./world.js";
import { getWorkerBrowser, startWorkerBrowser } from "./worker-browser.js";

setDefaultTimeout(config.stepTimeout);

BeforeAll({ timeout: config.navigationTimeout }, async function () {
  await startWorkerBrowser();
});

Before(async function (this: OrangeHrmWorld, scenario: ITestCaseHookParameter) {
  this.scenarioName = scenario.pickle.name ?? "scenario";
  this.artifactId = `${sanitize(this.scenarioName)}-${randomUUID()}`;
  this.artifactDirectory = path.join(
    process.cwd(),
    config.artifactsDir,
    this.artifactId,
  );
  this.traceEnabled = !scenario.pickle.tags.some((tag) =>
    tag.name.includes("@sensitive"),
  );
  this.sessionManager = new SessionManager(
    getWorkerBrowser(),
    this.artifactDirectory,
    config.recordVideo && this.traceEnabled,
  );
  this.selectedAccount = "administrator";
  this.scenarioData = {};
  this.employeeProfileUnderTest = undefined;
  this.employeeUnderTest = undefined;
  this.employeeCreationNotificationVisible = false;
  this.personalDetailsUnderTest = undefined;
  this.customFieldsUnderTest = undefined;
  this.employeeAttachmentUnderTest = undefined;
  this.pimReportUnderTest = undefined;
  this.pimReportCreateDeleteUnderTest = undefined;

  await mkdir(this.artifactDirectory, { recursive: true });
});

AfterStep(async function (this: OrangeHrmWorld) {
  if (process.env.PWDEBUG !== "1") return;

  const session = this.sessionManager.activeSession();
  if (session) {
    await session.page.pause();
  }
});

function sanitize(name: string): string {
  return (
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "scenario"
  );
}
