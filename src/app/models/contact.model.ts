export interface ContactInfo {
  id: number;
  phone: string;
  email: string;
  office: string;
  social: {
    name: string;
    url: string;
    icon: string;
  }[];
  workingHours?: string;
  mapEmbed?: string; 
  aboutSections?: { title: string; content: string }[];
}