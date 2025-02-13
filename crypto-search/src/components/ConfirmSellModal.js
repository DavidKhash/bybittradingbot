import React from 'react';
import './TradeModal.css'; // We'll reuse the TradeModal styles

function ConfirmSellModal({ isOpen, onClose, onConfirm, position }) {
  if (!isOpen) return null;

  const handleConfirm = (e) => {
    e.preventDefault();
    onConfirm();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Confirm Close Position</h2>
        <div className="order-details">
          <p>Symbol: {position.symbol}</p>
          <p>Size: {position.size}</p>
          <p>Entry Price: ${parseFloat(position.avgPrice).toFixed(2)}</p>
          <p>Current PnL: ${parseFloat(position.unrealisedPnl).toFixed(2)}</p>
        </div>
        <p style={{ color: '#666', marginTop: '15px', textAlign: 'center' }}>
          Are you sure you want to close this position?
        </p>
        <div className="modal-buttons">
          <button type="button" onClick={onClose} className="cancel-button">
            Cancel
          </button>
          <button type="button" onClick={handleConfirm} className="confirm-button">
            Confirm Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmSellModal; 