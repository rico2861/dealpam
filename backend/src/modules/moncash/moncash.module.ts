import { Module, Global } from '@nestjs/common';
import { MoncashService } from './moncash.service';

@Global()
@Module({
  providers: [MoncashService],
  exports: [MoncashService],
})
export class MoncashModule {}
