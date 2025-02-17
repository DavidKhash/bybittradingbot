import React, { useState, useEffect } from 'react';
import PullToRefresh from 'react-pull-to-refresh';
import './Transactions.css';

const formatTwoDecimals = (num) => {
  return parseFloat(num).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

const formatFourDecimals = (num) => {
  return parseFloat(num).toLocaleString(undefined, {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4
  });
};

const formatDate = (timestamp) => {
  const date = new Date(parseInt(timestamp));
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }) + ' ' + date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).toLowerCase();
};

function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedCards, setExpandedCards] = useState({});
  const [dateFilter, setDateFilter] = useState('all');
  const [pnlFilter, setPnlFilter] = useState({ type: 'none', value: '' });
  const [roiFilter, setRoiFilter] = useState({ type: 'none', value: '' });
  const [promptConfig, setPromptConfig] = useState({
    isOpen: false,
    metric: null,
    type: null,
    title: '',
    placeholder: ''
  });
  const [tempInputValue, setTempInputValue] = useState('');
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  const [showDateFilter, setShowDateFilter] = useState(false);

  const fetchTransactions = async (isManual = false) => {
    try {
      if (transactions.length === 0 || isManual) {
        setLoading(true);
      }
      setError(null);
      
      const response = await fetch('https://mybybitbot.com/api/v5/position/closed-pnl?category=linear&limit=50', {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (response.ok) {
        if (data.result && Array.isArray(data.result.list)) {
          setTransactions(data.result.list);
        } else {
          setTransactions([]);
        }
      } else {
        const errorMessage = data.error || 'Failed to fetch transactions';
        setError(errorMessage);
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setError('Error loading transactions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const handleRefresh = async () => {
    await fetchTransactions(true);
    return Promise.resolve();
  };

  const toggleCard = (transactionId) => {
    setExpandedCards(prev => ({
      ...prev,
      [transactionId]: !prev[transactionId]
    }));
  };

  const getCryptoIcon = (symbol) => {
    const baseSymbol = symbol.replace(/USDT$|USD$/, '').toLowerCase();
    return `https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/${baseSymbol}.png`;
  };

  const handleIconError = (e) => {
    e.target.src = 'https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/generic.png';
  };

  const handleDateFilterChange = (e) => {
    setDateFilter(e.target.value);
  };

  const handlePromptOpen = (metric, type) => {
    let title = '';
    let placeholder = '';
    
    if (metric === 'pnl') {
      title = `Filter by ${type === 'greater' ? 'minimum' : 'maximum'} PNL`;
      placeholder = 'Enter PNL amount in USDT';
    } else if (metric === 'roi') {
      title = `Filter by ${type === 'greater' ? 'minimum' : 'maximum'} ROI`;
      placeholder = 'Enter ROI percentage';
    }
    
    setPromptConfig({
      isOpen: true,
      metric,
      type,
      title,
      placeholder
    });
  };

  const handlePromptCancel = () => {
    setPromptConfig({ ...promptConfig, isOpen: false });
    setTempInputValue('');
  };

  const handlePromptConfirm = () => {
    const value = parseFloat(tempInputValue);
    if (!isNaN(value)) {
      if (promptConfig.metric === 'pnl') {
        setPnlFilter({ type: promptConfig.type, value });
      } else if (promptConfig.metric === 'roi') {
        setRoiFilter({ type: promptConfig.type, value });
      }
    }
    handlePromptCancel();
  };

  const filterTransactions = (transactions) => {
    return transactions.filter(transaction => {
      const closeTime = parseInt(transaction.updatedTime);
      const now = Date.now();
      const dayInMs = 24 * 60 * 60 * 1000;
      
      // Date filter
      if (dateFilter === 'today') {
        if (closeTime < (now - dayInMs)) return false;
      } else if (dateFilter === '3days') {
        if (closeTime < (now - (3 * dayInMs))) return false;
      } else if (dateFilter === '7days') {
        if (closeTime < (now - (7 * dayInMs))) return false;
      } else if (dateFilter === '30days') {
        if (closeTime < (now - (30 * dayInMs))) return false;
      }
      
      // PNL filter
      const pnl = parseFloat(transaction.closedPnl);
      if (pnlFilter.type === 'greater' && pnl < pnlFilter.value) return false;
      if (pnlFilter.type === 'less' && pnl > pnlFilter.value) return false;
      
      // ROI filter
      const entryValue = parseFloat(transaction.cumEntryValue);
      const roi = (pnl / entryValue) * 100;
      if (roiFilter.type === 'greater' && roi < roiFilter.value) return false;
      if (roiFilter.type === 'less' && roi > roiFilter.value) return false;
      
      return true;
    });
  };

  const calculateROI = (pnl, entryValue) => {
    return (parseFloat(pnl) / parseFloat(entryValue)) * 100;
  };

  const getFilteredTransactions = () => {
    let filtered = [...transactions];

    // Apply existing filters first
    if (pnlFilter.type !== 'none' && pnlFilter.value !== '') {
      const value = parseFloat(pnlFilter.value);
      filtered = filtered.filter(t => {
        const pnl = parseFloat(t.closedPnl);
        return pnlFilter.type === 'greater' ? pnl > value : pnl < value;
      });
    }

    if (roiFilter.type !== 'none' && roiFilter.value !== '') {
      const value = parseFloat(roiFilter.value);
      filtered = filtered.filter(t => {
        const roi = (parseFloat(t.closedPnl) / parseFloat(t.cumEntryValue)) * 100;
        return roiFilter.type === 'greater' ? roi > value : roi < value;
      });
    }

    // Apply date range filter
    if (dateRange.startDate && dateRange.endDate) {
      const start = new Date(dateRange.startDate);
      const end = new Date(dateRange.endDate);
      end.setHours(23, 59, 59); // Include the entire end date

      filtered = filtered.filter(t => {
        // Convert timestamp to milliseconds if it's in seconds
        const timestamp = t.createdTime.toString().length === 10 
          ? parseInt(t.createdTime) * 1000 
          : parseInt(t.createdTime);
        
        const txDate = new Date(timestamp);
        
        // Debug logging
        console.log('Transaction date:', txDate);
        console.log('Start date:', start);
        console.log('End date:', end);
        
        return txDate >= start && txDate <= end;
      });
    }

    // Sort the filtered results by date (newest first)
    filtered.sort((a, b) => {
      const timestampA = a.createdTime.toString().length === 10 
        ? parseInt(a.createdTime) * 1000 
        : parseInt(a.createdTime);
      const timestampB = b.createdTime.toString().length === 10 
        ? parseInt(b.createdTime) * 1000 
        : parseInt(b.createdTime);
      return timestampB - timestampA;
    });

    // Return only the most recent 30 transactions
    return filtered.slice(0, 30);
  };

  return (
    <div className="App">
      <h1>Closed Positions</h1>
      <div className="filters-container">
        <div className="date-filter-container">
          <button 
            className="date-filter-toggle"
            onClick={() => setShowDateFilter(!showDateFilter)}
          >
            {showDateFilter ? 'Hide Date Filter' : 'Show Date Filter'}
          </button>
          
          {showDateFilter && (
            <div className="date-range-inputs">
              <div className="date-input-group">
                <label>From:</label>
                <input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => setDateRange(prev => ({
                    ...prev,
                    startDate: e.target.value
                  }))}
                />
              </div>
              <div className="date-input-group">
                <label>To:</label>
                <input
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => setDateRange(prev => ({
                    ...prev,
                    endDate: e.target.value
                  }))}
                />
              </div>
              <button
                className="clear-dates-button"
                onClick={() => setDateRange({ startDate: '', endDate: '' })}
              >
                Clear Dates
              </button>
            </div>
          )}
        </div>

        <div className="filter-group">
          <div className="filter-row">
            <span className="toggle-label">Time Period:</span>
            <select 
              className="filter-select"
              value={dateFilter}
              onChange={handleDateFilterChange}
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="3days">Past 3 Days</option>
              <option value="7days">Past 7 Days</option>
              <option value="30days">Past 30 Days</option>
            </select>
          </div>
        </div>
        
        <div className="filter-group">
          <div className="filter-row">
            <span className="toggle-label">PNL Filter:</span>
            <button 
              onClick={() => handlePromptOpen('pnl', 'greater')}
              className={pnlFilter.type === 'greater' ? 'active' : ''}
            >
              {pnlFilter.type === 'greater' ? `Above $${pnlFilter.value}` : 'Above'}
            </button>
            <button 
              onClick={() => handlePromptOpen('pnl', 'less')}
              className={pnlFilter.type === 'less' ? 'active' : ''}
            >
              {pnlFilter.type === 'less' ? `Below $${pnlFilter.value}` : 'Below'}
            </button>
            {pnlFilter.type !== 'none' && (
              <button onClick={() => setPnlFilter({ type: 'none', value: '' })}>Clear</button>
            )}
          </div>
        </div>
        
        <div className="filter-group">
          <div className="filter-row">
            <span className="toggle-label">ROI Filter:</span>
            <button 
              onClick={() => handlePromptOpen('roi', 'greater')}
              className={roiFilter.type === 'greater' ? 'active' : ''}
            >
              {roiFilter.type === 'greater' ? `Above ${roiFilter.value}%` : 'Above'}
            </button>
            <button 
              onClick={() => handlePromptOpen('roi', 'less')}
              className={roiFilter.type === 'less' ? 'active' : ''}
            >
              {roiFilter.type === 'less' ? `Below ${roiFilter.value}%` : 'Below'}
            </button>
            {roiFilter.type !== 'none' && (
              <button onClick={() => setRoiFilter({ type: 'none', value: '' })}>Clear</button>
            )}
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
        {loading ? (
          <div className="loading-container">
            <div className="spinner" />
          </div>
        ) : error ? (
          <p className="error">{error}</p>
        ) : transactions.length > 0 ? (
          <>
            <div className="transactions-container">
              {getFilteredTransactions().map((transaction) => {
                const transactionId = `${transaction.symbol}-${transaction.createdTime}`;
                const isExpanded = expandedCards[transactionId];
                const pnl = parseFloat(transaction.closedPnl);
                
                return (
                  <div 
                    key={transactionId} 
                    className={`transaction-card ${!isExpanded ? 'collapsed' : ''}`}
                    onClick={() => toggleCard(transactionId)}
                  >
                    <div className="transaction-summary">
                      <div className="transaction-summary-info">
                        <div className="symbol-container">
                          <img 
                            src={getCryptoIcon(transaction.symbol)}
                            alt={transaction.symbol}
                            className="coin-icon"
                            onError={handleIconError}
                          />
                          <h2>{transaction.symbol}</h2>
                        </div>
                        
                        <span className={`position-side ${transaction.side.toLowerCase()}`}>
                          {transaction.side}
                        </span>

                        <div className="transaction-quick-stats">
                          <div className="quick-stat">
                            <span className="stat-label">PNL</span>
                            <span className={`value ${pnl >= 0 ? 'positive' : 'negative'}`} 
                                  style={{ 
                                    background: pnl >= 0 ? 'rgba(46, 125, 50, 0.1)' : 'rgba(198, 40, 40, 0.1)',
                                    color: pnl >= 0 ? '#2e7d32' : '#c62828'
                                  }}>
                              ${formatTwoDecimals(pnl)}
                            </span>
                          </div>
                          <div className="quick-stat">
                            <span className="stat-label">ROI</span>
                            <span className={`value ${pnl >= 0 ? 'positive' : 'negative'}`}
                                  style={{ 
                                    background: pnl >= 0 ? 'rgba(46, 125, 50, 0.1)' : 'rgba(198, 40, 40, 0.1)',
                                    color: pnl >= 0 ? '#2e7d32' : '#c62828'
                                  }}>
                              {formatTwoDecimals(calculateROI(pnl, transaction.cumEntryValue))}%
                            </span>
                          </div>
                        </div>
                      </div>

                      <button 
                        className={`expand-button ${isExpanded ? 'expanded' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleCard(transactionId);
                        }}
                      >
                        ▼
                      </button>
                    </div>
                    
                    <div className="transaction-details">
                      <div className="detail-row">
                        <span className="label">Entry Price:</span>
                        <span className="value">${formatFourDecimals(transaction.avgEntryPrice)}</span>
                      </div>
                      
                      <div className="detail-row">
                        <span className="label">Exit Price:</span>
                        <span className="value">${formatFourDecimals(transaction.avgExitPrice)}</span>
                      </div>
                      
                      <div className="detail-row">
                        <span className="label">Position Value:</span>
                        <span className="value">${formatTwoDecimals(transaction.cumEntryValue)}</span>
                      </div>
                      
                      <div className="detail-row">
                        <span className="label">Closed PNL:</span>
                        <span className={`value ${pnl >= 0 ? 'positive' : 'negative'}`}>
                          ${formatTwoDecimals(pnl)}
                        </span>
                      </div>
                      
                      <div className="detail-row">
                        <span className="label">ROI:</span>
                        <span className={`value ${pnl >= 0 ? 'positive' : 'negative'}`}>
                          {formatTwoDecimals(calculateROI(pnl, transaction.cumEntryValue))}%
                        </span>
                      </div>
                      
                      <div className="detail-row">
                        <span className="label">Close Time:</span>
                        <span className="value date-value">
                          {formatDate(transaction.updatedTime)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <p className="no-transactions">No closed positions</p>
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
    </div>
  );
}

export default Transactions; 