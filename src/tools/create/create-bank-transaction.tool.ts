import { z } from "zod";
import { CreateXeroTool } from "../../helpers/create-xero-tool.js";
import { createXeroBankTransaction } from "../../handlers/create-xero-bank-transaction.handler.js";
import { bankTransactionDeepLink } from "../../consts/deeplinks.js";
import { xeroClient } from "../../clients/xero-client.js";
import { processAttachments } from "../../helpers/process-attachments.js";

const lineItemSchema = z.object({
  description: z.string(),
  quantity: z.number(),
  unitAmount: z.number(),
  accountCode: z.string(),
  taxType: z.string(),
});

const CreateBankTransactionTool = CreateXeroTool(
  "create-bank-transaction",
  `Create a bank transaction in Xero.
  When a bank transaction is created, a deep link to the bank transaction in Xero is returned.
  This deep link can be used to view the bank transaction in Xero directly.
  This link should be displayed to the user.`,
  {
    type: z.enum(["RECEIVE", "SPEND"]),
    bankAccountId: z.string(),
    contactId: z.string(),
    lineItems: z.array(lineItemSchema),
    reference: z.string().optional(),
    date: z.string()
      .optional()
      .describe("If no date is provided, the date will default to today's date"),
    attachments: z.array(z.object({
      fileName: z.string().describe("File name with extension"),
      mimeType: z.string().describe("MIME type (optional)").optional(),
      base64Content: z.string().describe("Base64 encoded file")
    })).describe("Array of file attachments").optional()
  },
  async ({ type, bankAccountId, contactId, lineItems, reference, date, attachments }) => {
    const result = await createXeroBankTransaction(type, bankAccountId, contactId, lineItems, reference, date);

    if (result.isError) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error creating bank transaction: ${result.error}`
          }
        ]
      };
    }

    const bankTransaction = result.result;

    const deepLink = bankTransaction.bankAccount.accountID && bankTransaction.bankTransactionID
      ? bankTransactionDeepLink(bankTransaction.bankAccount.accountID, bankTransaction.bankTransactionID)
      : null;

    const attachmentResults = [];
    if (attachments && attachments.length > 0 && bankTransaction.bankTransactionID) {
      try {
        const processedAttachments = await processAttachments(attachments);
        for (const attachment of processedAttachments) {
          try {
            await xeroClient.accountingApi.createBankTransactionAttachmentByFileName(
              xeroClient.tenantId,
              bankTransaction.bankTransactionID,
              attachment.fileName,
              Buffer.from(attachment.base64Content, 'base64')
            );
            attachmentResults.push({ fileName: attachment.fileName, status: 'success' });
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`Attachment failed for ${attachment.fileName}:`, error);
            attachmentResults.push({ fileName: attachment.fileName, status: 'failed', error: errorMessage });
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`Failed to process attachments:`, error);
        attachmentResults.push({ fileName: 'unknown', status: 'failed', error: `Processing failed: ${errorMessage}` });
      }
    }

    return {
      content: [
        {
          type: "text" as const,
          text: [
            "Bank transaction successfully:",
            `ID: ${bankTransaction?.bankTransactionID}`,
            `Date: ${bankTransaction?.date}`,
            `Contact: ${bankTransaction?.contact?.name}`,
            `Total: ${bankTransaction?.total}`,
            `Status: ${bankTransaction?.status}`,
            attachmentResults.length > 0 ? `Attachments: ${attachmentResults.map(r => `${r.fileName} (${r.status})`).join(', ')}` : null,
            deepLink ? `Link to view: ${deepLink}` : null
          ].filter(Boolean).join("\n"),
        },
      ],
    };
  }
);

export default CreateBankTransactionTool;