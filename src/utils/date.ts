const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export const isValidDateOnly = (value: string): boolean => {
  if (!DATE_ONLY_REGEX.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};

export const toUtcDate = (dateOnly: string): Date => {
  if (!isValidDateOnly(dateOnly)) {
    throw new Error('Invalid date. Expected YYYY-MM-DD');
  }

  return new Date(`${dateOnly}T00:00:00.000Z`);
};

export const getUtcDateKey = (value: Date): string => value.toISOString().slice(0, 10);
