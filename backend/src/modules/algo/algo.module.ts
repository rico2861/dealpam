import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AlgoController } from './algo.controller';
import { AlgoService } from './algo.service';

@Module({
  imports: [HttpModule],
  controllers: [AlgoController],
  providers: [AlgoService],
  exports: [AlgoService],
})
export class AlgoModule {}
