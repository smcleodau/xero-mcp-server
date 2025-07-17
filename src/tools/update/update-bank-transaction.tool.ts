import { z } from "zod";
import { CreateXeroTool } from "../../helpers/create-xero-tool.js";
import { updateXeroBankTransaction } from "../../handlers/update-xero-bank-transaction.handler.js";
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

const UpdateBankTransactionTool = CreateXeroTool(
  "update-bank-transaction",
  `Update a bank transaction in Xero.
  When a bank transaction is updated, a deep link to the bank transaction in Xero is returned.
  This deep link can be used to view the bank transaction in Xero directly.
  This link should be displayed to the user.`,
  {
    bankTransactionId: z.string(),
    type: z.enum(["RECEIVE", "SPEND"]).optional(),
    contactId: z.string().optional(),
    lineItems: z.array(lineItemSchema).optional().describe(
      "All line items must be provided. Any line items not provided will be removed. Including existing line items. \
      Do not modify line items that have not been specified by the user",
    ),
    reference: z.string().optional(),
    date: z.string().optional(),
    attachments: z.array(z.object({
      fileName: z.string().describe("File name with extension"),
      mimeType: z.string().describe("MIME type (optional)").optional(),
      base64Content: z.string().describe("Base64 encoded file")
    })).describe("Array of file attachments").optional()
  },
  async (
    {
      bankTransactionId,
      type,
      contactId,
      lineItems,
      reference,
      date,
      attachments
    }
  ) => {
    const result = await updateXeroBankTransaction(bankTransactionId, type, contactId, lineItems, reference, date);

    if (result.isError) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error updating bank transaction: ${result.error}`,
          },
        ],
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
            "Bank transaction updated successfully:",
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

export default UpdateBankTransactionTool;