"use client";

import React, { useState, useEffect } from 'react';
import '../calculator.css';
import { useAds } from '@/shared/hooks/use-ads';
import { CalculatorFooter } from '@/shared/components/layout/CalculatorFooter';

export default function HcolVsLcolCalculator() {
  useAds();

  const [nameA, setNameA] = useState<string>('San Francisco, CA');
  const [salA, setSalA] = useState<number | string>(160000);
  const [taxA, setTaxA] = useState<number | string>(9.3);
  const [rentA, setRentA] = useState<number | string>(3400);
  const [otherA, setOtherA] = useState<number | string>(2800);

  const [nameB, setNameB] = useState<string>('Austin, TX');
  const [salB, setSalB] = useState<number | string>(115000);
  const [taxB, setTaxB] = useState<number | string>(0);
  const [rentB, setRentB] = useState<number | string>(1800);
  const [otherB, setOtherB] = useState<number | string>(1900);

  const [results, setResults] = useState<any>(null);

  const usd = (n: number) => '$' + Math.round(n).toLocaleString('en-US');
  const pct = (n: number) => (n * 100).toFixed(1) + '%';

  const FEDERAL_TAX = 0.22;
  const FICA = 0.0765;

  const calcCity = (sal: number, stateRate: number, rent: number, other: number) => {
    const gross = sal;
    const fedTax = gross * FEDERAL_TAX;
    const ficaTax = gross * FICA;
    const stateTax = gross * (stateRate / 100);
    const netAnnual = gross - fedTax - ficaTax - stateTax;
    const netMonthly = netAnnual / 12;
    const totalExpenses = rent + other;
    const disposable = netMonthly - totalExpenses;
    return { gross, fedTax, ficaTax, stateTax, netAnnual, netMonthly, totalExpenses, disposable, rent, other };
  };

  const handleCalc = () => {
    const sA = parseFloat(String(salA)) || 0;
    const tA = parseFloat(String(taxA)) || 0;
    const rA = parseFloat(String(rentA)) || 0;
    const oA = parseFloat(String(otherA)) || 0;

    const sB = parseFloat(String(salB)) || 0;
    const tB = parseFloat(String(taxB)) || 0;
    const rB = parseFloat(String(rentB)) || 0;
    const oB = parseFloat(String(otherB)) || 0;

    const cA = calcCity(sA, tA, rA, oA);
    const cB = calcCity(sB, tB, rB, oB);

    const gap = Math.abs(cA.disposable - cB.disposable);
    const bWins = cB.disposable > cA.disposable;
    const winner = bWins ? (nameB || 'City B') : (nameA || 'City A');
    const winClass = bWins ? '' : 'aw';
    const winColor = bWins ? 'gb' : 'ga';

    const maxBar = Math.max(cA.netMonthly, cB.netMonthly) || 1;

    setResults({
      cA,
      cB,
      gap,
      bWins,
      winner,
      winClass,
      winColor,
      maxBar
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
            <span className="dot" style={{ background: 'linear-gradient(135deg, var(--ca, #9a6a2f), var(--cb, #0b6b53))' }}></span> PayoffLab
          </div>
        </header>

        <section className="calc-hero">
          <div className="calc-eyebrow">City Salary Comparison</div>
          <h1>HCOL vs LCOL <em>Calculator</em></h1>
          <p className="calc-lede">Compare two job offers in different cities. After taxes, rent, and cost of living — which salary actually puts more money in your pocket each month?</p>
        </section>

        <div className="ad-slot" data-ad="top">Ad · Leaderboard 728×90</div>

        <div className="compare-grid" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '18px', marginTop: '14px' }}>
          <style jsx>{`
            @media(min-width: 720px) {
              .compare-grid {
                grid-template-columns: 1fr 1fr !important;
              }
            }
          `}</style>
          
          <div className="card a" style={{ borderTop: '4px solid var(--ca, #9a6a2f)', background: 'var(--paper-2)' }}>
            <h2 style={{ color: 'var(--ca, #9a6a2f)', marginTop: 0 }}>City A</h2>
            <div className="sub" style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '16px' }}>e.g. San Francisco, New York, Seattle</div>
            <label className="field" style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: 'var(--muted)', fontWeight: 600, marginBottom: '13px' }}>
              City name
              <input type="text" value={nameA} onChange={e => setNameA(e.target.value)} />
            </label>
            <label className="field" style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: 'var(--muted)', fontWeight: 600, marginBottom: '13px' }}>
              Gross salary ($)
              <input type="number" value={salA} step="1000" onChange={e => setSalA(e.target.value)} />
            </label>
            <label className="field" style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: 'var(--muted)', fontWeight: 600, marginBottom: '13px' }}>
              State income tax rate (%)
              <input type="number" value={taxA} step="0.1" onChange={e => setTaxA(e.target.value)} />
            </label>
            <label className="field" style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: 'var(--muted)', fontWeight: 600, marginBottom: '13px' }}>
              Monthly rent ($)
              <input type="number" value={rentA} step="50" onChange={e => setRentA(e.target.value)} />
            </label>
            <label className="field" style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: 'var(--muted)', fontWeight: 600, marginBottom: '13px' }}>
              Monthly other expenses ($)
              <input type="number" value={otherA} step="50" onChange={e => setOtherA(e.target.value)} />
            </label>
          </div>

          <div className="card b" style={{ borderTop: '4px solid var(--cb, #0b6b53)', background: 'var(--paper-2)' }}>
            <h2 style={{ color: 'var(--cb, #0b6b53)', marginTop: 0 }}>City B</h2>
            <div className="sub" style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '16px' }}>e.g. Austin, Nashville, Raleigh</div>
            <label className="field" style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: 'var(--muted)', fontWeight: 600, marginBottom: '13px' }}>
              City name
              <input type="text" value={nameB} onChange={e => setNameB(e.target.value)} />
            </label>
            <label className="field" style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: 'var(--muted)', fontWeight: 600, marginBottom: '13px' }}>
              Gross salary ($)
              <input type="number" value={salB} step="1000" onChange={e => setSalB(e.target.value)} />
            </label>
            <label className="field" style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: 'var(--muted)', fontWeight: 600, marginBottom: '13px' }}>
              State income tax rate (%)
              <input type="number" value={taxB} step="0.1" onChange={e => setTaxB(e.target.value)} />
            </label>
            <label className="field" style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: 'var(--muted)', fontWeight: 600, marginBottom: '13px' }}>
              Monthly rent ($)
              <input type="number" value={rentB} step="50" onChange={e => setRentB(e.target.value)} />
            </label>
            <label className="field" style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: 'var(--muted)', fontWeight: 600, marginBottom: '13px' }}>
              Monthly other expenses ($)
              <input type="number" value={otherB} step="50" onChange={e => setOtherB(e.target.value)} />
            </label>
          </div>

          <button className="calc-btn" onClick={handleCalc} style={{ gridColumn: '1 / -1' }}>Compare cities →</button>
        </div>

        <div id="results">
          {!results ? (
            <div className="card" style={{ marginTop: '16px' }}><div className="placeholder">Your side-by-side comparison will appear here.</div></div>
          ) : (
            <>
              <div className={`verdict ${results.winClass}`}>
                <style jsx>{`
                  .verdict:before {
                    background: var(--cb, #0b6b53);
                  }
                  .verdict.aw:before {
                    background: var(--ca, #9a6a2f) !important;
                  }
                `}</style>
                <h3>The verdict</h3>
                <div className="big">
                  <span style={{ color: results.bWins ? 'var(--cb, #0b6b53)' : 'var(--ca, #9a6a2f)', fontWeight: 700 }}>{results.winner}</span> leaves you <span style={{ color: results.bWins ? 'var(--cb, #0b6b53)' : 'var(--ca, #9a6a2f)', fontWeight: 700 }}>{usd(results.gap)}/mo</span> more disposable income.
                </div>
                <p>After taxes, rent, and living costs — the apparent salary gap doesn&apos;t tell the full story.</p>
              </div>

              <div className="side" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '14px' }}>
                <style jsx>{`
                  @media(min-width: 540px) {
                    .side {
                      grid-template-columns: 1fr 1fr !important;
                    }
                  }
                `}</style>
                
                <div className="city-card a" style={{ border: '1px solid var(--line)', borderRadius: '13px', padding: '18px', background: '#fff', borderTop: '3px solid var(--ca, #9a6a2f)' }}>
                  <div className="cname" style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: '16px', marginBottom: '12px', color: 'var(--ca, #9a6a2f)' }}>{nameA}</div>
                  <div className="metric"><span className="k">Gross salary</span><span className="val">{usd(results.cA.gross)}</span></div>
                  <div className="metric"><span className="k">Monthly net (after tax)</span><span className="val">{usd(results.cA.netMonthly)}</span></div>
                  <div className="metric"><span className="k">Rent</span><span className="val">−{usd(results.cA.rent)}</span></div>
                  <div className="metric"><span className="k">Other expenses</span><span className="val">−{usd(results.cA.other)}</span></div>
                  <div className="metric"><span className="k">Disposable / mo</span><span className="val" style={{ color: 'var(--ca, #9a6a2f)' }}>{usd(results.cA.disposable)}</span></div>
                </div>

                <div className="city-card b" style={{ border: '1px solid var(--line)', borderRadius: '13px', padding: '18px', background: '#fff', borderTop: '3px solid var(--cb, #0b6b53)' }}>
                  <div className="cname" style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: '16px', marginBottom: '12px', color: 'var(--cb, #0b6b53)' }}>{nameB}</div>
                  <div className="metric"><span className="k">Gross salary</span><span className="val">{usd(results.cB.gross)}</span></div>
                  <div className="metric"><span className="k">Monthly net (after tax)</span><span className="val">{usd(results.cB.netMonthly)}</span></div>
                  <div className="metric"><span className="k">Rent</span><span className="val">−{usd(results.cB.rent)}</span></div>
                  <div className="metric"><span className="k">Other expenses</span><span className="val">−{usd(results.cB.other)}</span></div>
                  <div className="metric"><span className="k">Disposable / mo</span><span className="val" style={{ color: 'var(--cb, #0b6b53)' }}>{usd(results.cB.disposable)}</span></div>
                </div>
              </div>

              <div className="card" style={{ marginTop: '16px' }}>
                <div className="bar-section" style={{ marginTop: '18px' }}>
                  <h3 style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: '17px', marginBottom: '14px', marginTop: 0 }}>Side-by-side breakdown</h3>
                  <div style={{ display: 'flex', gap: '16px', marginBottom: '12px', fontSize: '12.5px', color: 'var(--muted)' }}>
                    <span><i style={{ display: 'inline-block', width: '12px', height: '9px', background: 'var(--ca, #9a6a2f)', borderRadius: '3px', marginRight: '5px', verticalAlign: 'middle' }}></i>{nameA}</span>
                    <span><i style={{ display: 'inline-block', width: '12px', height: '9px', background: 'var(--cb, #0b6b53)', borderRadius: '3px', marginRight: '5px', verticalAlign: 'middle' }}></i>{nameB}</span>
                  </div>

                  {[
                    { label: 'Monthly net', valA: results.cA.netMonthly, valB: results.cB.netMonthly },
                    { label: 'Rent', valA: results.cA.rent, valB: results.cB.rent },
                    { label: 'Other costs', valA: results.cA.other, valB: results.cB.other },
                    { label: 'Disposable', valA: results.cA.disposable, valB: results.cB.disposable },
                  ].map((item, idx) => {
                    const maxVal = Math.max(Math.abs(item.valA), Math.abs(item.valB), 1);
                    const pA = Math.max(0, (item.valA / results.maxBar) * 100);
                    const pB = Math.max(0, (item.valB / results.maxBar) * 100);

                    return (
                      <div className="bar-row" key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', fontSize: '13px' }}>
                        <div className="bar-label" style={{ width: '110px', color: 'var(--muted)', fontWeight: 600, flexShrink: 0, fontSize: '12px' }}>{item.label}</div>
                        <div className="bar-pair" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div className="bar-track" style={{ height: '9px', background: 'var(--line)', borderRadius: '5px', overflow: 'hidden' }}>
                            <div className="bar-fill" style={{ height: '100%', borderRadius: '5px', width: `${pA.toFixed(1)}%`, background: 'var(--ca, #9a6a2f)' }}></div>
                          </div>
                          <div className="bar-track" style={{ height: '9px', background: 'var(--line)', borderRadius: '5px', overflow: 'hidden' }}>
                            <div className="bar-fill" style={{ height: '100%', borderRadius: '5px', width: `${pB.toFixed(1)}%`, background: 'var(--cb, #0b6b53)' }}></div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '75px' }}>
                          <div className="bar-amt" style={{ textAlign: 'right', fontWeight: 700, fontSize: '13px', color: 'var(--ca, #9a6a2f)' }}>{usd(item.valA)}</div>
                          <div className="bar-amt" style={{ textAlign: 'right', fontWeight: 700, fontSize: '13px', color: 'var(--cb, #0b6b53)' }}>{usd(item.valB)}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="ad-slot" data-ad="mid">Ad · In-content Responsive</div>

        <article className="calc-content">
          <h2>Why a higher salary doesn&apos;t always mean more money</h2>
          <p>Three forces silently consume HCOL salaries: <strong>state income tax</strong>, <strong>housing costs</strong>, and <strong>general cost of living</strong>. California&apos;s top marginal state tax is 13.3%. New York City piles on its own city tax. And median rent in San Francisco is 2–3x that of comparable cities in Texas or North Carolina.</p>
          
          <h3>The real comparison: disposable income</h3>
          <p>The only number that matters is what&apos;s left after you pay taxes, housing, food, transport, and your other fixed costs. Two people with wildly different salaries can end up with the same disposable income — or the lower-salary person can come out ahead if they chose a cheaper city.</p>
          
          <h3>What this calculator doesn&apos;t include</h3>
          <p>It doesn&apos;t model FICA (7.65%, same everywhere), federal income tax (same everywhere), or benefits differences between employers. It focuses on the <em>variable</em> factors: state tax and local cost of living — the things that actually differ by city.</p>

          <h2>Frequently asked questions</h2>
          <div className="calc-faq">
            <details><summary>What state tax rate should I enter?</summary><p>Use the marginal rate for your income level. For a rough estimate: California 9.3–13.3%, New York 6–10.9%, Texas/Florida/Washington 0%. See the take-home pay calculator for a full state list.</p></details>
            <details><summary>What should I include in &quot;other expenses&quot;?</summary><p>Food, transport, utilities, subscriptions, dining out, entertainment — everything except rent. You can look up city-specific estimates on Numbeo or BLS data for your lifestyle level.</p></details>
            <details><summary>Is my data saved?</summary><p>No. Everything runs locally in your browser. Nothing is stored or transmitted.</p></details>
          </div>
          <p className="disclaimer">For educational and estimation purposes only; not financial advice. Tax rates and cost of living estimates are approximations. Actual results depend on your specific deductions, lifestyle, and employer benefits.</p>
        </article>

        <div className="ad-slot" data-ad="bottom">Ad · Responsive</div>

        <CalculatorFooter />
      </div>
    </div>
  );
}
