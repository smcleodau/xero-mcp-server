import { xeroClient } from "../clients/xero-client.js";
import { XeroClientResponse } from "../types/tool-response.js";
import { formatError } from "../helpers/format-error.js";
import { Account } from "xero-node";
import { getClientHeaders } from "../helpers/get-client-headers.js";

async function getAccount(accountId: string): Promise<Account | undefined> {
  await xeroClient.authenticate();

  const response = await xeroClient.accountingApi.getAccount(
    xeroClient.tenantId,
    accountId,
    getClientHeaders(),
  );

  return response.body.accounts?.[0];
}

export async function getXeroAccount(
  accountId: string,
): Promise<XeroClientResponse<Account>> {
  try {
    const account = await getAccount(accountId);

    if (!account) {
      throw new Error("Account not found.");
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