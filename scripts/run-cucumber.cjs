const { spawn } = require("node:child_process");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const cucumberPackage = path.dirname(require.resolve("@cucumber/cucumber"));
const cucumberCli = path.resolve(cucumberPackage, "../bin/cucumber.js");
const cucumber = spawn(
  process.execPath,
  [cucumberCli, ...process.argv.slice(2)],
  { stdio: "inherit" },
);

cucumber.on("error", (error) => {
  console.error("Could not start Cucumber:", error);
  process.exitCode = 1;
});

cucumber.on("close", (code, signal) => {
  if (code === 0) {
    process.exitCode = 0;
    return;
  }

  const reportPath = path.resolve("reports/cucumber.html");
  console.error(
    `\nCucumber tests failed. Open the HTML report: ${pathToFileURL(reportPath).href}`,
  );

  process.exitCode = code ?? (signal ? 1 : 0);
});
