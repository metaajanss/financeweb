"use client";

import React, { useState, useEffect } from 'react';
import '../calculator.css';
import { useAds } from '@/shared/hooks/use-ads';
import { CalculatorFooter } from '@/shared/components/layout/CalculatorFooter';

export default function Optimizer401kIra() {
  useAds();

  const [income, setIncome] = useState<number | string>(90000);
  const [contrib, setContrib] = useState<number | string>(10000);
  const [bracket, setBracket] = useState<number | string>(22);
  const [matchPct, setMatchPct] = useState<number | string>(50);
  const [matchLimit, setMatchLimit] = useState<number | string>(6);
  const [ret, setRet] = useState<number | string>(7);
  const [years, setYears] = useState<number | string>(30);
  const [retBracket, setRetBracket] = useState<number | string>(18);
  
  const [results, setResults] = useState<any>(null);

  const usd = (n: number) => '$' + Math.round(n).toLocaleString('en-US');

  const fv = (pmt: number, r: number, n: number): number => {
    if (r === 0) return pmt * n;
    return pmt * ((Math.pow(1 + r, n) - 1) / r);
  };

  const handleCalc = () => {
    const inc = parseFloat(String(income)) || 0;
    const con = parseFloat(String(contrib)) || 0;
    const brac = (parseFloat(String(bracket)) || 0) / 100;
    const mPct = (parseFloat(String(matchPct)) || 0) / 100;
    const mLim = (parseFloat(String(matchLimit)) || 0) / 100;
    const rRate = (parseFloat(String(ret)) || 0) / 100;
    const yrs = parseFloat(String(years)) || 0;
    const rBrac = (parseFloat(String(retBracket)) || 0) / 100;

    const matchEligible = inc * mLim;
    const matchContrib = Math.min(con, matchEligible);
    const employerMatch = matchContrib * mPct;
    const totalAnnual = con + employerMatch;
    const matchReturn = mPct * 100;
    const cappingOut = con >= matchEligible;

    // Traditional: tax deduction now, taxed in retirement
    const tradTaxSavingNow = con * brac;
    const tradFV = fv(totalAnnual, rRate, yrs);
    const tradAfterTax = tradFV * (1 - rBrac);

    // Roth: no deduction, tax-free in retirement
    const rothFV = fv(totalAnnual, rRate, yrs);
    const rothAfterTax = rothFV;

    const rothWins = rothAfterTax > tradAfterTax;

    setResults({
      employerMatch,
      matchReturn,
      cappingOut,
      matchEligible,
      mLim,
      mPct,
      tradTaxSavingNow,
      tradFV,
      tradAfterTax,
      rothFV,
      rothAfterTax,
      rothWins,
      rBrac,
      brac,
      totalAnnual
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
            <span className="dot" style={{ background: 'linear-gradient(135deg, var(--trad, #9a6a2f), var(--roth, #0b6b53))' }}></span> PayoffLab
          </div>
        </header>

        <section className="calc-hero">
          <div className="calc-eyebrow">Retirement Planner</div>
          <h1>401k &amp; IRA <em>Optimizer</em></h1>
          <p className="calc-lede">Compare Traditional vs Roth contributions, see your tax savings today, capture your full employer match, and project your retirement balance. All in your browser.</p>
        </section>

        <div className="ad-slot" data-ad="top">Ad · Leaderboard 728×90</div>

        <div className="calc-grid">
          <div className="calc-card">
            <h2>Your situation</h2>
            <div className="sub">Enter your income, contribution, and employer match.</div>

            <label className="field" style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: 'var(--muted)', fontWeight: 600, marginBottom: '14px' }}>
              Annual gross income ($)
              <input type="number" value={income} step="1000" onChange={e => setIncome(e.target.value)} />
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '13px' }}>
              <label className="field" style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: 'var(--muted)', fontWeight: 600, marginBottom: '14px' }}>
                Annual 401k contribution ($)
                <input type="number" value={contrib} step="500" onChange={e => setContrib(e.target.value)} />
              </label>
              <label className="field" style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: 'var(--muted)', fontWeight: 600, marginBottom: '14px' }}>
                Current tax bracket (%)
                <input type="number" value={bracket} step="1" onChange={e => setBracket(e.target.value)} />
              </label>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '13px' }}>
              <label className="field" style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: 'var(--muted)', fontWeight: 600, marginBottom: '14px' }}>
                Employer match (%)
                <input type="number" value={matchPct} step="5" onChange={e => setMatchPct(e.target.value)} />
              </label>
              <label className="field" style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: 'var(--muted)', fontWeight: 600, marginBottom: '14px' }}>
                Match up to (% of salary)
                <input type="number" value={matchLimit} step="0.5" onChange={e => setMatchLimit(e.target.value)} />
              </label>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '13px' }}>
              <label className="field" style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: 'var(--muted)', fontWeight: 600, marginBottom: '14px' }}>
                Expected return (%/yr)
                <input type="number" value={ret} step="0.5" onChange={e => setRet(e.target.value)} />
              </label>
              <label className="field" style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: 'var(--muted)', fontWeight: 600, marginBottom: '14px' }}>
                Years to retirement
                <input type="number" value={years} step="1" onChange={e => setYears(e.target.value)} />
              </label>
            </div>

            <label className="field" style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: 'var(--muted)', fontWeight: 600, marginBottom: '14px' }}>
              Retirement tax bracket (%)
              <input type="number" value={retBracket} step="1" onChange={e => setRetBracket(e.target.value)} />
            </label>

            <button className="calc-btn" onClick={handleCalc}>Optimize contributions →</button>
          </div>

          <div id="results">
            {!results ? (
              <div className="calc-card"><div className="placeholder">Your Traditional vs Roth comparison and match analysis will appear here.</div></div>
            ) : (
              <>
                {results.employerMatch > 0 && (
                  <div style={{ background: 'linear-gradient(135deg, rgba(109, 40, 217, 0.08), rgba(11, 107, 83, 0.06))', border: '1px solid var(--line)', borderRadius: '13px', padding: '18px', marginBottom: '16px' }}>
                    <h3 style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: '16px', color: '#6d28d9', marginBottom: '8px' }}>
                      🎁 Employer match: {usd(results.employerMatch)}/yr — instant {results.matchReturn}% return
                    </h3>
                    <p style={{ fontSize: '14px', color: 'var(--muted)', margin: 0 }}>
                      {results.cappingOut 
                        ? `You're capturing your full match limit (${(results.mLim * 100).toFixed(0)}% of salary = ${usd(results.matchEligible)}).` 
                        : `You're getting ${usd(results.employerMatch)}/yr in free money. Max match at ${usd(results.matchEligible)}/yr to capture the full ${usd(results.matchEligible * results.mPct)}.`
                      }
                    </p>
                  </div>
                )}

                <div className="compare" style={{ marginBottom: '16px' }}>
                  <div className="strat" style={{ borderTop: '3px solid var(--trad, #9a6a2f)' }}>
                    <div className="name" style={{ color: 'var(--trad, #9a6a2f)' }}>Traditional</div>
                    <div className="tag">Tax break now, pay later</div>
                    <div className="metric">
                      <span className="k">Tax savings this year</span>
                      <span className="val" style={{ color: 'var(--trad, #9a6a2f)' }}>{usd(results.tradTaxSavingNow)}</span>
                    </div>
                    <div className="metric">
                      <span className="k">Portfolio at retirement</span>
                      <span className="val">{usd(results.tradFV)}</span>
                    </div>
                    <div className="metric">
                      <span className="k">After-tax value</span>
                      <span className="val">{usd(results.tradAfterTax)}</span>
                    </div>
                    {!results.rothWins && (
                      <div style={{ marginTop: '10px', fontSize: '12.5px', fontWeight: 700, color: 'var(--trad, #9a6a2f)' }}>🏆 Better for your situation</div>
                    )}
                  </div>

                  <div className="strat" style={{ borderTop: '3px solid var(--roth, #0b6b53)' }}>
                    <div className="name" style={{ color: 'var(--roth, #0b6b53)' }}>Roth</div>
                    <div className="tag">Pay tax now, free later</div>
                    <div className="metric">
                      <span className="k">Tax savings this year</span>
                      <span className="val">$0</span>
                    </div>
                    <div className="metric">
                      <span className="k">Portfolio at retirement</span>
                      <span className="val">{usd(results.rothFV)}</span>
                    </div>
                    <div className="metric">
                      <span className="k">After-tax value</span>
                      <span className="val" style={{ color: 'var(--roth, #0b6b53)' }}>{usd(results.rothAfterTax)}</span>
                    </div>
                    {results.rothWins && (
                      <div style={{ marginTop: '10px', fontSize: '12.5px', fontWeight: 700, color: 'var(--roth, #0b6b53)' }}>🏆 Better for your situation</div>
                    )}
                  </div>
                </div>

                <div className="calc-card">
                  <p style={{ fontSize: '13.5px', color: 'var(--muted)', margin: 0 }}>
                    {results.rothWins 
                      ? `Roth wins because your retirement tax rate (${(results.rBrac * 100).toFixed(0)}%) is close to or higher than your current rate (${(results.brac * 100).toFixed(0)}%). Paying tax now locks in the lower rate.` 
                      : `Traditional wins because your current tax rate (${(results.brac * 100).toFixed(0)}%) is higher than your expected retirement rate (${(results.rBrac * 100).toFixed(0)}%). The deduction saves more now than the future tax costs.`
                    } Total annual investment including employer match: <strong>{usd(results.totalAnnual)}</strong>.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="ad-slot" data-ad="mid">Ad · In-content Responsive</div>

        <article className="calc-content">
          <h2>Traditional vs Roth: the core difference</h2>
          <p><strong>Traditional 401k/IRA:</strong> contributions are pre-tax (you get a tax deduction now), investments grow tax-deferred, withdrawals in retirement are taxed as ordinary income.</p>
          <p><strong>Roth 401k/IRA:</strong> contributions are after-tax (no deduction now), investments grow tax-free, qualified withdrawals in retirement are completely tax-free.</p>
          
          <h3>When Traditional wins</h3>
          <p>If you&apos;re in a high tax bracket now and expect to be in a lower bracket in retirement, Traditional saves more. The deduction is worth more today than the tax you&apos;ll pay later.</p>
          
          <h3>When Roth wins</h3>
          <p>If you&apos;re in a low bracket now and expect to be in a higher bracket in retirement (or if tax rates generally rise), Roth wins. You lock in the lower rate today and pay nothing later.</p>
          
          <h3>Always capture your full employer match first</h3>
          <p>An employer match is an instant 50–100% return — no investment comes close. Before deciding Traditional vs Roth or paying down any debt, contribute at least enough to get the full match.</p>

          <h2>Frequently asked questions</h2>
          <div className="calc-faq">
            <details><summary>What is the 2026 401k contribution limit?</summary><p>The IRS 401k contribution limit for 2026 is $23,500 ($31,000 if you&apos;re 50 or older with catch-up contributions). IRA limits are $7,000 ($8,000 if 50+).</p></details>
            <details><summary>Is my data saved?</summary><p>No. Everything runs locally in your browser.</p></details>
          </div>
          <p className="disclaimer">For educational purposes only; not financial advice. Tax rules change. Consult a financial advisor for personalized retirement planning.</p>
        </article>

        <div className="ad-slot" data-ad="bottom">Ad · Responsive</div>

        <CalculatorFooter />
      </div>
    </div>
  );
}
