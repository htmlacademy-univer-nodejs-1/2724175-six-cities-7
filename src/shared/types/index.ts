export const CITY_LOCATIONS = {
  Paris: { latitude: 48.85661, longitude: 2.351499 },
  Cologne: { latitude: 50.938361, longitude: 6.959974 },
  Brussels: { latitude: 50.846557, longitude: 4.351697 },
  Amsterdam: { latitude: 52.370216, longitude: 4.895168 },
  Hamburg: { latitude: 53.550341, longitude: 10.000654 },
  Dusseldorf: { latitude: 51.225402, longitude: 6.776314 }
} as const;

export type CityName = keyof typeof CITY_LOCATIONS;
export type Location = { latitude: number; longitude: number };
export type City = { name: CityName; location: Location };

export enum HousingType {
  Apartment = 'apartment',
  House = 'house',
  Room = 'room',
  Hotel = 'hotel'
}

export enum Amenity {
  Breakfast = 'Breakfast',
  AirConditioning = 'Air conditioning',
  LaptopFriendlyWorkspace = 'Laptop friendly workspace',
  BabySeat = 'Baby seat',
  Washer = 'Washer',
  Towels = 'Towels',
  Fridge = 'Fridge'
}

export enum UserType {
  Regular = 'обычный',
  Pro = 'pro'
}

export type User = {
  name: string;
  email: string;
  avatar?: string;
  password: string;
  type: UserType;
};

export type Offer = {
  title: string;
  description: string;
  postDate: Date;
  city: City;
  previewImage: string;
  images: string[];
  isPremium: boolean;
  isFavorite: boolean;
  rating: number;
  housingType: HousingType;
  roomsCount: number;
  guestsCount: number;
  price: number;
  amenities: Amenity[];
  author: User;
  commentCount: number;
  location: Location;
};

export type Comment = {
  text: string;
  postDate: Date;
  rating: number;
  author: User;
};
