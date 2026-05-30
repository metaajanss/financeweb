"use client";

import React, { useState, useEffect } from 'react';
import '../calculator.css';
import { useAds } from '@/shared/hooks/use-ads';
import { CalculatorFooter } from '@/shared/components/layout/CalculatorFooter';

export default function TaxEstimator1099() {
  useAds();

  const [income, setIncome] = useState<number | string>(65000);
  const [q1, setQ1] = useState<number | string>(15000);
  const [q2, setQ2] = useState<number | string>(16000);
  const [q3, setQ3] = useState<number | string>(17000);
  
  const [fedRate, setFedRate] = useState<number | string>(24);
  const [stateRate, setStateRate] = useState<number | string>(5.5);
  const [deduct, setDeduct] = useState<number | string>(0);
  
  const [results, setResults] = useState<any>(null);

  const usd = (n: number) => '$' + Math.round(n).toLocaleString('en-US');

  const handleCalc = () => {
    const inc = parseFloat(String(income)) || 0;
    const q1v = parseFloat(String(q1)) || 0;
    const q2v = parseFloat(String(q2)) || 0;
    const q3v = parseFloat(String(q3)) || 0;
    const fed = (parseFloat(String(fedRate)) || 0) / 100;
    const state = (parseFloat(String(stateRate)) || 0) / 100;
    const ded = parseFloat(String(deduct)) || 0;

    if (inc <= 0) {
      setResults({ error: 'Enter your net self-employment income to begin.' });
      return;
    }

    const seIncome = Math.max(0, inc - ded);
    const seTax = seIncome * 0.153;
    const federalIncome = Math.max(0, seIncome * fed);
    const stateIncome = Math.max(0, seIncome * state);
    const quarterlyPayment = Math.round((seTax + federalIncome + stateIncome) / 4);
    const totalTax = seTax + federalIncome + stateIncome;

    const quarters = [
      { name: 'Q1 (Apr 15)', income: q1v },
      { name: 'Q2 (Jun 15)', income: q2v },
      { name: 'Q3 (Sep 15)', income: q3v },
      { name: 'Q4 (Jan 15 next yr)', income: inc - q1v - q2v - q3v }
    ];

    const qtable = quarters.map(q => {
      const seTaxQ = q.income * 0.153;
      const fedQ = q.income * fed;
      const stateQ = q.income * state;
      const payQ = Math.round(seTaxQ + fedQ + stateQ);
      return { name: q.name, payQ };
    });

    setResults({
      seIncome, seTax, federalIncome, stateIncome, quarterlyPayment, totalTax, qtable
    });
  };

  useEffect(() => {
    handleCalc();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="calc-container">
      <div className="calc-wrap">
        <header className="calc-header">
          <div className="calc-brand"><span className="dot" style={{ background: 'var(--warn, #a9842a)' }}></span> PayoffLab</div>
        </header>

        <section className="calc-hero">
          <div className="calc-eyebrow">Self-Employed Tax Planner</div>
          <h1>1099 Quarterly <em style={{ color: 'var(--warn, #a9842a)' }}>Tax</em> Estimator</h1>
          <p className="calc-lede">Enter your year-to-date self-employment income and we&apos;ll calculate your federal income tax, self-employment tax (Social Security + Medicare), estimated quarterly payment, and your total tax due for the year.</p>
        </section>

        <div className="ad-slot" data-ad="top">Ad · Leaderboard 728×90</div>

        <div className="calc-grid">
          <div className="calc-card">
            <h2>Your income</h2>
            <div className="sub">Enter your net self-employment income (revenue minus deductible business expenses).</div>
            
            <label className="field" style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: 'var(--muted)', fontWeight: 600, marginBottom: '14px' }}>
              Net self-employment income YTD ($)
              <input type="number" value={income} step="500" onChange={e => setIncome(e.target.value)} style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: '15px', padding: '11px', borderRadius: '9px', border: '1px solid var(--line)', width: '100%' }} />
            </label>
            
            <div style={{ fontSize: '11px', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 700, margin: '8px 0 12px' }}>quarterly breakdown</div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
              <label className="field" style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: 'var(--muted)', fontWeight: 600 }}>Q1 ($)
                <input type="number" value={q1} step="500" onChange={e => setQ1(e.target.value)} style={{ padding: '11px', borderRadius: '9px', border: '1px solid var(--line)', width: '100%' }} />
              </label>
              <label className="field" style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: 'var(--muted)', fontWeight: 600 }}>Q2 ($)
                <input type="number" value={q2} step="500" onChange={e => setQ2(e.target.value)} style={{ padding: '11px', borderRadius: '9px', border: '1px solid var(--line)', width: '100%' }} />
              </label>
              <label className="field" style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: 'var(--muted)', fontWeight: 600 }}>Q3 ($)
                <input type="number" value={q3} step="500" onChange={e => setQ3(e.target.value)} style={{ padding: '11px', borderRadius: '9px', border: '1px solid var(--line)', width: '100%' }} />
              </label>
            </div>

            <div style={{ fontSize: '11px', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 700, margin: '16px 0 12px' }}>tax estimates</div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
              <label className="field" style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: 'var(--muted)', fontWeight: 600 }}>Federal tax rate (%)
                <input type="number" value={fedRate} step="1" onChange={e => setFedRate(e.target.value)} style={{ padding: '11px', borderRadius: '9px', border: '1px solid var(--line)', width: '100%' }} />
              </label>
              <label className="field" style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: 'var(--muted)', fontWeight: 600 }}>State tax rate (%)
                <input type="number" value={stateRate} step="0.5" onChange={e => setStateRate(e.target.value)} style={{ padding: '11px', borderRadius: '9px', border: '1px solid var(--line)', width: '100%' }} />
              </label>
              <label className="field" style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: 'var(--muted)', fontWeight: 600 }}>Tax deductions ($)
                <input type="number" value={deduct} step="100" onChange={e => setDeduct(e.target.value)} style={{ padding: '11px', borderRadius: '9px', border: '1px solid var(--line)', width: '100%' }} />
              </label>
            </div>
            
            <p style={{ fontSize: '12.5px', color: 'var(--muted)', marginBottom: '16px', marginTop: '10px' }}>Self-employment tax (15.3%) is calculated automatically. See below for more context on each rate.</p>
            
            <button className="calc-btn" onClick={handleCalc}>Calculate quarterly payments →</button>
          </div>

          <div id="results">
            {!results ? (
              <div className="calc-card"><div className="placeholder">Calculating...</div></div>
            ) : results.error ? (
              <div className="calc-card"><div className="placeholder">{results.error}</div></div>
            ) : (
              <>
                <div className="verdict" style={{ borderColor: 'var(--warn, #a9842a)' }}>
                  <h3>Your estimated payment</h3>
                  <div className="big" style={{ color: 'var(--warn, #a9842a)' }}>
                    {usd(results.quarterlyPayment)}<br/>
                    <span style={{ fontSize: '0.65em', color: 'var(--muted)', fontWeight: 400 }}>each quarter</span>
                  </div>
                  <p>Based on {usd(results.seIncome)} net income and your estimated tax rates above. Total annual tax: {usd(results.totalTax)}.</p>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginTop: '16px' }}>
                  <div style={{ border: '1px solid var(--line)', borderRadius: '11px', padding: '16px', background: '#fff' }}>
                    <div style={{ fontSize: '12px', letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 700 }}>Self-employment tax</div>
                    <div style={{ fontFamily: "'Fraunces', serif", fontSize: '22px', fontWeight: 600, marginTop: '8px', fontVariantNumeric: 'tabular-nums' }}>{usd(results.seTax)}</div>
                  </div>
                  <div style={{ border: '1px solid var(--line)', borderRadius: '11px', padding: '16px', background: '#fff' }}>
                    <div style={{ fontSize: '12px', letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 700 }}>Fed + State Income Tax</div>
                    <div style={{ fontFamily: "'Fraunces', serif", fontSize: '22px', fontWeight: 600, marginTop: '8px', fontVariantNumeric: 'tabular-nums' }}>{usd(results.federalIncome + results.stateIncome)}</div>
                  </div>
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '16px' }}>
                  <thead>
                    <tr>
                      <th style={{ background: '#f0e3cf', fontFamily: "'Fraunces', serif", fontWeight: 600, color: 'var(--ink)', textAlign: 'left', padding: '10px 10px 10px 14px', borderBottom: '1px solid var(--line)', fontSize: '14px' }}>Quarter</th>
                      <th style={{ background: '#f0e3cf', fontFamily: "'Fraunces', serif", fontWeight: 600, color: 'var(--ink)', textAlign: 'right', padding: '10px', borderBottom: '1px solid var(--line)', fontSize: '14px' }}>Estimated Payment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.qtable.map((q: any, i: number) => (
                      <tr key={i}>
                        <td style={{ textAlign: 'left', padding: '10px 10px 10px 14px', borderBottom: '1px solid var(--line)', fontSize: '14px', color: 'var(--muted)', fontWeight: 600 }}>{q.name}</td>
                        <td style={{ textAlign: 'right', padding: '10px', borderBottom: '1px solid var(--line)', fontSize: '14px', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{usd(q.payQ)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                <div style={{ marginTop: '20px', padding: '14px', borderLeft: '4px solid var(--warn, #a9842a)', background: '#fde5bf', borderRadius: '4px' }}>
                  <p style={{ fontSize: '13.5px', color: 'var(--ink)', margin: 0 }}>
                    <strong>Payments are due:</strong> April 15, June 15, September 15, and January 15 (next year). File by <a href="https://www.irs.gov/payments-and-refunds" style={{ color: 'var(--warn, #a9842a)' }}>EFTPS</a>, your bank, or with your state tax agency.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="ad-slot" data-ad="mid">Ad · In-content Responsive</div>

        <article className="calc-content">
          <h2>Understanding 1099 quarterly taxes</h2>
          <p>As a self-employed person, you&apos;re responsible for paying income tax <strong>throughout the year</strong>, not just at filing time. If you&apos;ll owe $1,000 or more, the IRS expects four equal quarterly payments. Miss them and you&apos;ll owe penalties and interest when you file.</p>
          
          <h3>What goes into each quarterly payment</h3>
          <p>Your payment covers three things: (1) federal income tax, (2) state income tax, and (3) self-employment tax. The first two depend on your tax bracket and state. The third—self-employment tax—is fixed at 15.3% of your net income and covers your Social Security and Medicare contributions (since you don&apos;t have an employer doing it for you).</p>
          
          <h3>Estimated vs. actual tax</h3>
          <p>These quarterly payments are <strong>estimates</strong>. At tax time, you&apos;ll true up with your actual return. If you overpaid, you get a refund; if you underpaid, you owe the difference. So it&apos;s okay if your actual income differs from what you guessed — the calculator shows you the right starting point.</p>
          
          <h2>How to estimate your federal rate</h2>
          <ul>
            <li><strong>Single, $65,000 net income:</strong> roughly 24% combined federal + FICA. Adjust up if you&apos;re higher income or married filing separately, down if you&apos;re lower.</li>
            <li><strong>Use the IRS Form 1040 instructions</strong> or a tax professional for precision, but 20–30% is a safe ballpark for most self-employed earners.</li>
          </ul>
          
          <h2>State income tax</h2>
          <ul>
            <li>No state income tax: CA, FL, NV, SD, TN, TX, WA, WY — use 0%.</li>
            <li>Low (2–5%): NV, OK, WA, CO, IN, KY, LA, MS, MO, NM.</li>
            <li>High (6–13%): CA, NY, OR, IA, VT, NJ.</li>
          </ul>
          
          <h2>Frequently asked questions</h2>
          <div className="calc-faq">
            <details><summary>What if my income is uneven?</summary><p>Enter your Q1, Q2, Q3 income separately and the calculator will show each quarter&apos;s payment. If Q4 is unknown, the tool uses year-to-date to estimate a quarterly amount you can apply to all remaining quarters.</p></details>
            <details><summary>Can I pay less if I&apos;m low-income?</summary><p>If you expect to owe under $1,000 total, you don&apos;t technically have to make quarterly payments — but it&apos;s still a good idea to set the money aside. File your return and pay what you owe in April.</p></details>
            <details><summary>Is this data private?</summary><p>Yes. Everything runs in your browser. Nothing is saved or sent anywhere.</p></details>
          </div>
          <p className="disclaimer">For educational and estimation purposes only; not tax advice. Results depend heavily on your actual tax filing status, deductions, and state. Consult a qualified tax professional or use official IRS resources before making payments.</p>
        </article>

        <div className="ad-slot" data-ad="bottom">Ad · Responsive</div>

        <CalculatorFooter />
      </div>
    </div>
  );
}
