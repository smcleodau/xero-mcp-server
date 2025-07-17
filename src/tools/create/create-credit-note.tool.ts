import { z } from "zod";
import { createXeroCreditNote } from "../../handlers/create-xero-credit-note.handler.js";
import { DeepLinkType, getDeepLink } from "../../helpers/get-deeplink.js";
import { CreateXeroTool } from "../../helpers/create-xero-tool.js";
import { xeroClient } from "../../clients/xero-client.js";
import { attachmentsArraySchema } from "../../schemas/attachment.schema.js";
import { processAttachments } from "../../helpers/process-attachments.js";

const lineItemSchema = z.object({
  description: z.string(),
  quantity: z.number(),
  unitAmount: z.number(),
  accountCode: z.string(),
  taxType: z.string(),
});

const CreateCreditNoteTool = CreateXeroTool(
  "create-credit-note",
  "Create a credit note in Xero.\
 When a credit note is created, a deep link to the credit note in Xero is returned. \
 This deep link can be used to view the credit note in Xero directly. \
 This link should be displayed to the user.",
  {
    contactId: z.string(),
    lineItems: z.array(lineItemSchema),
    reference: z.string().optional(),
    attachments: attachmentsArraySchema,
  },
  async ({ contactId, lineItems, reference, attachments }) => {
    const result = await createXeroCreditNote(contactId, lineItems, reference);
    if (result.isError) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error creating credit note: ${result.error}`,
          },
        ],
      };
    }

    const creditNote = result.result;

    const deepLink = creditNote.creditNoteID
      ? await getDeepLink(DeepLinkType.CREDIT_NOTE, creditNote.creditNoteID)
      : null;

    const attachmentResults = [];
    if (attachments && attachments.length > 0 && creditNote.creditNoteID) {
      try {
        const processedAttachments = await processAttachments(attachments);
        for (const attachment of processedAttachments) {
          try {
            await xeroClient.accountingApi.createCreditNoteAttachmentByFileName(
              xeroClient.tenantId,
              creditNote.creditNoteID,
              attachment.fileName,
              Buffer.from(attachment.base64Content, 'base64'),
              true
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
            "Credit note created successfully:",
            `ID: ${creditNote?.creditNoteID}`,
            `Contact: ${creditNote?.contact?.name}`,
            `Total: ${creditNote?.total}`,
            `Status: ${creditNote?.status}`,
            attachmentResults.length > 0 ? `Attachments: ${attachmentResults.map(r => `${r.fileName} (${r.status})`).join(', ')}` : null,
            deepLink ? `Link to view: ${deepLink}` : null,
          ]
            .filter(Boolean)
            .join("\n"),
        },
      ],
    };
  },
);

export default CreateCreditNoteTool;
