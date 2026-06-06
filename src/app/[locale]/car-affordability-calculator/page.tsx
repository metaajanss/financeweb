"use client";

import React, { useState, useEffect } from 'react';
import '../calculator.css';
import { useAds } from '@/shared/hooks/use-ads';
import { CalculatorFooter } from '@/shared/components/layout/CalculatorFooter';

export default function CarAffordabilityCalculator() {
  useAds();

  const [income, setIncome] = useState<number | string>(4800);
  const [debts, setDebts] = useState<number | string>(600);
  const [price, setPrice] = useState<number | string>(32000);
  const [term, setTerm] = useState<number | string>(60);
  const [rate, setRate] = useState<number | string>(7.5);
  const [down, setDown] = useState<number | string>(3000);
  const [ins, setIns] = useState<number | string>(160);
  const [fuel, setFuel] = useState<number | string>(120);
  const [maint, setMaint] = useState<number | string>(80);

  const [results, setResults] = useState<any>(null);

  const usd = (n: number | string) => {
    const val = typeof n === 'number' ? n : parseFloat(String(n)) || 0;
    return '$' + Math.round(val).toLocaleString('en-US');
  };
  const pct = (n: number) => (n * 100).toFixed(1) + '%';

  const pmt = (P: number, r: number, n: number): number => {
    if (r === 0) return P / n;
    return P * r / (1 - Math.pow(1 + r, -n));
  };

  const handleCalc = () => {
    const inc = parseFloat(String(income)) || 0;
    const dbt = parseFloat(String(debts)) || 0;
    const prc = parseFloat(String(price)) || 0;
    const trm = parseFloat(String(term)) || 0;
    const rt = parseFloat(String(rate)) || 0;
    const dwn = parseFloat(String(down)) || 0;
    const i = parseFloat(String(ins)) || 0;
    const f = parseFloat(String(fuel)) || 0;
    const m = parseFloat(String(maint)) || 0;

    if (inc <= 0) {
      setResults({ error: 'Enter your monthly take-home pay to begin.' });
      return;
    }

    const loan = Math.max(0, prc - dwn);
    const loanPay = pmt(loan, rt / 100 / 12, trm);
    const totalCarMonthly = loanPay + i + f + m;
    const totalDebtRatio = (totalCarMonthly + dbt) / inc;
    const carRatio = totalCarMonthly / inc;
    const isSafe = carRatio <= 0.15 && totalDebtRatio <= 0.36;
    const totalLoanCost = loanPay * trm + dwn;
    const totalInterest = loanPay * trm - loan;

    const safeBudget = inc * 0.15;
    const leanBudget = inc * 0.10;
    const maxBudget = inc * 0.20;

    setResults({
      loanPay,
      totalCarMonthly,
      totalDebtRatio,
      carRatio,
      isSafe,
      totalLoanCost,
      totalInterest,
      safeBudget,
      leanBudget,
      maxBudget
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
            <span className="dot" style={{ background: 'linear-gradient(135deg, var(--car, #9a6a2f), var(--safe, #0b6b53))' }}></span> PayoffLab
          </div>
        </header>

        <section className="calc-hero">
          <div className="calc-eyebrow">Auto Budget Planner</div>
          <h1>Car <em>Affordability</em> Calculator</h1>
          <p className="calc-lede">Find your safe car budget based on your income and expenses — then see the real total cost of ownership including insurance, fuel, and maintenance. No signup.</p>
        </section>

        <div className="ad-slot" data-ad="top">Ad · Leaderboard 728×90</div>

        <div className="calc-grid">
          <div className="calc-card">
            <h2>Your budget</h2>
            <div className="sub">Enter your income and current monthly obligations.</div>

            <label className="field" style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: 'var(--muted)', fontWeight: 600, marginBottom: '14px' }}>
              Monthly take-home pay ($)
              <input type="number" value={income} step="100" onChange={e => setIncome(e.target.value)} />
            </label>
            <label className="field" style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: 'var(--muted)', fontWeight: 600, marginBottom: '14px' }}>
              Other monthly debt payments ($)
              <input type="number" value={debts} step="50" onChange={e => setDebts(e.target.value)} />
            </label>
            <label className="field" style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: 'var(--muted)', fontWeight: 600, marginBottom: '14px' }}>
              Car price you&apos;re considering ($)
              <input type="number" value={price} step="500" onChange={e => setPrice(e.target.value)} />
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '13px' }}>
              <label className="field" style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: 'var(--muted)', fontWeight: 600, marginBottom: '14px' }}>
                Loan term (months)
                <input type="number" value={term} step="12" onChange={e => setTerm(e.target.value)} />
              </label>
              <label className="field" style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: 'var(--muted)', fontWeight: 600, marginBottom: '14px' }}>
                Interest rate (%)
                <input type="number" value={rate} step="0.1" onChange={e => setRate(e.target.value)} />
              </label>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '13px' }}>
              <label className="field" style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: 'var(--muted)', fontWeight: 600, marginBottom: '14px' }}>
                Down payment ($)
                <input type="number" value={down} step="500" onChange={e => setDown(e.target.value)} />
              </label>
              <label className="field" style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: 'var(--muted)', fontWeight: 600, marginBottom: '14px' }}>
                Monthly insurance ($)
                <input type="number" value={ins} step="10" onChange={e => setIns(e.target.value)} />
              </label>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
              <label className="field" style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: 'var(--muted)', fontWeight: 600, marginBottom: '14px' }}>
                Monthly fuel ($)
                <input type="number" value={fuel} step="10" onChange={e => setFuel(e.target.value)} />
              </label>
              <label className="field" style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: 'var(--muted)', fontWeight: 600, marginBottom: '14px' }}>
                Monthly maintenance ($)
                <input type="number" value={maint} step="10" onChange={e => setMaint(e.target.value)} />
              </label>
            </div>

            <button className="calc-btn" onClick={handleCalc}>Check affordability →</button>
          </div>

          <div id="results">
            {!results ? (
              <div className="calc-card"><div className="placeholder">Calculating...</div></div>
            ) : results.error ? (
              <div className="calc-card"><div className="placeholder">{results.error}</div></div>
            ) : (
              <>
                <div className={`verdict ${results.isSafe ? '' : 'warn'}`}>
                  {/* CSS note: .verdict.warn:before has background: var(--warn) */}
                  <style jsx>{`
                    .verdict.warn:before {
                      background: var(--warn, #b45309) !important;
                    }
                    .verdict:before {
                      background: var(--safe, #0b6b53);
                    }
                  `}</style>
                  <h3>Affordability verdict</h3>
                  <div className="big">
                    Car costs = <b style={{ color: results.isSafe ? 'var(--safe, #0b6b53)' : 'var(--warn, #b45309)' }}>{pct(results.carRatio)}</b> of take-home.
                  </div>
                  <p>
                    {results.isSafe 
                      ? '✅ Within the 15% guideline — this car looks affordable on your budget.' 
                      : `⚠ Above the 15% guideline. Total car costs would be ${usd(results.totalCarMonthly)}/mo — consider a lower price or larger down payment.`
                    }
                  </p>
                </div>

                <div className="tiers" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '16px' }}>
                  <div className="tier" style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: '11px', padding: '16px', textAlign: 'center' }}>
                    <div className="tname" style={{ fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--muted)', fontWeight: 700, marginBottom: '8px' }}>Lean (10%)</div>
                    <div className="tval" style={{ color: 'var(--safe, #0b6b53)', fontFamily: "'Fraunces', serif", fontSize: '20px', fontWeight: 600 }}>
                      {usd(results.leanBudget)}<span style={{ fontSize: '13px', fontWeight: 400 }}>/mo</span>
                    </div>
                  </div>
                  <div className="tier" style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: '11px', padding: '16px', textAlign: 'center' }}>
                    <div className="tname" style={{ fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--muted)', fontWeight: 700, marginBottom: '8px' }}>Comfortable (15%)</div>
                    <div className="tval" style={{ color: 'var(--car, #9a6a2f)', fontFamily: "'Fraunces', serif", fontSize: '20px', fontWeight: 600 }}>
                      {usd(results.safeBudget)}<span style={{ fontSize: '13px', fontWeight: 400 }}>/mo</span>
                    </div>
                  </div>
                  <div className="tier" style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: '11px', padding: '16px', textAlign: 'center' }}>
                    <div className="tname" style={{ fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--muted)', fontWeight: 700, marginBottom: '8px' }}>Max (20%)</div>
                    <div className="tval" style={{ color: 'var(--warn, #b45309)', fontFamily: "'Fraunces', serif", fontSize: '20px', fontWeight: 600 }}>
                      {usd(results.maxBudget)}<span style={{ fontSize: '13px', fontWeight: 400 }}>/mo</span>
                    </div>
                  </div>
                </div>

                <div className="calc-card">
                  <h3 style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: '17px', marginBottom: '14px', marginTop: 0 }}>Monthly cost breakdown</h3>
                  <div className="breakdown-rows" style={{ display: 'flex', flexDirection: 'column' }}>
                    <div className="line" style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px dashed var(--line)', fontSize: '14px' }}>
                      <span className="k" style={{ color: 'var(--muted)' }}>Loan payment</span>
                      <span className="v" style={{ fontWeight: 700 }}>{usd(results.loanPay)}</span>
                    </div>
                    <div className="line" style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px dashed var(--line)', fontSize: '14px' }}>
                      <span className="k" style={{ color: 'var(--muted)' }}>Insurance</span>
                      <span className="v" style={{ fontWeight: 700 }}>{usd(ins)}</span>
                    </div>
                    <div className="line" style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px dashed var(--line)', fontSize: '14px' }}>
                      <span className="k" style={{ color: 'var(--muted)' }}>Fuel</span>
                      <span className="v" style={{ fontWeight: 700 }}>{usd(fuel)}</span>
                    </div>
                    <div className="line" style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px dashed var(--line)', fontSize: '14px' }}>
                      <span className="k" style={{ color: 'var(--muted)' }}>Maintenance</span>
                      <span className="v" style={{ fontWeight: 700 }}>{usd(maint)}</span>
                    </div>
                    <div className="line" style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px dashed var(--line)', fontSize: '14px' }}>
                      <span className="k" style={{ color: 'var(--muted)' }}><strong>Total car cost / mo</strong></span>
                      <span className="v" style={{ color: 'var(--car, #9a6a2f)', fontWeight: 700 }}><strong>{usd(results.totalCarMonthly)}</strong></span>
                    </div>
                    <div className="line" style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px dashed var(--line)', fontSize: '14px' }}>
                      <span className="k" style={{ color: 'var(--muted)' }}>Total paid over loan term</span>
                      <span className="v" style={{ fontWeight: 700 }}>{usd(results.totalLoanCost)}</span>
                    </div>
                    <div className="line" style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px dashed var(--line)', fontSize: '14px' }}>
                      <span className="k" style={{ color: 'var(--muted)' }}>Total interest paid</span>
                      <span className="v" style={{ fontWeight: 700 }}>{usd(results.totalInterest)}</span>
                    </div>
                    <div className="line" style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: '14px' }}>
                      <span className="k" style={{ color: 'var(--muted)' }}>Total debt-to-income ratio</span>
                      <span className="v" style={{ color: results.totalDebtRatio > 0.36 ? 'var(--warn, #b45309)' : 'var(--safe, #0b6b53)', fontWeight: 700 }}>{pct(results.totalDebtRatio)}</span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="ad-slot" data-ad="mid">Ad · In-content Responsive</div>

        <article className="calc-content">
          <h2>The 15% and 20% rules</h2>
          <p>Two widely used guidelines for car affordability: the <strong>15% rule</strong> says your total car costs (payment + insurance + fuel + maintenance) shouldn&apos;t exceed 15% of your monthly take-home pay. The stricter <strong>20/4/10 rule</strong> says: 20% down, loan no longer than 4 years, and total car costs under 10% of gross income.</p>
          
          <h3>Why total cost of ownership matters more than the monthly payment</h3>
          <p>Dealers focus on monthly payment because it sounds small. But insurance, fuel, and maintenance can easily add $400–700/month on top of the loan payment. This calculator shows you the full picture.</p>

          <h2>Frequently asked questions</h2>
          <div className="calc-faq">
            <details><summary>New vs used — which is more affordable?</summary><p>Used cars typically cost less upfront and have lower insurance premiums, but may have higher maintenance costs. New cars often come with warranties and better financing rates. Run both scenarios in this calculator to compare.</p></details>
            <details><summary>Is my data saved?</summary><p>No. Everything runs locally in your browser.</p></details>
          </div>
          <p className="disclaimer">For educational purposes only; not financial advice. Insurance and maintenance estimates vary widely. Get real quotes before making a purchase.</p>
        </article>

        <div className="ad-slot" data-ad="bottom">Ad · Responsive</div>

        <CalculatorFooter />
      </div>
    </div>
  );
}
