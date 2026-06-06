"use client";

import React, { useState, useEffect } from 'react';
import '../calculator.css';
import { useAds } from '@/shared/hooks/use-ads';
import { CalculatorFooter } from '@/shared/components/layout/CalculatorFooter';

export default function StudentLoanPayoffCalculator() {
  useAds();

  const [bal, setBal] = useState<number | string>(52000);
  const [rate, setRate] = useState<number | string>(6.5);
  const [agi, setAgi] = useState<number | string>(58000);
  const [family, setFamily] = useState<number | string>(1);
  const [pslfYears, setPslfYears] = useState<number | string>(3);

  const [results, setResults] = useState<any>(null);

  const usd = (n: number) => '$' + Math.round(n).toLocaleString('en-US');

  const pmt = (P: number, r: number, n: number): number => {
    if (r === 0) return P / n;
    return P * r / (1 - Math.pow(1 + r, -n));
  };

  const FPL: Record<number, number> = { 1: 15650, 2: 21150, 3: 26650, 4: 32150 };

  const simulate = (balance: number, apr: number, monthlyPay: number, maxMonths: number) => {
    const mr = apr / 100 / 12;
    let b = balance, totalPaid = 0, totalInt = 0, month = 0;
    while (b > 0.005 && month < maxMonths) {
      month++;
      const i = b * mr;
      const pay = Math.min(monthlyPay, b + i);
      b = b + i - pay;
      totalPaid += pay;
      totalInt += i;
    }
    return { months: month, totalPaid, totalInt, remaining: Math.max(0, b) };
  };

  const handleCalc = () => {
    const balance = parseFloat(String(bal)) || 0;
    const apr = parseFloat(String(rate)) || 0;
    const agiVal = parseFloat(String(agi)) || 0;
    const fam = Math.min(4, Math.max(1, Math.round(parseFloat(String(family)) || 1)));
    const pDone = Math.min(10, Math.max(0, parseFloat(String(pslfYears)) || 0));

    if (balance <= 0) {
      setResults({ error: 'Enter your loan balance to begin.' });
      return;
    }

    // Standard Plan
    const stdPay = pmt(balance, apr / 100 / 12, 120);
    const std = simulate(balance, apr, stdPay, 120);

    // IDR / SAVE: 5% of discretionary income above 225% poverty line
    const povertyLine = FPL[fam] || FPL[1];
    const discretionary = Math.max(0, agiVal - 2.25 * povertyLine);
    const idrPayAnnual = discretionary * 0.05;
    const idrPayMonthly = Math.max(0, idrPayAnnual / 12);
    const idr = simulate(balance, apr, idrPayMonthly, 240);
    const idrForgiven = idr.remaining;

    // PSLF
    const pslfRemaining = Math.max(0, 10 - pDone);
    const pslfSim = simulate(balance, apr, idrPayMonthly, pslfRemaining * 12);
    const pslfForgiven = pslfSim.remaining;

    // determine best
    const stdTotal = std.totalPaid;
    const idrTotal = idr.totalPaid;
    const pslfTotal = pslfSim.totalPaid;

    const best = [
      { key: 's', val: stdTotal },
      { key: 'i', val: idrTotal },
      { key: 'p', val: pslfTotal }
    ].sort((a, b) => a.val - b.val)[0].key;

    setResults({
      stdPay,
      std,
      idrPayMonthly,
      idr,
      idrForgiven,
      pslfRemaining,
      pslfSim,
      pslfForgiven,
      best,
      fam,
      povertyLine
    });
  };

  useEffect(() => {
    handleCalc();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="calc-container">
      <div className="calc-wrap">
        <header className="calc-header">
          <div className="calc-brand">
            <span className="dot" style={{ background: 'linear-gradient(135deg, var(--idr, #6d28d9), var(--pslf, #0b6b53))' }}></span> PayoffLab
          </div>
        </header>

        <section className="calc-hero">
          <div className="calc-eyebrow">Student Loan Planner</div>
          <h1>Student Loan <em>Payoff</em> Calculator</h1>
          <p className="calc-lede">Compare Standard repayment, Income-Driven Repayment (IDR / SAVE), and PSLF (Public Service Loan Forgiveness) side by side — total paid, monthly payment, and forgiven amount.</p>
        </section>

        <div className="ad-slot" data-ad="top">Ad · Leaderboard 728×90</div>

        <div className="calc-grid">
          <div className="calc-card">
            <h2>Your loans</h2>
            <div className="sub">Enter your loan details and income to compare all three paths.</div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '13px' }}>
              <label className="field" style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: 'var(--muted)', fontWeight: 600, marginBottom: '14px' }}>
                Loan balance ($)
                <input type="number" value={bal} step="500" onChange={e => setBal(e.target.value)} />
              </label>
              <label className="field" style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: 'var(--muted)', fontWeight: 600, marginBottom: '14px' }}>
                Interest rate (%)
                <input type="number" value={rate} step="0.1" onChange={e => setRate(e.target.value)} />
              </label>
            </div>

            <label className="field" style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: 'var(--muted)', fontWeight: 600, marginBottom: '14px' }}>
              Adjusted Gross Income ($)
              <input type="number" value={agi} step="1000" onChange={e => setAgi(e.target.value)} />
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '13px' }}>
              <label className="field" style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: 'var(--muted)', fontWeight: 600, marginBottom: '14px' }}>
                Family size
                <input type="number" min="1" value={family} onChange={e => setFamily(e.target.value)} />
              </label>
              <label className="field" style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: 'var(--muted)', fontWeight: 600, marginBottom: '14px' }}>
                Years in PSLF-eligible job
                <input type="number" min="0" max="10" value={pslfYears} onChange={e => setPslfYears(e.target.value)} />
              </label>
            </div>

            <button className="calc-btn" onClick={handleCalc}>Compare repayment plans →</button>
          </div>

          <div id="results">
            {!results ? (
              <div className="calc-card"><div className="placeholder">Your three-plan comparison will appear here.</div></div>
            ) : results.error ? (
              <div className="calc-card"><div className="placeholder">{results.error}</div></div>
            ) : (
              <>
                <div className="compare3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '16px' }}>
                  <style jsx>{`
                    @media(max-width: 560px) {
                      .compare3 {
                        grid-template-columns: 1fr !important;
                      }
                    }
                  `}</style>

                  {/* Standard */}
                  <div className="strat s" style={{ borderTop: '3px solid var(--std, #9a6a2f)', background: '#fff', border: '1px solid var(--line)', borderRadius: '13px', padding: '16px' }}>
                    <div className="name" style={{ color: 'var(--std, #9a6a2f)', fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: '16px', marginBottom: '2px' }}>
                      {results.best === 's' && '🏆 '}Standard
                    </div>
                    <div className="tag" style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '12px' }}>10-year fixed</div>
                    <div className="metric"><span className="k">Monthly payment</span><span className="val">{usd(results.stdPay)}</span></div>
                    <div className="metric"><span className="k">Payoff time</span><span className="val">10 years</span></div>
                    <div className="metric"><span className="k">Total paid</span><span className="val">{usd(results.std.totalPaid)}</span></div>
                    <div className="metric"><span className="k">Total interest</span><span className="val">{usd(results.std.totalInt)}</span></div>
                    <div className="metric"><span className="k">Forgiven</span><span className="val">$0</span></div>
                  </div>

                  {/* IDR */}
                  <div className="strat i" style={{ borderTop: '3px solid var(--idr, #6d28d9)', background: '#fff', border: '1px solid var(--line)', borderRadius: '13px', padding: '16px' }}>
                    <div className="name" style={{ color: 'var(--idr, #6d28d9)', fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: '16px', marginBottom: '2px' }}>
                      {results.best === 'i' && '🏆 '}IDR / SAVE
                    </div>
                    <div className="tag" style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '12px' }}>20-year income-driven</div>
                    <div className="metric"><span className="k">Monthly payment</span><span className="val">{usd(results.idrPayMonthly)}</span></div>
                    <div className="metric"><span className="k">Payoff time</span><span className="val">20 years</span></div>
                    <div className="metric"><span className="k">Total paid</span><span className="val">{usd(results.idr.totalPaid)}</span></div>
                    <div className="metric"><span className="k">Total interest</span><span className="val">{usd(results.idr.totalInt)}</span></div>
                    <div className="metric"><span className="k">Forgiven (taxable)</span><span className="val" style={{ color: 'var(--idr, #6d28d9)' }}>{usd(results.idrForgiven)}</span></div>
                  </div>

                  {/* PSLF */}
                  <div className="strat p" style={{ borderTop: '3px solid var(--pslf, #0b6b53)', background: '#fff', border: '1px solid var(--line)', borderRadius: '13px', padding: '16px' }}>
                    <div className="name" style={{ color: 'var(--pslf, #0b6b53)', fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: '16px', marginBottom: '2px' }}>
                      {results.best === 'p' && '🏆 '}PSLF
                    </div>
                    <div className="tag" style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '12px' }}>{pslfYears} of 10 years done</div>
                    <div className="metric"><span className="k">Monthly payment</span><span className="val">{usd(results.idrPayMonthly)}</span></div>
                    <div className="metric"><span className="k">Remaining time</span><span className="val">{results.pslfRemaining} years</span></div>
                    <div className="metric"><span className="k">Total paid</span><span className="val">{usd(results.pslfSim.totalPaid)}</span></div>
                    <div className="metric"><span className="k">Total interest</span><span className="val">{usd(results.pslfSim.totalInt)}</span></div>
                    <div className="metric"><span className="k">Forgiven (tax-free)</span><span className="val" style={{ color: 'var(--pslf, #0b6b53)' }}>{usd(results.pslfForgiven)}</span></div>
                  </div>
                </div>

                <div className="calc-card">
                  <p style={{ fontSize: '13.5px', color: 'var(--muted)', margin: 0 }}>
                    IDR payment based on 5% of discretionary income above 225% federal poverty line ({usd(2.25 * results.povertyLine)}) for family size {results.fam}. PSLF assumes you continue IDR payments for the remaining {results.pslfRemaining} year{results.pslfRemaining !== 1 ? 's' : ''} of the 10-year window.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="ad-slot" data-ad="mid">Ad · In-content Responsive</div>

        <article className="calc-content">
          <h2>The three main federal repayment paths</h2>
          
          <h3>Standard repayment (10 years)</h3>
          <p>Fixed payments over 10 years. You pay the most per month but the least in total interest. Best if you can afford the payments and want to be debt-free quickly.</p>
          
          <h3>Income-Driven Repayment (IDR / SAVE)</h3>
          <p>Payments are capped at 5–10% of your discretionary income. If you have a balance remaining after 20–25 years, it&apos;s forgiven (though currently taxable as income). Best if your income is low relative to your debt.</p>
          
          <h3>Public Service Loan Forgiveness (PSLF)</h3>
          <p>Work for a qualifying public service employer (government, most nonprofits), make 120 qualifying payments (10 years) on an IDR plan, and the remaining balance is forgiven — tax-free. Best if you&apos;re in public service and have a high balance relative to income.</p>

          <h2>Frequently asked questions</h2>
          <div className="calc-faq">
            <details><summary>Is PSLF forgiveness taxable?</summary><p>No. Unlike IDR forgiveness after 20–25 years, PSLF forgiveness is completely tax-free under current law.</p></details>
            <details><summary>What counts as a qualifying PSLF employer?</summary><p>Federal, state, local, or tribal government organizations; and most 501(c)(3) nonprofits. Private sector employers generally don&apos;t qualify.</p></details>
            <details><summary>Is this data saved?</summary><p>No. Everything runs locally in your browser.</p></details>
          </div>
          <p className="disclaimer">For educational purposes only; not financial or legal advice. Student loan rules change frequently. Verify current terms at studentaid.gov before making decisions.</p>
        </article>

        <div className="ad-slot" data-ad="bottom">Ad · Responsive</div>

        <CalculatorFooter />
      </div>
    </div>
  );
}
