"use client";

import React, { useState, useEffect, useRef } from 'react';
import './calculator.css';

interface Debt {
  id: string;
  name: string;
  bal: number | string;
  apr: number | string;
}

export default function DebtPayoffCalculator() {
  const [debts, setDebts] = useState<Debt[]>([
    { id: '1', name: 'Credit Card A', bal: 6200, apr: 24.99 },
    { id: '2', name: 'Car Loan', bal: 11800, apr: 7.4 },
    { id: '3', name: 'Credit Card B', bal: 2400, apr: 19.99 },
    { id: '4', name: 'Personal Loan', bal: 4900, apr: 12.5 },
  ]);
  const [extra, setExtra] = useState<number | string>(200);
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
    const y = Math.floor(m / 12), mo = m % 12; 
    return (y ? y + 'y ' : '') + (mo ? mo + 'mo' : (y ? '' : '0mo')); 
  };
  const payoffDate = (m: number) => { 
    const d = new Date(); d.setMonth(d.getMonth() + m); 
    return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }); 
  };

  const simulate = (debtsArr: any[], ext: number, strategy: 'snowball' | 'avalanche') => {
    let list = debtsArr.map(d => ({ ...d, balance: d.bal }));
    list.forEach(d => { d.min = Math.max(25, d.bal * 0.02); });
    const pool = list.reduce((s, d) => s + d.min, 0) + ext;

    if (strategy === 'snowball') list.sort((a, b) => a.balance - b.balance);
    else list.sort((a, b) => b.apr - a.apr);

    let month = 0, totalInterest = 0;
    const history = [list.reduce((s, d) => s + d.balance, 0)];
    let stuck = false;

    while (list.some(d => d.balance > 0.005)) {
      month++;
      if (month > 900) { stuck = true; break; }
      list.forEach(d => { 
        if (d.balance > 0) { 
          const i = d.balance * (d.apr / 100 / 12); 
          d.balance += i; 
          totalInterest += i; 
        }
      });
      const totalMonthlyInterest = list.reduce((s, d) => d.balance > 0 ? s + d.balance * (d.apr / 100 / 12) : s, 0);
      if (pool < totalMonthlyInterest - 0.01 && month > 3) { stuck = true; break; }
      let avail = pool;
      list.forEach(d => { 
        if (d.balance > 0 && avail > 0) { 
          const p = Math.min(d.min, d.balance, avail); 
          d.balance -= p; avail -= p; 
        }
      });
      for (const d of list) { 
        if (avail <= 0) break; 
        if (d.balance > 0) { 
          const p = Math.min(d.balance, avail); 
          d.balance -= p; avail -= p; 
        }
      }
      history.push(list.reduce((s, d) => s + Math.max(0, d.balance), 0));
    }
    return { months: month, totalInterest, history, stuck };
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

    if (snow.stuck || aval.stuck) {
      setResults({ error: "⚠ With these numbers, the minimum payments don't cover the interest. Increase your extra monthly payment to see a payoff plan." });
      return;
    }

    setResults({ snow, aval, intSaved: snow.totalInterest - aval.totalInterest, monthsSaved: snow.months - aval.months });
  };

  const drawChart = (cv: HTMLCanvasElement, s: number[], a: number[]) => {
    const dpr = window.devicePixelRatio || 1;
    const W = 640, H = 300, pad = { l: 58, r: 14, t: 14, b: 30 };
    cv.width = W * dpr; cv.height = H * dpr; cv.style.height = H + 'px';
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    const n = Math.max(s.length, a.length);
    const maxV = Math.max(...s, ...a, 1);
    const X = (i: number) => pad.l + (i / (n - 1)) * (W - pad.l - pad.r);
    const Y = (v: number) => pad.t + (1 - v / maxV) * (H - pad.t - pad.b);

    ctx.strokeStyle = '#e7dfcd'; ctx.fillStyle = '#9c947f'; ctx.font = '11px "Hanken Grotesk"'; ctx.lineWidth = 1;
    for (let g = 0; g <= 4; g++) {
      const v = maxV * g / 4, y = Y(v);
      ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(W - pad.r, y); ctx.stroke();
      ctx.fillText('$' + Math.round(v / 1000) + 'k', 8, y + 4);
    }
    const months = n - 1;
    for (let m = 0; m <= months; m += 12) { const x = X(m); ctx.fillText((m / 12) + 'y', x - 6, H - 10); }

    const line = (data: number[], color: string) => {
      ctx.strokeStyle = color; ctx.lineWidth = 2.6; ctx.lineJoin = 'round'; ctx.beginPath();
      data.forEach((v, i) => { const x = X(i), y = Y(v); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
      ctx.stroke();
      ctx.fillStyle = color; ctx.beginPath(); ctx.arc(X(data.length - 1), Y(data[data.length - 1]), 3.5, 0, 7); ctx.fill();
    };
    line(s, '#c2410c');
    line(a, '#0b6b53');
  };

  useEffect(() => {
    handleCalc();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (results && !results.error && canvasRef.current) {
      drawChart(canvasRef.current, results.snow.history, results.aval.history);
    }
  }, [results]);

  useEffect(() => {
    fetch('/api/ads')
      .then(res => res.json())
      .then(data => {
        if (data) {
          // 1. Genel Reklam Kodu (Auto Ads vb. scriptler head'e)
          if (data.adsCode) {
            const temp = document.createElement('div');
            temp.innerHTML = data.adsCode.trim();
            const scriptTags = temp.getElementsByTagName('script');
            for (let i = 0; i < scriptTags.length; i++) {
              const newScript = document.createElement('script');
              if (scriptTags[i].src) {
                newScript.src = scriptTags[i].src;
                newScript.async = true;
                if (scriptTags[i].crossOrigin) {
                  newScript.crossOrigin = scriptTags[i].crossOrigin;
                }
              } else {
                newScript.innerHTML = scriptTags[i].innerHTML;
              }
              document.head.appendChild(newScript);
            }
          }

          // 2. Özel Reklam Alanları Entegrasyonu (Top, Mid, Bottom)
          const injectSlot = (selector: string, adCode: string) => {
            const slot = document.querySelector(selector);
            if (!slot || !adCode) return;
            slot.innerHTML = ''; // Placeholder'ı temizle
            
            const temp = document.createElement('div');
            temp.innerHTML = adCode.trim();
            
            // Script tag'lerini çalışabilir hale getir
            while(temp.firstChild) {
                if (temp.firstChild.nodeName === 'SCRIPT') {
                    const oldScript = temp.firstChild as HTMLScriptElement;
                    const newScript = document.createElement('script');
                    if (oldScript.src) {
                        newScript.src = oldScript.src;
                        newScript.async = true;
                        if (oldScript.crossOrigin) newScript.crossOrigin = oldScript.crossOrigin;
                    } else {
                        newScript.innerHTML = oldScript.innerHTML;
                    }
                    slot.appendChild(newScript);
                    temp.removeChild(oldScript);
                } else {
                    slot.appendChild(temp.firstChild);
                }
            }

            // Google Ads ins etiketi varsa tetikle
            if (adCode.includes('<ins')) {
                try {
                    (window as any).adsbygoogle = (window as any).adsbygoogle || [];
                    (window as any).adsbygoogle.push({});
                } catch(e) {}
            }
          };

          if (data.topAdCode) injectSlot('[data-ad="top"]', data.topAdCode);
          if (data.midAdCode) injectSlot('[data-ad="mid"]', data.midAdCode);
          if (data.bottomAdCode) injectSlot('[data-ad="bottom"]', data.bottomAdCode);
        }
      })
      .catch(err => console.error('Failed to load ads config:', err));
  }, []);

  return (
    <div className="calc-container">
      <div className="calc-wrap">
        <header className="calc-header">
          <div className="calc-brand"><span className="dot"></span> PayoffLab</div>
        </header>

        <section className="calc-hero">
          <div className="calc-eyebrow">Debt Payoff Planner</div>
          <h1>Debt <em>Snowball</em> vs <span className="v">Avalanche</span> Calculator</h1>
          <p className="calc-lede">Enter your debts and an extra monthly payment. See which strategy clears your debt faster, how much interest each one saves, and your exact debt-free date — calculated instantly, right in your browser.</p>
        </section>

        <div className="ad-slot" data-ad="top">Ad · Leaderboard 728×90</div>

        <div className="calc-grid">
          <div className="calc-card">
            <h2>Your debts</h2>
            <div className="sub">Add each debt with its balance, interest rate, and minimum monthly payment.</div>
            
            <div className="debt-row head">
              <span>Debt name</span><span>Balance ($)</span><span>APR (%)</span><span></span>
            </div>
            
            <div id="debts">
              {debts.map(d => (
                <div key={d.id} className="debt-row">
                  <input type="text" placeholder="e.g. Credit Card" value={d.name} onChange={e => updateDebt(d.id, 'name', e.target.value)} />
                  <input type="number" placeholder="0" min="0" step="50" value={d.bal} onChange={e => updateDebt(d.id, 'bal', e.target.value)} />
                  <input type="number" placeholder="0" min="0" step="0.1" value={d.apr} onChange={e => updateDebt(d.id, 'apr', e.target.value)} />
                  <button className="rm-btn" title="Remove" onClick={() => removeDebt(d.id)}>×</button>
                </div>
              ))}
            </div>
            <button className="add-btn" onClick={addDebt}>+ Add another debt</button>

            <div className="extra-row">
              <label>Extra payment toward debt each month</label>
              <div className="row-flex">
                <input type="number" value={extra} min="0" step="10" onChange={e => setExtra(e.target.value)} />
                <span style={{fontSize: '13px', color: 'var(--muted)'}}>on top of all minimums</span>
              </div>
            </div>

            <button className="calc-btn" onClick={handleCalc}>Compare strategies →</button>
          </div>

          <div id="results">
            {!results ? (
              <div className="calc-card"><div className="placeholder">Calculating...</div></div>
            ) : results.error ? (
              <div className="calc-card"><div className="placeholder">{results.error}</div></div>
            ) : (
              <>
                <div className="verdict">
                  <h3>The verdict</h3>
                  {Math.abs(results.intSaved) < 1 ? (
                    <>
                      <div className="big">It&apos;s basically a <b>tie</b> for your debts.</div>
                      <p>Both clear your debt in about {dur(results.aval.months)}. Pick the <b>snowball</b> for motivation — the cost is negligible.</p>
                    </>
                  ) : (
                    <>
                      <div className="big">The <b>{results.intSaved >= 0 ? 'avalanche' : 'snowball'}</b> method saves you {usd(Math.abs(results.intSaved))} in interest.</div>
                      <p>{results.monthsSaved > 0 ? `It's also about ${results.monthsSaved} month${results.monthsSaved > 1 ? 's' : ''} faster. ` : ''}Below is the full side-by-side.</p>
                    </>
                  )}
                </div>
                
                <div className="compare">
                  <div className="strat s">
                    <div className="name">❄ Snowball</div><div className="tag">Smallest balance first</div>
                    <div className="metric"><span className="k">Debt-free in</span><span className="val">{dur(results.snow.months)}</span></div>
                    <div className="metric"><span className="k">Payoff date</span><span className="val">{payoffDate(results.snow.months)}</span></div>
                    <div className="metric"><span className="k">Total interest</span><span className="val">{usd(results.snow.totalInterest)}</span></div>
                  </div>
                  <div className="strat a">
                    <div className="name">⛰ Avalanche</div><div className="tag">Highest rate first</div>
                    <div className="metric"><span className="k">Debt-free in</span><span className="val">{dur(results.aval.months)}</span></div>
                    <div className="metric"><span className="k">Payoff date</span><span className="val">{payoffDate(results.aval.months)}</span></div>
                    <div className="metric"><span className="k">Total interest</span><span className="val">{usd(results.aval.totalInterest)}</span></div>
                  </div>
                </div>

                <div className="calc-card chart-card">
                  <h2>Balance over time</h2>
                  <div className="sub">How fast your total debt drops under each strategy.</div>
                  <canvas ref={canvasRef} id="chart" width="640" height="300"></canvas>
                  <div className="chart-legend">
                    <span><i style={{background: 'var(--snow)'}}></i>Snowball</span>
                    <span><i style={{background: 'var(--aval)'}}></i>Avalanche</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="ad-slot" data-ad="mid">Ad · In-content Responsive</div>

        <article className="calc-content">
          <h2>How the debt snowball and avalanche actually work</h2>
          <p>Both methods do the same core thing: you keep paying the minimum on every debt, then throw every extra dollar at <em>one</em> target debt until it&apos;s gone. When that debt is cleared, its old payment &quot;rolls over&quot; onto the next target. The only difference is <strong>which debt you target first.</strong></p>

          <h3>The debt snowball method</h3>
          <p>You attack the <strong>smallest balance first</strong>, regardless of interest rate. Each paid-off debt is a fast, visible win, which keeps motivation high. The trade-off is that you may pay more total interest if your smaller debts happen to have lower rates.</p>

          <h3>The debt avalanche method</h3>
          <p>You attack the <strong>highest interest rate first</strong>. This is mathematically optimal — it minimizes the total interest you pay and usually clears all debt a little sooner. The trade-off is that your first target might be a large balance, so the first &quot;win&quot; can take a while.</p>

          <h2>Which should you choose?</h2>
          <ul>
            <li><strong>Choose avalanche</strong> if you&apos;re motivated by saving the most money and can stay disciplined without frequent wins.</li>
            <li><strong>Choose snowball</strong> if you&apos;ve struggled to stick with payoff plans before and need momentum from quick victories.</li>
          </ul>
          <p>The calculator above shows you the real dollar difference for <em>your</em> specific debts, so you can decide with numbers instead of guessing.</p>

          <h2>Frequently asked questions</h2>
          <div className="calc-faq">
            <details><summary>Does this calculator store my financial data?</summary><p>No. Everything is calculated locally in your browser. Nothing is uploaded, saved, or sent anywhere.</p></details>
            <details><summary>What APR should I enter?</summary><p>Use the purchase APR shown on your statement. For credit cards it&apos;s often 18–29%. For loans, use the stated interest rate.</p></details>
            <details><summary>What if my minimum payments don&apos;t cover the interest?</summary><p>If a balance&apos;s interest is higher than its minimum payment, that debt would never be paid off on minimums alone. The calculator will flag this so you know to increase your payment.</p></details>
            <details><summary>Is the avalanche always better?</summary><p>In total interest, almost always. But the difference is sometimes small, and the snowball&apos;s motivational wins can matter more than a modest dollar saving for many people.</p></details>
          </div>

          <p className="disclaimer">This tool is for educational and estimation purposes only and does not constitute financial advice. Results are estimates based on the figures you enter and assume fixed rates and consistent payments. Consult a qualified financial professional before making decisions.</p>
        </article>

        <div className="ad-slot" data-ad="bottom">Ad · Responsive</div>

        <footer className="calc-footer">© {new Date().getFullYear()} PayoffLab · Free debt payoff calculator · Built to run entirely in your browser</footer>
      </div>
    </div>
  );
}
