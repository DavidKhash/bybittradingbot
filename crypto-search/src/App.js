// src/App.js
import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [query, setQuery] = useState('');
  const [tickers, setTickers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Don't fetch if query is empty
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
          // Filter results that match the query
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

    // Debounce the API call by 500ms
    const delayDebounceFn = setTimeout(() => {
      fetchTickers();
    }, 500);

    // Cleanup timeout on component unmount or when query changes
    return () => clearTimeout(delayDebounceFn);
  }, [query]); // Effect runs when query changes

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
            <span className={`change ${parseFloat(ticker.price24hPcnt) >= 0 ? 'positive' : 'negative'}`}>
              24h Change: {(parseFloat(ticker.price24hPcnt) * 100).toFixed(2)}%
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
