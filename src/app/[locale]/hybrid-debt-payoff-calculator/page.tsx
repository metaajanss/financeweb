"use client";

import React, { useState, useEffect, useRef } from 'react';
import '../calculator.css';
import { useAds } from '@/shared/hooks/use-ads';
import { CalculatorFooter } from '@/shared/components/layout/CalculatorFooter';

interface Debt {
  id: string;
  name: string;
  bal: number | string;
  apr: number | string;
}

export default function HybridDebtPayoffCalculator() {
  useAds();

  const [debts, setDebts] = useState<Debt[]>([
    { id: '1', name: 'Credit Card A', bal: 5800, apr: 26.99 },
    { id: '2', name: 'Credit Card B', bal: 1200, apr: 22.99 },
    { id: '3', name: 'Car Loan', bal: 13500, apr: 7.4 },
    { id: '4', name: 'Personal Loan', bal: 4200, apr: 14.5 },
  ]);
  const [extra, setExtra] = useState<number | string>(250);
  const [results, setResults] = useState<any>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const addDebt = () => {
    setDebts([...debts, { id: Math.random().toString(), name: '', bal: '', apr: '' }]);
  };

  const removeDebt = (id: string) => {
    setDebts(debts.filter(d => d.id !== id));
  };

  const updateDebt = (id: string, field: keyof Debt, val: string) => {
    setDebts(debts.map(d => d.id === id ? { ...d, [field]: val } : d));
  };

  const usd = (n: number) => '$' + Math.round(n).toLocaleString('en-US');
  
  const dur = (m: number) => {
    const y = Math.floor(m / 12);
    const mo = m % 12;
    return (y ? y + 'y ' : '') + (mo ? mo + 'mo' : (y ? '' : '0mo'));
  };

  const payoffDate = (m: number) => {
    const d = new Date();
    d.setMonth(d.getMonth() + m);
    return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  const simulate = (debtsArr: any[], ext: number, strategy: 'snowball' | 'avalanche' | 'hybrid') => {
    let list = debtsArr.map(d => ({
      ...d,
      balance: d.bal,
      min: Math.max(25, d.bal * 0.02)
    }));
    const pool = list.reduce((s, d) => s + d.min, 0) + ext;

    if (strategy === 'snowball') {
      list.sort((a, b) => a.balance - b.balance);
    } else if (strategy === 'avalanche') {
      list.sort((a, b) => b.apr - a.apr);
    } else {
      // hybrid: rate / balance score
      list.sort((a, b) => {
        const scoreA = a.balance > 0 ? a.apr / a.balance : 0;
        const scoreB = b.balance > 0 ? b.apr / b.balance : 0;
        return scoreB - scoreA;
      });
    }

    let month = 0, totalInterest = 0;
    const history = [list.reduce((s, d) => s + d.balance, 0)];

    while (list.some(d => d.balance > 0.005)) {
      month++;
      if (month > 900) break;
      
      list.forEach(d => {
        if (d.balance > 0) {
          const i = d.balance * (d.apr / 100 / 12);
          d.balance += i;
          totalInterest += i;
        }
      });

      const poolCheck = list.reduce((s, d) => d.balance > 0 ? s + d.balance * (d.apr / 100 / 12) : s, 0);
      if (pool < poolCheck - 0.01 && month > 3) {
        month = 999;
        break;
      }

      let avail = pool;
      list.forEach(d => {
        if (d.balance > 0 && avail > 0) {
          const p = Math.min(d.min, d.balance, avail);
          d.balance -= p;
          avail -= p;
        }
      });

      for (const d of list) {
        if (avail <= 0) break;
        if (d.balance > 0) {
          const p = Math.min(d.balance, avail);
          d.balance -= p;
          avail -= p;
        }
      }

      history.push(list.reduce((s, d) => s + Math.max(0, d.balance), 0));
    }

    return { months: month, totalInterest, history, stuck: month >= 999 };
  };

  const handleCalc = () => {
    const validDebts = debts.map(d => ({
      name: d.name || 'Debt',
      bal: parseFloat(String(d.bal)) || 0,
      apr: parseFloat(String(d.apr)) || 0
    })).filter(d => d.bal > 0);

    if (validDebts.length === 0) {
      setResults({ error: 'Add at least one debt with a balance above $0.' });
      return;
    }

    const ext = parseFloat(String(extra)) || 0;
    const snow = simulate(validDebts, ext, 'snowball');
    const aval = simulate(validDebts, ext, 'avalanche');
    const hybr = simulate(validDebts, ext, 'hybrid');

    if (snow.stuck || aval.stuck || hybr.stuck) {
      setResults({ error: "⚠ Minimum payments don't cover the interest. Increase your extra monthly payment." });
      return;
    }

    // best = lowest interest paid
    const best = [
      { key: 's', int: snow.totalInterest },
      { key: 'a', int: aval.totalInterest },
      { key: 'h', int: hybr.totalInterest },
    ].sort((a, b) => a.int - b.int)[0].key;

    const stratData = {
      s: { label: '❄ Snowball', tag: 'Smallest balance first', color: 'var(--snow, #c2410c)', r: snow },
      a: { label: '⛰ Avalanche', tag: 'Highest rate first', color: 'var(--aval, #0b6b53)', r: aval },
      h: { label: '⚡ Hybrid', tag: 'High-rate small debts first', color: 'var(--hybrid, #6d28d9)', r: hybr },
    };

    const winnerName = stratData[best as keyof typeof stratData].label;
    const secondInt = best === 'a' 
      ? Math.max(snow.totalInterest, hybr.totalInterest) 
      : aval.totalInterest;
    const saved = secondInt - stratData[best as keyof typeof stratData].r.totalInterest;

    setResults({
      snow,
      aval,
      hybr,
      best,
      stratData,
      winnerName,
      saved
    });
  };

  const drawChart = (cv: HTMLCanvasElement, s: number[], a: number[], h: number[]) => {
    const dpr = window.devicePixelRatio || 1;
    const W = 640, H = 300, pad = { l: 58, r: 14, t: 14, b: 30 };
    cv.width = W * dpr; cv.height = H * dpr; cv.style.height = H + 'px';
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    const n = Math.max(s.length, a.length, h.length);
    const maxV = Math.max(...s, ...a, ...h, 1);
    const X = (i: number) => pad.l + (i / (n - 1 || 1)) * (W - pad.l - pad.r);
    const Y = (v: number) => pad.t + (1 - v / maxV) * (H - pad.t - pad.b);

    ctx.strokeStyle = '#e7dfcd'; ctx.fillStyle = '#9c947f'; ctx.font = '11px "Hanken Grotesk"'; ctx.lineWidth = 1;
    for (let g = 0; g <= 4; g++) {
      const v = maxV * g / 4, y = Y(v);
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

    line(s, 'var(--snow, #c2410c)');
    line(a, 'var(--aval, #0b6b53)');
    line(h, 'var(--hybrid, #6d28d9)');
  };

  useEffect(() => {
    handleCalc();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (results && !results.error && canvasRef.current) {
      drawChart(canvasRef.current, results.snow.history, results.aval.history, results.hybr.history);
    }
  }, [results]);

  return (
    <div className="calc-container">
      <div className="calc-wrap">
        <header className="calc-header">
          <div className="calc-brand">
            <span className="dot" style={{ background: 'linear-gradient(135deg, var(--snow, #c2410c), var(--hybrid, #6d28d9), var(--aval, #0b6b53))' }}></span> PayoffLab
          </div>
        </header>

        <section className="calc-hero">
          <div className="calc-eyebrow">Debt Payoff Planner</div>
          <h1>Hybrid Debt <em>Payoff</em> Calculator</h1>
          <p className="calc-lede">Most calculators compare two strategies. This one compares all three — snowball, avalanche, and <strong>hybrid</strong> — side by side with your actual debts, so you can see exactly which saves the most for your situation.</p>
        </section>

        <div className="ad-slot" data-ad="top">Ad · Leaderboard 728×90</div>

        <div className="calc-grid">
          <div className="calc-card">
            <h2>Your debts</h2>
            <div className="sub">Enter each debt. Minimum payment is estimated if left at 0.</div>

            <div className="debt-row head" style={{ gridTemplateColumns: '1.5fr 1fr 1fr 28px' }}>
              <span>Debt name</span><span>Balance ($)</span><span>APR (%)</span><span></span>
            </div>

            <div id="debts">
              {debts.map(d => (
                <div key={d.id} className="debt-row" style={{ gridTemplateColumns: '1.5fr 1fr 1fr 28px' }}>
                  <input type="text" placeholder="Debt name" value={d.name} onChange={e => updateDebt(d.id, 'name', e.target.value)} />
                  <input type="number" placeholder="Balance" min="0" step="50" value={d.bal} onChange={e => updateDebt(d.id, 'bal', e.target.value)} />
                  <input type="number" placeholder="APR %" min="0" step="0.1" value={d.apr} onChange={e => updateDebt(d.id, 'apr', e.target.value)} />
                  <button className="rm-btn" title="Remove" onClick={() => removeDebt(d.id)}>×</button>
                </div>
              ))}
            </div>
            
            <button className="add-btn" onClick={addDebt}>+ Add another debt</button>

            <div className="extra-row" style={{ marginTop: '20px', paddingTop: '18px', borderTop: '1px solid var(--line)' }}>
              <label className="field" style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: 'var(--muted)', fontWeight: 600 }}>
                Extra monthly payment ($)
                <input type="number" value={extra} min="0" step="25" onChange={e => setExtra(e.target.value)} style={{ maxWidth: '180px' }} />
              </label>
            </div>

            <button className="calc-btn" onClick={handleCalc}>Compare all three strategies →</button>
          </div>

          <div id="results">
            {!results ? (
              <div className="calc-card"><div className="placeholder">Your three-way comparison and payoff chart will appear here.</div></div>
            ) : results.error ? (
              <div className="calc-card"><div className="placeholder">{results.error}</div></div>
            ) : (
              <>
                <div className="verdict" style={{ borderLeft: `5px solid ${results.stratData[results.best].color}` }}>
                  <style jsx>{`
                    .verdict:before {
                      background: ${results.stratData[results.best].color} !important;
                    }
                  `}</style>
                  <div style={{ fontFamily: "'Fraunces', serif", fontSize: '14px', letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 600, marginBottom: '8px' }}>Best for your debts</div>
                  <div style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(22px, 3.5vw, 29px)', fontWeight: 600, letterSpacing: '-.02em', lineHeight: 1.15 }}>
                    {results.winnerName} {results.saved > 0 ? <>saves you <b style={{ color: results.stratData[results.best].color }}>{usd(results.saved)}</b> in interest</> : 'ties with the best'}
                  </div>
                  <p style={{ fontSize: '14px', color: 'var(--muted)', marginTop: '8px', marginBottom: 0 }}>
                    Debt-free by {payoffDate(results.stratData[results.best].r.months)} · {usd(results.stratData[results.best].r.totalInterest)} total interest paid.
                  </p>
                </div>

                <div className="compare3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '16px' }}>
                  <style jsx>{`
                    @media(max-width: 540px) {
                      .compare3 {
                        grid-template-columns: 1fr !important;
                      }
                    }
                  `}</style>
                  
                  {['s', 'a', 'h'].map(k => {
                    const s = results.stratData[k as keyof typeof results.stratData];
                    const isWinner = k === results.best;
                    return (
                      <div className="strat" key={k} style={{ borderTop: `3px solid ${s.color}`, boxShadow: isWinner ? '0 0 0 2px var(--hybrid, #6d28d9)' : 'none' }}>
                        {isWinner && <span style={{ position: 'absolute', top: '12px', right: '12px', fontSize: '16px' }}>🏆</span>}
                        <div className="name" style={{ color: s.color, fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: '16px', marginBottom: '2px' }}>{s.label}</div>
                        <div className="tag" style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '12px' }}>{s.tag}</div>
                        <div className="metric"><span className="k">Debt-free in</span><span className="val">{dur(s.r.months)}</span></div>
                        <div className="metric"><span className="k">Payoff date</span><span className="val">{payoffDate(s.r.months)}</span></div>
                        <div className="metric"><span className="k">Total interest</span><span className="val">{usd(s.r.totalInterest)}</span></div>
                      </div>
                    );
                  })}
                </div>

                <div className="calc-card chart-card">
                  <h2 style={{ marginTop: 0 }}>Balance over time</h2>
                  <div className="sub">All three strategies on the same chart.</div>
                  <canvas ref={canvasRef} id="chart" width="640" height="300" style={{ width: '100%', display: 'block' }}></canvas>
                  <div className="legend" style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginTop: '10px', fontSize: '12px', color: 'var(--muted)', flexWrap: 'wrap' }}>
                    <span><i style={{ display: 'inline-block', width: '14px', height: '3px', borderRadius: '2px', verticalAlign: 'middle', marginRight: '5px', background: 'var(--snow, #c2410c)' }}></i>Snowball</span>
                    <span><i style={{ display: 'inline-block', width: '14px', height: '3px', borderRadius: '2px', verticalAlign: 'middle', marginRight: '5px', background: 'var(--aval, #0b6b53)' }}></i>Avalanche</span>
                    <span><i style={{ display: 'inline-block', width: '14px', height: '3px', borderRadius: '2px', verticalAlign: 'middle', marginRight: '5px', background: 'var(--hybrid, #6d28d9)' }}></i>Hybrid</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="ad-slot" data-ad="mid">Ad · In-content Responsive</div>

        <article className="calc-content">
          <h2>What is the hybrid debt payoff method?</h2>
          <p>The hybrid method is a middle path between snowball and avalanche. Instead of sorting purely by balance (snowball) or purely by rate (avalanche), it ranks debts by a <strong>combined score</strong> that rewards both high interest rates and smaller balances — targeting the debts that are simultaneously expensive and beatable.</p>

          <h3>How the three methods compare</h3>
          <ul>
            <li><strong>❄ Snowball</strong> — smallest balance first. Fast psychological wins, may pay more interest.</li>
            <li><strong>⛰ Avalanche</strong> — highest rate first. Mathematically optimal for interest savings, wins can take longer.</li>
            <li><strong>⚡ Hybrid</strong> — high-rate small debts first. Balances motivation and savings — often the best of both.</li>
          </ul>

          <h3>When hybrid outperforms</h3>
          <p>The hybrid shines when you have a mix of debt sizes and rates — for example a high-rate credit card with a moderate balance alongside a large, lower-rate personal loan. The snowball would ignore the expensive card; the avalanche might leave you grinding a large balance for years. The hybrid targets the card first for a quick, meaningful win, then tackles the large loan.</p>

          <h2>Frequently asked questions</h2>
          <div className="calc-faq">
            <details><summary>How is the hybrid score calculated?</summary><p>Each debt gets a score based on its interest rate divided by its balance. Higher scores mean the debt is expensive relative to its size — a prime target. Debts are sorted by this score, highest first.</p></details>
            <details><summary>Is my data saved?</summary><p>No. Everything runs locally in your browser. Nothing is stored or transmitted.</p></details>
            <details><summary>What if one strategy ties another?</summary><p>With some debt mixes, two or even all three strategies produce identical results — especially if all debts have similar rates or balances. The calculator will show you if that&apos;s the case.</p></details>
          </div>
          <p className="disclaimer">For educational and estimation purposes only; not financial advice. Results are estimates based on the figures you enter and assume fixed rates and consistent payments.</p>
        </article>

        <div className="ad-slot" data-ad="bottom">Ad · Responsive</div>

        <CalculatorFooter />
      </div>
    </div>
  );
}
