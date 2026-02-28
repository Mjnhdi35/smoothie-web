import { BadRequestException } from '@nestjs/common';
import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
]);

interface UploadFileLike {
  mimetype: string;
}

type UploadFileFilterCallback = (
  error: Error | null,
  acceptFile: boolean,
) => void;

export const DEFAULT_UPLOAD_OPTIONS: MulterOptions = {
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
  },
  fileFilter: (
    _req: unknown,
    file: UploadFileLike,
    callback: UploadFileFilterCallback,
  ) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      callback(new BadRequestException('Unsupported file type'), false);
      return;
    }

    callback(null, true);
  },
};
