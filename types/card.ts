export interface MarketListing {
  item_id?: string;
  item_link?: string;
  name?: string;
  price?: number;
  currency?: string;
  country_code?: string;
  source?: string;
  date_of_creation?: string;
  grade_company?: string | null;
  grade_value?: number | null;
  date_of_sale?: string | null;
}

export interface Card {
  id: string;
  name: string;
  year?: string;
  set?: string;
  cardNumber?: string;
  subcategory?: string;
  company?: string;
  team?: string;
  rarity?: string;
  price?: number;
  grade?: string;
  gradeCompany?: string;
  certificateNumber?: string;
  links?: Record<string, string>;
  listings?: MarketListing[];
  imageUri: string;
  backImageUri?: string;
  dateAdded: string;
  folderId: string | null;
}

export interface Folder {
  id: string;
  name: string;
  createdAt: string;
}