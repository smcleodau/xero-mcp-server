import { z } from 'zod';

export const attachmentSchema = z.object({
  fileName: z.string().describe("Override filename (optional if using filePath)").optional(),
  mimeType: z.string().describe("Override MIME type (optional)").optional(),
  filePath: z.string().describe("Path to local file").optional(),
  base64Content: z.string().describe("Direct base64 content (alternative to filePath)").optional()
}).refine(
  (data) => data.filePath || data.base64Content,
  {
    message: "Either filePath or base64Content must be provided",
    path: ["filePath", "base64Content"]
  }
).refine(
  (data) => {
    if (data.base64Content && !data.fileName) {
      return false;
    }
    return true;
  },
  {
    message: "fileName is required when using base64Content",
    path: ["fileName"]
  }
);

export const attachmentsArraySchema = z.array(attachmentSchema)
  .describe("Array of file attachments")
  .optional();

export type AttachmentInput = z.infer<typeof attachmentSchema>;
export type AttachmentsArray = z.infer<typeof attachmentsArraySchema>;