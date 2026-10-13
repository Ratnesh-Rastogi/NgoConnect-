import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { AppError } from '../errors/AppError.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOAD_DIR = path.resolve(__dirname, '../../uploads');

// Ensure private uploads directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Inspect the first bytes (magic numbers) to detect real file format
export const detectFileSignature = (buffer) => {
  if (!buffer || buffer.length < 4) return null;

  // PDF signature: %PDF (0x25 0x50 0x44 0x46)
  if (
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46
  ) {
    return 'application/pdf';
  }

  // PNG signature: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4E &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0D &&
    buffer[5] === 0x0A &&
    buffer[6] === 0x1A &&
    buffer[7] === 0x0A
  ) {
    return 'image/png';
  }

  // JPEG signature: FF D8 FF
  if (
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return 'image/jpeg';
  }

  return null;
};

// Validate file type from both declared MIME and real byte signatures
export const validateFileSignature = (buffer, claimedMimeType) => {
  const realMimeType = detectFileSignature(buffer);
  if (!realMimeType) {
    throw new AppError(
      'Invalid file content: signature does not match supported formats (PDF, JPG, PNG)',
      400
    );
  }

  // Normalize JPEG mime types
  const normalizedClaimed = claimedMimeType === 'image/jpg' ? 'image/jpeg' : claimedMimeType;
  if (normalizedClaimed !== realMimeType) {
    throw new AppError(
      `File signature mismatch: claimed ${claimedMimeType} but content is ${realMimeType}`,
      400
    );
  }

  return realMimeType;
};

// Save uploaded file into private uploads directory with random UUID filename
export const saveFile = async (buffer, originalName, mimeType) => {
  const ext =
    mimeType === 'application/pdf'
      ? '.pdf'
      : mimeType === 'image/png'
      ? '.png'
      : '.jpg';

  const randomKey = `${crypto.randomUUID()}${ext}`;
  const targetPath = path.join(UPLOAD_DIR, randomKey);

  await fs.promises.writeFile(targetPath, buffer);
  return randomKey;
};

// Retrieve file stream and metadata safely
export const getFile = (storageKey) => {
  // Prevent directory traversal attacks
  const safeKey = path.basename(storageKey);
  const targetPath = path.join(UPLOAD_DIR, safeKey);

  if (!fs.existsSync(targetPath)) {
    throw new AppError('File not found in storage', 404);
  }

  return {
    filePath: targetPath,
    stream: fs.createReadStream(targetPath),
    size: fs.statSync(targetPath).size
  };
};

// Remove file from storage
export const deleteFile = async (storageKey) => {
  if (!storageKey) return false;
  const safeKey = path.basename(storageKey);
  const targetPath = path.join(UPLOAD_DIR, safeKey);

  if (fs.existsSync(targetPath)) {
    await fs.promises.unlink(targetPath);
    return true;
  }
  return false;
};
