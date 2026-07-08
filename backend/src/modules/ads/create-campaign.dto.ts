import { IsString, IsNumber, IsOptional, IsArray, IsDateString, Min, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCampaignDto {
  @IsString() name: string;
  @IsString() @IsOptional() productId?: string;
  @IsString() @IsOptional() storeId?: string;
  @IsIn(['AWARENESS', 'TRAFFIC', 'CONVERSIONS']) @IsOptional() objective?: string;

  @Type(() => Number) @IsNumber() @Min(25) totalBudget: number;   // HTG
  @Type(() => Number) @IsNumber() @IsOptional() dailyBudget?: number;

  @IsDateString() startDate: string;
  @IsDateString() endDate: string;

  // Ciblage
  @IsArray() @IsOptional() targetGenders?: string[];     // ["MALE","FEMALE"] ou vide = tous
  @Type(() => Number) @IsNumber() @IsOptional() targetAgeMin?: number;
  @Type(() => Number) @IsNumber() @IsOptional() targetAgeMax?: number;
  @IsArray() @IsOptional() targetDepts?: string[];        // Départements haïtiens
  @IsArray() @IsOptional() targetCategories?: string[];
}
