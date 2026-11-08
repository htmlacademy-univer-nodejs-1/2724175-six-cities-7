import { Offer } from '../../types/index.js';

export function serializeOffer(offer: Offer): string {
  const fields = [
    offer.title, offer.description, offer.postDate.toISOString(), offer.city.name,
    offer.previewImage, offer.images.join(';'), String(offer.isPremium), String(offer.isFavorite),
    String(offer.rating), offer.housingType, String(offer.roomsCount), String(offer.guestsCount),
    String(offer.price), offer.amenities.join(';'), offer.author.name, offer.author.email,
    offer.author.avatar ?? '', offer.author.password, offer.author.type,
    String(offer.location.latitude), String(offer.location.longitude)
  ];
  if (fields.some((field) => /[\t\r\n]/.test(field))) {
    throw new Error('Поля TSV не должны содержать табуляции или переводы строк.');
  }
  if (offer.images.some((image) => image.includes(';'))) {
    throw new Error('Ссылки на фотографии не должны содержать разделитель «;».');
  }
  return `${fields.join('\t')}\n`;
}
