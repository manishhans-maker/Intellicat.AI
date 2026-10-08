import { ChatAttachment } from '../types';

/**
 * Efficiently compresses high-resolution photos on an offscreen canvas
 * Keeps visual sharpness intact for Gemini vision while reducing payload size to ~200-350KB.
 */
function compressImage(file: File, maxDim = 1280, quality = 0.85): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      if (typeof window === 'undefined') {
        resolve(dataUrl);
        return;
      }
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        } else {
          resolve(dataUrl);
        }
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    };
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
}

/**
 * Creates a lightweight, high-performance thumbnail data URL (~25KB-45KB) for persistent history storage
 * Prevents localStorage QuotaExceeded errors while keeping crisp image rendering in chat history.
 */
export function createThumbnailBase64(dataUrl: string, maxDim = 400, quality = 0.75): Promise<string> {
  if (!dataUrl || !dataUrl.startsWith('data:image')) return Promise.resolve(dataUrl);
  if (typeof window === 'undefined') return Promise.resolve(dataUrl);
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, width);
      canvas.height = Math.max(1, height);
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      } else {
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

/**
 * Extracts plain text or base64 multimodal data from various file formats in the browser
 * Avoids heavy node dependencies and handles Images, PDFs, Code, Markdown, TXT cleanly.
 */
export async function extractTextFromFile(file: File): Promise<{
  text: string;
  isImage: boolean;
  isPdf?: boolean;
  base64?: string;
  mimeType?: string;
  extractedText?: string;
}> {
  const fileName = file.name.toLowerCase();
  const fileType = file.type.toLowerCase();

  // 1. Image Files (Photos, Diagrams, Screenshots)
  if (fileType.startsWith('image/') || /\.(png|jpe?g|webp|gif|svg|bmp)$/i.test(fileName)) {
    try {
      const compressedBase64 = await compressImage(file);
      return {
        text: `[Photo/Image: ${file.name}]`,
        isImage: true,
        isPdf: false,
        base64: compressedBase64,
        mimeType: file.type || 'image/jpeg',
        extractedText: `[Attached Photo: ${file.name} (${(file.size / 1024).toFixed(1)} KB)]`,
      };
    } catch {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          resolve({
            text: `[Photo/Image: ${file.name}]`,
            isImage: true,
            isPdf: false,
            base64: reader.result as string,
            mimeType: file.type || 'image/jpeg',
            extractedText: `[Attached Photo: ${file.name}]`,
          });
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }
  }

  // 2. PDF Documents (Native Multimodal Gemini Analysis + Text Stream)
  if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64Data = reader.result as string;

        // Also extract readable text runs from the binary buffer for search and quick reference
        const arrayReader = new FileReader();
        arrayReader.onload = () => {
          try {
            const buffer = arrayReader.result as ArrayBuffer;
            const bytes = new Uint8Array(buffer);
            const textChunks: string[] = [];
            let currentChunk = '';

            for (let i = 0; i < Math.min(bytes.length, 60000); i++) {
              const charCode = bytes[i];
              if ((charCode >= 32 && charCode <= 126) || charCode === 10 || charCode === 13 || charCode === 9) {
                currentChunk += String.fromCharCode(charCode);
              } else {
                if (currentChunk.length >= 4) {
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

            const extractedString = textChunks.slice(0, 1000).join(' ');
            resolve({
              text: extractedString && extractedString.length > 20
                ? `[PDF Document: ${file.name} (${(file.size / 1024).toFixed(1)} KB)]\n${extractedString}`
                : `[PDF Document: ${file.name} (${(file.size / 1024).toFixed(1)} KB)]`,
              isImage: false,
              isPdf: true,
              base64: base64Data,
              mimeType: 'application/pdf',
              extractedText: extractedString || `[PDF Document: ${file.name} (${(file.size / 1024).toFixed(1)} KB)]`,
            });
          } catch {
            resolve({
              text: `[PDF Document: ${file.name} (${(file.size / 1024).toFixed(1)} KB)]`,
              isImage: false,
              isPdf: true,
              base64: base64Data,
              mimeType: 'application/pdf',
              extractedText: `[PDF Document: ${file.name} (${(file.size / 1024).toFixed(1)} KB)]`,
            });
          }
        };
        arrayReader.onerror = () => {
          resolve({
            text: `[PDF Document: ${file.name}]`,
            isImage: false,
            isPdf: true,
            base64: base64Data,
            mimeType: 'application/pdf',
            extractedText: `[PDF Document: ${file.name}]`,
          });
        };
        arrayReader.readAsArrayBuffer(file);
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

  // 3. DOCX / PPTX / Office Documents (Binary extraction with clean text stream parsing)
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
