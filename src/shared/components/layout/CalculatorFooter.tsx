import React from 'react';
import { Link } from '@/i18n/navigation';

export function CalculatorFooter() {
  return (
    <footer className="calc-footer">
      <div className="footer-grid">
        <div>
          <div className="footer-brand"><span className="dot"></span> PayoffLab</div>
          <p className="footer-desc">Free, fast, and secure financial calculators. Built to run entirely in your browser with zero data collection.</p>
        </div>
        
        <div className="footer-nav">
          <div>
            <h4>Calculators</h4>
            <ul className="footer-links">
              <li><Link href="/take-home-pay-calculator">Take home pay calculator</Link></li>
              <li><Link href="/crypto-profit-calculator">Crypto profit calculator</Link></li>
              <li><Link href="/mortgage-payoff-calculator">Mortgage payoff calculator</Link></li>
            </ul>
          </div>
          <div>
            <h4>More Tools</h4>
            <ul className="footer-links">
              <li><Link href="/refinance-break-even-calculator">Refinance break even calculator</Link></li>
              <li><Link href="/rent-vs-buy-calculator">Rent vs buy calculator</Link></li>
              <li><Link href="/1099-quarterly-tax-estimator">1099 quarterly tax estimator</Link></li>
            </ul>
          </div>
        </div>
      </div>
      
      <div className="footer-bottom">
        <div>© {new Date().getFullYear()} PayoffLab. All rights reserved.</div>
        <div className="footer-legal">
          <Link href="#">Privacy Policy</Link>
          <Link href="#">Terms of Service</Link>
        </div>
      </div>
    </footer>
  );
}
