// src/App.js
import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
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
        const response = await fetch(`http://159.65.25.174:4001/api/tickers?symbol=${query}USDT`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });
        
        const data = await response.json();

        if (response.ok && data.retCode === 0 && data.result && data.result.list) {
          const filteredTickers = data.result.list.filter(ticker => 
            ticker.symbol.toLowerCase().includes(query.toLowerCase())
          );
          setTickers(filteredTickers);
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
    setQuery(''); // Clear search after selection
  };

  const formatNumber = (num) => {
    return parseFloat(num).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 8
    });
  };

  return (
    <div className="App">
      <h1>Crypto Ticker Search</h1>

      {selectedCoin && (
        <div className="selected-coin">
          <h2>{selectedCoin.symbol}</h2>
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
          {tickers.map((ticker) => (
            <li 
              key={ticker.symbol}
              onClick={() => handleCoinSelect(ticker)}
              className={selectedCoin?.symbol === ticker.symbol ? 'selected' : ''}
            >
              <div className="top-row">
                <span className="symbol">{ticker.symbol}</span>
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
          ))}
        </ul>
      )}
    </div>
  );
}

export default App;
