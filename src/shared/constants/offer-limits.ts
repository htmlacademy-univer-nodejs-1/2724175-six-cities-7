export const OFFER_LIMITS = {
  title: { min: 10, max: 100 },
  description: { min: 20, max: 1024 },
  imagesCount: 6,
  rating: { min: 1, max: 5, precision: 10 },
  rooms: { min: 1, max: 8 },
  guests: { min: 1, max: 10 },
  price: { min: 100, max: 100000 },
  latitude: { min: -90, max: 90 },
  longitude: { min: -180, max: 180 }
} as const;

export const USER_LIMITS = {
  name: { min: 1, max: 15 },
  password: { min: 6, max: 12 }
} as const;
