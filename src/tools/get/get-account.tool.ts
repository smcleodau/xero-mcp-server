import { z } from "zod";
import { getXeroAccount } from "../../handlers/get-xero-account.handler.js";
import { CreateXeroTool } from "../../helpers/create-xero-tool.js";
import { DeepLinkType, getDeepLink } from "../../helpers/get-deeplink.js";

const GetAccountTool = CreateXeroTool(
  "get-account",
  "Retrieve a single account from Xero by its ID. This provides details such as the account ID, code, name, type, description, and other account properties.",
  {
    accountId: z.string().describe("The ID of the account to retrieve"),
  },
  async (params: { accountId: string }) => {
    const { accountId } = params;
    const response = await getXeroAccount(accountId);

    if (response.isError) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error retrieving account: ${response.error}`,
          },
        ],
      };
    }

    const account = response.result;

    if (!account) {
      return {
        content: [
          {
            type: "text" as const,
            text: `No account found with ID: ${accountId}`,
          },
        ],
      };
    }

    const deepLink = null; // TODO: Add ACCOUNT type to DeepLinkType enum

    return {
      content: [
        {
          type: "text" as const,
          text: [
            `Account ID: ${account.accountID}`,
            `Code: ${account.code}`,
            `Name: ${account.name}`,
            `Type: ${account.type}`,
            `Description: ${account.description || 'None'}`,
            `Tax Type: ${account.taxType || 'None'}`,
            `Bank Account Number: ${account.bankAccountNumber || 'None'}`,
            `Bank Account Type: ${account.bankAccountType || 'None'}`,
            `Enable Payments: ${account.enablePaymentsToAccount ?? 'Not set'}`,
            `Show in Expense Claims: ${account.showInExpenseClaims ?? 'Not set'}`,
            `Status: ${account.status}`,
            deepLink ? `Link to view: ${deepLink}` : null,
          ]
            .filter(Boolean)
            .join("\n"),
        },
      ],
    };
  },
);

export default GetAccountTool;