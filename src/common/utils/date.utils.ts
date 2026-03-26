import { ISO_DATE_LENGTH } from './date.constants';

export const toIsoDate = (date: Date): string => {
  return date.toISOString().slice(0, ISO_DATE_LENGTH);
};

export const addDays = (date: Date, days: number): Date => {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
};
