export interface AccountDefinition {
  username: string;
  password: string;
}

export const namedAccounts = {
  administrator: {
    usernameEnvVar: "ADMIN_USERNAME",
    passwordEnvVar: "ADMIN_PASSWORD",
  },
} as const;

export type AccountName = keyof typeof namedAccounts;

export const isAccountName = (value: string): value is AccountName =>
  Object.hasOwn(namedAccounts, value);

export const resolveAccountName = (value: string): AccountName => {
  if (!isAccountName(value)) {
    throw new Error(`Unsupported account name: ${value}`);
  }

  return value;
};

const getRequiredUsername = (name: string): string => {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
};

const getRequiredPassword = (name: string): string => {
  const value = process.env[name];

  if (!value?.trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
};

export const getAccount = (accountName: AccountName): AccountDefinition => {
  const accountConfig = namedAccounts[accountName];
  const username = getRequiredUsername(accountConfig.usernameEnvVar);
  const password = getRequiredPassword(accountConfig.passwordEnvVar);

  return {
    username,
    password,
  };
};

export const getPimTestEmployeePassword = (): string =>
  getRequiredPassword("PIM_TEST_EMPLOYEE_PASSWORD");
