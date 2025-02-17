import React, { useState, useEffect } from 'react';
import '../App.css';
import TradeModal from '../components/TradeModal';
import Toast from '../components/Toast';
import LoadingSpinner from '../components/LoadingSpinner';

function Home() {
  const [query, setQuery] = useState('');
  const [tickers, setTickers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedCoin, setSelectedCoin] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [orderDetails, setOrderDetails] = useState(null);
  const [accountBalance, setAccountBalance] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

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
        const response = await fetch(`https://ecommerzz.com/api/tickers?category=spot`, {
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

  useEffect(() => {
    // Fetch account balance when component mounts
    fetchAccountBalance();
  }, []);

  const fetchAccountBalance = async () => {
    try {
      const response = await fetch('https://ecommerzz.com/api/balance', {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      if (data.result && data.result.list) {
        setAccountBalance(data.result.list[0].totalWalletBalance);
      }
    } catch (error) {
      console.error('Error fetching balance:', error);
    }
  };

  const handlePlaceOrder = async (symbol) => {
    if (!localStorage.getItem('tradePassword')) {
      alert('Please set a trade password in Settings first');
      return;
    }

    const tradeAmount = localStorage.getItem('tradeAmount');
    const tradeLeverage = localStorage.getItem('tradeLeverage') || '1';
    
    if (!tradeAmount) {
      alert('Please set a trade amount in Settings first');
      return;
    }

    const orderDetails = {
      symbol: symbol,
      side: 'Buy',
      type: 'Market',
      qty: tradeAmount,
      leverage: tradeLeverage,
      positionIdx: 0,
      timeInForce: 'GTC'
    };

    console.log('Setting order details:', orderDetails);
    
    setOrderDetails(orderDetails);
    setIsModalOpen(true);
  };

  const handleOrderConfirm = async (password) => {
    try {
      setIsPlacingOrder(true); // Show loading spinner
      const storedLeverage = localStorage.getItem('tradeLeverage') || '10';
      const storedAmount = localStorage.getItem('tradeAmount') || '100';

      const orderParams = {
        symbol: selectedCoin.symbol,
        side: 'Buy',
        type: 'Market',
        qty: storedAmount,
        leverage: storedLeverage,
        positionIdx: 0,
        timeInForce: 'GTC',
        password: password
      };

      const response = await fetch('https://ecommerzz.com/api/place-order', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderParams)
      });

      const data = await response.json();
      
      if (response.ok && data.retCode === 0) {
        setToast({
          show: true,
          message: 'Order placed successfully!',
          type: 'success'
        });
        setIsModalOpen(false);
      } else {
        setToast({
          show: true,
          message: `Order failed: ${data.message || 'Unknown error'}`,
          type: 'error'
        });
      }
    } catch (error) {
      console.error('Error placing order:', error);
      setToast({
        show: true,
        message: `Failed to place order: ${error.message}`,
        type: 'error'
      });
    } finally {
      setIsPlacingOrder(false); // Hide loading spinner
    }
  };

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

  // Add this to your existing JSX where you want the trade button to appear
  const renderTradeButton = (ticker) => (
    <button 
      className="trade-button"
      onClick={() => handlePlaceOrder(ticker.symbol)}
    >
      Trade
    </button>
  );

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
          {renderTradeButton(selectedCoin)}
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

      {loading ? (
        <div className="loading-container">
          <div className="spinner" />
        </div>
      ) : error ? (
        <p className="error">{error}</p>
      ) : query.trim() !== '' ? (
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
      ) : null}

      <TradeModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleOrderConfirm}
        symbol={orderDetails?.symbol}
        orderDetails={orderDetails}
      />

      {isPlacingOrder && <LoadingSpinner />}

      {toast.show && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ ...toast, show: false })}
        />
      )}
    </div>
  );
}

export default Home; 