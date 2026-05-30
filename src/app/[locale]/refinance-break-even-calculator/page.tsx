"use client";

import React, { useState, useEffect } from 'react';
import '../calculator.css';
import { useAds } from '@/shared/hooks/use-ads';
import { CalculatorFooter } from '@/shared/components/layout/CalculatorFooter';

export default function RefinanceBreakEvenCalculator() {
  useAds();

  const [bal, setBal] = useState<number | string>(280000);
  const [curRate, setCurRate] = useState<number | string>(7.1);
  const [curYears, setCurYears] = useState<number | string>(27);
  const [newRate, setNewRate] = useState<number | string>(5.75);
  const [newYears, setNewYears] = useState<number | string>(30);
  const [costs, setCosts] = useState<number | string>(6500);
  
  const [results, setResults] = useState<any>(null);

  const usd = (n: number) => '$' + Math.round(n).toLocaleString('en-US');
  const dur = (m: number) => {
    const y = Math.floor(m / 12), mo = Math.round(m % 12);
    return (y ? y + 'y ' : '') + (mo ? mo + 'mo' : (y ? '' : '0mo'));
  };
  const pmt = (P: number, r: number, n: number) => {
    if (r === 0) return P / n;
    return P * r / (1 - Math.pow(1 + r, -n));
  };

  const handleCalc = () => {
    const b = parseFloat(String(bal)) || 0;
    const cR = parseFloat(String(curRate)) || 0;
    const cY = parseFloat(String(curYears)) || 0;
    const nR = parseFloat(String(newRate)) || 0;
    const nY = parseFloat(String(newYears)) || 0;
    const c = parseFloat(String(costs)) || 0;

    if (b <= 0 || cY <= 0 || nY <= 0) {
      setResults({ error: 'Fill in your loan details to begin.' });
      return;
    }

    const curPay = pmt(b, cR / 100 / 12, cY * 12);
    const newPay = pmt(b, nR / 100 / 12, nY * 12);
    const curInterest = curPay * cY * 12 - b;
    const newInterest = newPay * nY * 12 - b;
    const monthlySave = curPay - newPay;
    const lifetimeIntDiff = curInterest - newInterest; 
    const be = monthlySave > 0 ? c / monthlySave : 0;

    setResults({
      curPay, newPay, curInterest, newInterest, monthlySave, lifetimeIntDiff, be, costs: c
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
            <span className="dot" style={{ background: 'linear-gradient(135deg, #9a6a2f, #0b6b53)' }}></span> PayoffLab
          </div>
        </header>

        <section className="calc-hero">
          <div className="calc-eyebrow">Refinance Planner</div>
          <h1>Refinance <em style={{ color: '#0b6b53' }}>Break-Even</em> Calculator</h1>
          <p className="calc-lede">Find out if refinancing is actually worth it. See your new monthly payment, how much you save each month, and exactly how many months it takes to earn back your closing costs.</p>
        </section>

        <div className="ad-slot" data-ad="top">Ad · Leaderboard 728×90</div>

        <div className="calc-grid">
          <div className="calc-card">
            <h2>Your numbers</h2>
            <div className="sub">Enter your current loan and the new loan you&apos;re considering.</div>
            
            <div style={{ fontSize: '11px', letterSpacing: '.1em', textTransform: 'uppercase', color: '#9a6a2f', fontWeight: 700, margin: '6px 0 12px' }}>Current loan</div>
            <label className="field" style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: 'var(--muted)', fontWeight: 600, marginBottom: '14px' }}>
              Remaining balance ($)
              <input type="number" value={bal} step="1000" onChange={e => setBal(e.target.value)} style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: '15px', padding: '11px', borderRadius: '9px', border: '1px solid var(--line)', width: '100%' }} />
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '13px' }}>
              <label className="field" style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: 'var(--muted)', fontWeight: 600, marginBottom: '14px' }}>
                Current rate (%)
                <input type="number" value={curRate} step="0.05" onChange={e => setCurRate(e.target.value)} style={{ padding: '11px', borderRadius: '9px', border: '1px solid var(--line)', width: '100%' }} />
              </label>
              <label className="field" style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: 'var(--muted)', fontWeight: 600, marginBottom: '14px' }}>
                Years left
                <input type="number" value={curYears} step="1" onChange={e => setCurYears(e.target.value)} style={{ padding: '11px', borderRadius: '9px', border: '1px solid var(--line)', width: '100%' }} />
              </label>
            </div>

            <div style={{ fontSize: '11px', letterSpacing: '.1em', textTransform: 'uppercase', color: '#0b6b53', fontWeight: 700, margin: '6px 0 12px' }}>New loan</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '13px' }}>
              <label className="field" style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: 'var(--muted)', fontWeight: 600, marginBottom: '14px' }}>
                New rate (%)
                <input type="number" value={newRate} step="0.05" onChange={e => setNewRate(e.target.value)} style={{ padding: '11px', borderRadius: '9px', border: '1px solid var(--line)', width: '100%' }} />
              </label>
              <label className="field" style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: 'var(--muted)', fontWeight: 600, marginBottom: '14px' }}>
                New term (years)
                <input type="number" value={newYears} step="1" onChange={e => setNewYears(e.target.value)} style={{ padding: '11px', borderRadius: '9px', border: '1px solid var(--line)', width: '100%' }} />
              </label>
            </div>
            <label className="field" style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: 'var(--muted)', fontWeight: 600, marginBottom: '14px' }}>
              Closing costs ($)
              <input type="number" value={costs} step="100" onChange={e => setCosts(e.target.value)} style={{ padding: '11px', borderRadius: '9px', border: '1px solid var(--line)', width: '100%' }} />
            </label>
            <button className="calc-btn" onClick={handleCalc}>Check break-even →</button>
          </div>
          <div id="results">
            {!results ? (
              <div className="calc-card"><div className="placeholder">Calculating...</div></div>
            ) : results.error ? (
              <div className="calc-card"><div className="placeholder">{results.error}</div></div>
            ) : (
              <>
                <div className="verdict" style={{ borderColor: results.monthlySave <= 0 ? '#9a6a2f' : '#0b6b53' }}>
                  <h3 style={{ textTransform: 'uppercase', color: 'var(--muted)', fontSize: '15px', fontWeight: 600 }}>The verdict</h3>
                  {results.monthlySave <= 0 ? (
                    <>
                      <div className="big" style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(23px, 3.6vw, 31px)', fontWeight: 600 }}>
                        The new loan <b style={{ color: '#9a6a2f' }}>doesn&apos;t lower</b> your monthly payment.
                      </div>
                      <p>Your payment would change by {usd(results.monthlySave)}/mo. Refinancing only makes sense here if you&apos;re shortening the term to save interest.</p>
                    </>
                  ) : (
                    <>
                      <div className="big" style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(23px, 3.6vw, 31px)', fontWeight: 600 }}>
                        You break even in <b style={{ color: '#0b6b53' }}>{dur(results.be)}</b>.
                      </div>
                      <p>
                        You&apos;d save <b>{usd(results.monthlySave)}/mo</b>. After {Math.ceil(results.be)} months your savings exceed the {usd(results.costs)} in closing costs.
                        {results.lifetimeIntDiff < 0 
                          ? <span> Note: the longer term means about {usd(-results.lifetimeIntDiff)} <b>more</b> total interest — good for cash flow, not for total cost.</span> 
                          : <span> Over the full loan you&apos;d also pay about {usd(results.lifetimeIntDiff)} less interest.</span>}
                      </p>
                    </>
                  )}
                </div>
                <div className="compare" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
                  <div className="strat" style={{ border: '1px solid var(--line)', borderRadius: '13px', padding: '18px', background: '#fff', borderTop: '3px solid #9a6a2f' }}>
                    <div className="name" style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: '17px', color: '#9a6a2f' }}>Current loan</div>
                    <div className="tag" style={{ fontSize: '11.5px', color: 'var(--muted)', marginBottom: '14px' }}>{curRate}% · {curYears}y left</div>
                    <div className="metric" style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px dashed var(--line)', fontSize: '13.5px' }}><span className="k" style={{ color: 'var(--muted)' }}>Monthly payment</span><span className="val" style={{ fontWeight: 700, fontSize: '16px' }}>{usd(results.curPay)}</span></div>
                    <div className="metric" style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', fontSize: '13.5px' }}><span className="k" style={{ color: 'var(--muted)' }}>Interest left to pay</span><span className="val" style={{ fontWeight: 700, fontSize: '16px' }}>{usd(results.curInterest)}</span></div>
                  </div>
                  <div className="strat" style={{ border: '1px solid var(--line)', borderRadius: '13px', padding: '18px', background: '#fff', borderTop: '3px solid #0b6b53' }}>
                    <div className="name" style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: '17px', color: '#0b6b53' }}>After refinance</div>
                    <div className="tag" style={{ fontSize: '11.5px', color: 'var(--muted)', marginBottom: '14px' }}>{newRate}% · {newYears}y</div>
                    <div className="metric" style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px dashed var(--line)', fontSize: '13.5px' }}><span className="k" style={{ color: 'var(--muted)' }}>Monthly payment</span><span className="val" style={{ fontWeight: 700, fontSize: '16px' }}>{usd(results.newPay)}</span></div>
                    <div className="metric" style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', fontSize: '13.5px' }}><span className="k" style={{ color: 'var(--muted)' }}>Total interest</span><span className="val" style={{ fontWeight: 700, fontSize: '16px' }}>{usd(results.newInterest)}</span></div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="ad-slot" data-ad="mid">Ad · In-content Responsive</div>

        <article className="calc-content">
          <h2>What &quot;break-even&quot; really means</h2>
          <p>Refinancing isn&apos;t free — you pay <strong>closing costs</strong> (often 2–5% of the loan) to get the new rate. The break-even point is how long it takes for your lower monthly payment to add up to those costs. Before break-even, you&apos;re behind. After it, the refinance is pure savings — as long as you still own the home.</p>
          
          <h3>The hidden trap: resetting the term</h3>
          <p>If you refinance a loan you&apos;ve been paying for 5 years into a fresh 30-year loan, your monthly payment drops, but you&apos;ve added 5 years of payments back. A lower rate can still mean <em>more total interest</em> over the life of the loan. That&apos;s why the calculator shows both your monthly savings <strong>and</strong> the lifetime interest for each option — so you see the full picture.</p>
          
          <h2>When refinancing makes sense</h2>
          <ul>
            <li>You&apos;ll stay in the home well past the break-even point.</li>
            <li>The rate drop is meaningful (often 0.75%+ on a large balance).</li>
            <li>You&apos;re not dramatically extending your timeline, or you&apos;re fine with it for the lower payment.</li>
          </ul>
          
          <h2>Frequently asked questions</h2>
          <div className="calc-faq">
            <details><summary>Is my data saved?</summary><p>No. The calculation runs entirely in your browser. Nothing is stored or transmitted.</p></details>
            <details><summary>What&apos;s included in closing costs?</summary><p>Typically lender fees, appraisal, title, and recording fees. Ask your lender for a full estimate and enter the total.</p></details>
            <details><summary>Can I shorten my term when I refinance?</summary><p>Yes — refinancing into a shorter term (e.g. 30 → 15 years) usually means a higher monthly payment but far less total interest. Enter the shorter term to compare.</p></details>
          </div>
          <p className="disclaimer">For educational and estimation purposes only; not financial advice. Estimates assume fixed rates and consistent payments and exclude taxes, insurance, and PMI. Consult a qualified professional.</p>
        </article>

        <div className="ad-slot" data-ad="bottom">Ad · Responsive</div>

        <CalculatorFooter />
      </div>
    </div>
  );
}
