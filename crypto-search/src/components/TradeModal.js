import React, { useState } from 'react';
import './TradeModal.css';

function TradeModal({ isOpen, onClose, onConfirm, symbol, orderDetails }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const storedPassword = localStorage.getItem('tradePassword');
    
    if (!storedPassword) {
      setError('Please set a trade password in Settings first');
      return;
    }

    if (password !== storedPassword) {
      setError('Incorrect password');
      return;
    }

    onConfirm(password);
    setPassword('');
    setError('');
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Confirm Trade</h2>
        <div className="order-details">
          <p>Symbol: {symbol}</p>
          <p>Type: {orderDetails.side} {orderDetails.type}</p>
          <p>USDT Amount: {orderDetails.qty} USDT</p>
          <p>Leverage: {orderDetails.leverage}x</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Enter Trade Password:</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <p className="error-message">{error}</p>}
          <div className="modal-buttons">
            <button type="button" onClick={onClose} className="cancel-button">
              Cancel
            </button>
            <button type="submit" className="confirm-button">
              Confirm Trade
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default TradeModal; 