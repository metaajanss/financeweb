"use client";

import React, { useState, useEffect, useRef } from 'react';
import '../calculator.css';
import { useAds } from '@/shared/hooks/use-ads';
import { CalculatorFooter } from '@/shared/components/layout/CalculatorFooter';

export default function MortgagePayoffCalculator() {
  useAds();

  const [amount, setAmount] = useState<number | string>(350000);
  const [rate, setRate] = useState<number | string>(6.5);
  const [term, setTerm] = useState<number | string>(30);
  const [extra, setExtra] = useState<number | string>(300);
  
  const [results, setResults] = useState<any>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const usd = (n: number) => '$' + Math.round(n).toLocaleString('en-US');
  const dur = (m: number) => {
    const y = Math.floor(m / 12), mo = m % 12;
    return (y ? y + 'y ' : '') + (mo ? mo + 'mo' : (y ? '' : '0mo'));
  };
  const payoffDate = (m: number) => {
    const d = new Date(); d.setMonth(d.getMonth() + m);
    return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  const pmt = (P: number, r: number, n: number) => {
    if (r === 0) return P / n;
    return P * r / (1 - Math.pow(1 + r, -n));
  };

  const simulate = (P: number, annual: number, years: number, extraPmt: number) => {
    const r = annual / 100 / 12, n = years * 12;
    const base = pmt(P, r, n);
    let bal = P, month = 0, interest = 0;
    const hist = [bal];
    while (bal > 0.005 && month < 1200) {
      month++;
      const i = bal * r; interest += i;
      let pay = base + extraPmt;
      if (pay > bal + i) pay = bal + i;
      bal = bal + i - pay;
      hist.push(Math.max(0, bal));
    }
    return { payment: base, extraPayment: extraPmt, months: month, interest, hist };
  };

  const handleCalc = () => {
    const P = parseFloat(String(amount)) || 0;
    const annualRate = parseFloat(String(rate)) || 0;
    const years = parseFloat(String(term)) || 0;
    const extraPmt = parseFloat(String(extra)) || 0;

    if (P <= 0 || years <= 0) {
      setResults({ error: 'Enter a loan amount and term to begin.' });
      return;
    }

    const baseR = simulate(P, annualRate, years, 0);
    const extraR = simulate(P, annualRate, years, extraPmt);
    const intSaved = baseR.interest - extraR.interest;
    const monthsSaved = baseR.months - extraR.months;

    setResults({
      baseR, extraR, intSaved, monthsSaved, extraPmt
    });
  };

  useEffect(() => {
    handleCalc();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const drawChart = (cv: HTMLCanvasElement, b: number[], e: number[]) => {
    const dpr = window.devicePixelRatio || 1;
    const W = 640, H = 300, pad = { l: 62, r: 14, t: 14, b: 30 };
    cv.width = W * dpr; cv.height = H * dpr; cv.style.height = H + 'px';
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    const n = Math.max(b.length, e.length);
    const maxV = Math.max(...b, ...e, 1);
    const X = (i: number) => pad.l + (i / (n - 1)) * (W - pad.l - pad.r);
    const Y = (v: number) => pad.t + (1 - v / maxV) * (H - pad.t - pad.b);
    ctx.strokeStyle = '#e7dfcd'; ctx.fillStyle = '#9c947f'; ctx.font = '11px "Hanken Grotesk"'; ctx.lineWidth = 1;
    for (let g = 0; g <= 4; g++) {
      const v = maxV * g / 4, y = Y(v);
      ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(W - pad.r, y); ctx.stroke();
      ctx.fillText('$' + Math.round(v / 1000) + 'k', 8, y + 4);
    }
    const months = n - 1;
    for (let m = 0; m <= months; m += 60) { const x = X(m); ctx.fillText((m / 12) + 'y', x - 6, H - 10); }
    const line = (d: number[], c: string) => {
      ctx.strokeStyle = c; ctx.lineWidth = 2.6; ctx.lineJoin = 'round'; ctx.beginPath();
      d.forEach((v, i) => { const x = X(i), y = Y(v); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
      ctx.stroke(); ctx.fillStyle = c; ctx.beginPath(); ctx.arc(X(d.length - 1), Y(d[d.length - 1]), 3.5, 0, 7); ctx.fill();
    };
    line(b, '#9a6a2f'); // base
    line(e, '#0b6b53'); // extra
  };

  useEffect(() => {
    if (results && !results.error && canvasRef.current) {
      drawChart(canvasRef.current, results.baseR.hist, results.extraR.hist);
    }
  }, [results]);

  return (
    <div className="calc-container">
      <div className="calc-wrap">
        <header className="calc-header">
          <div className="calc-brand">
            <span className="dot" style={{ background: 'linear-gradient(135deg, #9a6a2f, #0b6b53)' }}></span> PayoffLab
          </div>
        </header>

        <section className="calc-hero">
          <div className="calc-eyebrow">Mortgage Planner</div>
          <h1>Mortgage <em style={{ color: '#0b6b53' }}>Payoff</em> Calculator</h1>
          <p className="calc-lede">See exactly how much an extra monthly payment saves you — in interest, in years, and on your payoff date — compared to paying the standard amount. Calculated instantly in your browser.</p>
        </section>

        <div className="ad-slot" data-ad="top">Ad · Leaderboard 728×90</div>

        <div className="calc-grid">
          <div className="calc-card">
            <h2>Your mortgage</h2>
            <div className="sub">Enter your loan details and how much extra you can pay each month.</div>
            <label className="field" style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: 'var(--muted)', fontWeight: 600, marginBottom: '15px' }}>
              Loan amount ($)
              <input type="number" value={amount} step="1000" onChange={e => setAmount(e.target.value)} style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: '15px', padding: '11px', borderRadius: '9px', border: '1px solid var(--line)', width: '100%' }} />
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '13px' }}>
              <label className="field" style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: 'var(--muted)', fontWeight: 600, marginBottom: '15px' }}>
                Interest rate (% APR)
                <input type="number" value={rate} step="0.05" onChange={e => setRate(e.target.value)} style={{ padding: '11px', borderRadius: '9px', border: '1px solid var(--line)', width: '100%' }} />
              </label>
              <label className="field" style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: 'var(--muted)', fontWeight: 600, marginBottom: '15px' }}>
                Loan term (years)
                <input type="number" value={term} step="1" onChange={e => setTerm(e.target.value)} style={{ padding: '11px', borderRadius: '9px', border: '1px solid var(--line)', width: '100%' }} />
              </label>
            </div>
            <label className="field" style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: 'var(--muted)', fontWeight: 600, marginBottom: '15px' }}>
              Extra payment each month ($)
              <input type="number" value={extra} step="25" onChange={e => setExtra(e.target.value)} style={{ padding: '11px', borderRadius: '9px', border: '1px solid var(--line)', width: '100%' }} />
            </label>
            <button className="calc-btn" onClick={handleCalc}>Calculate savings →</button>
          </div>
          <div id="results">
            {!results ? (
              <div className="calc-card"><div className="placeholder">Calculating...</div></div>
            ) : results.error ? (
              <div className="calc-card"><div className="placeholder">{results.error}</div></div>
            ) : (
              <>
                <div className="verdict" style={{ borderColor: '#0b6b53' }}>
                  <h3 style={{ textTransform: 'uppercase', color: 'var(--muted)', fontSize: '15px', fontWeight: 600 }}>The verdict</h3>
                  {results.extraPmt <= 0 ? (
                    <>
                      <div className="big" style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(24px, 4vw, 33px)', fontWeight: 600 }}>
                        Add an extra payment to see your savings.
                      </div>
                      <p>Your standard payment is <b>{usd(results.baseR.payment)}/mo</b> and you&apos;ll pay {usd(results.baseR.interest)} in total interest.</p>
                    </>
                  ) : (
                    <>
                      <div className="big" style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(24px, 4vw, 33px)', fontWeight: 600 }}>
                        Paying <b style={{ color: '#0b6b53' }}>{usd(results.extraPmt)}</b> extra saves you {usd(results.intSaved)} in interest.
                      </div>
                      <p>You&apos;d be mortgage-free <b>{dur(results.monthsSaved)}</b> sooner — by {payoffDate(results.extraR.months)} instead of {payoffDate(results.baseR.months)}.</p>
                    </>
                  )}
                </div>
                <div className="compare" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
                  <div className="strat" style={{ border: '1px solid var(--line)', borderRadius: '13px', padding: '18px', background: '#fff', borderTop: '3px solid #9a6a2f' }}>
                    <div className="name" style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: '17px', color: '#9a6a2f' }}>Standard payment</div>
                    <div className="tag" style={{ fontSize: '11.5px', color: 'var(--muted)', marginBottom: '14px' }}>{usd(results.baseR.payment)}/mo</div>
                    <div className="metric" style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px dashed var(--line)', fontSize: '13.5px' }}><span className="k" style={{ color: 'var(--muted)' }}>Paid off in</span><span className="val" style={{ fontWeight: 700, fontSize: '16px' }}>{dur(results.baseR.months)}</span></div>
                    <div className="metric" style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px dashed var(--line)', fontSize: '13.5px' }}><span className="k" style={{ color: 'var(--muted)' }}>Payoff date</span><span className="val" style={{ fontWeight: 700, fontSize: '16px' }}>{payoffDate(results.baseR.months)}</span></div>
                    <div className="metric" style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', fontSize: '13.5px' }}><span className="k" style={{ color: 'var(--muted)' }}>Total interest</span><span className="val" style={{ fontWeight: 700, fontSize: '16px' }}>{usd(results.baseR.interest)}</span></div>
                  </div>
                  <div className="strat" style={{ border: '1px solid var(--line)', borderRadius: '13px', padding: '18px', background: '#fff', borderTop: '3px solid #0b6b53' }}>
                    <div className="name" style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: '17px', color: '#0b6b53' }}>With extra</div>
                    <div className="tag" style={{ fontSize: '11.5px', color: 'var(--muted)', marginBottom: '14px' }}>{usd(results.baseR.payment + results.extraPmt)}/mo</div>
                    <div className="metric" style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px dashed var(--line)', fontSize: '13.5px' }}><span className="k" style={{ color: 'var(--muted)' }}>Paid off in</span><span className="val" style={{ fontWeight: 700, fontSize: '16px' }}>{dur(results.extraR.months)}</span></div>
                    <div className="metric" style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px dashed var(--line)', fontSize: '13.5px' }}><span className="k" style={{ color: 'var(--muted)' }}>Payoff date</span><span className="val" style={{ fontWeight: 700, fontSize: '16px' }}>{payoffDate(results.extraR.months)}</span></div>
                    <div className="metric" style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', fontSize: '13.5px' }}><span className="k" style={{ color: 'var(--muted)' }}>Total interest</span><span className="val" style={{ fontWeight: 700, fontSize: '16px' }}>{usd(results.extraR.interest)}</span></div>
                  </div>
                </div>
                <div className="calc-card chart-card">
                  <h2 style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: '20px', margin: '0 0 4px 0' }}>Balance over time</h2>
                  <div className="sub" style={{ fontSize: '13.5px', color: 'var(--muted)', marginBottom: '18px' }}>How much faster your balance reaches zero with extra payments.</div>
                  <canvas ref={canvasRef} id="chart" width="640" height="300" style={{ width: '100%', height: 'auto', display: 'block' }}></canvas>
                  <div className="legend" style={{ display: 'flex', gap: '18px', justifyContent: 'center', marginTop: '10px', fontSize: '12.5px', color: 'var(--muted)' }}>
                    <span><i style={{ display: 'inline-block', width: '14px', height: '3px', borderRadius: '2px', verticalAlign: 'middle', marginRight: '6px', background: '#9a6a2f' }}></i>Standard</span>
                    <span><i style={{ display: 'inline-block', width: '14px', height: '3px', borderRadius: '2px', verticalAlign: 'middle', marginRight: '6px', background: '#0b6b53' }}></i>With extra</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="ad-slot" data-ad="mid">Ad · In-content Responsive</div>

        <article className="calc-content">
          <h2>How extra mortgage payments work</h2>
          <p>Your regular mortgage payment is split between <strong>interest</strong> (the lender&apos;s fee) and <strong>principal</strong> (the actual balance). Early in the loan, most of each payment goes to interest. When you pay extra, that <em>entire</em> extra amount goes straight to principal — shrinking the balance that future interest is calculated on. The effect compounds, which is why even a modest extra payment can erase years from the loan.</p>
          
          <h3>Where the savings come from</h3>
          <p>A lower balance means less interest accrues next month, which means more of your <em>next</em> regular payment also goes to principal. This snowballs over time. The calculator above shows the real number for your loan.</p>
          
          <h2>Should you pay extra at all?</h2>
          <ul>
            <li><strong>Yes, if</strong> you have no higher-interest debt (like credit cards), a healthy emergency fund, and your mortgage rate is higher than what you&apos;d safely earn investing.</li>
            <li><strong>Maybe not, if</strong> your rate is low and you could earn more by investing the difference, or if it would leave you cash-strapped.</li>
          </ul>
          
          <h2>Frequently asked questions</h2>
          <div className="calc-faq">
            <details><summary>Does this store my information?</summary><p>No. Everything runs locally in your browser. Nothing is saved or sent anywhere.</p></details>
            <details><summary>Should I tell my lender the extra is for principal?</summary><p>Yes — make sure extra payments are applied to principal, not held as a prepayment of the next month&apos;s bill. Most lenders have a &quot;principal only&quot; option.</p></details>
            <details><summary>What about property tax and insurance?</summary><p>This calculator models the loan principal and interest only. Escrow items like tax and insurance don&apos;t change how fast the loan itself is paid off.</p></details>
          </div>
          <p className="disclaimer">For educational and estimation purposes only; not financial advice. Assumes a fixed rate and consistent payments. Consult a qualified professional before making decisions.</p>
        </article>

        <div className="ad-slot" data-ad="bottom">Ad · Responsive</div>

        <CalculatorFooter />
      </div>
    </div>
  );
}
