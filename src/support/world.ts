import {
  setWorldConstructor,
  type IWorldOptions,
  World,
} from "@cucumber/cucumber";
import { randomUUID } from "node:crypto";

import type { AccountName } from "../config/accounts.js";
import type { SessionManager } from "./session-manager.js";

export type ScenarioData = Record<string, unknown>;

export class OrangeHrmWorld extends World {
  public sessionManager!: SessionManager;
  public selectedAccount: AccountName = "administrator";
  public scenarioData: ScenarioData = {};
  public artifactId = `${Date.now()}-${randomUUID().slice(0, 8)}`;
  public artifactDirectory = "reports/artifacts";

  constructor(options: IWorldOptions) {
    super(options);
    this.scenarioData = {};
    this.artifactId = `${Date.now()}-${randomUUID().slice(0, 8)}`;
  }
}

setWorldConstructor(OrangeHrmWorld);
