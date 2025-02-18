import React, { useState, useEffect } from 'react';
import '../App.css';

function Settings() {
  const [tradeAmount, setTradeAmount] = useState('');
  const [leverage, setLeverage] = useState('1'); // Default leverage is 1x
  const [message, setMessage] = useState('');

  // Load saved settings on component mount
  useEffect(() => {
    const savedAmount = localStorage.getItem('tradeAmount');
    const savedLeverage = localStorage.getItem('tradeLeverage');
    if (savedAmount) {
      setTradeAmount(savedAmount);
    }
    if (savedLeverage) {
      setLeverage(savedLeverage);
    }
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate trade amount
    if (tradeAmount && (isNaN(tradeAmount) || parseFloat(tradeAmount) <= 0)) {
      setMessage('Trade amount must be a positive number');
      return;
    }

    // Validate leverage
    if (leverage && (isNaN(leverage) || parseFloat(leverage) <= 0)) {
      setMessage('Leverage must be a positive number');
      return;
    }

    // Save settings
    if (tradeAmount) {
      localStorage.setItem('tradeAmount', tradeAmount);
    }
    if (leverage) {
      localStorage.setItem('tradeLeverage', leverage);
    }

    setMessage('Settings saved successfully!');
  };

  return (
    <div className="App">
      <h1>Settings</h1>
      <div className="settings-container">
        <form onSubmit={handleSubmit} className="settings-form">
          <div className="settings-section">
            <h2>Trade Settings</h2>
            <div className="form-group">
              <label>Trade Amount (USDT):</label>
              <input
                type="number"
                value={tradeAmount}
                onChange={(e) => setTradeAmount(e.target.value)}
                placeholder="Enter trade amount"
                step="any"
              />
            </div>

            <div className="form-group">
              <label>Leverage:</label>
              <input
                type="number"
                value={leverage}
                onChange={(e) => setLeverage(e.target.value)}
                placeholder="Enter leverage (e.g., 1, 2, 5, 10)"
                min="1"
                step="any"
              />
            </div>
          </div>
          
          <button type="submit" className="submit-button">Save Settings</button>
        </form>
        {message && <p className={message.includes('success') ? 'success-message' : 'error-message'}>{message}</p>}
      </div>
    </div>
  );
}

export default Settings; 