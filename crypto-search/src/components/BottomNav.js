import React from 'react';
import { NavLink } from 'react-router-dom';
import './BottomNav.css';

const BottomNav = () => {
  return (
    <nav className="bottom-nav">
      <div className="nav-links">
        <NavLink to="/" className="nav-link">
          <i className="fi fi-rr-search nav-icon"></i>
          <span>Search</span>
        </NavLink>
        <NavLink to="/orders" className="nav-link">
          <i className="fi fi-rr-chart-line-up nav-icon"></i>
          <span>Orders</span>
        </NavLink>
        <NavLink to="/transactions" className="nav-link">
          <i className="fi fi-rr-coins nav-icon"></i>
          <span>PnL</span>
        </NavLink>
        <NavLink to="/settings" className="nav-link">
          <i className="fi fi-rr-settings nav-icon"></i>
          <span>Settings</span>
        </NavLink>
      </div>
    </nav>
  );
};

export default BottomNav; 