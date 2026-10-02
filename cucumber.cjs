const workerValue = process.env.CUCUMBER_WORKERS ?? "1";
const workers = Number(workerValue);

if (!/^[1-9]\d*$/.test(workerValue) || !Number.isSafeInteger(workers)) {
  throw new Error("CUCUMBER_WORKERS must be a positive integer.");
}

module.exports = {
  default: {
    paths: ["features/**/*.feature"],
    require: [
      "dist/support/world.js",
      "dist/support/worker-browser.js",
      "dist/support/startup.js",
      "dist/support/teardown.js",
      "dist/steps/**/*.js",
    ],
    format: [
      "progress",
      "html:reports/cucumber.html",
      "json:reports/cucumber.json",
      "junit:reports/cucumber.xml",
    ],
    parallel: workers,
    retry: 0,
    strict: true,
    publish: false,
  },
};
