export declare class CreateProductDto {
    name: string;
    description: string;
    categoryId: string;
    brandId?: string;
    price: number;
    salePrice?: number;
    stock?: number;
    sku?: string;
    sizes?: string[];
    colors?: string[];
}
