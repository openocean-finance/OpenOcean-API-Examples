import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Navigation.css';


const Navigation = () => {
  const location = useLocation();

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <nav className="navigation">
      <div className="nav-container">
        <div className="nav-brand">
          <h1 style={{ display: 'flex', alignItems: 'center' }}>
            <img src='/logo.avif' alt="Logo" className="logo" />
            <span style={{ marginLeft: '10px' }}>OpenOcean</span>
          </h1>
        </div>
        <ul className="nav-menu">
          <li className="nav-item">
            <Link
              to="/swap"
              className={`nav-link ${isActive('/swap') ? 'active' : ''}`}
            >
              Swap
            </Link>
          </li>
          <li className="nav-item">
            <Link
              to="/swap-sol"
              className={`nav-link ${isActive('/swap-sol') ? 'active' : ''}`}
            >
              Swap Solana
            </Link>
          </li>
          <li className="nav-item">
            <Link
              to="/swap-gasless"
              className={`nav-link ${isActive('/swap-gasless') ? 'active' : ''}`}
            >
              Swap Gasless
            </Link>
          </li>
          <li className="nav-item">
            <Link
              to="/limit-order"
              className={`nav-link ${isActive('/limit-order') ? 'active' : ''}`}
            >
              Limit Order
            </Link>
          </li>
          <li className="nav-item">
            <Link
              to="/dca"
              className={`nav-link ${isActive('/dca') ? 'active' : ''}`}
            >
              DCA
            </Link>
          </li>
        </ul>
      </div>
    </nav>
  );
};

export default Navigation; 