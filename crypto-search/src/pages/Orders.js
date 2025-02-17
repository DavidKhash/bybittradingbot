import React, { useState, useEffect } from 'react';
import PullToRefresh from 'react-pull-to-refresh';
import '../App.css';
import './Orders.css';
import ConfirmSellModal from '../components/ConfirmSellModal';
import Toast from '../components/Toast';
import LoadingSpinner from '../components/LoadingSpinner';

// Helper function to format numbers to exactly two decimals
const formatTwoDecimals = (num) => {
  return parseFloat(num).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

function Orders() {
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedCards, setExpandedCards] = useState({}); // Track expanded state of each card
  const [isManualRefresh, setIsManualRefresh] = useState(false);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [intervalId, setIntervalId] = useState(null);
  const [updateKey, setUpdateKey] = useState(0);
  const [sortOption, setSortOption] = useState('none');
  const [filters, setFilters] = useState({
    pnl: { type: 'none', value: '' },
    roe: { type: 'none', value: '' }
  });
  const [promptConfig, setPromptConfig] = useState({
    isOpen: false,
    metric: null,
    type: null,
    title: '',
    placeholder: ''
  });
  const [tempInputValue, setTempInputValue] = useState('');
  const [refreshInterval, setRefreshInterval] = useState(5000);
  const [sellModalOpen, setSellModalOpen] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState(null);
  const [isClosing, setIsClosing] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const getCryptoIcon = (symbol) => {
    const baseSymbol = symbol.replace(/USDT$|USD$/, '').toLowerCase();
    return `https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/${baseSymbol}.png`;
  };

  const handleIconError = (e) => {
    e.target.src = 'https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/generic.png';
  };

  // Auto-refresh setup
  useEffect(() => {
    if (autoRefreshEnabled) {
      // Initial fetch
      fetchPositions();

      // Set up auto-refresh interval using the selected refreshInterval
      const newIntervalId = setInterval(() => {
        fetchPositions(false);
      }, refreshInterval);
      setIntervalId(newIntervalId);

      // Cleanup function to clear interval when component unmounts
      return () => {
        if (newIntervalId) {
          clearInterval(newIntervalId);
        }
      };
    } else if (intervalId) {
      clearInterval(intervalId);
      setIntervalId(null);
    }
  }, [autoRefreshEnabled, refreshInterval]); // Run when autoRefreshEnabled or refreshInterval changes

  const fetchPositions = async (isManual = false) => {
    try {
      // Show loading only on initial load or manual refresh
      if (positions.length === 0 || isManual) {
        setLoading(true);
        setIsManualRefresh(isManual);
      }
      setError(null);
      
      const response = await fetch('https://mybybitbot.com/api/positions', {
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
          // Trigger animation only if refresh interval is 5000 ms (5 seconds)
          if (refreshInterval === 5000) {
            setUpdateKey(prev => prev + 1);
          }
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
      setIsManualRefresh(false);
    }
  };

  const formatNumber = (num) => {
    return parseFloat(num).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 8
    });
  };

  const toggleCard = (positionId) => {
    setExpandedCards(prev => ({
      ...prev,
      [positionId]: !prev[positionId]
    }));
  };

  const handleRefresh = async () => {
    console.log('Refreshing positions...');
    await fetchPositions(true); // Pass true for manual refresh
    return Promise.resolve();
  };

  const handleToggleAutoRefresh = () => {
    setAutoRefreshEnabled(!autoRefreshEnabled);
  };

  const handleFilterChange = (metric, field, value) => {
    if (field === 'type') {
      if (value === 'none') {
        setFilters(prev => ({
          ...prev,
          [metric]: {
            type: 'none',
            value: ''
          }
        }));
      } else {
        // Open prompt instead of directly changing the filter
        setPromptConfig({
          isOpen: true,
          metric,
          type: value,
          title: `Enter ${metric.toUpperCase()} ${value} value`,
          placeholder: metric === 'pnl' ? 'Enter amount' : 'Enter percentage'
        });
        setTempInputValue('');
      }
    }
  };

  const handlePromptConfirm = () => {
    if (tempInputValue) {
      setFilters(prev => ({
        ...prev,
        [promptConfig.metric]: {
          type: promptConfig.type,
          value: tempInputValue
        }
      }));
    }
    setPromptConfig(prev => ({ ...prev, isOpen: false }));
  };

  const handlePromptCancel = () => {
    setPromptConfig(prev => ({ ...prev, isOpen: false }));
    // Reset the filter to 'none' if canceling
    setFilters(prev => ({
      ...prev,
      [promptConfig.metric]: {
        type: 'none',
        value: ''
      }
    }));
  };

  const getFilteredPositions = (positions) => {
    return positions.filter(position => {
      const pnl = parseFloat(position.unrealisedPnl);
      const roe = (pnl / parseFloat(position.positionValue)) * 100;
      
      // PNL Filter
      if (filters.pnl.type !== 'none' && filters.pnl.value !== '') {
        const pnlThreshold = parseFloat(filters.pnl.value);
        if (filters.pnl.type === 'above' && pnl <= pnlThreshold) return false;
        if (filters.pnl.type === 'below' && pnl >= pnlThreshold) return false;
      }
      
      // ROE Filter
      if (filters.roe.type !== 'none' && filters.roe.value !== '') {
        const roeThreshold = parseFloat(filters.roe.value);
        if (filters.roe.type === 'above' && roe <= roeThreshold) return false;
        if (filters.roe.type === 'below' && roe >= roeThreshold) return false;
      }
      
      return true;
    });
  };

  const getSortedPositions = () => {
    const filteredPositions = getFilteredPositions(positions);
    if (sortOption === 'none') return filteredPositions;
    
    return [...filteredPositions].sort((a, b) => {
      switch (sortOption) {
        case 'pnl-high-low':
          return parseFloat(b.unrealisedPnl) - parseFloat(a.unrealisedPnl);
        case 'pnl-low-high':
          return parseFloat(a.unrealisedPnl) - parseFloat(b.unrealisedPnl);
        case 'roe-high-low':
          return (parseFloat(b.unrealisedPnl) / parseFloat(b.positionValue)) 
                 - (parseFloat(a.unrealisedPnl) / parseFloat(a.positionValue));
        case 'roe-low-high':
          return (parseFloat(a.unrealisedPnl) / parseFloat(a.positionValue))
                 - (parseFloat(b.unrealisedPnl) / parseFloat(b.positionValue));
        default:
          return 0;
      }
    });
  };

  const handleSortChange = (e) => {
    setSortOption(e.target.value);
  };

  const handleRefreshIntervalChange = (interval) => {
    if (autoRefreshEnabled) {
      setRefreshInterval(interval);
    }
  };

  const handleSell = async () => {
    try {
      setIsClosing(true); // Show loading spinner
      
      const orderParams = {
        symbol: selectedPosition.symbol,
        side: selectedPosition.side === 'Buy' ? 'Sell' : 'Buy',
        type: 'Market',
        qty: Math.abs(parseFloat(selectedPosition.size)).toString(),
        positionIdx: 0,
        timeInForce: 'GTC',
        reduceOnly: true,
        closeOnTrigger: true
      };

      console.log('Sending close position order:', orderParams);

      const response = await fetch('https://mybybitbot.com/api/place-order', {
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
          message: 'Position closed successfully!',
          type: 'success'
        });
        fetchPositions(true);
      } else {
        setToast({
          show: true,
          message: `Failed to close position: ${data.message || 'Unknown error'}`,
          type: 'error'
        });
      }
    } catch (error) {
      console.error('Error closing position:', error);
      setToast({
        show: true,
        message: `Error closing position: ${error.message}`,
        type: 'error'
      });
    } finally {
      setIsClosing(false); // Hide loading spinner
      setSellModalOpen(false);
      setSelectedPosition(null);
    }
  };

  const handleSellClick = (e, position) => {
    e.stopPropagation(); // Prevent card expansion when clicking sell
    setSelectedPosition(position);
    setSellModalOpen(true);
  };

  return (
    <div className="App">
      <h1>Current Positions</h1>
      <div className="controls-container">
        <div className="refresh-timer-container">
          <div className="refresh-group">
            <div className="refresh-header">
              <span className="toggle-label">Auto-refresh</span>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={autoRefreshEnabled}
                  onChange={handleToggleAutoRefresh}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
            <div className="refresh-buttons">
              <button 
                className={`refresh-button ${refreshInterval === 1000 ? 'active' : ''}`}
                onClick={() => handleRefreshIntervalChange(1000)}
              >
                1 Second
              </button>
              <button 
                className={`refresh-button ${refreshInterval === 3000 ? 'active' : ''}`}
                onClick={() => handleRefreshIntervalChange(3000)}
              >
                3 Seconds
              </button>
              <button 
                className={`refresh-button ${refreshInterval === 5000 ? 'active' : ''}`}
                onClick={() => handleRefreshIntervalChange(5000)}
              >
                5 Seconds
              </button>
            </div>
          </div>
        </div>
        <div className="filters-container">
          <div className="filter-group">
            <div className="filter-row">
              <span className="toggle-label">PNL Filter:</span>
              <div className="filter-buttons">
                <button
                  className={`filter-button ${filters.pnl.type === 'none' ? 'active' : ''}`}
                  onClick={() => handleFilterChange('pnl', 'type', 'none')}
                >
                  None
                </button>
                <button
                  className={`filter-button ${filters.pnl.type === 'above' ? 'active' : ''}`}
                  onClick={() => handleFilterChange('pnl', 'type', 'above')}
                >
                  Above
                </button>
                <button
                  className={`filter-button ${filters.pnl.type === 'below' ? 'active' : ''}`}
                  onClick={() => handleFilterChange('pnl', 'type', 'below')}
                >
                  Below
                </button>
              </div>
            </div>
            {filters.pnl.type !== 'none' && filters.pnl.value && (
              <div className="active-filter-value">
                ${formatTwoDecimals(filters.pnl.value)}
                <button
                  className="clear-filter"
                  onClick={() => handleFilterChange('pnl', 'type', 'none')}
                >
                  ✕
                </button>
              </div>
            )}
          </div>
          <div className="filter-group">
            <div className="filter-row">
              <span className="toggle-label">ROE Filter:</span>
              <div className="filter-buttons">
                <button
                  className={`filter-button ${filters.roe.type === 'none' ? 'active' : ''}`}
                  onClick={() => handleFilterChange('roe', 'type', 'none')}
                >
                  None
                </button>
                <button
                  className={`filter-button ${filters.roe.type === 'above' ? 'active' : ''}`}
                  onClick={() => handleFilterChange('roe', 'type', 'above')}
                >
                  Above
                </button>
                <button
                  className={`filter-button ${filters.roe.type === 'below' ? 'active' : ''}`}
                  onClick={() => handleFilterChange('roe', 'type', 'below')}
                >
                  Below
                </button>
              </div>
            </div>
            {filters.roe.type !== 'none' && filters.roe.value && (
              <div className="active-filter-value">
                {formatTwoDecimals(filters.roe.value)}%
                <button
                  className="clear-filter"
                  onClick={() => handleFilterChange('roe', 'type', 'none')}
                >
                  ✕
                </button>
              </div>
            )}
          </div>
          <div className="filter-group sort-group">
            <div className="filter-row">
              <span className="toggle-label">Sort by:</span>
              <select 
                className="sort-select"
                value={sortOption}
                onChange={handleSortChange}
              >
                <option value="none">None</option>
                <option value="pnl-high-low">PNL (High to Low)</option>
                <option value="pnl-low-high">PNL (Low to High)</option>
                <option value="roe-high-low">ROE (High to Low)</option>
                <option value="roe-low-high">ROE (Low to High)</option>
              </select>
            </div>
          </div>
        </div>
      </div>
      <PullToRefresh
        onRefresh={handleRefresh}
        pullingContent={
          <div className="loading">
            <div className="refresh-spinner" />
            <span>Pull to refresh...</span>
          </div>
        }
        refreshingContent={
          <div className="loading">
            <div className="refresh-spinner" />
            <span>Refreshing...</span>
          </div>
        }
      >
        {(loading && (positions.length === 0 || isManualRefresh)) ? (
          <div className="loading-container">
            <div className="spinner" />
          </div>
        ) : error ? (
          <p className="error">{error}</p>
        ) : positions.length > 0 ? (
          <div className="positions-container">
            {getSortedPositions().map((position) => {
              const positionId = `${position.symbol}-${position.positionIdx}`;
              const isExpanded = expandedCards[positionId];
              
              return (
                <div 
                  key={positionId} 
                  className={`position-card ${!isExpanded ? 'collapsed' : ''}`}
                  onClick={() => toggleCard(positionId)}
                >
                  <div className="position-summary">
                    <div className="position-summary-info">
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

                      <div className="position-quick-stats">
                        <div className="quick-stat">
                          <span 
                            key={`${updateKey}-pnl`}
                            className={`value ${
                              parseFloat(position.unrealisedPnl) >= 0 ? 'positive' : 'negative'
                            } animate-update-active ${
                              sortOption.includes('pnl') ? 'sorted-value' : ''
                            }`}
                          >
                            ${formatTwoDecimals(position.unrealisedPnl)}
                          </span>
                        </div>
                        <div className="quick-stat">
                          <span 
                            key={`${updateKey}-roe`}
                            className={`value ${
                              parseFloat(position.unrealisedPnl) >= 0 ? 'positive' : 'negative'
                            } animate-update-active ${
                              sortOption.includes('roe') ? 'sorted-value' : ''
                            }`}
                          >
                            {formatTwoDecimals((parseFloat(position.unrealisedPnl) / parseFloat(position.positionValue)) * 100)}%
                          </span>
                        </div>
                      </div>
                    </div>

                    <button 
                      className={`expand-button ${isExpanded ? 'expanded' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleCard(positionId);
                      }}
                    >
                      ▼
                    </button>
                  </div>
                  
                  <div className="position-details">
                    <div className="detail-row">
                      <span className="label">Position Value (USDT):</span>
                      <span className="value">${formatTwoDecimals(position.size * position.markPrice)}</span>
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
                        ${formatTwoDecimals(position.unrealisedPnl)}
                      </span>
                    </div>
                    
                    <div className="detail-row">
                      <span className="label">ROE:</span>
                      <span className={`value ${parseFloat(position.unrealisedPnl) >= 0 ? 'positive' : 'negative'}`}>
                        {formatTwoDecimals((parseFloat(position.unrealisedPnl) / parseFloat(position.positionValue)) * 100)}%
                      </span>
                    </div>
                    
                    <div className="sell-button-container">
                      <button 
                        className="sell-button"
                        onClick={(e) => handleSellClick(e, position)}
                      >
                        Close Position
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="no-positions">No open positions</p>
        )}
      </PullToRefresh>
      
      {/* Filter Prompt Modal */}
      <div className={`filter-prompt-overlay ${promptConfig.isOpen ? 'visible' : ''}`}>
        <div className={`filter-prompt ${promptConfig.isOpen ? 'visible' : ''}`}>
          <div className="filter-prompt-title">{promptConfig.title}</div>
          <input
            type="number"
            className="filter-prompt-input"
            value={tempInputValue}
            onChange={(e) => setTempInputValue(e.target.value)}
            placeholder={promptConfig.placeholder}
            autoFocus
          />
          <div className="filter-prompt-buttons">
            <button 
              className="filter-prompt-button cancel"
              onClick={handlePromptCancel}
            >
              Cancel
            </button>
            <button 
              className="filter-prompt-button confirm"
              onClick={handlePromptConfirm}
            >
              Confirm
            </button>
          </div>
        </div>
      </div>

      <ConfirmSellModal
        isOpen={sellModalOpen}
        onClose={() => {
          setSellModalOpen(false);
          setSelectedPosition(null);
        }}
        onConfirm={handleSell}
        position={selectedPosition}
      />

      {/* Add loading spinner */}
      {isClosing && <LoadingSpinner />}

      {/* Add toast notifications */}
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

export default Orders; 