import React, { useState } from 'react';
import './TradeModal.css';

function TradeModal({ isOpen, onClose, onConfirm, symbol, orderDetails, needsMinOrderConfirm }) {
  const [isConfirmingMinOrder, setIsConfirmingMinOrder] = useState(needsMinOrderConfirm);

  const handleSubmit = (e) => {
    e.preventDefault();
    onConfirm(isConfirmingMinOrder);
    if (isConfirmingMinOrder) {
      setIsConfirmingMinOrder(false);
    }
  };

  if (!isOpen) return null;

  const usdtAmount = (parseFloat(orderDetails.qty) * parseFloat(orderDetails.lastPrice)).toFixed(2);
  const formattedQty = parseFloat(orderDetails.qty).toFixed(8);
  const amountWasAdjusted = orderDetails.originalAmount !== orderDetails.adjustedAmount;

  // Show minimum order confirmation view
  if (isConfirmingMinOrder) {
    return (
      <div className="modal-overlay">
        <div className="modal-content">
          <h2>Minimum Order Value</h2>
          <div className="order-details">
            <p>The minimum order value for {symbol} is ${orderDetails.adjustedAmount} USDT</p>
            <p style={{ marginTop: '15px' }}>
              Would you like to increase your order amount from ${orderDetails.originalAmount} to ${orderDetails.adjustedAmount} USDT for this trade?
            </p>
          </div>
          <div className="modal-buttons">
            <button type="button" onClick={onClose} className="cancel-button">
              Cancel
            </button>
            <button type="button" onClick={handleSubmit} className="confirm-button">
              Confirm
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show final order confirmation view
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Confirm Trade</h2>
        <div className="order-details">
          <p>Symbol: {symbol}</p>
          <p>Type: {orderDetails.side} {orderDetails.type}</p>
          <p>Quantity: {formattedQty} {symbol.replace('USDT', '')}</p>
          {amountWasAdjusted ? (
            <>
              <p style={{ textDecoration: 'line-through', color: '#666' }}>
                Original Amount: ${orderDetails.originalAmount}
              </p>
              <p style={{ color: '#2196f3' }}>
                Adjusted Amount: ${orderDetails.adjustedAmount}
              </p>
            </>
          ) : (
            <p>USDT Amount: ${usdtAmount}</p>
          )}
          <p>Price: ${parseFloat(orderDetails.lastPrice).toFixed(2)}</p>
          <p>Leverage: {orderDetails.leverage}x</p>
        </div>
        {amountWasAdjusted && (
          <p style={{ color: '#666', marginTop: '10px', fontSize: '0.9em' }}>
            * Amount adjusted to meet minimum order value requirement
          </p>
        )}
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