import { fileToBase64 } from './file-to-base64.js';
import { detectMimeType } from './mime-type.js';
import type { AttachmentInput } from '../schemas/attachment.schema.js';

export interface ProcessedAttachment {
  fileName: string;
  mimeType: string;
  base64Content: string;
}

export async function processAttachments(attachments: AttachmentInput[] | undefined): Promise<ProcessedAttachment[]> {
  if (!attachments || attachments.length === 0) {
    return [];
  }

  const processedAttachments: ProcessedAttachment[] = [];

  for (const attachment of attachments) {
    try {
      let fileName: string;
      let mimeType: string;
      let base64Content: string;

      if (attachment.filePath) {
        // Use file path - convert to base64
        const fileData = await fileToBase64(attachment.filePath);
        fileName = attachment.fileName || fileData.fileName;
        mimeType = attachment.mimeType || fileData.mimeType;
        base64Content = fileData.base64Content;
      } else if (attachment.base64Content) {
        // Use direct base64 content
        if (!attachment.fileName) {
          throw new Error("fileName is required when using base64Content");
        }
        fileName = attachment.fileName;
        mimeType = attachment.mimeType || detectMimeType(fileName);
        base64Content = attachment.base64Content;
      } else {
        throw new Error("Either filePath or base64Content must be provided");
      }

      processedAttachments.push({
        fileName,
        mimeType,
        base64Content
      });
    } catch (error) {
      // Re-throw with additional context
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to process attachment: ${errorMessage}`);
    }
  }

  return processedAttachments;
}