import { Global, Module } from '@nestjs/common';
import { BadgesService } from './badges.service';

@Global()
@Module({ providers: [BadgesService], exports: [BadgesService] })
export class BadgesModule {}
