import { qrSvg } from '../qr';

export const QR_TONE = '#c0baac';

export const cardQrSvg = (link: string): string => qrSvg(link, QR_TONE);
