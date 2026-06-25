import { Controller, Post, Delete, Body, UploadedFile, UploadedFiles, UseInterceptors, UseGuards, BadRequestException } from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiConsumes, ApiOperation } from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { UploadService } from './upload.service';

const storage = memoryStorage();
const imgFilter = (_req: any, file: Express.Multer.File, cb: any) => {
  if (file.mimetype.startsWith('image/')) cb(null, true);
  else cb(new BadRequestException('Seules les images sont acceptées'), false);
};

@ApiTags('Upload')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('upload')
export class UploadController {
  constructor(private uploadService: UploadService) {}

  @Post('image')
  @ApiOperation({ summary: 'Upload une image — retourne 3 tailles WebP (thumb/medium/full) sur R2' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { storage, fileFilter: imgFilter, limits: { fileSize: 10 * 1024 * 1024 } }))
  uploadImage(@UploadedFile() file: Express.Multer.File, @Body('folder') folder = 'products') {
    return this.uploadService.uploadImage(file, folder);
  }

  @Post('images')
  @ApiOperation({ summary: 'Upload plusieurs images (max 8)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FilesInterceptor('files', 8, { storage, fileFilter: imgFilter, limits: { fileSize: 10 * 1024 * 1024 } }))
  uploadImages(@UploadedFiles() files: Express.Multer.File[], @Body('folder') folder = 'products') {
    if (!files?.length) throw new BadRequestException('Aucun fichier fourni');
    return this.uploadService.uploadImages(files, folder);
  }

  @Post('document')
  @ApiOperation({ summary: 'Upload document (PDF, image)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { storage, limits: { fileSize: 10 * 1024 * 1024 } }))
  uploadDocument(@UploadedFile() file: Express.Multer.File) {
    return this.uploadService.uploadDocument(file, 'documents');
  }

  @Post('avatar')
  @ApiOperation({ summary: 'Upload avatar utilisateur' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { storage, fileFilter: imgFilter, limits: { fileSize: 5 * 1024 * 1024 } }))
  uploadAvatar(@UploadedFile() file: Express.Multer.File) {
    return this.uploadService.uploadImage(file, 'avatars');
  }

  @Delete()
  deleteImage(@Body('publicId') publicId: string, @Body('folder') folder = 'products') {
    return this.uploadService.deleteImage(publicId, folder);
  }
}
