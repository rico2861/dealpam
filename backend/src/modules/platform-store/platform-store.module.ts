import { Module } from '@nestjs/common';
import { PlatformStoreController } from './platform-store.controller';
import { PlatformStoreService } from './platform-store.service';

@Module({
  controllers: [PlatformStoreController],
  providers:   [PlatformStoreService],
  exports:     [PlatformStoreService],
})
export class PlatformStoreModule {}
