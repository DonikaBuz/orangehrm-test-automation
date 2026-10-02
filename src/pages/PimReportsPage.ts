import { randomUUID } from "node:crypto";
import { errors as playwrightErrors } from "playwright";
import type { Locator, Page } from "playwright";

export interface PimReportCreationResult {
  reportName: string;
  successNotificationVisible: boolean;
  displayedReportName: string;
}

export interface PimReportCreateDeleteResult {
  reportName: string;
  creationNotificationVisible: boolean;
  reportNameDisplayed: boolean;
  deletionNotificationVisible: boolean;
  reportRemoved: boolean;
}

export class PimReportsPage {
  constructor(private readonly page: Page) {}

  async createReportUsingEmploymentStatus(
    reportNamePrefix: string,
  ): Promise<PimReportCreationResult> {
    const reportName = `${reportNamePrefix} ${randomUUID().slice(0, 8)}`;
    await this.page.getByRole("link", { name: "PIM", exact: true }).click();
    await this.page.getByRole("link", { name: "Reports", exact: true }).click();
    await this.page.getByRole("button", { name: /Add/ }).click();
    await this.page
      .getByRole("heading", { name: "Add Report", exact: true })
      .waitFor({ state: "visible" });

    await this.fieldGroup("Report Name").locator("input").fill(reportName);
    await this.selectOption("Selection Criteria", "Employment Status");
    await this.sectionRow("Selection Criteria").getByRole("button").click();
    const employmentStatusSelect = this.sectionRow("Selection Criteria")
      .locator(".oxd-select-text")
      .last();
    await employmentStatusSelect.click();
    await this.page
      .getByRole("option", { name: "Full-Time Permanent", exact: true })
      .click();
    await this.selectOption("Select Display Field Group", "Personal");
    await this.selectOption("Select Display Field", "Employee First Name");
    await this.sectionRow("Display Fields").getByRole("button").click();
    const includeHeader = this.page.getByRole("checkbox");
    if (!(await includeHeader.isChecked())) {
      await this.page.locator(".oxd-switch-input").click();
    }
    if (!(await includeHeader.isChecked())) {
      throw new Error("The report's Include Header option was not enabled.");
    }

    const successNotification =
      this.waitForSuccessNotification("Successfully Saved");
    await this.page.getByRole("button", { name: "Save", exact: true }).click();
    const successNotificationVisible = await successNotification;

    await this.page.waitForURL(/\/pim\/displayPredefinedReport\//);
    const reportTitle = this.page.getByText(reportName, { exact: true });
    await reportTitle.waitFor({ state: "visible" });
    const displayedReportName = (await reportTitle.innerText()).trim();

    return { reportName, successNotificationVisible, displayedReportName };
  }

  async createAndDeleteReport(
    reportNamePrefix: string,
  ): Promise<PimReportCreateDeleteResult> {
    const createdReport =
      await this.createReportUsingEmploymentStatus(reportNamePrefix);
    if (
      !createdReport.successNotificationVisible ||
      createdReport.displayedReportName !== createdReport.reportName
    ) {
      throw new Error(
        `Could not verify creation of "${createdReport.reportName}" before deleting it.`,
      );
    }

    await this.page.getByRole("link", { name: "PIM", exact: true }).click();
    await this.page.getByRole("link", { name: "Reports", exact: true }).click();

    const reportNameInput = this.page.getByPlaceholder("Type for hints...");
    await reportNameInput.fill(createdReport.reportName);
    const suggestions = this.page.locator(".oxd-autocomplete-option");
    const exactReportSuggestion = suggestions.filter({
      hasText: createdReport.reportName,
    });
    await exactReportSuggestion
      .filter({ hasNotText: "Searching..." })
      .first()
      .waitFor({ state: "visible" });
    const suggestionNames = await suggestions.allInnerTexts();
    const suggestionIndex = suggestionNames.findIndex(
      (name) => name.trim() === createdReport.reportName,
    );
    if (suggestionIndex < 0) {
      throw new Error(
        `Could not find the newly created report "${createdReport.reportName}" in the suggestions.`,
      );
    }

    await suggestions.nth(suggestionIndex).click();
    const selectedReportName = (await reportNameInput.inputValue()).trim();
    if (selectedReportName !== createdReport.reportName) {
      throw new Error(
        `Expected to select "${createdReport.reportName}", but selected "${selectedReportName}".`,
      );
    }

    await this.page
      .getByRole("button", { name: "Search", exact: true })
      .click();
    const reportRow = this.page
      .locator(".oxd-table-row")
      .filter({
        has: this.page.getByText(createdReport.reportName, { exact: true }),
      })
      .first();
    await reportRow.waitFor({ state: "visible" });
    const deleteButton = reportRow.locator("button:has(.bi-trash)");
    await deleteButton.waitFor({ state: "visible" });
    await deleteButton.click();
    await this.page
      .getByText("Are you Sure?", { exact: false })
      .waitFor({ state: "visible" });

    const deletionNotification = this.waitForSuccessNotification(
      "Successfully Deleted",
    );
    await this.page.getByRole("button", { name: /Yes, Delete/ }).click();
    const deletionNotificationVisible = await deletionNotification;
    await reportRow.waitFor({ state: "hidden" });

    return {
      reportName: createdReport.reportName,
      creationNotificationVisible: createdReport.successNotificationVisible,
      reportNameDisplayed:
        createdReport.displayedReportName === createdReport.reportName,
      deletionNotificationVisible,
      reportRemoved: !(await reportRow.isVisible()),
    };
  }

  private async selectOption(label: string, value: string): Promise<void> {
    await this.fieldGroup(label).locator(".oxd-select-text").click();
    await this.page.getByRole("option", { name: value, exact: true }).click();
  }

  private fieldGroup(label: string): Locator {
    return this.page
      .locator(".oxd-input-group")
      .filter({ has: this.page.getByText(label, { exact: true }) })
      .first();
  }

  private sectionRow(title: string): Locator {
    return this.page
      .locator(".oxd-form-row")
      .filter({
        has: this.page.getByRole("heading", { name: title, exact: true }),
      })
      .first();
  }

  private async waitForSuccessNotification(message: string): Promise<boolean> {
    try {
      await this.page
        .locator(".oxd-toast-content-text", { hasText: message })
        .waitFor({ state: "visible" });
      return true;
    } catch (error) {
      if (error instanceof playwrightErrors.TimeoutError) return false;
      throw error;
    }
  }
}
