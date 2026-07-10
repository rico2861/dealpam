import { IsString, IsNumber, IsOptional, IsArray, IsDateString, Min, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCampaignDto {
  @IsString() name: string;
  @IsString() @IsOptional() productId?: string;
  @IsString() @IsOptional() storeId?: string;
  @IsIn(['AWARENESS', 'TRAFFIC', 'CONVERSIONS']) @IsOptional() objective?: string;

  // Le minimum réel (configurable par l'admin via AdSettings) est vérifié à
  // l'exécution dans AdsService.createCampaign — ce décorateur statique ne
  // sert qu'à rejeter les valeurs absurdes (négatives/nulles) avant même
  // d'atteindre le service.
  @Type(() => Number) @IsNumber() @Min(1) totalBudget: number;   // HTG
  @Type(() => Number) @IsNumber() @IsOptional() dailyBudget?: number;

  @IsDateString() startDate: string;
  @IsDateString() endDate: string;

  // Ciblage
  @IsArray() @IsOptional() targetGenders?: string[];     // ["MALE","FEMALE"] ou vide = tous
  @Type(() => Number) @IsNumber() @IsOptional() targetAgeMin?: number;
  @Type(() => Number) @IsNumber() @IsOptional() targetAgeMax?: number;
  @IsArray() @IsOptional() targetDepts?: string[];        // Départements haïtiens
  @IsArray() @IsOptional() targetCategories?: string[];
  // Centres d'intérêt sélectionnés manuellement (liste fixe côté frontend) —
  // simple tag list, pas d'inférence comportementale/ML.
  @IsArray() @IsOptional() targetInterests?: string[];
}
