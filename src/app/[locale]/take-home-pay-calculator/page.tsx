"use client";

import React, { useState, useEffect } from 'react';
import '../calculator.css';
import { useAds } from '@/shared/hooks/use-ads';
import { CalculatorFooter } from '@/shared/components/layout/CalculatorFooter';

const BRACKETS: any = {
  single:  [[11925,0.10],[48475,0.12],[103350,0.22],[197300,0.24],[250525,0.32],[626350,0.35],[Infinity,0.37]],
  married: [[23850,0.10],[96950,0.12],[206700,0.22],[394600,0.24],[501050,0.32],[751600,0.35],[Infinity,0.37]],
  hoh:     [[17000,0.10],[64850,0.12],[103350,0.22],[197300,0.24],[250500,0.32],[626350,0.35],[Infinity,0.37]]
};
const STD_DED: any = { single: 15000, married: 30000, hoh: 22500 };

function fedTax(income: number, status: string) {
  const brackets = BRACKETS[status];
  const deduction = STD_DED[status];
  let taxable = Math.max(0, income - deduction);
  let tax = 0, prev = 0;
  for (const [top, rate] of brackets) {
    if (taxable <= 0) break;
    const chunk = Math.min(taxable, top - prev);
    tax += chunk * rate;
    taxable -= chunk;
    prev = top;
    if (top === Infinity) break;
  }
  return tax;
}

