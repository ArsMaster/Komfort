export interface Slide {
  image: string;
  title?: string;
  description?: string;
  link?: string;   
  isActive?: boolean;
  order?: number; 
}

export interface AboutSection {
  title: string;
  content: string;
}

export interface CompanyInfo {
  address: string;
  phone: string;
  email: string;
  workHours: string;
  aboutSections: AboutSection[];
  social?: Array<{ type: string; url: string }>;
}

export interface HomePageSettings {
  title: string;
  description: string;
  bannerImages?: string[];
  featuredCategories: number[];
}