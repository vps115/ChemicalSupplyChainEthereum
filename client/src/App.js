// src/App.js
import React from 'react';
import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';
import RegistrationVerificationComponent from './components/RegistrationVerificationComponent';
import BiddingComponent from './components/BiddingComponent';
import SupplyLogisticsComponent from './components/SupplyLogisticsComponent';
import InsuranceComponent from './components/InsuranceComponent';

function App() {
  return (
    <Router>
      <nav>
        <Link to="/">Registration</Link>
        <Link to="/bidding">Bidding</Link>
        <Link to="/logistics">Supply Logistics</Link>
        <Link to="/insurance">Insurance</Link>
      </nav>
      <div className="container">
        <Routes>
          <Route path="/" element={<RegistrationVerificationComponent />} />
          <Route path="/bidding" element={<BiddingComponent />} />
          <Route path="/logistics" element={<SupplyLogisticsComponent />} />
          <Route path="/insurance" element={<InsuranceComponent />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
