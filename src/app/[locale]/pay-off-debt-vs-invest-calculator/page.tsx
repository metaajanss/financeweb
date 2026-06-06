"use client";

import React, { useState, useEffect, useRef } from 'react';
import '../calculator.css';
import { useAds } from '@/shared/hooks/use-ads';
import { CalculatorFooter } from '@/shared/components/layout/CalculatorFooter';

export default function PayOffDebtVsInvestCalculator() {
  useAds();

  const [bal, setBal] = useState<number | string>(28000);
  const [debtRate, setDebtRate] = useState<number | string>(7.5);
  const [minPay, setMinPay] = useState<number | string>(420);
  const [invRate, setInvRate] = useState<number | string>(7);
  const [years, setYears] = useState<number | string>(10);
  const [extra, setExtra] = useState<number | string>(500);

  const [results, setResults] = useState<any>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const usd = (n: number) => '$' + Math.round(n).toLocaleString('en-US');

  const simulateDebtFirst = (balance: number, dRate: number, mPay: number, ext: number, iRate: number, yrs: number) => {
    const N = yrs * 12;
    const mr = dRate / 100 / 12;
    const imr = iRate / 100 / 12;
    const monthly = mPay + ext;
    let debt = balance, invest = 0;
    const nw = [];

    for (let m = 1; m <= N; m++) {
      if (debt > 0) {
        const interest = debt * mr;
        const pay = Math.min(monthly, debt + interest);
        debt = debt + interest - pay;
        if (debt < 0.005) {
          invest = invest * (1 + imr) + (monthly - pay);
          debt = 0;
        }
      } else {
        invest = invest * (1 + imr) + monthly;
      }
      nw.push(invest - Math.max(0, debt));
    }
    return nw;
  };

  const simulateInvestFirst = (balance: number, dRate: number, mPay: number, ext: number, iRate: number, yrs: number) => {
    const N = yrs * 12;
    const mr = dRate / 100 / 12;
    const imr = iRate / 100 / 12;
    let debt = balance, invest = 0;
    const nw = [];

    for (let m = 1; m <= N; m++) {
      const interest = debt > 0 ? debt * mr : 0;
      const pay = debt > 0 ? Math.min(mPay, debt + interest) : 0;
      debt = Math.max(0, debt + interest - pay);
      invest = invest * (1 + imr) + ext;
      nw.push(invest - Math.max(0, debt));
    }
    return nw;
  };

  const handleCalc = () => {
    const b = parseFloat(String(bal)) || 0;
    const dR = parseFloat(String(debtRate)) || 0;
    const mP = parseFloat(String(minPay)) || 0;
    const iR = parseFloat(String(invRate)) || 0;
    const yrs = parseInt(String(years)) || 0;
    const ext = parseFloat(String(extra)) || 0;

    if (b <= 0 || yrs <= 0) {
      setResults({ error: 'Enter your balance and time horizon to begin.' });
      return;
    }

    const debtFirst = simulateDebtFirst(b, dR, mP, ext, iR, yrs);
    const invFirst = simulateInvestFirst(b, dR, mP, ext, iR, yrs);

    const dfFinal = debtFirst[debtFirst.length - 1];
    const ifFinal = invFirst[invFirst.length - 1];
    const gap = Math.abs(dfFinal - ifFinal);
    const invWins = ifFinal > dfFinal;
    const debtWins = dfFinal > ifFinal;
    const tie = gap < 100;

    let vClass = tie ? 'tie' : (invWins ? 'inv' : 'debt');

    setResults({
      debtFirst,
      invFirst,
      dfFinal,
      ifFinal,
      gap,
      invWins,
      debtWins,
      tie,
      vClass,
      yrs,
      dR,
      iR,
      mP,
      ext
    });
  };

  const drawChart = (cv: HTMLCanvasElement, d: number[], inv: number[]) => {
    const dpr = window.devicePixelRatio || 1;
    const W = 640, H = 280, pad = { l: 64, r: 14, t: 14, b: 30 };
    cv.width = W * dpr; cv.height = H * dpr; cv.style.height = H + 'px';
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    const n = Math.max(d.length, inv.length);
    const all = [...d, ...inv];
    const maxV = Math.max(...all, 1), minV = Math.min(...all, 0);
    const X = (i: number) => pad.l + (i / (n - 1 || 1)) * (W - pad.l - pad.r);
    const Y = (v: number) => pad.t + (1 - (v - minV) / (maxV - minV || 1)) * (H - pad.t - pad.b);

    ctx.strokeStyle = '#e7dfcd'; ctx.fillStyle = '#9c947f'; ctx.font = '11px "Hanken Grotesk"'; ctx.lineWidth = 1;
    for (let g = 0; g <= 4; g++) {
      const v = minV + (maxV - minV) * g / 4, y = Y(v);
      ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(W - pad.r, y); ctx.stroke();
      ctx.fillText('$' + Math.round(v / 1000) + 'k', 8, y + 4);
    }
    for (let m = 0; m <= n - 1; m += 12) {
      ctx.fillText((m / 12) + 'y', X(m) - 6, H - 10);
    }

    const line = (data: number[], color: string) => {
      ctx.strokeStyle = color; ctx.lineWidth = 2.6; ctx.lineJoin = 'round';
      ctx.beginPath();
      data.forEach((v, i) => {
        const x = X(i), y = Y(v);
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      });
      ctx.stroke();
      ctx.fillStyle = color; ctx.beginPath(); ctx.arc(X(data.length - 1), Y(data[data.length - 1]), 3.5, 0, 7); ctx.fill();
    };

    line(d, 'var(--snow, #c2410c)');
    line(inv, 'var(--aval, #0b6b53)');
  };

  useEffect(() => {
    handleCalc();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (results && !results.error && canvasRef.current) {
      drawChart(canvasRef.current, results.debtFirst, results.invFirst);
    }
  }, [results]);

  return (
    <div className="calc-container">
      <div className="calc-wrap">
        <header className="calc-header">
          <div className="calc-brand">
            <span className="dot" style={{ background: 'linear-gradient(135deg, var(--debt, #c2410c), var(--inv, #0b6b53))' }}></span> PayoffLab
          </div>
        </header>

        <section className="calc-hero">
          <div className="calc-eyebrow">Wealth Builder</div>
          <h1>Pay Off Debt vs <em>Invest</em></h1>
          <p className="calc-lede">Should your extra money go toward paying down debt or into investments? Enter your numbers and see which path leaves you with more net worth — with a year-by-year chart.</p>
        </section>

        <div className="ad-slot" data-ad="top">Ad · Leaderboard 728×90</div>

        <div className="calc-grid">
          <div className="calc-card">
            <h2>Your situation</h2>
            <div className="sub">Enter your debt and what you can put toward it each month.</div>

            <div className="group-label" style={{ fontSize: '11px', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 700, margin: '16px 0 11px', paddingTop: '14px', borderTop: '1px solid var(--line)' }}>Your debt</div>
            <label className="field" style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: 'var(--muted)', fontWeight: 600, marginBottom: '14px' }}>
              Remaining balance ($)
              <input type="number" value={bal} step="500" onChange={e => setBal(e.target.value)} />
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '13px' }}>
              <label className="field" style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: 'var(--muted)', fontWeight: 600, marginBottom: '14px' }}>
                Interest rate (%)
                <input type="number" value={debtRate} step="0.1" onChange={e => setDebtRate(e.target.value)} />
              </label>
              <label className="field" style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: 'var(--muted)', fontWeight: 600, marginBottom: '14px' }}>
                Minimum payment ($)
                <input type="number" value={minPay} step="10" onChange={e => setMinPay(e.target.value)} />
              </label>
            </div>

            <div className="group-label" style={{ fontSize: '11px', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 700, margin: '16px 0 11px', paddingTop: '14px', borderTop: '1px solid var(--line)' }}>Your investment plan</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '13px' }}>
              <label className="field" style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: 'var(--muted)', fontWeight: 600, marginBottom: '14px' }}>
                Expected return (%/yr)
                <input type="number" value={invRate} step="0.5" onChange={e => setInvRate(e.target.value)} />
              </label>
              <label className="field" style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: 'var(--muted)', fontWeight: 600, marginBottom: '14px' }}>
                Years to compare
                <input type="number" value={years} step="1" onChange={e => setYears(e.target.value)} />
              </label>
            </div>

            <div className="group-label" style={{ fontSize: '11px', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 700, margin: '16px 0 11px', paddingTop: '14px', borderTop: '1px solid var(--line)' }}>Extra monthly amount</div>
            <label className="field" style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: 'var(--muted)', fontWeight: 600, marginBottom: '14px' }}>
              Extra cash available each month ($)
              <input type="number" value={extra} step="25" onChange={e => setExtra(e.target.value)} />
            </label>
            <p style={{ fontSize: '12.5px', color: 'var(--muted)', marginBottom: '4px', marginTop: 0 }}>Path A: put all extra toward debt first, then invest freed-up payment once debt is gone. Path B: invest all extra now, pay minimums only.</p>

            <button className="calc-btn" onClick={handleCalc}>Compare both paths →</button>
          </div>

          <div id="results">
            {!results ? (
              <div className="calc-card"><div className="placeholder">Your net-worth comparison and chart will appear here.</div></div>
            ) : results.error ? (
              <div className="calc-card"><div className="placeholder">{results.error}</div></div>
            ) : (
              <>
                <div className={`verdict ${results.vClass}`}>
                  <style jsx>{`
                    .verdict:before {
                      background: var(--muted);
                    }
                    .verdict.inv:before {
                      background: var(--inv, #0b6b53) !important;
                    }
                    .verdict.debt:before {
                      background: var(--debt, #c2410c) !important;
                    }
                  `}</style>
                  <h3>The verdict</h3>
                  {results.tie ? (
                    <>
                      <div className="big">It&apos;s essentially a <b style={{ color: 'var(--muted)' }}>tie</b> over {results.yrs} years.</div>
                      <p>The difference is under $100. Both paths build similar wealth at your rate assumptions.</p>
                    </>
                  ) : results.invWins ? (
                    <>
                      <div className="big">Investing first leaves you <span className="gi" style={{ color: 'var(--inv, #0b6b53)', fontWeight: 700 }}>{usd(results.gap)} ahead</span> after {results.yrs} years.</div>
                      <p>At {results.iR}% returns vs {results.dR}% debt cost, the market edge compounds over time. Your debt rate is low enough that investing wins on pure math.</p>
                    </>
                  ) : (
                    <>
                      <div className="big">Paying debt first leaves you <span className="gd" style={{ color: 'var(--debt, #c2410c)', fontWeight: 700 }}>{usd(results.gap)} ahead</span> after {results.yrs} years.</div>
                      <p>Your {results.dR}% debt rate is close to or above your {results.iR}% expected return. The guaranteed savings on interest beats the uncertain market gain.</p>
                    </>
                  )}
                </div>

                <div className="compare" style={{ marginBottom: '16px' }}>
                  <div className="strat d" style={{ borderTop: '3px solid var(--debt, #c2410c)' }}>
                    <div className="name" style={{ color: 'var(--debt, #c2410c)' }}>🏦 Pay debt first</div>
                    <div className="tag">Clear debt fast, then invest</div>
                    <div className="metric">
                      <span className="k">Net worth after {results.yrs}y</span>
                      <span className="val">{usd(results.dfFinal)}</span>
                    </div>
                    <div className="metric">
                      <span className="k">Strategy</span>
                      <span className="val" style={{ fontSize: '13px' }}>Pay {usd(results.mP + results.ext)}/mo until debt-free, then invest it all</span>
                    </div>
                  </div>

                  <div className="strat i" style={{ borderTop: '3px solid var(--inv, #0b6b53)' }}>
                    <div className="name" style={{ color: 'var(--inv, #0b6b53)' }}>📈 Invest first</div>
                    <div className="tag">Invest extra, pay minimums</div>
                    <div className="metric">
                      <span className="k">Net worth after {results.yrs}y</span>
                      <span className="val">{usd(results.ifFinal)}</span>
                    </div>
                    <div className="metric">
                      <span className="k">Strategy</span>
                      <span className="val" style={{ fontSize: '13px' }}>Invest {usd(results.ext)}/mo, pay {usd(results.mP)}/mo minimum</span>
                    </div>
                  </div>
                </div>

                <div className="calc-card chart-card">
                  <h2 style={{ marginTop: 0 }}>Net worth over time</h2>
                  <div className="sub">Investments minus remaining debt balance for each path.</div>
                  <canvas ref={canvasRef} id="chart" width="640" height="280" style={{ width: '100%', display: 'block' }}></canvas>
                  <div className="legend" style={{ display: 'flex', gap: '18px', justifyContent: 'center', marginTop: '10px', fontSize: '12.5px', color: 'var(--muted)' }}>
                    <span><i style={{ display: 'inline-block', width: '14px', height: '3px', borderRadius: '2px', verticalAlign: 'middle', marginRight: '6px', background: 'var(--debt, #c2410c)' }}></i>Pay debt first</span>
                    <span><i style={{ display: 'inline-block', width: '14px', height: '3px', borderRadius: '2px', verticalAlign: 'middle', marginRight: '6px', background: 'var(--inv, #0b6b53)' }}></i>Invest first</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="ad-slot" data-ad="mid">Ad · In-content Responsive</div>

        <article className="calc-content">
          <h2>The math behind pay off debt vs invest</h2>
          <p>At its core, this is a question of <strong>guaranteed return vs expected return</strong>. Paying off a 7.5% debt gives you a guaranteed 7.5% return — you no longer owe that interest. Investing in the stock market has historically returned around 7–10% annually, but with significant year-to-year volatility and no guarantee.</p>
          
          <h3>The &quot;freed-up payment&quot; advantage</h3>
          <p>One factor people underestimate: when you pay off debt aggressively, you eventually free up the entire monthly payment — minimum plus extra. At that point, all of it can go to investing. This calculator models that correctly: once debt is cleared, everything flows into investments.</p>
          
          <h3>When paying debt wins</h3>
          <ul>
            <li>Your debt interest rate is <strong>higher than your expected investment return</strong>.</li>
            <li>You value the <strong>certainty</strong> of a guaranteed return over market risk.</li>
            <li>The debt is a significant psychological burden that affects your decision-making.</li>
          </ul>
          
          <h3>When investing wins</h3>
          <ul>
            <li>Your debt rate is <strong>low</strong> (e.g. 3–4% mortgage) and you expect higher investment returns.</li>
            <li>You have an <strong>employer 401k match</strong> — that&apos;s an instant 50–100% return you shouldn&apos;t skip.</li>
            <li>Time horizon is long, giving compounding returns time to compound.</li>
          </ul>

          <h2>Frequently asked questions</h2>
          <div className="calc-faq">
            <details><summary>Does this account for taxes on investment gains?</summary><p>No — taxes on investment gains depend heavily on account type (taxable vs 401k/IRA), holding period, and income. For a rough estimate in a tax-advantaged account, the pre-tax return is a reasonable proxy.</p></details>
            <details><summary>Is my data saved?</summary><p>No. Calculations run entirely in your browser. Nothing is stored or sent anywhere.</p></details>
            <details><summary>What about employer 401k matching?</summary><p>Always capture a full employer match before extra debt payments — it&apos;s an instant guaranteed return that almost always beats the math. The calculator doesn&apos;t model the match but the principle is universal.</p></details>
          </div>
          <p className="disclaimer">For educational and estimation purposes only; not financial advice. Investment returns are uncertain and past performance does not guarantee future results. Consult a qualified financial professional.</p>
        </article>

        <div className="ad-slot" data-ad="bottom">Ad · Responsive</div>

        <CalculatorFooter />
      </div>
    </div>
  );
}
