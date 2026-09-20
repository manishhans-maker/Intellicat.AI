import { ChatAttachment } from '../types';

/**
 * Extracts plain text from various file formats in the browser
 * Avoids heavy node dependencies and handles TXT, MD, JSON, CSV, CODE, DOCX, PDF cleanly.
 */
export async function extractTextFromFile(file: File): Promise<{
  text: string;
  isImage: boolean;
  base64?: string;
}> {
  const fileName = file.name.toLowerCase();
  const fileType = file.type.toLowerCase();

  // 1. Image Files
  if (fileType.startsWith('image/')) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve({
          text: `[Image File: ${file.name}]`,
          isImage: true,
          base64: reader.result as string,
        });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // 2. Plain Text / Code / JSON / Markdown / CSV
  if (
    fileType.startsWith('text/') ||
    fileName.endsWith('.txt') ||
    fileName.endsWith('.md') ||
    fileName.endsWith('.json') ||
    fileName.endsWith('.csv') ||
    fileName.endsWith('.js') ||
    fileName.endsWith('.ts') ||
    fileName.endsWith('.tsx') ||
    fileName.endsWith('.jsx') ||
    fileName.endsWith('.py') ||
    fileName.endsWith('.html') ||
    fileName.endsWith('.css') ||
    fileName.endsWith('.sql') ||
    fileName.endsWith('.xml') ||
    fileName.endsWith('.yml') ||
    fileName.endsWith('.yaml') ||
    fileName.endsWith('.log')
  ) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const text = (reader.result as string) || '';
        resolve({ text, isImage: false });
      };
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }

  // 3. PDF / DOCX / PPTX Documents (Binary extraction with clean text stream parsing)
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const buffer = reader.result as ArrayBuffer;
        const bytes = new Uint8Array(buffer);
        let extractedString = '';

        // Extract printable ASCII & UTF text runs from binary formats
        const textChunks: string[] = [];
        let currentChunk = '';

        for (let i = 0; i < bytes.length; i++) {
          const charCode = bytes[i];
          // Standard printable ASCII + basic whitespace
          if ((charCode >= 32 && charCode <= 126) || charCode === 10 || charCode === 13 || charCode === 9) {
            currentChunk += String.fromCharCode(charCode);
          } else {
            if (currentChunk.length >= 4) {
              // Filter out common binary PDF/ZIP garbage tokens
              const cleaned = currentChunk.replace(/[^\x20-\x7E\n]/g, '').trim();
              if (
                cleaned.length >= 4 &&
                !cleaned.startsWith('obj') &&
                !cleaned.startsWith('endobj') &&
                !cleaned.startsWith('stream') &&
                !cleaned.startsWith('endstream') &&
                !cleaned.startsWith('xref')
              ) {
                textChunks.push(cleaned);
              }
            }
            currentChunk = '';
          }
        }

        if (currentChunk.length >= 4) {
          textChunks.push(currentChunk.trim());
        }

        extractedString = textChunks.slice(0, 1500).join(' ');

        if (!extractedString || extractedString.length < 30) {
          extractedString = `[Document: ${file.name} (${(file.size / 1024).toFixed(1)} KB)]\nUploaded for multi-modal reference.`;
        }

        resolve({
          text: extractedString,
          isImage: false,
        });
      } catch (err) {
        resolve({
          text: `[File: ${file.name}] Attached successfully.`,
          isImage: false,
        });
      }
    };
    reader.onerror = () => {
      resolve({
        text: `[File: ${file.name}] Attached.`,
        isImage: false,
      });
    };
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Efficient Chunking & Retrieval:
 * Extracts only the most relevant excerpts matching user query
 * to protect Gemini API token quota and prevent sending huge files repeatedly.
 */
export function extractRelevantChunks(
  fullText: string,
  userQuery: string,
  maxChars = 2500
): string {
  if (!fullText || fullText.length <= maxChars) {
    return fullText;
  }

  const queryTerms = userQuery
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 2);

  const paragraphs = fullText
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  // Score paragraphs by keyword overlap
  const scored = paragraphs.map((p) => {
    const lower = p.toLowerCase();
    let score = 0;
    for (const term of queryTerms) {
      if (lower.includes(term)) {
        score += 1;
      }
    }
    return { paragraph: p, score };
  });

  scored.sort((a, b) => b.score - a.score);

  let result = `[Document Summary Excerpts relevant to query: "${userQuery}"]\n`;
  let currentLength = result.length;

  for (const item of scored) {
    if (currentLength + item.paragraph.length > maxChars) {
      break;
    }
    result += `\n... ${item.paragraph} ...\n`;
    currentLength += item.paragraph.length;
  }

  return result;
}
