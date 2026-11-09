import { qrSvg } from '../qr';
import { CHALK } from './layout';

export const QR_TONE = CHALK;

export const cardQrSvg = (link: string): string => qrSvg(link, QR_TONE);
