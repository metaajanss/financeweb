"use client";

import React, { useState, useEffect } from 'react';
import '../calculator.css';
import { useAds } from '@/shared/hooks/use-ads';
import { CalculatorFooter } from '@/shared/components/layout/CalculatorFooter';

interface Item {
  id: string;
  label: string;
  val: number | string;
}

export default function NetWorthCalculator() {
  useAds();

  const [assets, setAssets] = useState<Item[]>([
    { id: '1', label: 'Checking & savings', val: 12000 },
    { id: '2', label: 'Investment accounts', val: 28000 },
    { id: '3', label: 'Home value', val: 0 },
    { id: '4', label: 'Car(s)', val: 18000 },
    { id: '5', label: 'Retirement (401k/IRA)', val: 45000 },
  ]);

  const [liabilities, setLiabilities] = useState<Item[]>([
    { id: '1', label: 'Mortgage', val: 0 },
    { id: '2', label: 'Student loans', val: 24000 },
    { id: '3', label: 'Credit card debt', val: 4500 },
    { id: '4', label: 'Car loan', val: 12000 },
  ]);

  const [age, setAge] = useState<number | string>(32);
  const [compare, setCompare] = useState<string>('1');
  const [results, setResults] = useState<any>(null);

  const usd = (n: number) => (n < 0 ? '-$' : '$') + Math.abs(Math.round(n)).toLocaleString('en-US');

  const BENCHMARKS: Record<string, [number, number]> = {
    'Under 35': [39000, 183000],
    '35–44': [135600, 549600],
    '45–54': [247200, 975800],
    '55–64': [364500, 1566900],
    '65–74': [410000, 1794600],
    '75+': [335600, 1624100]
  };

  const getBenchmark = (ageNum: number) => {
    if (ageNum < 35) return ['Under 35', ...BENCHMARKS['Under 35']];
    if (ageNum < 45) return ['35–44', ...BENCHMARKS['35–44']];
    if (ageNum < 55) return ['45–54', ...BENCHMARKS['45–54']];
    if (ageNum < 65) return ['55–64', ...BENCHMARKS['55–64']];
    if (ageNum < 75) return ['65–74', ...BENCHMARKS['65–74']];
    return ['75+', ...BENCHMARKS['75+']];
  };

  const addAsset = () => {
    setAssets([...assets, { id: Math.random().toString(), label: '', val: '' }]);
  };

  const addLiability = () => {
    setLiabilities([...liabilities, { id: Math.random().toString(), label: '', val: '' }]);
  };

  const removeAsset = (id: string) => {
    setAssets(assets.filter(a => a.id !== id));
  };

  const removeLiability = (id: string) => {
    setLiabilities(liabilities.filter(l => l.id !== id));
  };

  const updateAsset = (id: string, field: keyof Item, val: string) => {
    setAssets(assets.map(a => a.id === id ? { ...a, [field]: val } : a));
  };

  const updateLiability = (id: string, field: keyof Item, val: string) => {
    setLiabilities(liabilities.map(l => l.id === id ? { ...l, [field]: val } : l));
  };

  const handleCalc = () => {
    const totalAssets = assets.reduce((s, a) => s + (parseFloat(String(a.val)) || 0), 0);
    const totalLiab = liabilities.reduce((s, l) => s + (parseFloat(String(l.val)) || 0), 0);
    const nw = totalAssets - totalLiab;
    const ageNum = parseFloat(String(age)) || 30;
    const showBench = compare === '1';

    const [group, median, avg] = getBenchmark(ageNum);
    const maxB = Math.max(Math.abs(nw), Number(avg)) * 1.1 || 1;

    setResults({
      totalAssets,
      totalLiab,
      nw,
      showBench,
      group,
      median,
      avg,
      maxB
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
            <span className="dot" style={{ background: 'linear-gradient(135deg, var(--pos, #0b6b53), var(--you, #6d28d9))' }}></span> PayoffLab
          </div>
        </header>

        <section className="calc-hero">
          <div className="calc-eyebrow">Wealth Snapshot</div>
          <h1><em>Net Worth</em> Calculator</h1>
          <p className="calc-lede">Add your assets and debts to find your net worth instantly. Then see how you compare to the average and median net worth for your age group — based on Federal Reserve data.</p>
        </section>

        <div className="ad-slot" data-ad="top">Ad · Leaderboard 728×90</div>

        <div className="calc-grid">
          <div className="calc-card">
            <h2>Your snapshot</h2>
            <div className="sub" style={{ marginBottom: '10px' }}>Add what you own and what you owe.</div>

            <div className="section-label" style={{ fontSize: '11px', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 700, margin: '16px 0 10px', paddingTop: '14px', borderTop: '1px solid var(--line)' }}>Assets (what you own)</div>
            <div id="assets">
              {assets.map(a => (
                <div key={a.id} className="row" style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 24px', gap: '8px', alignItems: 'center', marginBottom: '9px' }}>
                  <input type="text" placeholder="Item name" value={a.label} onChange={e => updateAsset(a.id, 'label', e.target.value)} />
                  <input type="number" placeholder="0" min="0" step="100" value={a.val} onChange={e => updateAsset(a.id, 'val', e.target.value)} />
                  <button className="rm-btn" title="Remove" onClick={() => removeAsset(a.id)} style={{ border: 'none', background: 'none', color: 'var(--muted)', fontSize: '20px', cursor: 'pointer', padding: '8px 0', lineHeight: 1 }}>×</button>
                </div>
              ))}
            </div>
            <button className="add-btn" onClick={addAsset}>+ Add asset</button>

            <div className="section-label" style={{ fontSize: '11px', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 700, margin: '16px 0 10px', paddingTop: '14px', borderTop: '1px solid var(--line)' }}>Liabilities (what you owe)</div>
            <div id="liabilities">
              {liabilities.map(l => (
                <div key={l.id} className="row" style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 24px', gap: '8px', alignItems: 'center', marginBottom: '9px' }}>
                  <input type="text" placeholder="Item name" value={l.label} onChange={e => updateLiability(l.id, 'label', e.target.value)} />
                  <input type="number" placeholder="0" min="0" step="100" value={l.val} onChange={e => updateLiability(l.id, 'val', e.target.value)} />
                  <button className="rm-btn" title="Remove" onClick={() => removeLiability(l.id)} style={{ border: 'none', background: 'none', color: 'var(--muted)', fontSize: '20px', cursor: 'pointer', padding: '8px 0', lineHeight: 1 }}>×</button>
                </div>
              ))}
            </div>
            <button className="add-btn" onClick={addLiability}>+ Add liability</button>

            <div className="age-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '13px', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--line)' }}>
              <label className="field" style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: 'var(--muted)', fontWeight: 600 }}>
                Your age
                <input type="number" value={age} min="18" max="90" onChange={e => setAge(e.target.value)} />
              </label>
              <label className="field" style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: 'var(--muted)', fontWeight: 600 }}>
                Compare to peers?
                <select value={compare} onChange={e => setCompare(e.target.value)} style={{ fontFamily: 'inherit', fontSize: '15px', border: '1px solid var(--line)', borderRadius: '9px', padding: '11px', background: '#fff' }}>
                  <option value="1">Yes</option>
                  <option value="0">No</option>
                </select>
              </label>
            </div>

            <button className="calc-btn" onClick={handleCalc}>Calculate net worth →</button>
          </div>

          <div id="results">
            {!results ? (
              <div className="calc-card"><div className="placeholder">Calculating...</div></div>
            ) : (
              <div className="calc-card">
                <h2 style={{ marginTop: 0 }}>Your net worth</h2>
                <div className={`nw-big ${results.nw >= 0 ? 'pos' : 'neg'}`} style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(30px, 5vw, 48px)', fontWeight: 600, letterSpacing: '-.02em', marginBottom: '6px', color: results.nw >= 0 ? 'var(--pos, #0b6b53)' : 'var(--neg, #a63a1d)' }}>
                  {usd(results.nw)}
                </div>
                <p style={{ fontSize: '14px', color: 'var(--muted)', margin: 0 }}>
                  Total assets {usd(results.totalAssets)} minus total liabilities {usd(results.totalLiab)}
                </p>

                <div className="breakdown" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', margin: '16px 0' }}>
                  <div className="bcard" style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: '11px', padding: '16px' }}>
                    <div className="lbl" style={{ fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--muted)', fontWeight: 700, marginBottom: '7px' }}>Total assets</div>
                    <div className="val" style={{ color: 'var(--pos, #0b6b53)', fontFamily: "'Fraunces', serif", fontSize: '22px', fontWeight: 600 }}>{usd(results.totalAssets)}</div>
                  </div>
                  <div className="bcard" style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: '11px', padding: '16px' }}>
                    <div className="lbl" style={{ fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--muted)', fontWeight: 700, marginBottom: '7px' }}>Total liabilities</div>
                    <div className="val" style={{ color: 'var(--neg, #a63a1d)', fontFamily: "'Fraunces', serif", fontSize: '22px', fontWeight: 600 }}>{usd(results.totalLiab)}</div>
                  </div>
                </div>

                {results.showBench && (
                  <div className="benchmark" style={{ marginTop: '16px' }}>
                    <h3 style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: '17px', marginBottom: '12px', marginTop: 0 }}>Age group: {results.group}</h3>
                    
                    {[
                      { label: 'You', val: results.nw, color: 'var(--you, #6d28d9)' },
                      { label: 'Median', val: results.median, color: 'var(--pos, #0b6b53)' },
                      { label: 'Average', val: results.avg, color: 'var(--muted)' },
                    ].map((r, idx) => (
                      <div className="bench-row" key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', fontSize: '13px' }}>
                        <div className="bench-label" style={{ width: '90px', color: 'var(--muted)', fontWeight: 600, flexShrink: 0, fontSize: '12px' }}>{r.label}</div>
                        <div className="bench-track" style={{ flex: 1, height: '10px', background: 'var(--line)', borderRadius: '5px', overflow: 'hidden' }}>
                          <div className="bench-fill" style={{ height: '100%', borderRadius: '5px', width: `${Math.max(0, (Number(r.val) / results.maxB) * 100).toFixed(1)}%`, background: r.color }}></div>
                        </div>
                        <div className="bench-amt" style={{ width: '80px', textAlign: 'right', fontWeight: 700, fontSize: '13px', color: r.color }}>{usd(Number(r.val))}</div>
                      </div>
                    ))}
                    
                    <p style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '10px', marginBottom: 0 }}>Source: Federal Reserve Survey of Consumer Finances 2022</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="ad-slot" data-ad="mid">Ad · In-content Responsive</div>

        <article className="calc-content">
          <h2>What is net worth?</h2>
          <p>Net worth is simply <strong>assets minus liabilities</strong>. Everything you own (savings, investments, home equity, car) minus everything you owe (mortgage, student loans, credit card debt). It&apos;s the single best snapshot of your financial health.</p>
          
          <h3>Average vs median — which matters more?</h3>
          <p>The average net worth is pulled upward by ultra-wealthy outliers. The <strong>median</strong> — the midpoint where half of people are above and half below — is a better benchmark for most people. According to the Fed&apos;s Survey of Consumer Finances, the median net worth for Americans under 35 is around $39,000, while the average is $183,000 because of the skew.</p>
          
          <h3>How to grow your net worth</h3>
          <ul>
            <li>Increase assets: invest consistently, build home equity, contribute to retirement accounts.</li>
            <li>Reduce liabilities: pay down high-interest debt aggressively.</li>
            <li>Track it: measuring net worth annually is the simplest way to stay on course.</li>
          </ul>

          <h2>Frequently asked questions</h2>
          <div className="calc-faq">
            <details><summary>Should I include my home?</summary><p>Yes — use the current market value as an asset and your outstanding mortgage balance as a liability. The difference is your home equity, which counts toward net worth.</p></details>
            <details><summary>Is my data saved?</summary><p>No. Everything runs in your browser. Nothing is stored or transmitted.</p></details>
          </div>
          <p className="disclaimer">Benchmark data from Federal Reserve Survey of Consumer Finances (2022, most recent available). For educational purposes only; not financial advice.</p>
        </article>

        <div className="ad-slot" data-ad="bottom">Ad · Responsive</div>

        <CalculatorFooter />
      </div>
    </div>
  );
}
