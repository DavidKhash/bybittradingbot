export const truncateTicker = (ticker, maxLength = 5) => {
  if (!ticker) return '';
  
  // Remove USDT for length check
  const baseSymbol = ticker.replace('USDT', '');
  
  if (baseSymbol.length <= maxLength) {
    return baseSymbol + 'USDT';
  }
  
  return baseSymbol.slice(0, maxLength) + '...';
};

export const isTickerTruncated = (ticker, maxLength = 5) => {
  const baseSymbol = ticker.replace('USDT', '');
  return baseSymbol.length > maxLength;
}; 