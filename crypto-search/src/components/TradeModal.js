import React from 'react';
import './TradeModal.css';

function TradeModal({ isOpen, onClose, onConfirm, symbol, orderDetails }) {
  const handleSubmit = (e) => {
    e.preventDefault();
    onConfirm();
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
        <p style={{ color: '#666', marginTop: '15px', textAlign: 'center' }}>
          Are you sure you want to place this order?
        </p>
        <div className="modal-buttons">
          <button type="button" onClick={onClose} className="cancel-button">
            Cancel
          </button>
          <button type="button" onClick={handleSubmit} className="confirm-button">
            Confirm Trade
          </button>
        </div>
      </div>
    </div>
  );
}

export default TradeModal; 