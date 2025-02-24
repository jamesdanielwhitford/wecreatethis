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

/**
 * Creates a controlled input handler for currency fields
 * that maintains cursor position when formatting
 */
export function createCurrencyInputHandler(
  setValue: (value: string) => void
) {
  return function handleCurrencyInput(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const input = e.target;
    const oldValue = input.value;
    const cursorPosition = input.selectionStart || 0;
    
    // Count number of currency symbols and spaces before cursor
    const symbolsBeforeCursor = (oldValue.substring(0, cursorPosition).match(/[R\s,]/g) || []).length;
    
    // Clean the input (remove all non-numeric and non-decimal characters)
    const cleaned = oldValue.replace(/[^0-9.]/g, '');
    
    if (cleaned === '') {
      setValue('');
      return;
    }

    // Validate decimal points
    const parts = cleaned.split('.');
    if (parts.length > 2) return;
    
    try {
      const number = parseFloat(cleaned);
      if (!isNaN(number)) {
        // Format the value
        const formatted = formatZAR(number);
        setValue(formatted);
        
        // Calculate new cursor position 
        // (accounting for added/removed formatting characters)
        const newSymbolsBeforeCursor = (formatted.substring(0, cursorPosition).match(/[R\s,]/g) || []).length;
        const symbolDiff = newSymbolsBeforeCursor - symbolsBeforeCursor;
        
        // Set cursor position in next render cycle
        setTimeout(() => {
          const newPosition = Math.min(
            cursorPosition + symbolDiff,
            formatted.length
          );
          input.setSelectionRange(newPosition, newPosition);
        }, 0);
      }
    } catch {
      setValue(cleaned);
    }
  };
}