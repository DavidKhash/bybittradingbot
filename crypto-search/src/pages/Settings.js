import React, { useState, useEffect } from 'react';
import '../App.css';

function Settings() {
  const [tradePassword, setTradePassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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
    if (tradePassword !== confirmPassword) {
      setMessage('Passwords do not match!');
      return;
    }
    
    // Validate trade amount
    const amount = parseFloat(tradeAmount);
    if (isNaN(amount) || amount <= 0) {
      setMessage('Please enter a valid trade amount');
      return;
    }

    // Validate leverage
    const leverageNum = parseInt(leverage);
    if (isNaN(leverageNum) || leverageNum < 1 || leverageNum > 100) {
      setMessage('Leverage must be between 1 and 100');
      return;
    }
    
    // Store settings in localStorage
    if (tradePassword) {
      localStorage.setItem('tradePassword', tradePassword);
    }
    localStorage.setItem('tradeAmount', tradeAmount);
    localStorage.setItem('tradeLeverage', leverage);
    setMessage('Settings saved successfully!');
    setTradePassword('');
    setConfirmPassword('');
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
                required
                min="0"
                step="0.01"
                placeholder="Enter amount in USDT"
              />
              <small className="input-help">Amount to use for each trade</small>
            </div>

            <div className="form-group">
              <label>Leverage (1-100x):</label>
              <input
                type="number"
                value={leverage}
                onChange={(e) => setLeverage(e.target.value)}
                required
                min="1"
                max="100"
                step="1"
                placeholder="Enter leverage (1-100x)"
              />
              <small className="input-help">Cross margin leverage for trades</small>
            </div>
          </div>

          <div className="settings-section">
            <h2>Security</h2>
            <div className="form-group">
              <label>Trade Password:</label>
              <input
                type="password"
                value={tradePassword}
                onChange={(e) => setTradePassword(e.target.value)}
                minLength="6"
                placeholder="Leave blank to keep current password"
              />
            </div>
            <div className="form-group">
              <label>Confirm Password:</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                minLength="6"
                placeholder="Leave blank to keep current password"
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