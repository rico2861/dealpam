import { Transform } from 'class-transformer';
import { IsString, IsOptional, IsNumber, IsBoolean, MinLength, MaxLength, Min, IsIn } from 'class-validator';

export class CreateProductDto {
  @IsString() @MinLength(3) @MaxLength(200)
  name: string;

  @IsOptional() @IsString() @MaxLength(80)
  subtitle?: string;

  @IsString() @MinLength(3)
  description: string;

  @IsString()
  categoryId: string;

  @IsOptional() @IsString()
  brandId?: string;

  /** Nom de marque libre — si aucune marque existante ne correspond, elle est créée à la volée. */
  @IsOptional() @IsString() @MaxLength(60)
  brandName?: string;

  @Transform(({ value }) => parseFloat(value))
  @IsNumber() @Min(0)
  price: number;

  @IsOptional() @Transform(({ value }) => (value ? parseFloat(value) : undefined))
  @IsNumber() @Min(0)
  salePrice?: number;

  @IsOptional() @Transform(({ value }) => parseInt(value) || 0)
  @IsNumber() @Min(0)
  stock?: number;

  /** JSON string — paliers de prix dégressifs: [{"minQty":1,"price":500},{"minQty":3,"price":650}] */
  @IsOptional() @IsString()
  priceTiers?: string;

  @IsOptional() @Transform(({ value }) => parseInt(value) || 1)
  @IsNumber() @Min(1)
  minOrderQty?: number;

  @IsOptional() @IsString()
  sku?: string;

  @IsOptional() @IsString() @IsIn(['new', 'used', 'refurbished', 'damaged'])
  condition?: string;

  @IsOptional() @IsString() @MaxLength(500)
  conditionNote?: string;

  @IsOptional()
  sizes?: string | string[];

  @IsOptional()
  colors?: string | string[];

  @IsOptional() @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  hasDelivery?: boolean;

  @IsOptional() @Transform(({ value }) => (value ? parseFloat(value) : undefined))
  @IsNumber() @Min(0)
  deliveryPriceHTG?: number;

  @IsOptional() @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  allowOffers?: boolean;

  @IsOptional() @Transform(({ value }) => (value ? parseFloat(value) : undefined))
  @IsNumber() @Min(0)
  minOfferPriceHTG?: number;

  @IsOptional()
  deliveryDepts?: string | string[];

  @IsOptional() @IsString()
  city?: string;

  @IsOptional() @IsString()
  department?: string;

  /** JSON string — category-specific attributes */
  @IsOptional() @IsString()
  attributes?: string;

  /** JSON string — noms des points de retrait de la boutique où ce produit est disponible: ["Nom du point A","Nom du point B"]. Absent/vide = disponible à tous les points de retrait. */
  @IsOptional() @IsString()
  pickupPointNames?: string;

  /** JSON string — variant array: [{color,colorHex,size,stock,priceOverride?,sku?,imageFileIndex?}] */
  @IsOptional() @IsString()
  variants?: string;

  /** Target store id — defaults to seller's primary store */
  @IsOptional() @IsString()
  storeId?: string;

  /** Service / Immobilier / Freelance */
  @IsOptional() @IsString()
  productType?: string;

  @IsOptional() @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  requiresAppointment?: boolean;

  /** JSON string — extra config for service/RE/freelance listings */
  @IsOptional() @IsString()
  serviceConfig?: string;

  /** Price unit label: "HTG/séance", "HTG/projet", "HTG/m²"… */
  @IsOptional() @IsString()
  priceUnit?: string;

  /** Full address of the service location */
  @IsOptional() @IsString()
  address?: string;

  /** Publication status */
  @IsOptional() @IsString()
  status?: string;

  /** Badge "Édition limitée" — mis en avant visuellement sur la fiche produit */
  @IsOptional() @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isLimitedEdition?: boolean;
}
