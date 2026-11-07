export interface LocalTimeProps {
  at: Date;
  timeZone?: string;
  long?: boolean;
  short?: 'day' | 'minute';
}
