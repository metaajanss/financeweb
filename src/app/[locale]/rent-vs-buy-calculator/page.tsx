"use client";

import React, { useState, useEffect, useRef } from 'react';
import '../calculator.css';
import { useAds } from '@/shared/hooks/use-ads';
import { CalculatorFooter } from '@/shared/components/layout/CalculatorFooter';

export default function RentVsBuyCalculator() {
  useAds();

  const [price, setPrice] = useState<number | string>(420000);
  const [down, setDown] = useState<number | string>(20);
  const [rate, setRate] = useState<number | string>(6.5);
  const [rent, setRent] = useState<number | string>(2200);
  const [years, setYears] = useState<number | string>(7);

  const [appr, setAppr] = useState<number | string>(3);
  const [rentInc, setRentInc] = useState<number | string>(3);
  const [invRet, setInvRet] = useState<number | string>(6);
  const [homeCost, setHomeCost] = useState<number | string>(2.5);
  const [buyCost, setBuyCost] = useState<number | string>(3);
  const [sellCost, setSellCost] = useState<number | string>(6);

  const [results, setResults] = useState<any>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const usd = (n: number) => (n < 0 ? '-$' : '$') + Math.round(Math.abs(n)).toLocaleString('en-US');
  const pmt = (P: number, r: number, n: number) => {
    if (r === 0) return P / n;
    return P * r / (1 - Math.pow(1 + r, -n));
  };

  const handleCalc = () => {
    const p = parseFloat(String(price)) || 0;
    const dPct = parseFloat(String(down)) || 0;
    const r = parseFloat(String(rate)) || 0;
    const r0 = parseFloat(String(rent)) || 0;
    const y = parseFloat(String(years)) || 0;

    const a = (parseFloat(String(appr)) || 0) / 100;
    const rI = (parseFloat(String(rentInc)) || 0) / 100;
    const iR = (parseFloat(String(invRet)) || 0) / 100;
    const hC = (parseFloat(String(homeCost)) || 0) / 100;
    const bC = (parseFloat(String(buyCost)) || 0) / 100;
    const sC = (parseFloat(String(sellCost)) || 0) / 100;

    if (p <= 0 || y <= 0) {
      setResults({ error: 'Enter a home price and time horizon to begin.' });
      return;
    }

    const N = Math.round(y * 12);
    const downPmt = p * dPct / 100;
    const closing = p * bC;
    const loan = p - downPmt;
    const mr = r / 100 / 12;
    const pi = pmt(loan, mr, 30 * 12); 
    const imr = Math.pow(1 + iR, 1 / 12) - 1; 
    const amr = Math.pow(1 + a, 1 / 12) - 1; 

    let renterPort = downPmt + closing;
    let buyerSide = 0; 
    let bal = loan, homeVal = p;
    let totalRent = 0, totalBuyOut = downPmt + closing;
    const buyNW = [downPmt + (homeVal * (1 - sC) - bal)]; 
    const rentNW = [renterPort]; 

    for (let m = 1; m <= N; m++) {
      homeVal *= (1 + amr);
      const interest = bal * mr; 
      let principal = pi - interest;
      if (principal > bal) principal = bal;
      bal -= principal;
      const homeCarry = homeVal * hC / 12;
      const buyerMonthly = pi + homeCarry; 
      const yearIdx = Math.floor((m - 1) / 12);
      const rentMonthly = r0 * Math.pow(1 + rI, yearIdx);
      totalRent += rentMonthly; totalBuyOut += buyerMonthly;

      const diff = buyerMonthly - rentMonthly;
      if (diff > 0) renterPort += diff; 
      else buyerSide += (-diff); 
      renterPort *= (1 + imr); buyerSide *= (1 + imr);

      const buyEquityNet = homeVal * (1 - sC) - bal;
      buyNW.push(buyEquityNet + buyerSide);
      rentNW.push(renterPort);
    }

    const buyFinal = buyNW[buyNW.length - 1], rentFinal = rentNW[rentNW.length - 1];
    const buyWins = buyFinal >= rentFinal;
    const gap = Math.abs(buyFinal - rentFinal);

    let crossover = -1;
    for (let m = 1; m < buyNW.length; m++) {
      if (buyNW[m] >= rentNW[m]) { crossover = m; break; }
    }

    setResults({
      buyFinal, rentFinal, buyWins, gap, crossover, totalRent, totalBuyOut, buyNW, rentNW, years: y
    });
  };

  useEffect(() => {
    handleCalc();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const drawChart = (cv: HTMLCanvasElement, r: number[], b: number[]) => {
    const dpr = window.devicePixelRatio || 1;
    const W = 640, H = 300, pad = { l: 64, r: 14, t: 14, b: 30 };
    cv.width = W * dpr; cv.height = H * dpr; cv.style.height = H + 'px';
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    const n = Math.max(r.length, b.length);
    const all = r.concat(b); const maxV = Math.max(...all, 1); const minV = Math.min(...all, 0);
    const X = (i: number) => pad.l + (i / (n - 1)) * (W - pad.l - pad.r);
    const Y = (v: number) => pad.t + (1 - (v - minV) / (maxV - minV)) * (H - pad.t - pad.b);
    ctx.strokeStyle = '#e7dfcd'; ctx.fillStyle = '#9c947f'; ctx.font = '11px "Hanken Grotesk"'; ctx.lineWidth = 1;
    for (let g = 0; g <= 4; g++) {
      const v = minV + (maxV - minV) * g / 4, y = Y(v);
      ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(W - pad.r, y); ctx.stroke();
      ctx.fillText('$' + Math.round(v / 1000) + 'k', 8, y + 4);
    }
    const months = n - 1;
    for (let m = 0; m <= months; m += 12) { const x = X(m); ctx.fillText((m / 12) + 'y', x - 6, H - 10); }
    const line = (d: number[], c: string) => {
      ctx.strokeStyle = c; ctx.lineWidth = 2.6; ctx.lineJoin = 'round'; ctx.beginPath();
      d.forEach((v, i) => { const x = X(i), y = Y(v); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
      ctx.stroke(); ctx.fillStyle = c; ctx.beginPath(); ctx.arc(X(d.length - 1), Y(d[d.length - 1]), 3.5, 0, 7); ctx.fill();
    };
    line(r, '#9a6a2f'); // rent
    line(b, '#0b6b53'); // buy
  };

  useEffect(() => {
    if (results && !results.error && canvasRef.current) {
      drawChart(canvasRef.current, results.rentNW, results.buyNW);
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
          <div className="calc-eyebrow">Housing Decision</div>
          <h1>Rent vs <em style={{ color: '#0b6b53' }}>Buy</em> Calculator</h1>
          <p className="calc-lede">Compare the true long-term cost of renting versus buying — including appreciation, the investment return on your down payment, taxes and selling costs — and see exactly when buying pulls ahead.</p>
        </section>

        <div className="ad-slot" data-ad="top">Ad · Leaderboard 728×90</div>

        <div className="calc-grid">
          <div className="calc-card">
            <h2>Your situation</h2>
            <div className="sub">Start with the basics — adjust the assumptions below if you like.</div>
            <label className="field" style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: 'var(--muted)', fontWeight: 600, marginBottom: '14px' }}>
              Home price ($)
              <input type="number" value={price} step="5000" onChange={e => setPrice(e.target.value)} style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: '15px', padding: '11px', borderRadius: '9px', border: '1px solid var(--line)', width: '100%' }} />
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '13px' }}>
              <label className="field" style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: 'var(--muted)', fontWeight: 600, marginBottom: '14px' }}>
                Down payment (%)
                <input type="number" value={down} step="1" onChange={e => setDown(e.target.value)} style={{ padding: '11px', borderRadius: '9px', border: '1px solid var(--line)', width: '100%' }} />
              </label>
              <label className="field" style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: 'var(--muted)', fontWeight: 600, marginBottom: '14px' }}>
                Mortgage rate (%)
                <input type="number" value={rate} step="0.05" onChange={e => setRate(e.target.value)} style={{ padding: '11px', borderRadius: '9px', border: '1px solid var(--line)', width: '100%' }} />
              </label>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '13px' }}>
              <label className="field" style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: 'var(--muted)', fontWeight: 600, marginBottom: '14px' }}>
                Monthly rent ($)
                <input type="number" value={rent} step="50" onChange={e => setRent(e.target.value)} style={{ padding: '11px', borderRadius: '9px', border: '1px solid var(--line)', width: '100%' }} />
              </label>
              <label className="field" style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: 'var(--muted)', fontWeight: 600, marginBottom: '14px' }}>
                Years you&apos;ll stay
                <input type="number" value={years} step="1" onChange={e => setYears(e.target.value)} style={{ padding: '11px', borderRadius: '9px', border: '1px solid var(--line)', width: '100%' }} />
              </label>
            </div>
            <details style={{ margin: '4px 0 10px', borderTop: '1px solid var(--line)', paddingTop: '12px' }}>
              <summary style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--muted)', cursor: 'pointer', letterSpacing: '.04em', textTransform: 'uppercase' }}>Assumptions ▾</summary>
              <div style={{ marginTop: '14px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '13px' }}>
                  <label className="field" style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: 'var(--muted)', fontWeight: 600, marginBottom: '14px' }}>Home appreciation (%/yr)<input type="number" value={appr} step="0.5" onChange={e => setAppr(e.target.value)} style={{ padding: '11px', borderRadius: '9px', border: '1px solid var(--line)', width: '100%' }} /></label>
                  <label className="field" style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: 'var(--muted)', fontWeight: 600, marginBottom: '14px' }}>Rent increase (%/yr)<input type="number" value={rentInc} step="0.5" onChange={e => setRentInc(e.target.value)} style={{ padding: '11px', borderRadius: '9px', border: '1px solid var(--line)', width: '100%' }} /></label>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '13px' }}>
                  <label className="field" style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: 'var(--muted)', fontWeight: 600, marginBottom: '14px' }}>Investment return (%/yr)<input type="number" value={invRet} step="0.5" onChange={e => setInvRet(e.target.value)} style={{ padding: '11px', borderRadius: '9px', border: '1px solid var(--line)', width: '100%' }} /></label>
                  <label className="field" style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: 'var(--muted)', fontWeight: 600, marginBottom: '14px' }}>Yearly home costs (%)<input type="number" value={homeCost} step="0.1" onChange={e => setHomeCost(e.target.value)} style={{ padding: '11px', borderRadius: '9px', border: '1px solid var(--line)', width: '100%' }} /></label>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '13px' }}>
                  <label className="field" style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: 'var(--muted)', fontWeight: 600, marginBottom: '14px' }}>Buy closing costs (%)<input type="number" value={buyCost} step="0.5" onChange={e => setBuyCost(e.target.value)} style={{ padding: '11px', borderRadius: '9px', border: '1px solid var(--line)', width: '100%' }} /></label>
                  <label className="field" style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: 'var(--muted)', fontWeight: 600, marginBottom: '14px' }}>Selling costs (%)<input type="number" value={sellCost} step="0.5" onChange={e => setSellCost(e.target.value)} style={{ padding: '11px', borderRadius: '9px', border: '1px solid var(--line)', width: '100%' }} /></label>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--muted)' }}>Yearly home costs = property tax + insurance + maintenance.</p>
              </div>
            </details>
            <button className="calc-btn" onClick={handleCalc}>Compare rent vs buy →</button>
          </div>
          <div id="results">
            {!results ? (
              <div className="calc-card"><div className="placeholder">Calculating...</div></div>
            ) : results.error ? (
              <div className="calc-card"><div className="placeholder">{results.error}</div></div>
            ) : (
              <>
                <div className="verdict" style={{ borderColor: results.buyWins ? '#0b6b53' : '#9a6a2f' }}>
                  <h3 style={{ textTransform: 'uppercase', color: 'var(--muted)', fontSize: '15px', fontWeight: 600 }}>The verdict</h3>
                  {results.buyWins ? (
                    <>
                      <div className="big" style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(23px, 3.6vw, 31px)', fontWeight: 600 }}>
                        Over {results.years} years, <b>buying</b> leaves you {usd(results.gap)} richer.
                      </div>
                      <p>
                        {results.crossover > 0 ? `Buying pulls ahead at about ${(results.crossover / 12).toFixed(1)} years. ` : ''}
                        This compares ending net worth, giving the renter full credit for investing the down payment.
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="big" style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(23px, 3.6vw, 31px)', fontWeight: 600 }}>
                        Over {results.years} years, <b>renting</b> leaves you {usd(results.gap)} richer.
                      </div>
                      <p>
                        {results.crossover > 0 
                          ? `Buying would only pull ahead after about ${(results.crossover / 12).toFixed(1)} years — longer than you plan to stay. ` 
                          : `Buying never pulls ahead within your horizon. `}
                        You&apos;d come out ahead investing the difference.
                      </p>
                    </>
                  )}
                </div>
                <div className="compare" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
                  <div className="strat" style={{ border: '1px solid var(--line)', borderRadius: '13px', padding: '18px', background: '#fff', borderTop: '3px solid #9a6a2f' }}>
                    <div className="name" style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: '17px', color: '#9a6a2f' }}>Rent</div>
                    <div className="tag" style={{ fontSize: '11.5px', color: 'var(--muted)', marginBottom: '14px' }}>+ invest the difference</div>
                    <div className="metric" style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px dashed var(--line)', fontSize: '13.5px' }}><span className="k" style={{ color: 'var(--muted)' }}>Net worth after {results.years}y</span><span className="val" style={{ fontWeight: 700, fontSize: '16px' }}>{usd(results.rentFinal)}</span></div>
                    <div className="metric" style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', fontSize: '13.5px' }}><span className="k" style={{ color: 'var(--muted)' }}>Total rent paid</span><span className="val" style={{ fontWeight: 700, fontSize: '16px' }}>{usd(results.totalRent)}</span></div>
                  </div>
                  <div className="strat" style={{ border: '1px solid var(--line)', borderRadius: '13px', padding: '18px', background: '#fff', borderTop: '3px solid #0b6b53' }}>
                    <div className="name" style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: '17px', color: '#0b6b53' }}>Buy</div>
                    <div className="tag" style={{ fontSize: '11.5px', color: 'var(--muted)', marginBottom: '14px' }}>{down}% down · {rate}%</div>
                    <div className="metric" style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px dashed var(--line)', fontSize: '13.5px' }}><span className="k" style={{ color: 'var(--muted)' }}>Net worth after {results.years}y</span><span className="val" style={{ fontWeight: 700, fontSize: '16px' }}>{usd(results.buyFinal)}</span></div>
                    <div className="metric" style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', fontSize: '13.5px' }}><span className="k" style={{ color: 'var(--muted)' }}>Total housing paid</span><span className="val" style={{ fontWeight: 700, fontSize: '16px' }}>{usd(results.totalBuyOut)}</span></div>
                  </div>
                </div>
                <div className="calc-card chart-card">
                  <h2 style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: '20px', margin: '0 0 4px 0' }}>Net worth over time</h2>
                  <div className="sub" style={{ fontSize: '13.5px', color: 'var(--muted)', marginBottom: '18px' }}>What each path is worth (home equity net of selling costs, plus investments).</div>
                  <canvas ref={canvasRef} id="chart" width="640" height="300" style={{ width: '100%', height: 'auto', display: 'block' }}></canvas>
                  <div className="legend" style={{ display: 'flex', gap: '18px', justifyContent: 'center', marginTop: '10px', fontSize: '12.5px', color: 'var(--muted)' }}>
                    <span><i style={{ display: 'inline-block', width: '14px', height: '3px', borderRadius: '2px', verticalAlign: 'middle', marginRight: '6px', background: '#9a6a2f' }}></i>Rent &amp; invest</span>
                    <span><i style={{ display: 'inline-block', width: '14px', height: '3px', borderRadius: '2px', verticalAlign: 'middle', marginRight: '6px', background: '#0b6b53' }}></i>Buy</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="ad-slot" data-ad="mid">Ad · In-content Responsive</div>

        <article className="calc-content">
          <h2>How this rent vs buy comparison works</h2>
          <p>A fair comparison can&apos;t just stack rent against a mortgage payment — that ignores two big things. First, a buyer builds <strong>equity</strong> and benefits from <strong>appreciation</strong>, but pays large upfront and selling costs. Second, a renter can <strong>invest</strong> the money they didn&apos;t sink into a down payment. This calculator gives both paths the same budget, lets the renter invest every dollar of difference, and then compares the <strong>net worth</strong> each path leaves you with at the end.</p>
          
          <h3>Why &quot;how long you&apos;ll stay&quot; is the biggest lever</h3>
          <p>Buying carries heavy one-time costs (closing on the way in, ~6% to sell on the way out). Those costs are spread over however long you own. Stay two years and they crush the math; stay ten and appreciation plus equity usually win. That&apos;s why the single most important input is your time horizon.</p>
          
          <h2>When renting tends to win</h2>
          <ul>
            <li>You&apos;ll move within a few years.</li>
            <li>Rents are low relative to home prices in your area.</li>
            <li>You&apos;ll genuinely invest the down payment instead of spending it.</li>
          </ul>
          
          <h2>When buying tends to win</h2>
          <ul>
            <li>You&apos;ll stay well past the break-even point.</li>
            <li>Your area appreciates steadily.</li>
            <li>Buying isn&apos;t dramatically more expensive per month than renting.</li>
          </ul>
          
          <h2>Frequently asked questions</h2>
          <div className="calc-faq">
            <details><summary>Is my data saved?</summary><p>No. The entire comparison runs locally in your browser. Nothing is stored or sent anywhere.</p></details>
            <details><summary>What investment return should I use?</summary><p>A common long-run assumption for a diversified portfolio is 5–7% before inflation. Use a figure you&apos;d realistically achieve and stick to.</p></details>
            <details><summary>Does this include tax deductions?</summary><p>No — mortgage interest deductions vary widely by situation and have become less impactful for most filers. The model stays conservative and excludes them.</p></details>
          </div>
          <p className="disclaimer">For educational and estimation purposes only; not financial advice. Results are highly sensitive to the assumptions you enter and cannot predict real markets. Consult a qualified professional.</p>
        </article>

        <div className="ad-slot" data-ad="bottom">Ad · Responsive</div>

        <CalculatorFooter />
      </div>
    </div>
  );
}
