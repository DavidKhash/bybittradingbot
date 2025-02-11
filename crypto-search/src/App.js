// src/App.js
import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [query, setQuery] = useState('');
  const [tickers, setTickers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTickers = async () => {
      if (query.trim() === '') {
        setTickers([]);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const response = await fetch('http://localhost:4001/api/tickers', {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });
        
        console.log('Response status:', response.status);
        const data = await response.json();
        console.log('Response data:', data);

        if (response.ok && data.retCode === 0 && data.result && data.result.list) {
          const filteredTickers = data.result.list.filter(ticker => 
            ticker.symbol.toLowerCase().includes(query.toLowerCase())
          );
          setTickers(filteredTickers);
        } else {
          throw new Error(data.retMsg || 'Failed to fetch tickers');
        }
      } catch (error) {
        console.error('Detailed error:', error);
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

  return (
    <div className="App">
      <h1>Crypto Ticker Search</h1>
      <input
        type="text"
        placeholder="Search for a crypto ticker (e.g., BTC, ETH)..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {loading && <p>Loading...</p>}
      {error && <p className="error">{error}</p>}
      <ul>
        {tickers.map((ticker) => (
          <li key={ticker.symbol}>
            <span className="symbol">{ticker.symbol}</span>
            <span className="price">
              Last Price: ${parseFloat(ticker.lastPrice).toLocaleString()} 
            </span>
            <span className="change">
              24h Change: 
              <span className={parseFloat(ticker.price24hPcnt) >= 0 ? 'positive' : 'negative'}>
                {(parseFloat(ticker.price24hPcnt) * 100).toFixed(2)}%
              </span>
            </span>
            <span className="volume">
              24h Volume: ${parseFloat(ticker.volume24h).toLocaleString()}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;
