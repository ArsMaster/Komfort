export interface Shop {
  id: string;
  title: string;
  address: string;
  description: string;
  imageUrl: string;
  phone?: string;
  email?: string;
  workingHours?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}