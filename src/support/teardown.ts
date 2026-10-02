import {
  After,
  AfterAll,
  Status,
  type ITestCaseHookParameter,
} from "@cucumber/cucumber";
import { readFile, rm } from "node:fs/promises";
import path from "node:path";

import type { ScenarioSession } from "./session-manager.js";
import type { OrangeHrmWorld } from "./world.js";
import { stopWorkerBrowser } from "./worker-browser.js";

After(async function (this: OrangeHrmWorld, scenario: ITestCaseHookParameter) {
  const sessions = this.sessionManager?.allSessions() ?? [];
  const failed = scenario.result?.status === Status.FAILED;
  const errors: unknown[] = [];

  const attach = (data: Buffer, mediaType: string): void => {
    try {
      this.attach(data, mediaType);
    } catch (error) {
      errors.push(error);
    }
  };

  try {
    if (failed) {
      for (const session of sessions) {
        await captureScreenshot(this, session, attach, errors);
        await saveTrace(this, session, attach, errors);
        if (session.diagnostics.length > 0) {
          attach(
            Buffer.from(
              JSON.stringify({
                account: session.accountName,
                diagnostics: session.diagnostics,
              }),
            ),
            "application/json",
          );
        }
      }
    } else {
      for (const session of sessions) {
        await discardTrace(session, errors);
      }
    }
  } finally {
    try {
      await this.sessionManager?.closeAll();
    } catch (error) {
      errors.push(error);
    }

    for (const session of sessions) {
      await finalizeVideo(
        this,
        session,
        failed || errors.length > 0,
        attach,
        errors,
      );
    }
  }

  if (errors.length > 0) {
    const details = errors.map(formatError).join("\n");
    attach(Buffer.from(`Secondary teardown errors:\n${details}`), "text/plain");
    if (!failed) {
      throw new AggregateError(errors, "Scenario teardown failed.");
    }
    return;
  }

  if (!failed) {
    await rm(this.artifactDirectory, { recursive: true, force: true });
  }
});

AfterAll(async function () {
  await stopWorkerBrowser();
});

async function captureScreenshot(
  world: OrangeHrmWorld,
  session: ScenarioSession,
  attach: (data: Buffer, mediaType: string) => void,
  errors: unknown[],
): Promise<void> {
  try {
    const screenshot = await session.page.screenshot({
      path: path.join(
        world.artifactDirectory,
        `${session.accountName}-failure.png`,
      ),
      fullPage: true,
    });
    attach(
      Buffer.from(`Failure screenshot for account: ${session.accountName}`),
      "text/plain",
    );
    attach(screenshot, "image/png");
  } catch (error) {
    errors.push(error);
  }
}

async function saveTrace(
  world: OrangeHrmWorld,
  session: ScenarioSession,
  attach: (data: Buffer, mediaType: string) => void,
  errors: unknown[],
): Promise<void> {
  if (!session.traceStarted) return;

  const tracePath = path.join(
    world.artifactDirectory,
    `${session.accountName}-trace.zip`,
  );
  try {
    await session.context.tracing.stop({ path: tracePath });
    attach(
      Buffer.from(`Playwright trace for account: ${session.accountName}`),
      "text/plain",
    );
    attach(await readFile(tracePath), "application/zip");
  } catch (error) {
    errors.push(error);
  } finally {
    session.traceStarted = false;
  }
}

async function discardTrace(
  session: ScenarioSession,
  errors: unknown[],
): Promise<void> {
  if (!session.traceStarted) return;
  try {
    await session.context.tracing.stop();
  } catch (error) {
    errors.push(error);
  } finally {
    session.traceStarted = false;
  }
}

async function finalizeVideo(
  world: OrangeHrmWorld,
  session: ScenarioSession,
  failed: boolean,
  attach: (data: Buffer, mediaType: string) => void,
  errors: unknown[],
): Promise<void> {
  try {
    const video = session.page.video();
    if (!video) return;

    const originalPath = await video.path();
    if (failed) {
      const retainedPath = path.join(
        world.artifactDirectory,
        `${session.accountName}-failure.webm`,
      );
      await video.saveAs(retainedPath);
      attach(
        Buffer.from(`Video recording for account: ${session.accountName}`),
        "text/plain",
      );
      attach(await readFile(retainedPath), "video/webm");
    }
    await video.delete();
    await rm(path.dirname(originalPath), { recursive: true, force: true });
  } catch (error) {
    errors.push(error);
  }
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
