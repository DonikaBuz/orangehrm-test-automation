import type { Browser, BrowserContext, Page } from "playwright";

import { config } from "../config/env.js";
import { LoginPage } from "../pages/LoginPage.js";
import type { AccountName } from "../config/accounts.js";

export interface ScenarioSession {
  accountName: AccountName;
  context: BrowserContext;
  page: Page;
  loginPage: LoginPage;
}

export class SessionManager {
  private readonly browser: Browser;
  private readonly sessions = new Map<AccountName, ScenarioSession>();
  private activeAccount: AccountName | null = null;

  constructor(browser: Browser) {
    this.browser = browser;
  }

  async createSession(accountName: AccountName): Promise<ScenarioSession> {
    const existingSession = this.sessions.get(accountName);
    if (existingSession) {
      this.activeAccount = accountName;
      return existingSession;
    }

    let context: BrowserContext | undefined;
    let page: Page | undefined;

    try {
      context = await this.browser.newContext({
        baseURL: config.baseUrl,
        viewport: config.viewport,
        ignoreHTTPSErrors: true,
      });

      await context.tracing.start({
        screenshots: true,
        snapshots: true,
        sources: true,
      });

      page = await context.newPage();
      const loginPage = new LoginPage(page);
      const session: ScenarioSession = {
        accountName,
        context,
        page,
        loginPage,
      };

      this.sessions.set(accountName, session);
      this.activeAccount = accountName;
      return session;
    } catch (error) {
      if (page) {
        await page.close().catch(() => undefined);
      }

      if (context) {
        try {
          await context.tracing.stop();
        } catch {
          // ignore trace cleanup errors after creation failure
        }
        await context.close().catch(() => undefined);
      }

      throw error;
    }
  }

  async switchAccount(accountName: AccountName): Promise<ScenarioSession> {
    return this.getOrCreateSession(accountName);
  }

  async getOrCreateSession(accountName: AccountName): Promise<ScenarioSession> {
    return this.createSession(accountName);
  }

  getActiveSession(): ScenarioSession | undefined {
    if (this.activeAccount === null) {
      return undefined;
    }

    return this.sessions.get(this.activeAccount);
  }

  getSession(accountName: AccountName): ScenarioSession | undefined {
    return this.sessions.get(accountName);
  }

  getAllAccountNames(): AccountName[] {
    return [...this.sessions.keys()];
  }

  async closeAll(): Promise<void> {
    const sessions = [...this.sessions.values()];
    this.sessions.clear();
    this.activeAccount = null;

    await Promise.all(
      sessions.map(async (session) => {
        try {
          await session.context.tracing.stop();
        } catch {
          // successful traces are discarded and failed trace stops do not mask the scenario failure
        }

        try {
          await session.context.close();
        } catch {
          // close all contexts even when some fail
        }
      }),
    );
  }
}
