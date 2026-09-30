const workers = Number(process.env.CUCUMBER_WORKERS ?? "2"); //take a look into this later

if (!Number.isInteger(workers) || workers < 1) {
  throw new Error("CUCUMBER_WORKERS must be a positive integer.");
}

module.exports = {
  default: {
    paths: ["features/**/*.feature"],
    require: [
      "dist/support/world.js",
      "dist/support/hooks.js",
      "dist/steps/**/*.js",
    ],
    format: [
      "progress",
      "html:reports/cucumber.html",
      "json:reports/cucumber.json",
    ],
    parallel: workers,
    retry: 0,
    strict: true,
    publish: false,
  },
};
