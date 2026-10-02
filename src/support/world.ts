import {
  setWorldConstructor,
  type IWorldOptions,
  World,
} from "@cucumber/cucumber";
import { randomUUID } from "node:crypto";

import type { AccountName } from "../config/accounts.js";
import type {
  EmployeeCustomFields,
  EmployeeDetails,
  EmployeePersonalDetails,
  EmployeeProfile,
  SavedSection,
} from "../pages/PimPage.js";
import type {
  PimReportCreationResult,
  PimReportCreateDeleteResult,
} from "../pages/PimReportsPage.js";
import type { SessionManager } from "./session-manager.js";

export type ScenarioData = Record<string, unknown>;

export class OrangeHrmWorld extends World {
  public sessionManager!: SessionManager;
  public selectedAccount: AccountName = "administrator";
  public scenarioData: ScenarioData = {};
  public employeeProfileUnderTest?: EmployeeProfile;
  public employeeUnderTest?: EmployeeDetails;
  public employeeCreationNotificationVisible = false;
  public personalDetailsUnderTest?: SavedSection<EmployeePersonalDetails>;
  public customFieldsUnderTest?: SavedSection<EmployeeCustomFields>;
  public employeeAttachmentUnderTest?: {
    fileName: string;
    successNotificationVisible: boolean;
  };
  public pimReportUnderTest?: PimReportCreationResult;
  public pimReportCreateDeleteUnderTest?: PimReportCreateDeleteResult;
  public traceEnabled = true;
  public scenarioName = "scenario";
  public artifactId = `${Date.now()}-${randomUUID()}`;
  public artifactDirectory = "reports/artifacts";

  constructor(options: IWorldOptions) {
    super(options);
    this.scenarioData = {};
    this.artifactId = `${Date.now()}-${randomUUID()}`;
  }
}

setWorldConstructor(OrangeHrmWorld);
