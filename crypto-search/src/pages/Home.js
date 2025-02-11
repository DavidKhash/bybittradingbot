import React, { useState, useEffect } from 'react';
import '../App.css';

function Home() {
  const [query, setQuery] = useState('');
  const [tickers, setTickers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedCoin, setSelectedCoin] = useState(null);

  useEffect(() => {
    if (query.trim() === '') {
      setTickers([]);
      return;
    }

    const fetchTickers = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch all spot tickers instead of a specific symbol
        const response = await fetch(`http://159.65.25.174:4001/api/tickers?category=spot`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });
        
        const data = await response.json();

        if (response.ok && data.retCode === 0 && data.result && data.result.list) {
          // Filter tickers based on user input
          const filteredTickers = data.result.list.filter(ticker => {
            const normalizedSymbol = ticker.symbol.toLowerCase();
            const normalizedQuery = query.toLowerCase();
            return normalizedSymbol.includes(normalizedQuery);
          });

          // Sort results: exact matches first, then alphabetically
          const sortedTickers = filteredTickers.sort((a, b) => {
            const aStartsWithQuery = a.symbol.toLowerCase().startsWith(query.toLowerCase());
            const bStartsWithQuery = b.symbol.toLowerCase().startsWith(query.toLowerCase());
            
            if (aStartsWithQuery && !bStartsWithQuery) return -1;
            if (!aStartsWithQuery && bStartsWithQuery) return 1;
            
            return a.symbol.localeCompare(b.symbol);
          });

          setTickers(sortedTickers);
          setError(null);
        } else {
          throw new Error(data.retMsg || 'Failed to fetch tickers');
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        setError(`Error fetching tickers: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };

    const delayDebounceFn = setTimeout(() => {
      fetchTickers();
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  const handleCoinSelect = (ticker) => {
    setSelectedCoin(ticker);
    setQuery('');
  };

  const formatNumber = (num) => {
    return parseFloat(num).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 8
    });
  };

  // Add this function to get crypto icon URL
  const getCryptoIcon = (symbol) => {
    // Remove USDT or USD from the symbol if present
    const baseSymbol = symbol.replace(/USDT$|USD$/, '').toLowerCase();
    
    // You can use either of these icon services:
    
    // Option 1: CryptoIcons API
    return `https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/${baseSymbol}.png`;
    
    // Option 2: Alternative service
    // return `https://cryptoicons.org/api/icon/${baseSymbol}/200`;
  };

  // Add error handling for icon loading
  const handleIconError = (e) => {
    e.target.src = 'https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/generic.png'; // Generic icon as fallback
  };

  return (
    <div className="App">
      <h1>Crypto Ticker Search</h1>

      {selectedCoin && (
        <div className="selected-coin">
          <div className="selected-coin-header">
            <img 
              src={getCryptoIcon(selectedCoin.symbol)}
              alt={selectedCoin.symbol}
              className="coin-icon large"
              onError={handleIconError}
            />
            <h2>{selectedCoin.symbol}</h2>
          </div>
          <div className="selected-coin-details">
            <div className="detail-item">
              <span className="detail-label">Price</span>
              <span className="detail-value">${formatNumber(selectedCoin.lastPrice)}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">24h Change</span>
              <span className={`detail-value ${parseFloat(selectedCoin.price24hPcnt) >= 0 ? 'positive' : 'negative'}`}>
                {(parseFloat(selectedCoin.price24hPcnt) * 100).toFixed(2)}%
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-label">24h High</span>
              <span className="detail-value">${formatNumber(selectedCoin.highPrice24h)}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">24h Low</span>
              <span className="detail-value">${formatNumber(selectedCoin.lowPrice24h)}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">24h Volume</span>
              <span className="detail-value">${formatNumber(selectedCoin.volume24h)}</span>
            </div>
          </div>
        </div>
      )}

      <div className="search-container">
        <input
          type="text"
          placeholder="Search for a crypto ticker (e.g., BTC, ETH)..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {loading && <p className="loading">Loading...</p>}
      {error && <p className="error">{error}</p>}
      
      {query && (
        <ul>
          {tickers.length > 0 ? (
            tickers.map((ticker) => (
              <li 
                key={ticker.symbol}
                onClick={() => handleCoinSelect(ticker)}
                className={selectedCoin?.symbol === ticker.symbol ? 'selected' : ''}
              >
                <div className="top-row">
                  <div className="symbol-container">
                    <img 
                      src={getCryptoIcon(ticker.symbol)}
                      alt={ticker.symbol}
                      className="coin-icon"
                      onError={handleIconError}
                    />
                    <span className="symbol">{ticker.symbol}</span>
                  </div>
                  <span className="price">
                    ${formatNumber(ticker.lastPrice)}
                  </span>
                </div>
                <div className="bottom-row">
                  <span className={`change ${parseFloat(ticker.price24hPcnt) >= 0 ? 'positive' : 'negative'}`}>
                    {(parseFloat(ticker.price24hPcnt) * 100).toFixed(2)}%
                  </span>
                  <span className="volume">
                    Vol: ${formatNumber(ticker.volume24h)}
                  </span>
                </div>
              </li>
            ))
          ) : (
            <p className="no-results">No matching cryptocurrencies found</p>
          )}
        </ul>
      )}
    </div>
  );
}

export default Home; 