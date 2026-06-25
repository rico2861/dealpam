export declare class CreateCampaignDto {
    name: string;
    productId: string;
    objective?: string;
    totalBudget: number;
    dailyBudget?: number;
    startDate: string;
    endDate: string;
    targetGenders?: string[];
    targetAgeMin?: number;
    targetAgeMax?: number;
    targetDepts?: string[];
    targetCategories?: string[];
}
