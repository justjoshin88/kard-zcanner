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