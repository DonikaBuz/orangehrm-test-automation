import {
  After,
  AfterAll,
  Before,
  BeforeAll,
  Status,
  setDefaultTimeout,
} from "@cucumber/cucumber";
import type { ITestCaseHookParameter } from "@cucumber/cucumber";
import { chromium, firefox, webkit } from "playwright";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { config } from "../config/env.js";
import { SessionManager } from "./session-manager.js";
import type { OrangeHrmWorld } from "./world.js";

const browserFactories = {
  chromium,
  firefox,
  webkit,
} as const;

type WorkerBrowser = Awaited<ReturnType<typeof chromium.launch>>;

let workerBrowser: WorkerBrowser | null = null;

setDefaultTimeout(config.stepTimeout);

const getWorkerBrowser = async (): Promise<WorkerBrowser> => {
  const factory = browserFactories[config.browser];
  return factory.launch({
    headless: config.headless,
  });
};

BeforeAll(async function () {
  workerBrowser = await getWorkerBrowser();
});

Before(async function (this: OrangeHrmWorld, scenario: ITestCaseHookParameter) {
  if (!workerBrowser) {
    throw new Error(
      "Worker browser was not initialized before the scenario hook.",
    );
  }

  this.sessionManager = new SessionManager(workerBrowser);
  this.selectedAccount = "administrator";
  this.scenarioData = {};
  this.artifactId = `${scenario.pickle.name ?? "scenario"}-${Date.now()}-${randomUUID().slice(0, 8)}`;
  this.artifactDirectory = path.join(
    process.cwd(),
    config.artifactsDir,
    this.artifactId,
  );

  await mkdir(this.artifactDirectory, { recursive: true });
});

After(async function (this: OrangeHrmWorld, scenario: ITestCaseHookParameter) {
  const sessionNames = this.sessionManager?.getAllAccountNames() ?? [];

  for (const accountName of sessionNames) {
    const session = this.sessionManager.getSession(accountName);
    if (!session) {
      continue;
    }

    const tracePath = path.join(this.artifactDirectory, `${accountName}.zip`);

    try {
      if (scenario.result?.status === Status.FAILED) {
        const screenshotPath = path.join(
          this.artifactDirectory,
          `${accountName}-failure.png`,
        );

        await session.page.screenshot({
          path: screenshotPath,
          fullPage: true,
        });

        const screenshot = await readFile(screenshotPath);
        this.attach(screenshot, "image/png");
        await session.context.tracing.stop({ path: tracePath });
      } else {
        await session.context.tracing.stop();
      }
    } catch (error) {
      const message = `Artifact collection failed for ${accountName}: ${String(error)}`;
      this.attach(message, "text/plain");
    }
  }

  try {
    await this.sessionManager.closeAll();
  } catch {
    // teardown must proceed even if closing one context fails
  }
});

AfterAll(async function () {
  if (workerBrowser) {
    await workerBrowser.close();
  }
});
