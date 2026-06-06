"use client";

import React, { useState, useEffect, useRef } from 'react';
import '../calculator.css';
import { useAds } from '@/shared/hooks/use-ads';
import { CalculatorFooter } from '@/shared/components/layout/CalculatorFooter';

export default function FireCalculator() {
  useAds();

  const [age, setAge] = useState<number | string>(30);
  const [portfolio, setPortfolio] = useState<number | string>(45000);
  const [income, setIncome] = useState<number | string>(85000);
  const [spend, setSpend] = useState<number | string>(48000);
  const [ret, setRet] = useState<number | string>(7);
  const [swr, setSwr] = useState<number | string>(4);
  const [inf, setInf] = useState<number | string>(3);

  const [results, setResults] = useState<any>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const usd = (n: number) => '$' + Math.round(n).toLocaleString('en-US');

  const handleCalc = () => {
    const startAge = parseFloat(String(age)) || 0;
    const port = parseFloat(String(portfolio)) || 0;
    const inc = parseFloat(String(income)) || 0;
    const sp = parseFloat(String(spend)) || 0;
    const retRate = (parseFloat(String(ret)) || 0) / 100;
    const swrRate = (parseFloat(String(swr)) || 0) / 100;
    const infRate = (parseFloat(String(inf)) || 0) / 100;

    if (inc <= 0 || sp <= 0) {
      setResults({ error: 'Enter your income and spending to begin.' });
      return;
    }

    const annualSavings = inc - sp;
    const fireNumber = sp / swrRate;
    const savingsRate = annualSavings / inc;

    if (annualSavings <= 0) {
      setResults({ error: "⚠ With a negative or zero savings rate, FIRE isn't reachable. Reduce spending or increase income." });
      return;
    }

    const portHistory: number[] = [port];
    const labels: number[] = [startAge];
    let p = port;
    let fireAgeVal: number | null = null;
    let fireYearVal: number | null = null;

    for (let y = 1; y <= 70; y++) {
      p = p * (1 + retRate) + annualSavings;
      portHistory.push(p);
      labels.push(startAge + y);
      if (fireAgeVal === null && p >= fireNumber) {
        fireAgeVal = startAge + y;
        fireYearVal = y;
      }
    }

    if (fireAgeVal === null) {
      setResults({ error: "FIRE target not reached within 70 years. Try increasing savings or expected returns." });
      return;
    }

    const fireDate = new Date();
    fireDate.setFullYear(fireDate.getFullYear() + (fireYearVal || 0));
    const fireDateStr = fireDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

    setResults({
      fireAge: fireAgeVal,
      fireYear: fireYearVal,
      fireDateStr,
      fireNumber,
      savingsRate,
      annualSavings,
      portHistory,
      labels,
      fireIdx: fireAgeVal - startAge,
      swrRate
    });
  };

  const drawChart = (cv: HTMLCanvasElement, hist: number[], fireN: number, labels: number[], fireIdx: number) => {
    const dpr = window.devicePixelRatio || 1;
    const W = 640, H = 300, pad = { l: 64, r: 14, t: 14, b: 30 };
    cv.width = W * dpr; cv.height = H * dpr; cv.style.height = H + 'px';
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    const displayN = Math.min(hist.length, fireIdx + 11);
    const data = hist.slice(0, displayN);
    const maxV = Math.max(...data, fireN) * 1.05 || 1;
    const X = (i: number) => pad.l + (i / (displayN - 1 || 1)) * (W - pad.l - pad.r);
    const Y = (v: number) => pad.t + (1 - v / maxV) * (H - pad.t - pad.b);

    // grid
    ctx.strokeStyle = '#e7dfcd'; ctx.fillStyle = '#9c947f'; ctx.font = '11px "Hanken Grotesk"'; ctx.lineWidth = 1;
    for (let g = 0; g <= 4; g++) {
      const v = maxV * g / 4, y = Y(v);
      ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(W - pad.r, y); ctx.stroke();
      ctx.fillText('$' + Math.round(v / 1000) + 'k', 8, y + 4);
    }
    for (let i = 0; i < displayN; i += 5) {
      ctx.fillText('' + labels[i], X(i) - 6, H - 10);
    }

    // SWR line (dashed)
    ctx.setLineDash([6, 4]); ctx.strokeStyle = '#0b6b53'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(pad.l, Y(fireN)); ctx.lineTo(W - pad.r, Y(fireN)); ctx.stroke();
    ctx.setLineDash([]);

    // portfolio line
    ctx.strokeStyle = '#b45309'; ctx.lineWidth = 2.8; ctx.lineJoin = 'round';
    ctx.beginPath();
    data.forEach((v, i) => {
      const x = X(i), y = Y(v);
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    });
    ctx.stroke();

    // marker
    if (fireIdx < displayN) {
      ctx.fillStyle = '#b45309'; ctx.beginPath(); ctx.arc(X(fireIdx), Y(data[fireIdx]), 5, 0, 7); ctx.fill();
      ctx.fillStyle = '#b45309'; ctx.font = 'bold 12px "Hanken Grotesk"';
      ctx.fillText('FIRE ✓', X(fireIdx) + 8, Y(data[fireIdx]) + 4);
    }
  };

  useEffect(() => {
    handleCalc();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (results && !results.error && canvasRef.current) {
      drawChart(canvasRef.current, results.portHistory, results.fireNumber, results.labels, results.fireIdx);
    }
  }, [results]);

  return (
    <div className="calc-container">
      <div className="calc-wrap">
        <header className="calc-header">
          <div className="calc-brand">
            <span className="dot" style={{ background: 'linear-gradient(135deg, var(--fire, #b45309), var(--green, #0b6b53))' }}></span> PayoffLab
          </div>
        </header>

        <section className="calc-hero">
          <div className="calc-eyebrow">Financial Independence Planner</div>
          <h1><em>FIRE</em> Calculator</h1>
          <p className="calc-lede">Find your FIRE number, your financial independence date, and see exactly how your portfolio grows year by year until you can retire early — or just retire comfortably.</p>
        </section>

        <div className="ad-slot" data-ad="top">Ad · Leaderboard 728×90</div>

        <div className="calc-grid">
          <div className="calc-card">
            <h2>Your numbers</h2>
            <div className="sub">Enter your current situation and we&apos;ll find your FIRE date.</div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '13px' }}>
              <label className="field" style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: 'var(--muted)', fontWeight: 600, marginBottom: '14px' }}>
                Current age
                <input type="number" min="18" max="80" value={age} onChange={e => setAge(e.target.value)} />
              </label>
              <label className="field" style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: 'var(--muted)', fontWeight: 600, marginBottom: '14px' }}>
                Current portfolio ($)
                <input type="number" value={portfolio} step="1000" onChange={e => setPortfolio(e.target.value)} />
              </label>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '13px' }}>
              <label className="field" style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: 'var(--muted)', fontWeight: 600, marginBottom: '14px' }}>
                Annual income ($)
                <input type="number" value={income} step="1000" onChange={e => setIncome(e.target.value)} />
              </label>
              <label className="field" style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: 'var(--muted)', fontWeight: 600, marginBottom: '14px' }}>
                Annual spending ($)
                <input type="number" value={spend} step="500" onChange={e => setSpend(e.target.value)} />
              </label>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '13px' }}>
              <label className="field" style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: 'var(--muted)', fontWeight: 600, marginBottom: '14px' }}>
                Investment return (%/yr)
                <input type="number" value={ret} step="0.5" onChange={e => setRet(e.target.value)} />
              </label>
              <label className="field" style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: 'var(--muted)', fontWeight: 600, marginBottom: '14px' }}>
                Safe withdrawal rate (%)
                <input type="number" value={swr} step="0.1" onChange={e => setSwr(e.target.value)} />
              </label>
            </div>

            <label className="field" style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: 'var(--muted)', fontWeight: 600, marginBottom: '14px' }}>
              Expected annual inflation (%)
              <input type="number" value={inf} step="0.1" onChange={e => setInf(e.target.value)} />
            </label>

            <button className="calc-btn" onClick={handleCalc}>Find my FIRE date →</button>
          </div>

          <div id="results">
            {!results ? (
              <div className="calc-card"><div className="placeholder">Calculating...</div></div>
            ) : results.error ? (
              <div className="calc-card"><div className="placeholder">{results.error}</div></div>
            ) : (
              <>
                <div className="verdict" style={{ borderLeft: '5px solid var(--fire, #b45309)' }}>
                  <style jsx>{`
                    .verdict:before {
                      background: var(--fire, #b45309) !important;
                    }
                  `}</style>
                  <h3>Your FIRE date</h3>
                  <div className="big">
                    Age <b>{results.fireAge}</b> — {results.fireDateStr}
                  </div>
                  <p>
                    In {results.fireYear} year{results.fireYear !== 1 ? 's' : ''} your portfolio reaches your FIRE number of <strong>{usd(results.fireNumber)}</strong> at a {(results.swrRate * 100).toFixed(1)}% withdrawal rate.
                  </p>
                </div>

                <div className="stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '16px' }}>
                  <div className="stat hi" style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: '11px', padding: '15px' }}>
                    <div className="lbl" style={{ fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--muted)', fontWeight: 700, marginBottom: '7px' }}>FIRE number</div>
                    <div className="val" style={{ color: 'var(--fire, #b45309)', fontFamily: "'Fraunces', serif", fontSize: '20px', fontWeight: 600 }}>{usd(results.fireNumber)}</div>
                  </div>
                  <div className="stat" style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: '11px', padding: '15px' }}>
                    <div className="lbl" style={{ fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--muted)', fontWeight: 700, marginBottom: '7px' }}>Savings rate</div>
                    <div className="val" style={{ fontFamily: "'Fraunces', serif", fontSize: '20px', fontWeight: 600 }}>{(results.savingsRate * 100).toFixed(1)}%</div>
                  </div>
                  <div className="stat" style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: '11px', padding: '15px' }}>
                    <div className="lbl" style={{ fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--muted)', fontWeight: 700, marginBottom: '7px' }}>Annual savings</div>
                    <div className="val" style={{ fontFamily: "'Fraunces', serif", fontSize: '20px', fontWeight: 600 }}>{usd(results.annualSavings)}</div>
                  </div>
                </div>

                <div className="calc-card chart-card">
                  <h2 style={{ marginTop: 0 }}>Portfolio growth</h2>
                  <div className="sub">Year-by-year until FIRE and beyond.</div>
                  <canvas ref={canvasRef} id="chart" width="640" height="300" style={{ width: '100%', display: 'block' }}></canvas>
                  <div className="legend" style={{ display: 'flex', gap: '18px', justifyContent: 'center', marginTop: '10px', fontSize: '12.5px', color: 'var(--muted)', flexWrap: 'wrap' }}>
                    <span><i style={{ display: 'inline-block', width: '14px', height: '3px', borderRadius: '2px', verticalAlign: 'middle', marginRight: '6px', background: 'var(--fire, #b45309)' }}></i>Portfolio value</span>
                    <span><i style={{ display: 'inline-block', width: '14px', height: '0', borderTop: '2px dashed var(--green, #0b6b53)', verticalAlign: 'middle', marginRight: '6px' }}></i>FIRE number</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="ad-slot" data-ad="mid">Ad · In-content Responsive</div>

        <article className="calc-content">
          <h2>What is FIRE?</h2>
          <p>FIRE stands for <strong>Financial Independence, Retire Early</strong>. The goal is to save and invest aggressively enough that your portfolio generates enough passive income to cover your living expenses — forever. At that point, work becomes optional.</p>
          
          <h3>The 4% rule and your FIRE number</h3>
          <p>The cornerstone of FIRE planning is the <strong>4% safe withdrawal rate</strong>, derived from the Trinity Study. It says a portfolio diversified between stocks and bonds can sustain a 4% annual withdrawal for at least 30 years across most historical market scenarios. Your FIRE number is simply your annual spending divided by your withdrawal rate: if you spend $50,000/year, you need $1,250,000.</p>
          
          <h3>FIRE variants</h3>
          <ul>
            <li><strong>Lean FIRE</strong> — retire early on a very frugal budget (typically under $40k/year).</li>
            <li><strong>Fat FIRE</strong> — retire early with a comfortable or luxurious lifestyle ($80k+ /year).</li>
            <li><strong>Barista FIRE</strong> — semi-retire; cover most expenses from investments but keep a part-time job for healthcare or extras.</li>
            <li><strong>Coast FIRE</strong> — save enough that you can stop contributing and let compounding do the rest.</li>
          </ul>

          <h2>The biggest lever: savings rate</h2>
          <p>Nothing matters more than what percentage of your income you save. At a 10% savings rate, retirement is ~40 years away. At 50%, it&apos;s ~17 years. At 70%, about 8–9 years. Cutting spending matters more than chasing higher returns.</p>

          <h2>Frequently asked questions</h2>
          <div className="calc-faq">
            <details><summary>Is the 4% rule still valid in 2026?</summary><p>It&apos;s debated. Some planners suggest 3–3.5% for longer retirements (40+ years). The calculator lets you adjust the withdrawal rate — try 3.5% for a more conservative estimate.</p></details>
            <details><summary>Does this account for Social Security?</summary><p>No. If you plan to receive Social Security, your actual spending need from the portfolio is lower. Subtract your expected SS benefit from annual spending for a more accurate FIRE number.</p></details>
            <details><summary>Is my data saved?</summary><p>No. Everything runs locally in your browser. Nothing is stored or transmitted.</p></details>
          </div>
          <p className="disclaimer">For educational and estimation purposes only; not financial advice. Returns are uncertain and past performance does not guarantee future results. Consult a qualified financial professional.</p>
        </article>

        <div className="ad-slot" data-ad="bottom">Ad · Responsive</div>

        <CalculatorFooter />
      </div>
    </div>
  );
}
