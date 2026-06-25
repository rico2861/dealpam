import { UploadService } from './upload.service';
export declare class UploadController {
    private uploadService;
    constructor(uploadService: UploadService);
    uploadImage(file: Express.Multer.File, folder?: string): Promise<import("./upload.service").UploadedImage>;
    uploadImages(files: Express.Multer.File[], folder?: string): Promise<import("./upload.service").UploadedImage[]>;
    uploadDocument(file: Express.Multer.File): Promise<{
        url: string;
        publicId: string;
    }>;
    uploadAvatar(file: Express.Multer.File): Promise<import("./upload.service").UploadedImage>;
    deleteImage(publicId: string, folder?: string): Promise<void>;
}
