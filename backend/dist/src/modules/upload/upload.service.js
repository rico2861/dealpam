"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var UploadService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.UploadService = void 0;
const common_1 = require("@nestjs/common");
const client_s3_1 = require("@aws-sdk/client-s3");
const sharp = require('sharp');
const crypto_1 = require("crypto");
const path = require("path");
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif', 'image/avif', 'image/tiff'];
const MAX_SIZE_BYTES = 10 * 1024 * 1024;
let UploadService = UploadService_1 = class UploadService {
    constructor() {
        this.logger = new common_1.Logger(UploadService_1.name);
        this.bucket = process.env.R2_BUCKET_NAME || 'dealpam';
        this.cdnUrl = process.env.R2_CDN_URL || `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${this.bucket}`;
        this.s3 = new client_s3_1.S3Client({
            region: 'auto',
            endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
            credentials: {
                accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
                secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
            },
        });
    }
    async uploadImage(file, folder = 'products') {
        this.validateImage(file);
        const publicId = this.generateId();
        const keyBase = `${folder}/${publicId}`;
        const [full, medium, thumb] = await Promise.all([
            this.processAndUpload(file.buffer, `${keyBase}_full.webp`, 800),
            this.processAndUpload(file.buffer, `${keyBase}_medium.webp`, 600),
            this.processAndUpload(file.buffer, `${keyBase}_thumb.webp`, 300),
        ]);
        return {
            publicId,
            urlFull: full,
            urlMedium: medium,
            urlThumb: thumb,
        };
    }
    async uploadImages(files, folder = 'products') {
        return Promise.all(files.map(f => this.uploadImage(f, folder)));
    }
    async uploadDocument(file, folder = 'documents') {
        if (!file)
            throw new common_1.BadRequestException('Aucun fichier fourni');
        if (file.size > MAX_SIZE_BYTES)
            throw new common_1.BadRequestException('Fichier trop grand (max 10MB)');
        const ext = path.extname(file.originalname).toLowerCase() || '.bin';
        const publicId = this.generateId();
        const key = `${folder}/${publicId}${ext}`;
        await this.s3.send(new client_s3_1.PutObjectCommand({
            Bucket: this.bucket,
            Key: key,
            Body: file.buffer,
            ContentType: file.mimetype,
            CacheControl: 'public, max-age=31536000, immutable',
        }));
        return { url: `${this.cdnUrl}/${key}`, publicId };
    }
    async deleteImage(publicId, folder = 'products') {
        const keys = [`${folder}/${publicId}_full.webp`, `${folder}/${publicId}_medium.webp`, `${folder}/${publicId}_thumb.webp`];
        await Promise.allSettled(keys.map(key => this.s3.send(new client_s3_1.DeleteObjectCommand({ Bucket: this.bucket, Key: key }))));
    }
    async processAndUpload(buffer, key, width) {
        const processed = await sharp(buffer)
            .resize(width, width, { fit: 'inside', withoutEnlargement: true })
            .webp({ quality: width <= 300 ? 75 : 80, effort: 4 })
            .toBuffer();
        await this.s3.send(new client_s3_1.PutObjectCommand({
            Bucket: this.bucket,
            Key: key,
            Body: processed,
            ContentType: 'image/webp',
            CacheControl: 'public, max-age=31536000, immutable',
        }));
        return `${this.cdnUrl}/${key}`;
    }
    validateImage(file) {
        if (!file)
            throw new common_1.BadRequestException('Aucun fichier fourni');
        if (!ALLOWED_MIME.includes(file.mimetype))
            throw new common_1.BadRequestException(`Format non supporté. Acceptés: JPG, PNG, WebP, HEIC`);
        if (file.size > MAX_SIZE_BYTES)
            throw new common_1.BadRequestException('Image trop grande (max 10MB)');
    }
    generateId() {
        return `${Date.now()}_${(0, crypto_1.randomBytes)(8).toString('hex')}`;
    }
};
exports.UploadService = UploadService;
exports.UploadService = UploadService = UploadService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], UploadService);
//# sourceMappingURL=upload.service.js.map