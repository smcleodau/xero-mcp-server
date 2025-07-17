import { promises as fs } from 'fs';
import { resolve, basename } from 'path';
import { detectMimeType } from './mime-type.js';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB limit

export interface FileToBase64Result {
  base64Content: string;
  mimeType: string;
  fileName: string;
}

export async function fileToBase64(filePath: string): Promise<FileToBase64Result> {
  try {
    const resolvedPath = resolve(filePath);
    
    // Check if file exists and get stats
    const stats = await fs.stat(resolvedPath);
    
    if (!stats.isFile()) {
      throw new Error(`Path is not a file: ${filePath}`);
    }
    
    // Check file size
    if (stats.size > MAX_FILE_SIZE) {
      throw new Error(`File too large: ${Math.round(stats.size / 1024 / 1024)}MB (max: 10MB)`);
    }
    
    // Read file content
    const buffer = await fs.readFile(resolvedPath);
    
    // Convert to base64
    const base64Content = buffer.toString('base64');
    
    // Extract filename
    const fileName = basename(resolvedPath);
    
    // Detect MIME type
    const mimeType = detectMimeType(fileName);
    
    return {
      base64Content,
      mimeType,
      fileName
    };
    
  } catch (error) {
    if (error instanceof Error) {
      const nodeError = error as NodeJS.ErrnoException;
      if (nodeError.code === 'ENOENT') {
        throw new Error(`File not found: ${filePath}`);
      } else if (nodeError.code === 'EACCES') {
        throw new Error(`Permission denied: ${filePath}`);
      } else if (error.message.includes('too large') || error.message.includes('not a file')) {
        throw error; // Re-throw our custom errors
      } else {
        throw new Error(`Unable to read file: ${filePath} - ${error.message}`);
      }
    } else {
      throw new Error(`Unable to read file: ${filePath} - ${String(error)}`);
    }
  }
}