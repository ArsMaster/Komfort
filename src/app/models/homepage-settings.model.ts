export interface Slide {
  image: string;
  title?: string;
  description?: string;
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
}

export interface HomePageSettings {
  title: string;
  description: string;
  bannerImages?: string[];
  featuredCategories: number[];
}