"use client";

import React, { useState, useEffect, useRef } from 'react';
import '../calculator.css';
import { useAds } from '@/shared/hooks/use-ads';
import { CalculatorFooter } from '@/shared/components/layout/CalculatorFooter';

export default function EmergencyFundCalculator() {
  useAds();

  const [expenses, setExpenses] = useState<number | string>(3800);
  const [stability, setStability] = useState<number | string>(6);
  const [deps, setDeps] = useState<number | string>(0);
  const [current, setCurrent] = useState<number | string>(5000);
  const [monthly, setMonthly] = useState<number | string>(400);

  const [results, setResults] = useState<any>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const usd = (n: number) => '$' + Math.round(n).toLocaleString('en-US');

  const handleCalc = () => {
    const exp = parseFloat(String(expenses)) || 0;
    const stab = parseFloat(String(stability)) || 6;
    const dp = parseFloat(String(deps)) || 0;
    const curr = parseFloat(String(current)) || 0;
    const mon = parseFloat(String(monthly)) || 0;

    const months = stab + dp;
    const target = exp * months;
    const gap = Math.max(0, target - curr);
    const monthsToGoal = mon > 0 ? Math.ceil(gap / mon) : null;
    const progress = target > 0 ? Math.min(100, (curr / target) * 100) : 0;

    const chartData: number[] = [];
    let bal = curr;
    const iterations = Math.min(monthsToGoal || 60, 60);
    for (let m = 0; m <= iterations; m++) {
      chartData.push(bal);
      bal = Math.min(bal + mon, target);
    }

    const alreadyFunded = curr >= target;

    setResults({
      months,
      target,
      gap,
      monthsToGoal,
      progress,
      chartData,
      alreadyFunded,
      exp
    });
  };

  const drawChart = (cv: HTMLCanvasElement, data: number[], target: number) => {
    const dpr = window.devicePixelRatio || 1;
    const W = 560, H = 200, pad = { l: 56, r: 14, t: 14, b: 28 };
    cv.width = W * dpr; cv.height = H * dpr; cv.style.height = H + 'px';
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    const n = data.length;
    const maxV = target * 1.05 || 1;
    const X = (i: number) => pad.l + (i / (n - 1 || 1)) * (W - pad.l - pad.r);
    const Y = (v: number) => pad.t + (1 - v / maxV) * (H - pad.t - pad.b);

    // grid
    ctx.strokeStyle = '#e7dfcd'; ctx.fillStyle = '#9c947f'; ctx.font = '11px "Hanken Grotesk"'; ctx.lineWidth = 1;
    for (let g = 0; g <= 4; g++) {
      const v = maxV * g / 4, y = Y(v);
      ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(W - pad.r, y); ctx.stroke();
      ctx.fillText('$' + Math.round(v / 1000) + 'k', 8, y + 4);
    }
    // x axis
    for (let i = 0; i < n; i += Math.max(1, Math.floor(n / 6))) {
      ctx.fillText(i + 'mo', X(i) - 8, H - 8);
    }

    // target line (dashed)
    ctx.setLineDash([5, 4]); ctx.strokeStyle = '#0b6b53'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(pad.l, Y(target)); ctx.lineTo(W - pad.r, Y(target)); ctx.stroke();
    ctx.setLineDash([]);

    // balance line
    ctx.strokeStyle = '#b45309'; ctx.lineWidth = 2.6; ctx.lineJoin = 'round';
    ctx.beginPath();
    data.forEach((v, i) => {
      const x = X(i), y = Y(v);
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    });
    ctx.stroke();
  };

  useEffect(() => {
    handleCalc();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (results && canvasRef.current) {
      drawChart(canvasRef.current, results.chartData, results.target);
    }
  }, [results]);

  return (
    <div className="calc-container">
      <div className="calc-wrap">
        <header className="calc-header">
          <div className="calc-brand">
            <span className="dot" style={{ background: 'linear-gradient(135deg, var(--safe, #0b6b53), var(--warn, #b45309))' }}></span> PayoffLab
          </div>
        </header>

        <section className="calc-hero">
          <div className="calc-eyebrow">Financial Safety Net</div>
          <h1><em>Emergency Fund</em> Calculator</h1>
          <p className="calc-lede">Find exactly how much you need in your emergency fund based on your expenses, job stability, and household. Then see how long it takes to build it with your monthly savings.</p>
        </section>

        <div className="ad-slot" data-ad="top">Ad · Leaderboard 728×90</div>

        <div className="calc-grid">
          <div className="calc-card">
            <h2>Your situation</h2>
            <div className="sub">We&apos;ll calculate your recommended emergency fund target.</div>

            <label className="field" style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: 'var(--muted)', fontWeight: 600, marginBottom: '14px' }}>
              Monthly essential expenses ($)
              <input type="number" value={expenses} step="100" onChange={e => setExpenses(e.target.value)} />
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '13px' }}>
              <label className="field" style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: 'var(--muted)', fontWeight: 600, marginBottom: '14px' }}>
                Job stability
                <select value={stability} onChange={e => setStability(e.target.value)} style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: '15px', padding: '11px', borderRadius: '9px', border: '1px solid var(--line)', width: '100%' }}>
                  <option value="3">Stable (gov/large co)</option>
                  <option value="6">Average</option>
                  <option value="9">Variable income</option>
                  <option value="12">Self-employed / freelance</option>
                </select>
              </label>
              <label className="field" style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: 'var(--muted)', fontWeight: 600, marginBottom: '14px' }}>
                Dependents
                <select value={deps} onChange={e => setDeps(e.target.value)} style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: '15px', padding: '11px', borderRadius: '9px', border: '1px solid var(--line)', width: '100%' }}>
                  <option value="0">None</option>
                  <option value="1">1–2 dependents</option>
                  <option value="2">3+ dependents</option>
                </select>
              </label>
            </div>

            <label className="field" style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: 'var(--muted)', fontWeight: 600, marginBottom: '14px' }}>
              Current emergency fund ($)
              <input type="number" value={current} step="500" onChange={e => setCurrent(e.target.value)} />
            </label>
            <label className="field" style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: 'var(--muted)', fontWeight: 600, marginBottom: '14px' }}>
              Monthly savings toward fund ($)
              <input type="number" value={monthly} step="50" onChange={e => setMonthly(e.target.value)} />
            </label>

            <button className="calc-btn" onClick={handleCalc}>Calculate my target →</button>
          </div>

          <div id="results">
            {!results ? (
              <div className="calc-card"><div className="placeholder">Calculating...</div></div>
            ) : (
              <>
                <div className="verdict" style={{ borderLeft: '5px solid var(--safe, #0b6b53)' }}>
                  <h3>Your target</h3>
                  <div className="big">
                    <b style={{ color: 'var(--safe, #0b6b53)' }}>{usd(results.target)}</b>
                  </div>
                  <p>
                    {results.months} months of expenses for your situation.{' '}
                    {results.alreadyFunded 
                      ? '✅ You already have a fully funded emergency fund!' 
                      : `You need ${usd(results.gap)} more. ${parseFloat(String(monthly)) > 0 ? `At ${usd(parseFloat(String(monthly)))}/mo you'll be fully funded in <strong>${results.monthsToGoal} month${results.monthsToGoal !== 1 ? 's' : ''}</strong>.` : 'Set a monthly savings goal to see your timeline.'}`
                    }
                  </p>
                </div>

                <div className="tiers" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '16px' }}>
                  <div className="tier" style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: '11px', padding: '14px', textAlign: 'center' }}>
                    <div className="tn" style={{ fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--muted)', fontWeight: 700, marginBottom: '7px' }}>3 months</div>
                    <div className="tv" style={{ fontFamily: "'Fraunces', serif", fontSize: '18px', fontWeight: 600 }}>{usd(results.exp * 3)}</div>
                  </div>
                  <div className="tier" style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: '11px', padding: '14px', textAlign: 'center' }}>
                    <div className="tn" style={{ fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--muted)', fontWeight: 700, marginBottom: '7px' }}>{results.months} months (you)</div>
                    <div className="tv" style={{ color: 'var(--safe, #0b6b53)', fontFamily: "'Fraunces', serif", fontSize: '18px', fontWeight: 600 }}>{usd(results.target)}</div>
                  </div>
                  <div className="tier" style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: '11px', padding: '14px', textAlign: 'center' }}>
                    <div className="tn" style={{ fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--muted)', fontWeight: 700, marginBottom: '7px' }}>12 months</div>
                    <div className="tv" style={{ fontFamily: "'Fraunces', serif", fontSize: '18px', fontWeight: 600 }}>{usd(results.exp * 12)}</div>
                  </div>
                </div>

                <div className="calc-card">
                  <div className="progress-section" style={{ marginTop: '16px' }}>
                    <h3 style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: '17px', marginBottom: '12px', marginTop: 0 }}>Current progress</h3>
                    <div className="prog-track" style={{ height: '14px', background: 'var(--line)', borderRadius: '7px', overflow: 'hidden', marginBottom: '8px' }}>
                      <div className="prog-fill" style={{ height: '100%', borderRadius: '7px', background: 'var(--safe, #0b6b53)', width: `${results.progress.toFixed(1)}%` }}></div>
                    </div>
                    <p style={{ fontSize: '13.5px', color: 'var(--muted)', margin: 0 }}>
                      {usd(parseFloat(String(current)))} saved of {usd(results.target)} target ({results.progress.toFixed(0)}%)
                    </p>
                    <canvas ref={canvasRef} id="chart" width="560" height="200" style={{ marginTop: '18px', width: '100%', display: 'block' }}></canvas>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="ad-slot" data-ad="mid">Ad · In-content Responsive</div>

        <article className="calc-content">
          <h2>How much emergency fund do you really need?</h2>
          <p>The classic advice is <strong>3–6 months of expenses</strong>. But that range depends heavily on your situation. A salaried employee with no dependents and a stable employer is fine at 3 months. A freelancer with two kids and an irregular income should be closer to 9–12 months.</p>
          
          <h3>What counts as &quot;essential expenses&quot;?</h3>
          <p>Only the non-negotiables: rent/mortgage, utilities, groceries, minimum debt payments, insurance, transportation to work. Skip dining out, subscriptions, entertainment — those can be cut if you lose income.</p>
          
          <h3>Where to keep your emergency fund</h3>
          <ul>
            <li><strong>High-yield savings account (HYSA)</strong> — best for most people. Currently yielding 4–5% with full liquidity.</li>
            <li><strong>Money market account</strong> — similar to HYSA, slightly higher minimums.</li>
            <li>Not in stocks — markets can be down exactly when you need the money.</li>
          </ul>

          <h2>Frequently asked questions</h2>
          <div className="calc-faq">
            <details><summary>Should I invest before finishing my emergency fund?</summary><p>Capture any employer 401k match first (it&apos;s a 50–100% guaranteed return). Then prioritize the emergency fund before additional investing, so a job loss doesn&apos;t force you to sell investments at a bad time.</p></details>
            <details><summary>Is my data saved?</summary><p>No. Everything runs locally in your browser.</p></details>
          </div>
          <p className="disclaimer">For educational purposes only; not financial advice.</p>
        </article>

        <div className="ad-slot" data-ad="bottom">Ad · Responsive</div>

        <CalculatorFooter />
      </div>
    </div>
  );
}