export default function TakeHomePayCalculator() {
  useAds();

  const [gross, setGross] = useState<number | string>(75000);
  const [stateVal, setStateVal] = useState<string>("10.9,NY");
  const [filing, setFiling] = useState<string>("single");
  const [freq, setFreq] = useState<string>("26");

  const [results, setResults] = useState<any>(null);

  const usd = (n: number) => '$' + Math.round(n).toLocaleString('en-US');
  const pct = (n: number) => (n * 100).toFixed(1) + '%';

  const handleCalc = () => {
    const g = parseFloat(String(gross)) || 0;
    const [stateRateStr, stateCode] = stateVal.split(',');
    const statePct = parseFloat(stateRateStr) / 100;
    const frequency = parseInt(freq);

    if (g <= 0) {
      setResults({ error: 'Enter a salary to see your take-home breakdown.' });
      return;
    }

    const fedTaxAmt = fedTax(g, filing);
    const ss = Math.min(g, 176100) * 0.062;
    const medicare = g * 0.0145;
    const fica = ss + medicare;
    const stateTax = g * statePct;
    const totalTax = fedTaxAmt + fica + stateTax;
    const netAnnual = g - totalTax;
    const perPeriod = netAnnual / frequency;
    const monthly = netAnnual / 12;
    const effRate = totalTax / g;

    const freqLabels: any = { 52:'weekly', 26:'bi-weekly', 24:'semi-monthly', 12:'monthly' };
    const freqLabel = freqLabels[frequency];

    const barData = [
      { label:'Federal tax', amt:fedTaxAmt, color:'#9a6a2f' },
      { label:'Social Security', amt:ss, color:'#b5803a' },
      { label:'Medicare', amt:medicare, color:'#c9a05a' },
      { label:'State tax', amt:stateTax, color:'#7a5020' },
      { label:'Take-home', amt:netAnnual, color:'#0b6b53' },
    ];

    setResults({
      g, fedTaxAmt, ss, medicare, stateTax, netAnnual, perPeriod, monthly, effRate, freqLabel, barData, stateCode
    });
  };

  useEffect(() => {
    handleCalc();
  }, [gross, stateVal, filing, freq]);

  return (
    <div className="calc-container">
      <div className="calc-wrap">
        <header className="calc-header">
          <div className="calc-brand">
            <span className="dot" style={{ background: 'linear-gradient(135deg, #9a6a2f, #0b6b53)' }}></span> PayoffLab
          </div>
        </header>

        <section className="calc-hero">
          <div className="calc-eyebrow">Salary Planner · 2026</div>
          <h1><em>Take-Home</em> Pay Calculator</h1>
          <p className="calc-lede">Enter your salary, state, and filing status. See your net pay after federal tax, FICA, and state income tax — monthly, bi-weekly, and annually.</p>
        </section>

        <div className="ad-slot" data-ad="top">Ad · Leaderboard 728×90</div>

        <div className="calc-grid">
          <div className="calc-card">
            <h2>Your salary</h2>
            <div className="sub">We&apos;ll handle all the tax math.</div>

            <label className="field" style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: 'var(--muted)', fontWeight: 600, marginBottom: '14px' }}>
              Annual gross salary ($)
              <input type="number" value={gross} step="1000" onChange={e => setGross(e.target.value)} style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: '15px', padding: '11px', borderRadius: '9px', border: '1px solid var(--line)', width: '100%' }} />
            </label>

            <label className="field" style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: 'var(--muted)', fontWeight: 600, marginBottom: '14px' }}>
              State
              <select value={stateVal} onChange={e => setStateVal(e.target.value)} style={{ padding: '11px', borderRadius: '9px', border: '1px solid var(--line)', width: '100%' }}>
                <option value="0,AL">Alabama (5%)</option>
                <option value="0,AK">Alaska (no state tax)</option>
                <option value="2.5,AZ">Arizona (2.5%)</option>
                <option value="4.7,AR">Arkansas (4.7%)</option>
                <option value="13.3,CA">California (up to 13.3%)</option>
                <option value="4.4,CO">Colorado (4.4%)</option>
                <option value="6.99,CT">Connecticut (up to 6.99%)</option>
                <option value="6.6,DE">Delaware (6.6%)</option>
                <option value="0,FL">Florida (no state tax)</option>
                <option value="5.49,GA">Georgia (5.49%)</option>
                <option value="11,HI">Hawaii (up to 11%)</option>
                <option value="5.8,ID">Idaho (5.8%)</option>
                <option value="4.95,IL">Illinois (4.95%)</option>
                <option value="3.05,IN">Indiana (3.05%)</option>
                <option value="6,IA">Iowa (6%)</option>
                <option value="5.7,KS">Kansas (5.7%)</option>
                <option value="4,KY">Kentucky (4%)</option>
                <option value="4.25,LA">Louisiana (4.25%)</option>
                <option value="7.15,ME">Maine (7.15%)</option>
                <option value="5.75,MD">Maryland (5.75%)</option>
                <option value="5,MA">Massachusetts (5%)</option>
                <option value="4.25,MI">Michigan (4.25%)</option>
                <option value="9.85,MN">Minnesota (9.85%)</option>
                <option value="5,MS">Mississippi (5%)</option>
                <option value="5.3,MO">Missouri (5.3%)</option>
                <option value="6.75,MT">Montana (6.75%)</option>
                <option value="6.84,NE">Nebraska (6.84%)</option>
                <option value="0,NV">Nevada (no state tax)</option>
                <option value="0,NH">New Hampshire (no state tax)</option>
                <option value="10.75,NJ">New Jersey (up to 10.75%)</option>
                <option value="5.9,NM">New Mexico (5.9%)</option>
                <option value="10.9,NY">New York (up to 10.9%)</option>
                <option value="5.25,NC">North Carolina (5.25%)</option>
                <option value="2.9,ND">North Dakota (2.9%)</option>
                <option value="3.99,OH">Ohio (3.99%)</option>
                <option value="4.75,OK">Oklahoma (4.75%)</option>
                <option value="9.9,OR">Oregon (9.9%)</option>
                <option value="3.07,PA">Pennsylvania (3.07%)</option>
                <option value="5.99,RI">Rhode Island (5.99%)</option>
                <option value="7,SC">South Carolina (7%)</option>
                <option value="0,SD">South Dakota (no state tax)</option>
                <option value="0,TN">Tennessee (no state tax)</option>
                <option value="0,TX">Texas (no state tax)</option>
                <option value="4.85,UT">Utah (4.85%)</option>
                <option value="8.75,VT">Vermont (8.75%)</option>
                <option value="5.75,VA">Virginia (5.75%)</option>
                <option value="0,WA">Washington (no state tax)</option>
                <option value="6.5,WV">West Virginia (6.5%)</option>
                <option value="7.65,WI">Wisconsin (7.65%)</option>
                <option value="0,WY">Wyoming (no state tax)</option>
              </select>
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '13px' }}>
              <label className="field" style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: 'var(--muted)', fontWeight: 600, marginBottom: '14px' }}>
                Filing status
                <select value={filing} onChange={e => setFiling(e.target.value)} style={{ padding: '11px', borderRadius: '9px', border: '1px solid var(--line)', width: '100%' }}>
                  <option value="single">Single</option>
                  <option value="married">Married (jointly)</option>
                  <option value="hoh">Head of household</option>
                </select>
              </label>
              <label className="field" style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: 'var(--muted)', fontWeight: 600, marginBottom: '14px' }}>
                Pay frequency
                <select value={freq} onChange={e => setFreq(e.target.value)} style={{ padding: '11px', borderRadius: '9px', border: '1px solid var(--line)', width: '100%' }}>
                  <option value="26">Bi-weekly (26x)</option>
                  <option value="24">Semi-monthly (24x)</option>
                  <option value="12">Monthly (12x)</option>
                  <option value="52">Weekly (52x)</option>
                </select>
              </label>
            </div>

            <button className="calc-btn" onClick={handleCalc}>Calculate take-home →</button>
          </div>

          <div id="results">
            {!results ? (
              <div className="calc-card"><div className="placeholder">Calculating...</div></div>
            ) : results.error ? (
              <div className="calc-card"><div className="placeholder">{results.error}</div></div>
            ) : (
              <>
                <div className="verdict" style={{ borderColor: '#0b6b53' }}>
                  <h3 style={{ textTransform: 'uppercase', color: 'var(--muted)', fontSize: '15px', fontWeight: 600 }}>Your take-home pay</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '14px', marginBottom: '16px' }}>
                    <div style={{ background: '#fff', border: '1px solid #0b6b53', borderRadius: '11px', padding: '16px' }}>
                      <div style={{ fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--muted)', fontWeight: 700, marginBottom: '8px' }}>Annual</div>
                      <div style={{ color: '#0b6b53', fontFamily: "'Fraunces', serif", fontSize: 'clamp(19px, 3vw, 25px)', fontWeight: 600, letterSpacing: '-.01em', fontVariantNumeric: 'tabular-nums' }}>{usd(results.netAnnual)}</div>
                    </div>
                    <div style={{ background: '#fff', border: '1px solid #0b6b53', borderRadius: '11px', padding: '16px' }}>
                      <div style={{ fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--muted)', fontWeight: 700, marginBottom: '8px' }}>Monthly</div>
                      <div style={{ color: '#0b6b53', fontFamily: "'Fraunces', serif", fontSize: 'clamp(19px, 3vw, 25px)', fontWeight: 600, letterSpacing: '-.01em', fontVariantNumeric: 'tabular-nums' }}>{usd(results.monthly)}</div>
                    </div>
                    <div style={{ background: '#fff', border: '1px solid #0b6b53', borderRadius: '11px', padding: '16px' }}>
                      <div style={{ fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--muted)', fontWeight: 700, marginBottom: '8px' }}>{results.freqLabel.charAt(0).toUpperCase() + results.freqLabel.slice(1)}</div>
                      <div style={{ color: '#0b6b53', fontFamily: "'Fraunces', serif", fontSize: 'clamp(19px, 3vw, 25px)', fontWeight: 600, letterSpacing: '-.01em', fontVariantNumeric: 'tabular-nums' }}>{usd(results.perPeriod)}</div>
                    </div>
                  </div>
                </div>

                <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: '13px', padding: '20px', marginBottom: '16px' }}>
                  <h3 style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: '17px', margin: '0 0 14px 0' }}>Tax breakdown (annual)</h3>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid var(--line)', fontSize: '14px' }}>
                    <span style={{ color: 'var(--muted)' }}>Gross salary</span><span style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{usd(results.g)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid var(--line)', fontSize: '14px' }}>
                    <span style={{ color: 'var(--muted)' }}>Federal income tax</span><span style={{ color: '#9a6a2f', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>−{usd(results.fedTaxAmt)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid var(--line)', fontSize: '14px' }}>
                    <span style={{ color: 'var(--muted)' }}>Social Security (6.2%)</span><span style={{ color: '#9a6a2f', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>−{usd(results.ss)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid var(--line)', fontSize: '14px' }}>
                    <span style={{ color: 'var(--muted)' }}>Medicare (1.45%)</span><span style={{ color: '#9a6a2f', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>−{usd(results.medicare)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid var(--line)', fontSize: '14px' }}>
                    <span style={{ color: 'var(--muted)' }}>State income tax ({results.stateCode})</span><span style={{ color: '#9a6a2f', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>−{usd(results.stateTax)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0 9px', borderTop: '2px solid var(--line)', marginTop: '6px', fontSize: '15px' }}>
                    <span style={{ fontWeight: 700, color: 'var(--ink)' }}>Take-home pay</span><span style={{ color: '#0b6b53', fontWeight: 700, fontSize: '17px', fontVariantNumeric: 'tabular-nums' }}>{usd(results.netAnnual)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '4px', fontSize: '13px' }}>
                    <span style={{ color: 'var(--muted)' }}>Effective total tax rate</span><span style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{pct(results.effRate)}</span>
                  </div>
                </div>

                <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: '13px', padding: '20px' }}>
                  <div style={{ marginTop: '0' }}>
                    <h3 style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: '17px', marginBottom: '12px', marginTop: 0 }}>Where your dollar goes</h3>
                    {results.barData.map((b: any, i: number) => {
                      const p = b.amt / results.g;
                      return (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '9px', fontSize: '13px' }}>
                          <div style={{ width: '130px', color: 'var(--muted)', fontWeight: 600, flexShrink: 0 }}>{b.label}</div>
                          <div style={{ flex: 1, height: '10px', background: 'var(--line)', borderRadius: '5px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', borderRadius: '5px', transition: 'width .4s', width: `${(p * 100).toFixed(1)}%`, background: b.color }}></div>
                          </div>
                          <div style={{ width: '42px', textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{(p * 100).toFixed(1)}%</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="ad-slot" data-ad="mid">Ad · In-content Responsive</div>

        <article className="calc-content">
          <h2>What gets taken out of your paycheck?</h2>
          <p>Every paycheck goes through several layers of withholding before you see it. Understanding each one helps you plan your budget and your W-4 adjustments.</p>
          
          <h3>Federal income tax</h3>
          <p>The U.S. uses a <strong>progressive bracket system</strong>: you pay a lower rate on the first dollars earned and higher rates as income climbs. Your marginal rate (the highest bracket you hit) is not the same as your effective rate (what you actually pay on average). Most $60–90k earners have an effective federal rate of 14–20%.</p>
          
          <h3>FICA: Social Security + Medicare</h3>
          <p>These are flat percentages everyone pays: <strong>6.2% for Social Security</strong> (up to $176,100 in 2026) and <strong>1.45% for Medicare</strong> (no cap). Together that&apos;s 7.65% off every paycheck, regardless of your bracket.</p>
          
          <h3>State income tax</h3>
          <p>Ranges from 0% in nine no-tax states to over 13% in California&apos;s top bracket. For most people it&apos;s the second-biggest deduction after federal tax.</p>
          
          <h2>No-income-tax states</h2>
          <p>These nine states charge zero state income tax: <strong>Alaska, Florida, Nevada, New Hampshire, South Dakota, Tennessee, Texas, Washington,</strong> and <strong>Wyoming</strong>. Moving to one can increase take-home pay by 4–10% depending on your income.</p>
          
          <h2>How to increase your take-home pay</h2>
          <ul>
            <li><strong>Pre-tax 401(k) contributions</strong> — every dollar you contribute reduces your taxable income. A $10,000 contribution in the 22% bracket saves ~$2,200 in federal tax.</li>
            <li><strong>HSA or FSA contributions</strong> — same principle: pre-tax, lowers your taxable income.</li>
            <li><strong>Adjust your W-4</strong> — if you consistently get a large refund, you&apos;re over-withholding. Adjust allowances to get more each paycheck instead of a lump sum in April.</li>
          </ul>
          
          <h2>Frequently asked questions</h2>
          <div className="calc-faq">
            <details><summary>Is this accurate for my paycheck?</summary><p>It&apos;s a close estimate for most W-2 employees. Actual withholding depends on your W-4 elections, 401(k) contributions, health insurance, and other pre-tax deductions — none of which are included here. Use this as a planning baseline.</p></details>
            <details><summary>Why does married filing jointly change my take-home?</summary><p>Married filing jointly doubles the standard deduction and applies wider brackets, so the same income is taxed at a lower effective rate than single status.</p></details>
            <details><summary>Is my data saved?</summary><p>No. Everything is calculated locally in your browser. Nothing is stored or sent anywhere.</p></details>
          </div>
          <p className="disclaimer">For educational and estimation purposes only; not tax advice. Tax rates are approximations for 2026. Actual withholding depends on your W-4, pre-tax deductions, and other factors. Consult a tax professional for precise figures.</p>
        </article>

        <div className="ad-slot" data-ad="bottom">Ad · Responsive</div>

        <CalculatorFooter />
      </div>
    </div>
  );
}
