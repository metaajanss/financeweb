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
        
        <div className="footer-nav grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
          <div>
            <h4>Income &amp; Tax</h4>
            <ul className="footer-links">
              <li><Link href="/take-home-pay-calculator">Take-Home Pay Calculator</Link></li>
              <li><Link href="/1099-quarterly-tax-estimator">1099 Quarterly Tax Estimator</Link></li>
              <li><Link href="/401k-ira-optimizer">401k &amp; IRA Optimizer</Link></li>
              <li><Link href="/emergency-fund-calculator">Emergency Fund Calculator</Link></li>
              <li><Link href="/hcol-vs-lcol-calculator">HCOL vs LCOL Calculator</Link></li>
            </ul>
          </div>
          <div>
            <h4>Debt &amp; Financing</h4>
            <ul className="footer-links">
              <li><Link href="/">Debt Payoff Calculator</Link></li>
              <li><Link href="/hybrid-debt-payoff-calculator">Hybrid Debt Payoff</Link></li>
              <li><Link href="/student-loan-payoff-calculator">Student Loan Payoff</Link></li>
              <li><Link href="/car-affordability-calculator">Car Affordability Calculator</Link></li>
            </ul>
          </div>
          <div>
            <h4>Wealth &amp; Planning</h4>
            <ul className="footer-links">
              <li><Link href="/crypto-profit-calculator">Crypto Profit Calculator</Link></li>
              <li><Link href="/net-worth-calculator">Net Worth Calculator</Link></li>
              <li><Link href="/fire-calculator">FIRE Calculator</Link></li>
              <li><Link href="/pay-off-debt-vs-invest-calculator">Debt vs Invest Calculator</Link></li>
              <li><Link href="/mortgage-payoff-calculator">Mortgage Payoff Calculator</Link></li>
              <li><Link href="/refinance-break-even-calculator">Refinance Break-Even</Link></li>
              <li><Link href="/rent-vs-buy-calculator">Rent vs Buy Calculator</Link></li>
              <li><Link href="/wedding-budget-calculator">Wedding Budget Calculator</Link></li>
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
