import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';

export const STORAGE_CONFIG = {
  public: {
    root: path.join(process.cwd(), 'storage', 'public'),
    url: '/storage',
  },
  disks: {
    userImages: 'storage/public/users/images',
    projectImages: 'storage/public/projects/images',
    documents: 'storage/public/projects/documents',
  },
} as const;

export type StorageDisk = keyof typeof STORAGE_CONFIG.disks;

export class Storage {
  static async put(
    disk: StorageDisk,
    file: File,
    options?: { filename?: string; subfolder?: string }
  ): Promise<string> {
    const diskPath = path.join(process.cwd(), STORAGE_CONFIG.disks[disk]);
    const folderPath = options?.subfolder
      ? path.join(diskPath, options.subfolder)
      : diskPath;

    await fs.mkdir(folderPath, { recursive: true });

    const ext = path.extname(file.name);
    const filename = options?.filename || `${randomUUID()}${ext}`;
    const filePath = path.join(folderPath, filename);
    const relativePath = path
      .relative(path.join(process.cwd(), 'storage', 'public'), filePath)
      .replace(/\\/g, '/');

    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(filePath, buffer);

    return relativePath;
  }

  static async delete(_disk: StorageDisk, filePath: string): Promise<void> {
    const storageRoot = path.join(process.cwd(), 'storage', 'public');
    const fullPath = path.join(storageRoot, filePath);

    try {
      await fs.unlink(fullPath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }

  static async exists(disk: StorageDisk, filePath: string): Promise<boolean> {
    const diskPath = path.join(process.cwd(), STORAGE_CONFIG.disks[disk]);
    const fullPath = path.join(diskPath, filePath);

    try {
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  static url(relativePath: string): string {
    return `${STORAGE_CONFIG.public.url}/${relativePath}`;
  }

  static path(disk: StorageDisk, filePath: string): string {
    const diskPath = path.join(process.cwd(), STORAGE_CONFIG.disks[disk]);
    return path.join(diskPath, filePath);
  }
}

export function validateFileType(file: File, allowedTypes: readonly string[]): boolean {
  const mimeType = file.type;
  const extension = path.extname(file.name).toLowerCase();
  return allowedTypes.includes(mimeType) || allowedTypes.includes(extension);
}

export function validateFileSize(file: File, maxSizeMB: number): boolean {
  return file.size <= maxSizeMB * 1024 * 1024;
}

export const ALLOWED_FILE_TYPES = {
  images: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', '.jpg', '.jpeg', '.png', '.gif', '.webp'],
  documents: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.pdf', '.doc', '.docx', '.xls', '.xlsx',
  ],
} as const;

export const MAX_FILE_SIZES = {
  images: 5,
  documents: 50,
} as const;
