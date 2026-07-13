import { PartialType, OmitType } from '@nestjs/swagger';
import { CreatePlanDto } from './create-plan.dto';

// tier n'est jamais modifiable après création (clé unique liée aux abonnements existants).
export class UpdatePlanDto extends PartialType(OmitType(CreatePlanDto, ['tier'] as const)) {}
