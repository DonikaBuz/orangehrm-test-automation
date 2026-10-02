import { chromium, firefox, webkit } from "playwright";
import type { Browser } from "playwright";

import { config } from "../config/env.js";

const browsers = { chromium, firefox, webkit };
let workerBrowser: Browser | undefined;

export async function startWorkerBrowser(): Promise<void> {
  const factory = browsers[config.browser];
  workerBrowser = await factory.launch({
    headless: process.env.PWDEBUG === "1" ? false : config.headless,
    timeout: config.navigationTimeout,
  });
}

export function getWorkerBrowser(): Browser {
  if (!workerBrowser) {
    throw new Error("The worker browser has not been started.");
  }
  return workerBrowser;
}

export async function stopWorkerBrowser(): Promise<void> {
  const browser = workerBrowser;
  workerBrowser = undefined;
  await browser?.close();
}
