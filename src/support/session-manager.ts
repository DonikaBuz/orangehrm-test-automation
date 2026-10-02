import type { Browser, BrowserContext, Page } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";

import type { AccountName } from "../config/accounts.js";
import { config } from "../config/env.js";
import { LoginPage } from "../pages/LoginPage.js";
import { PimPage } from "../pages/PimPage.js";
import { PimReportsPage } from "../pages/PimReportsPage.js";

export interface ScenarioSession {
  accountName: AccountName;
  context: BrowserContext;
  page: Page;
  loginPage: LoginPage;
  pimPage: PimPage;
  pimReportsPage: PimReportsPage;
  diagnostics: string[];
  traceStarted: boolean;
  authenticated: boolean;
}

export class SessionManager {
  private readonly sessions = new Map<AccountName, ScenarioSession>();
  private activeAccount: AccountName | undefined;

  constructor(
    private readonly browser: Browser,
    private readonly artifactDirectory: string,
    private readonly recordVideo = config.recordVideo,
  ) {}

  async sessionFor(accountName: AccountName): Promise<ScenarioSession> {
    const existing = this.sessions.get(accountName);
    if (existing) {
      this.activeAccount = accountName;
      return existing;
    }

    const recordingDirectory = path.join(
      this.artifactDirectory,
      "recordings",
      accountName,
    );
    let context: BrowserContext | undefined;

    try {
      if (this.recordVideo) {
        await mkdir(recordingDirectory, { recursive: true });
      }

      context = await this.browser.newContext({
        baseURL: config.baseUrl,
        viewport: config.viewport,
        recordVideo: this.recordVideo ? { dir: recordingDirectory } : undefined,
      });
      context.setDefaultTimeout(config.actionTimeout);
      context.setDefaultNavigationTimeout(config.navigationTimeout);

      const page = await context.newPage();
      const session: ScenarioSession = {
        accountName,
        context,
        page,
        loginPage: new LoginPage(page),
        pimPage: new PimPage(page),
        pimReportsPage: new PimReportsPage(page),
        diagnostics: [],
        traceStarted: false,
        authenticated: false,
      };

      collectDiagnostics(page, session.diagnostics);
      this.sessions.set(accountName, session);
      this.activeAccount = accountName;
      return session;
    } catch (error) {
      if (context) {
        try {
          await context.close();
        } catch (closeError) {
          throw new AggregateError(
            [error, closeError],
            "Session creation failed and its partial context could not be closed.",
            { cause: closeError },
          );
        }
      }
      throw error;
    }
  }

  activeSession(): ScenarioSession | undefined {
    return this.activeAccount
      ? this.sessions.get(this.activeAccount)
      : undefined;
  }

  authenticatedSession(): ScenarioSession {
    const session = this.activeSession();
    if (!session?.authenticated) {
      throw new Error(
        "The selected account must authenticate before protected actions.",
      );
    }
    return session;
  }

  markAuthenticated(accountName: AccountName): void {
    const session = this.sessions.get(accountName);
    if (!session) {
      throw new Error(`Create ${accountName}'s session before authenticating.`);
    }
    session.authenticated = true;
  }

  async startTracing(accountName: AccountName): Promise<void> {
    const session = this.sessions.get(accountName);
    if (!session) {
      throw new Error(`Create ${accountName}'s session before tracing.`);
    }
    if (session.traceStarted) return;

    await session.context.tracing.start({
      screenshots: true,
      snapshots: true,
      sources: true,
    });
    session.traceStarted = true;
  }

  sessionForAccount(accountName: AccountName): ScenarioSession | undefined {
    return this.sessions.get(accountName);
  }

  allSessions(): ScenarioSession[] {
    return [...this.sessions.values()];
  }

  async closeAll(): Promise<void> {
    const sessions = this.allSessions();
    this.sessions.clear();
    this.activeAccount = undefined;

    const results = await Promise.allSettled(
      sessions.map(({ context }) => context.close()),
    );
    const errors = results.flatMap((result, index) =>
      result.status === "rejected"
        ? [
            new Error(
              `Could not close the ${sessions[index]?.accountName} context: ${String(result.reason)}`,
            ),
          ]
        : [],
    );

    if (errors.length > 0) {
      throw new AggregateError(
        errors,
        "One or more browser contexts failed to close.",
      );
    }
  }
}

function collectDiagnostics(page: Page, diagnostics: string[]): void {
  const add = (message: string): void => {
    if (diagnostics.length < 25) diagnostics.push(message.slice(0, 2_000));
  };

  page.on("console", (message) => {
    if (message.type() === "error") add(`console: ${message.text()}`);
  });
  page.on("pageerror", (error) => add(`page: ${error.message}`));
  page.on("requestfailed", (request) => {
    let requestPath = "invalid request URL";
    try {
      const url = new URL(request.url());
      requestPath = `${url.origin}${url.pathname}`;
    } catch (error) {
      if (!(error instanceof TypeError)) throw error;
    }
    add(
      `request: ${requestPath} (${request.failure()?.errorText ?? "failed"})`,
    );
  });
}
