import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const sharp = require('sharp') as (input: Buffer) => any;
import { randomBytes } from 'crypto';
import * as path from 'path';

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif', 'image/avif', 'image/tiff'];
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export interface UploadedImage {
  publicId: string;
  urlFull: string;   // 1400px WebP — product detail page hero
  urlMedium: string; // 700px  WebP — search results / hover zoom
  urlThumb: string;  // 380px  WebP — card grids / carousels
}

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);
  private s3: S3Client;
  private bucket: string;
  private cdnUrl: string;
  // Bucket dédié aux documents d'identité (KYC) — idéalement un bucket R2
  // SANS accès public (pas de domaine pub-*.r2.dev ni domaine custom), pour
  // que ces fichiers ne soient jamais accessibles autrement que via une URL
  // signée à courte durée de vie générée par ce service. Si non configuré,
  // retombe sur le bucket public par défaut (à éviter en production KYC).
  private docsBucket: string;

  constructor() {
    this.bucket = process.env.R2_BUCKET_NAME || 'dealpam';
    this.cdnUrl = process.env.R2_PUBLIC_URL || `${process.env.R2_ENDPOINT}/${this.bucket}`;
    this.docsBucket = process.env.R2_DOCS_BUCKET_NAME || this.bucket;

    this.s3 = new S3Client({
      region: 'auto',
      endpoint: process.env.R2_ENDPOINT,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
      },
    });
  }

  // ── Image upload (3 sizes, WebP) ──────────────────────────────────────────

  async uploadImage(file: Express.Multer.File, folder = 'products'): Promise<UploadedImage> {
    this.validateImage(file);

    const publicId = this.generateId();
    const keyBase = `${folder}/${publicId}`;

    const [full, medium, thumb] = await Promise.all([
      this.processAndUpload(file.buffer, `${keyBase}_full.webp`,   1400, 90),
      this.processAndUpload(file.buffer, `${keyBase}_medium.webp`,  700, 85),
      this.processAndUpload(file.buffer, `${keyBase}_thumb.webp`,   380, 78),
    ]);

    return {
      publicId,
      urlFull:   full,
      urlMedium: medium,
      urlThumb:  thumb,
    };
  }

  async uploadImages(files: Express.Multer.File[], folder = 'products'): Promise<UploadedImage[]> {
    return Promise.all(files.map(f => this.uploadImage(f, folder)));
  }

  // ── Document upload (PDF / image, no resize) ──────────────────────────────

  async uploadDocument(file: Express.Multer.File, folder = 'documents'): Promise<{ url: string; publicId: string }> {
    if (!file) throw new BadRequestException('Aucun fichier fourni');
    if (file.size > MAX_SIZE_BYTES) throw new BadRequestException('Fichier trop grand (max 10MB)');

    const ALLOWED_DOC_MIME = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    const ALLOWED_DOC_EXT = ['.pdf', '.jpg', '.jpeg', '.png', '.webp'];
    if (!ALLOWED_DOC_MIME.includes(file.mimetype)) throw new BadRequestException('Seuls PDF et images (JPG, PNG) sont acceptés');
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_DOC_EXT.includes(ext)) throw new BadRequestException('Extension de fichier non autorisée');
    const publicId = this.generateId();
    const key = `${folder}/${publicId}${ext}`;

    // Pas de CacheControl "public" : ces fichiers ne doivent jamais être mis
    // en cache par un CDN ni servis directement — uniquement via URL signée.
    await this.s3.send(new PutObjectCommand({
      Bucket: this.docsBucket,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    }));

    // "url" ici n'est PAS une URL publique valide si docsBucket est privé —
    // elle sert uniquement de référence interne pour reconstruire la clé
    // (voir getDocumentSignedUrl). Ne jamais renvoyer ce champ tel quel à un client.
    return { url: `${this.docsBucket}/${key}`, publicId };
  }

  // ── URL signée temporaire pour consulter un document privé ────────────────
  // Seule façon légitime d'accéder à un document KYC : lien valide 5 minutes,
  // généré à la demande pour un admin ou le vendeur propriétaire du document.
  async getDocumentSignedUrl(publicId: string, fileName: string, folder = 'seller-documents', expiresInSeconds = 300): Promise<string> {
    const ext = path.extname(fileName).toLowerCase() || '.pdf';
    const key = `${folder}/${publicId}${ext}`;
    const command = new GetObjectCommand({ Bucket: this.docsBucket, Key: key });
    return getSignedUrl(this.s3, command, { expiresIn: expiresInSeconds });
  }

  async deleteDocument(publicId: string, fileName: string, folder = 'seller-documents'): Promise<void> {
    const ext = path.extname(fileName).toLowerCase() || '.pdf';
    const key = `${folder}/${publicId}${ext}`;
    await this.s3.send(new DeleteObjectCommand({ Bucket: this.docsBucket, Key: key }));
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  async deleteImage(publicId: string, folder = 'products'): Promise<void> {
    const keys = [`${folder}/${publicId}_full.webp`, `${folder}/${publicId}_medium.webp`, `${folder}/${publicId}_thumb.webp`];
    await Promise.allSettled(keys.map(key =>
      this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }))
    ));
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private async processAndUpload(buffer: Buffer, key: string, width: number, quality = 85): Promise<string> {
    const processed = await sharp(buffer)
      .resize(width, width, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality, effort: 4, smartSubsample: true })
      .toBuffer();

    await this.s3.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: processed,
      ContentType: 'image/webp',
      CacheControl: 'public, max-age=31536000, immutable',
    }));

    return `${this.cdnUrl}/${key}`;
  }

  private validateImage(file: Express.Multer.File): void {
    if (!file) throw new BadRequestException('Aucun fichier fourni');
    if (!ALLOWED_MIME.includes(file.mimetype)) throw new BadRequestException(`Format non supporté. Acceptés: JPG, PNG, WebP, HEIC`);
    if (file.size > MAX_SIZE_BYTES) throw new BadRequestException('Image trop grande (max 10MB)');
  }

  private generateId(): string {
    return `${Date.now()}_${randomBytes(8).toString('hex')}`;
  }
}
