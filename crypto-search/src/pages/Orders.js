import React, { useState, useEffect } from 'react';
import '../App.css';
import './Orders.css';

function Orders() {
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const getCryptoIcon = (symbol) => {
    const baseSymbol = symbol.replace(/USDT$|USD$/, '').toLowerCase();
    return `https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/${baseSymbol}.png`;
  };

  const handleIconError = (e) => {
    e.target.src = 'https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/generic.png';
  };

  useEffect(() => {
    fetchPositions();
  }, []);

  const fetchPositions = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('http://159.65.25.174:4001/api/positions', {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      console.log('Positions data:', data);
      
      if (response.ok) {
        if (data.result && Array.isArray(data.result.list)) {
          const activePositions = data.result.list.filter(
            position => parseFloat(position.size) > 0
          );
          setPositions(activePositions);
        } else {
          setPositions([]); // Set empty array if no positions found
        }
      } else {
        const errorMessage = data.error || 'Failed to fetch positions';
        console.error('Position fetch error:', data);
        setError(errorMessage);
      }
    } catch (error) {
      console.error('Error fetching positions:', error);
      setError('Error loading positions');
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num) => {
    return parseFloat(num).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 8
    });
  };

  return (
    <div className="App">
      <h1>Current Positions</h1>
      {loading ? (
        <div className="loading-container">
          <div className="spinner" />
        </div>
      ) : error ? (
        <p className="error">{error}</p>
      ) : positions.length > 0 ? (
        <div className="positions-container">
          {positions.map((position) => (
            <div key={`${position.symbol}-${position.positionIdx}`} className="position-card">
              <div className="position-header">
                <div className="symbol-container">
                  <img 
                    src={getCryptoIcon(position.symbol)}
                    alt={position.symbol}
                    className="coin-icon"
                    onError={handleIconError}
                  />
                  <h2>{position.symbol}</h2>
                </div>
                <span className={`position-side ${position.side.toLowerCase()}`}>
                  {position.side}
                </span>
              </div>
              
              <div className="position-details">
                <div className="detail-row">
                  <span className="label">Size:</span>
                  <span className="value">{formatNumber(position.size)}</span>
                </div>
                
                <div className="detail-row">
                  <span className="label">Entry Price:</span>
                  <span className="value">${formatNumber(position.avgPrice)}</span>
                </div>
                
                <div className="detail-row">
                  <span className="label">Mark Price:</span>
                  <span className="value">${formatNumber(position.markPrice)}</span>
                </div>
                
                <div className="detail-row">
                  <span className="label">Leverage:</span>
                  <span className="value">{position.leverage}x</span>
                </div>
                
                <div className="detail-row">
                  <span className="label">Unrealized PNL:</span>
                  <span className={`value ${parseFloat(position.unrealisedPnl) >= 0 ? 'positive' : 'negative'}`}>
                    ${formatNumber(position.unrealisedPnl)}
                  </span>
                </div>
                
                <div className="detail-row">
                  <span className="label">ROE:</span>
                  <span className={`value ${parseFloat(position.unrealisedPnl) >= 0 ? 'positive' : 'negative'}`}>
                    {formatNumber((parseFloat(position.unrealisedPnl) / parseFloat(position.positionValue)) * 100)}%
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="no-positions">No open positions</p>
      )}
    </div>
  );
}

export default Orders; 