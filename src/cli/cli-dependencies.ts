import { Offer } from '../shared/types/index.js';
import { MockServerData, OfferTemplate } from '../shared/types/mock-server-data.type.js';

export type ReaderFactory = (path: string) => { read(): AsyncIterable<Offer> };
export type GeneratorFactory = (templates: OfferTemplate[]) => { generate(): Offer };
export type TemplateLoader = (url: string) => Promise<MockServerData>;
export type OfferSerializer = (offer: Offer) => string;
