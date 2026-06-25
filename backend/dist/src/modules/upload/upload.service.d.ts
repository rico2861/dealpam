export interface UploadedImage {
    publicId: string;
    urlFull: string;
    urlMedium: string;
    urlThumb: string;
}
export declare class UploadService {
    private readonly logger;
    private s3;
    private bucket;
    private cdnUrl;
    constructor();
    uploadImage(file: Express.Multer.File, folder?: string): Promise<UploadedImage>;
    uploadImages(files: Express.Multer.File[], folder?: string): Promise<UploadedImage[]>;
    uploadDocument(file: Express.Multer.File, folder?: string): Promise<{
        url: string;
        publicId: string;
    }>;
    deleteImage(publicId: string, folder?: string): Promise<void>;
    private processAndUpload;
    private validateImage;
    private generateId;
}
