// src/apps/bossbitch/utils/currency.ts

// Create a consistent number formatter to use across server and client
const formatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'ZAR',
  minimumFractionDigits: 2,
  // Use 'R' as currency symbol and place it at the start
  currencyDisplay: 'narrowSymbol'
});

export const formatZAR = (value: number): string => {
  // Format the number and replace the default 'ZAR' symbol with 'R'
  return formatter.format(value).replace('ZAR', 'R');
};

export const parseZAR = (value: string): number => {
  // Remove currency symbol, spaces, and commas
  const cleaned = value.replace(/[R\s,]/g, '');
  return parseFloat(cleaned);
};