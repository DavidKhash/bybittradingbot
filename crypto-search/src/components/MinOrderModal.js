import React from 'react';
import './TradeModal.css'; // We can reuse the TradeModal styles

function MinOrderModal({ isOpen, onClose, onConfirm, symbol, originalAmount, minAmount }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Minimum Order Value</h2>
        <div className="order-details">
          <p>The minimum order value for {symbol} is ${minAmount} USDT</p>
          <p style={{ marginTop: '15px' }}>
            Would you like to increase your order amount from ${originalAmount} to ${minAmount} USDT for this trade?
          </p>
        </div>
        <div className="modal-buttons">
          <button type="button" onClick={onClose} className="cancel-button">
            Cancel
          </button>
          <button type="button" onClick={onConfirm} className="confirm-button">
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

export default MinOrderModal; 