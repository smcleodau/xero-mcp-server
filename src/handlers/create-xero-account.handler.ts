import { xeroClient } from "../clients/xero-client.js";
import { XeroClientResponse } from "../types/tool-response.js";
import { formatError } from "../helpers/format-error.js";
import { Account, AccountType } from "xero-node";
import { getClientHeaders } from "../helpers/get-client-headers.js";

async function createAccount(
  code: string,
  name: string,
  type: AccountType,
  accountId?: string,
  description?: string,
  taxType?: string,
  enablePaymentsToAccount?: boolean,
  bankAccountNumber?: string,
  bankAccountType?: Account.BankAccountTypeEnum,
  showInExpenseClaims?: boolean,
): Promise<Account | undefined> {
  await xeroClient.authenticate();

  const account: Account = {
    code,
    name,
    type,
    description,
    taxType,
    enablePaymentsToAccount,
    bankAccountNumber,
    bankAccountType,
    showInExpenseClaims,
  };

  if (accountId) {
    const response = await xeroClient.accountingApi.updateAccount(
      xeroClient.tenantId,
      accountId,
      { accounts: [account] },
      undefined,
      getClientHeaders(),
    );
    return response.body.accounts?.[0];
  } else {
    const response = await xeroClient.accountingApi.createAccount(
      xeroClient.tenantId,
      account,
      undefined,
      getClientHeaders(),
    );
    return response.body.accounts?.[0];
  }
}

export async function createXeroAccount(
  code: string,
  name: string,
  type: AccountType,
  accountId?: string,
  description?: string,
  taxType?: string,
  enablePaymentsToAccount?: boolean,
  bankAccountNumber?: string,
  bankAccountType?: Account.BankAccountTypeEnum,
  showInExpenseClaims?: boolean,
): Promise<XeroClientResponse<Account>> {
  try {
    const account = await createAccount(
      code,
      name,
      type,
      accountId,
      description,
      taxType,
      enablePaymentsToAccount,
      bankAccountNumber,
      bankAccountType,
      showInExpenseClaims,
    );

    if (!account) {
      throw new Error("Account creation/update failed.");
    }

    return {
      result: account,
      isError: false,
      error: null,
    };
  } catch (error) {
    return {
      result: null,
      isError: true,
      error: formatError(error),
    };
  }
}