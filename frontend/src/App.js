import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navigation from './components/Navigation';
import Swap from './pages/Swap';
import SwapSol from './pages/SwapSol';
import LimitOrder from './pages/LimitOrder';
import Dca from './pages/Dca';
import './App.css';
import SwapGasless from './pages/SwapGasless';

const App = () => {
  return (
    <Router>
      <div className="App">
        <Navigation />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Navigate to="/swap" replace />} />
            <Route path="/swap" element={<Swap />} />
            <Route path="/swap-sol" element={<SwapSol />} />
            <Route path="/swap-gasless" element={<SwapGasless />} />
            <Route path="/limit-order" element={<LimitOrder />} />
            <Route path="/dca" element={<Dca />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
};

export default App;
