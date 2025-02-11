import React from 'react';
import { NavLink } from 'react-router-dom';
import './BottomNav.css';

const BottomNav = () => {
  return (
    <nav className="bottom-nav">
      <NavLink to="/" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
        <div className="icon">🏠</div>
        <div className="label">Home</div>
      </NavLink>
      <NavLink to="/orders" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
        <div className="icon">📋</div>
        <div className="label">Orders</div>
      </NavLink>
      <NavLink to="/transactions" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
        <div className="icon">💸</div>
        <div className="label">Transactions</div>
      </NavLink>
      <NavLink to="/settings" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
        <div className="icon">⚙️</div>
        <div className="label">Settings</div>
      </NavLink>
    </nav>
  );
};

export default BottomNav; 