import { config } from "./env.js";

export interface AccountDefinition {
  username: string;
  password: string;
  displayName: string;
}

export const namedAccounts: Record<string, AccountDefinition> = {
  administrator: {
    username: process.env.ORANGEHRM_USERNAME ?? config.defaultUsername,
    password: process.env.ORANGEHRM_PASSWORD ?? config.defaultPassword,
    displayName: "Administrator",
  },
  ...(process.env.ORANGEHRM_SECONDARY_USERNAME &&
  process.env.ORANGEHRM_SECONDARY_PASSWORD
    ? {
        secondary: {
          username: process.env.ORANGEHRM_SECONDARY_USERNAME,
          password: process.env.ORANGEHRM_SECONDARY_PASSWORD,
          displayName: "Secondary User",
        },
      }
    : {}),
};

export type AccountName = keyof typeof namedAccounts;

export const getAccount = (accountName: AccountName): AccountDefinition => {
  const account = namedAccounts[accountName];

  if (!account) {
    throw new Error(`Unknown account: ${String(accountName)}`);
  }

  return account;
};

export const administratorAccount = namedAccounts.administrator;
