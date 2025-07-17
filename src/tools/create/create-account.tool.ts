import { createXeroAccount } from "../../handlers/create-xero-account.handler.js";
import { z } from "zod";
import { DeepLinkType, getDeepLink } from "../../helpers/get-deeplink.js";
import { ensureError } from "../../helpers/ensure-error.js";
import { CreateXeroTool } from "../../helpers/create-xero-tool.js";
import { Account, AccountType } from "xero-node";

const CreateAccountTool = CreateXeroTool(
  "create-account",
  "Create or update an account in Xero. If accountId is provided, the account will be updated; otherwise, a new account will be created. When an account is created, a deep link to the account in Xero is returned.",
  {
    code: z.string().max(10).describe("Account code (max 10 characters)"),
    name: z.string().describe("Account name"),
    type: z.enum([
      "BANK",
      "CURRENT",
      "CURRLIAB",
      "DEPRECIATN",
      "DIRECTCOSTS",
      "EQUITY",
      "EXPENSE",
      "FIXED",
      "INVENTORY",
      "LIABILITY",
      "NONCURRENT",
      "OTHERINCOME",
      "OVERHEADS",
      "PREPAYMENT",
      "REVENUE",
      "SALES",
      "TERMLIAB",
    ]).describe("Account type"),
    accountId: z.string().optional().describe("Account ID for updating existing account"),
    description: z.string().optional().describe("Account description"),
    taxType: z.string().optional().describe("Tax type"),
    enablePaymentsToAccount: z.boolean().optional().describe("Enable payments to account"),
    bankAccountNumber: z.string().optional().describe("Bank account number"),
    bankAccountType: z.enum(["BANK", "CREDITCARD", "PAYPAL"]).optional().describe("Bank account type"),
    showInExpenseClaims: z.boolean().optional().describe("Show in expense claims"),
  },
  async ({
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
  }) => {
    try {
      const response = await createXeroAccount(
        code,
        name,
        type as unknown as AccountType,
        accountId,
        description,
        taxType,
        enablePaymentsToAccount,
        bankAccountNumber,
        bankAccountType as Account.BankAccountTypeEnum | undefined,
        showInExpenseClaims,
      );
      
      if (response.isError) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error ${accountId ? 'updating' : 'creating'} account: ${response.error}`,
            },
          ],
        };
      }

      const account = response.result;

      const deepLink = account.accountID
        ? null // TODO: Add ACCOUNT type to DeepLinkType enum
        : null;

      return {
        content: [
          {
            type: "text" as const,
            text: [
              `Account ${accountId ? 'updated' : 'created'}: ${account.name} (ID: ${account.accountID})`,
              `Code: ${account.code}`,
              `Type: ${account.type}`,
              deepLink ? `Link to view: ${deepLink}` : null,
            ]
              .filter(Boolean)
              .join("\n"),
          },
        ],
      };
    } catch (error) {
      const err = ensureError(error);

      return {
        content: [
          {
            type: "text" as const,
            text: `Error ${accountId ? 'updating' : 'creating'} account: ${err.message}`,
          },
        ],
      };
    }
  },
);

export default CreateAccountTool;