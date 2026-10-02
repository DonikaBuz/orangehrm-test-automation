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

export const toInteger = (
  value: string | undefined,
  fallback: number,
  fieldName: string,
): number => {
  const sourceValue = value ?? String(fallback);
  const parsedValue = Number(sourceValue);

  if (
    !Number.isSafeInteger(parsedValue) ||
    parsedValue <= 0 ||
    !Number.isFinite(parsedValue)
  ) {
    throw new Error(`${fieldName} must be a positive integer value.`);
  }

  return parsedValue;
};

export const config = {
  baseUrl: getBaseUrl(),
  browser: getBrowser(),
  headless: parseBoolean(process.env.HEADLESS, true, "HEADLESS"),
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
  recordVideo: parseBoolean(process.env.RECORD_VIDEO, true, "RECORD_VIDEO"),
} as const;
