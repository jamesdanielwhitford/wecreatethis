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
    const oldSelectionStart = input.selectionStart || 0;
    
    // Get the numeric value before the cursor (ignoring formatting characters)
    const valueBeforeCursor = oldValue.substring(0, oldSelectionStart).replace(/[R\s,]/g, '');
    const numericValueBeforeCursor = valueBeforeCursor.length;
    
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
        
        // Calculate new cursor position by finding where our numeric cursor position should be
        // in the formatted string
        let newCursorPos = 0;
        let numericCharCount = 0;
        
        // Walk through the formatted string to find the position where we've seen
        // the same number of numeric characters as were before the cursor in the original value
        for (let i = 0; i < formatted.length; i++) {
          const char = formatted[i];
          if (!/[R\s,]/.test(char)) {
            numericCharCount++;
          }
          
          if (numericCharCount > numericValueBeforeCursor) {
            newCursorPos = i;
            break;
          }
          
          newCursorPos = i + 1;
        }
        
        // Set cursor position in next render cycle
        setTimeout(() => {
          input.setSelectionRange(newCursorPos, newCursorPos);
        }, 0);
      }
    } catch {
      setValue(cleaned);
    }
  };
}