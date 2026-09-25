import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import multer from 'multer';
import express from 'express';
import { v2 as cloudinary } from 'cloudinary';
import { Request, Response, NextFunction, Express } from 'express';

/**
 * Image storage service.
 *
 * Driver abstraction: STORAGE_DRIVER=local (default) persists files under
 * UPLOADS_DIR and serves them at /uploads. A cloud driver (S3/Cloudinary)
 * can be added later by implementing save()/remove() and keeping the same
 * route contract — response stays the same for frontend consumers.

 * Never trust original filenames: we always generate a random UUID name and
 * only ever allow a fixed set of image MIME types (validated twice: multer
 * fileFilter + post-upload magic-byte check).
 */

const UPLOADS_DIR = process.env.UPLOADS_DIR
  ? path.resolve(process.env.UPLOADS_DIR)
  : path.join(process.cwd(), 'uploads');
const STORAGE_DRIVER = process.env.STORAGE_DRIVER || 'local';
const MAX_FILE_SIZE = 8 * 1024 * 1024; // 8MB
const MAX_FILES_PER_REQUEST = 10;
const IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

// Signatures that must appear at the start of the file (magic bytes) by MIME type.


const JPEG_MAGIC = [255,  216,  255];
const PNG_MAGIC = [137,  80,  78,  71];
const WEBP_MAGIC = [82,  73,  70,  70,  36];

const MAGIC_BYTES: Record<string, number[]> = {
  'image/jpeg': JPEG_MAGIC,


  'image/png': PNG_MAGIC,


  'image/webp': WEBP_MAGIC,


};

function looksLikeImage(buffer: Buffer | undefined, mime: string): boolean {
  const magic = MAGIC_BYTES[mime] ?? undefined;
  if (!magic || !buffer) return false;
 if (buffer.length < magic.length) return false;
 return magic.every((byte, i) => buffer[i] === byte);
}

export function getUploadsDir(): string {
  return UPLOADS_DIR;
}

function ensureUploadsDir(): void {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Cloudinary driver: enabled when CLOUDINARY_CLOUD_NAME is provided (Neon DB stores the returned CDN URL as metadata).
const CLOUDINARY_ENABLED = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

if (CLOUDINARY_ENABLED) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

const storage = multer.memoryStorage();

export const uploadImages = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE, files: MAX_FILES_PER_REQUEST },
  fileFilter: (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    if (!IMAGE_MIME_TYPES.has(file.mimetype)) {
      cb(new Error(`Unsupported image type: ${file.mimetype}. Allowed: JPG, PNG, WebP`) as never);
      return;
    }
    cb(null, true);
  },
});

export function validateImageBuffers(files: Express.Multer.File[]): void {
  for (const f of files) {
    if (!looksLikeImage(f.buffer, f.mimetype)) {
      throw new Error(`File contents do not match its declared image type (${f.mimetype}). Upload rejected.`);
    }
  }
}

export async function saveUploadedImage(buffer: Buffer, mime: string): Promise<string> {
  if (CLOUDINARY_ENABLED) {
    const dataUrl = `data:${mime};base64,${buffer.toString('base64')}`;
    const result = await cloudinary.uploader.upload(dataUrl, {
      folder: 'shabaautos',
      resource_type: 'image',
      unique_filename: true,
      overwrite: false,
    });
    return result.secure_url;
  }

  ensureUploadsDir();
  const ext = mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg';
  const name = `${crypto.randomUUID()}.${ext}`;
  await fs.promises.writeFile(path.join(UPLOADS_DIR, name), buffer);
 return `/uploads/${name}`;
}

export async function removeStoredImage(urlOrPath: string): Promise<void> {
  if (!urlOrPath) return;
  if (urlOrPath.includes('res.cloudinary.com')) {
    const publicId = urlOrPath.split('/').pop()?.split('.')[0];
    if (publicId) await cloudinary.uploader.destroy('shabaautos/' + publicId).catch(() => undefined);
    return;
  }

  const filename = path.basename(urlOrPath.split('?')[0]);
  if (filename === '.' || filename === '..') return;
  const filePath = path.join(UPLOADS_DIR, filename);
  // Only remove files that live under our uploads dir (defense-in-depth against path traversal).
  if (STORAGE_DRIVER === 'local' && filePath.startsWith(UPLOADS_DIR)) {

    await fs.promises.unlink(filePath).catch(() => undefined);
  }
}

export function mountUploadsStatic(app: Express): void {
  ensureUploadsDir();
  app.use(
    '/uploads',
    (_req: Request, res: Response, next: NextFunction) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Content-Security-Policy', "default-src 'none'; img-src 'self'");
      next();
    },
    // Only serve the allowlisted image extensions we generate ourselves.



    express.static(UPLOADS_DIR, {
      fallthrough: false,
      setHeaders: (res: Response) => {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');


      },
    }),
  );
}

export { STORAGE_DRIVER };
