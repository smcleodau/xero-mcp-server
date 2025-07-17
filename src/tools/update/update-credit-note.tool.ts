import { z } from "zod";
import { updateXeroCreditNote } from "../../handlers/update-xero-credit-note.handler.js";
import { DeepLinkType, getDeepLink } from "../../helpers/get-deeplink.js";
import { CreateXeroTool } from "../../helpers/create-xero-tool.js";
import { xeroClient } from "../../clients/xero-client.js";

const lineItemSchema = z.object({
  description: z.string(),
  quantity: z.number(),
  unitAmount: z.number(),
  accountCode: z.string(),
  taxType: z.string(),
});

const UpdateCreditNoteTool = CreateXeroTool(
  "update-credit-note",
  "Update a credit note in Xero. Only works on draft credit notes.\
  All line items must be provided. Any line items not provided will be removed. Including existing line items.\
  Do not modify line items that have not been specified by the user.\
 When a credit note is updated, a deep link to the credit note in Xero is returned.\
 This deep link can be used to view the credit note in Xero directly.\
 This link should be displayed to the user.",
  {
    creditNoteId: z.string(),
    lineItems: z.array(lineItemSchema).optional().describe(
      "All line items must be provided. Any line items not provided will be removed. Including existing line items.\
      Do not modify line items that have not been specified by the user",
    ),
    reference: z.string().optional(),
    date: z.string().optional(),
    contactId: z.string().optional(),
    attachments: z.array(z.object({
      fileName: z.string().describe("File name with extension"),
      mimeType: z.string().describe("MIME type (optional)").optional(),
      base64Content: z.string().describe("Base64 encoded file")
    })).describe("Array of file attachments").optional(),
  },
  async (
    {
      creditNoteId,
      lineItems,
      reference,
      date,
      contactId,
      attachments,
    }: {
      creditNoteId: string;
      lineItems?: Array<{
        description: string;
        quantity: number;
        unitAmount: number;
        accountCode: string;
        taxType: string;
      }>;
      reference?: string;
      date?: string;
      contactId?: string;
      attachments?: Array<{
        fileName: string;
        mimeType?: string;
        base64Content: string;
      }>;
    },
  ) => {
    const result = await updateXeroCreditNote(
      creditNoteId,
      lineItems,
      reference,
      contactId,
      date,
    );
    if (result.isError) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error updating credit note: ${result.error}`,
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
      for (const attachment of attachments) {
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
    }

    return {
      content: [
        {
          type: "text" as const,
          text: [
            "Credit note updated successfully:",
            `ID: ${creditNote?.creditNoteID}`,
            `Contact: ${creditNote?.contact?.name}`,
            `Total: ${creditNote?.total}`,
            `Status: ${creditNote?.status}`,
            attachmentResults.length > 0 ? `Attachments: ${attachmentResults.map(r => `${r.fileName} (${r.status})`).join(', ')}` : null,
            deepLink ? `Link to view: ${deepLink}` : null,
          ].join("\n"),
        },
      ],
    };
  },
);

export default UpdateCreditNoteTool; 