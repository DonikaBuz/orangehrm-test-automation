import dotenv from "dotenv";

dotenv.config();

export type BrowserName = "chromium" | "firefox" | "webkit";

const parseBoolean = (
  value: string | undefined,
  fallback: boolean,
  fieldName: string,
): boolean => {
  if (value === undefined) {
    return fallback;
  }

  if (value !== "true" && value !== "false") {
    throw new Error(`${fieldName} must be "true" or "false".`);
  }

  return value === "true";
};

const getBrowser = (): BrowserName => {
  const browser = process.env.BROWSER ?? "chromium";

  if (browser !== "chromium" && browser !== "firefox" && browser !== "webkit") {
    throw new Error(
      `Invalid BROWSER "${browser}". Use chromium, firefox, or webkit.`,
    );
  }

  return browser;
};

const getBaseUrl = (): string => {
  const value =
    process.env.BASE_URL ?? "https://opensource-demo.orangehrmlive.com";
  const url = new URL(value);

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("BASE_URL must use http or https.");
  }

  return url.href;
};

const toInteger = (
  value: string | undefined,
  fallback: number,
  fieldName: string,
): number => {
  const parsedValue = Number(value ?? fallback);

  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    throw new Error(`${fieldName} must be a positive number.`);
  }

  return parsedValue;
};

export const config = {
  baseUrl: getBaseUrl(),
  browser: getBrowser(),
  headless: parseBoolean(process.env.HEADLESS, true, "HEADLESS"),
  defaultUsername: process.env.ORANGEHRM_USERNAME ?? "Admin",
  defaultPassword: process.env.ORANGEHRM_PASSWORD ?? "admin123",
  actionTimeout: toInteger(
    process.env.ACTION_TIMEOUT,
    15_000,
    "ACTION_TIMEOUT",
  ),
  navigationTimeout: toInteger(
    process.env.NAVIGATION_TIMEOUT,
    30_000,
    "NAVIGATION_TIMEOUT",
  ),
  stepTimeout: toInteger(process.env.STEP_TIMEOUT, 60_000, "STEP_TIMEOUT"),
  viewport: {
    width: toInteger(process.env.VIEWPORT_WIDTH, 1_440, "VIEWPORT_WIDTH"),
    height: toInteger(process.env.VIEWPORT_HEIGHT, 1_200, "VIEWPORT_HEIGHT"),
  },
  artifactsDir: "reports/artifacts",
} as const;
