"use client";

import React, { useState, useEffect } from 'react';
import '../calculator.css';
import { useAds } from '@/shared/hooks/use-ads';
import { CalculatorFooter } from '@/shared/components/layout/CalculatorFooter';

const CATS = [
  { emoji: '🏛', name: 'Venue', sub: 'Ceremony + reception space', pct: 28 },
  { emoji: '🍽', name: 'Catering', sub: 'Food, drink, cake, service', pct: 19 },
  { emoji: '📸', name: 'Photography & Video', sub: 'Photographer + videographer', pct: 11 },
  { emoji: '🎵', name: 'Music & Entertainment', sub: 'DJ or band', pct: 9 },
  { emoji: '💐', name: 'Flowers & Décor', sub: 'Bouquets, centerpieces, lighting', pct: 9 },
  { emoji: '👗', name: 'Attire', sub: 'Dress, suit, accessories, alterations', pct: 8 },
  { emoji: '📋', name: 'Planner / Coordinator', sub: 'Day-of or full planning', pct: 4 },
  { emoji: '💌', name: 'Stationery', sub: 'Invitations, programs, signage', pct: 2 },
  { emoji: '🚗', name: 'Transportation', sub: 'Shuttle, limo, getaway car', pct: 2 },
  { emoji: '🎁', name: 'Favors & Gifts', sub: 'Guest favors, wedding party gifts', pct: 2 },
  { emoji: '💒', name: 'Officiant', sub: 'Ceremony fee', pct: 1 },
  { emoji: '🛡', name: 'Contingency', sub: 'Buffer for overruns', pct: 5 },
];

export default function WeddingBudgetCalculator() {
  useAds();

  const [budget, setBudget] = useState<number | string>(30000);
  const [guests, setGuests] = useState<number | string>(100);
  const [pcts, setPcts] = useState<number[]>(CATS.map(c => c.pct));
  
  const [results, setResults] = useState<any>(null);

  const usd = (n: number) => '$' + Math.round(n).toLocaleString('en-US');

  const updatePct = (index: number, val: string) => {
    const nextPcts = [...pcts];
    nextPcts[index] = parseFloat(val) || 0;
    setPcts(nextPcts);
  };

  const handleCalc = () => {
    const bud = parseFloat(String(budget)) || 0;
    const gst = parseFloat(String(guests)) || 0;
    const totalPct = pcts.reduce((s, p) => s + p, 0);

    const rows = CATS.map((c, i) => ({
      ...c,
      amt: bud * (pcts[i] / 100)
    }));

    const totalAllocated = rows.reduce((s, r) => s + r.amt, 0);
    const diff = bud - totalAllocated;
    const perGuest = gst > 0 ? totalAllocated / gst : 0;
    const maxAmt = Math.max(...rows.map(r => r.amt), 1);

    setResults({
      rows,
      totalAllocated,
      diff,
      perGuest,
      maxAmt,
      totalPct
    });
  };

  useEffect(() => {
    handleCalc();
  }, [budget, guests, pcts]); // recalculate automatically on inputs change

  return (
    <div className="calc-container">
      <div className="calc-wrap">
        <header className="calc-header">
          <div className="calc-brand">
            <span className="dot" style={{ background: 'linear-gradient(135deg, var(--rose, #9f4157), var(--gold, #a9842a))' }}></span> PayoffLab
          </div>
        </header>

        <section className="calc-hero">
          <div className="calc-eyebrow">Wedding Planner</div>
          <h1><em>Wedding Budget</em> Calculator</h1>
          <p className="calc-lede">Enter your total budget and guest count to get a recommended spend breakdown by category. Adjust each item to your priorities and see where you stand instantly.</p>
        </section>

        <div className="ad-slot" data-ad="top">Ad · Leaderboard 728×90</div>

        <div className="calc-grid">
          <div className="calc-card">
            <h2>Your wedding</h2>
            <div className="sub">Start with your total budget and guest count.</div>

            <label className="field" style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: 'var(--muted)', fontWeight: 600, marginBottom: '14px' }}>
              Total budget ($)
              <input type="number" value={budget} step="500" onChange={e => setBudget(e.target.value)} />
            </label>
            <label className="field" style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: 'var(--muted)', fontWeight: 600, marginBottom: '14px' }}>
              Number of guests
              <input type="number" value={guests} step="5" onChange={e => setGuests(e.target.value)} />
            </label>

            <p style={{ fontSize: '12.5px', color: 'var(--muted)', marginBottom: '16px' }}>Allocations below are based on national average percentages. Adjust each to match your priorities.</p>

            <div id="cats">
              {CATS.map((c, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: '8px', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontSize: '16px' }}>{c.emoji}</span>
                  <label style={{ fontSize: '12.5px', color: 'var(--muted)', fontWeight: 600 }}>
                    {c.name} <span style={{ fontWeight: 400, fontSize: '11px' }}>({pcts[i]}%)</span>
                  </label>
                  <input
                    type="number"
                    value={pcts[i]}
                    min="0"
                    max="100"
                    step="1"
                    onChange={e => updatePct(i, e.target.value)}
                    style={{ width: '60px', fontFamily: 'inherit', fontSize: '14px', border: '1px solid var(--line)', borderRadius: '7px', padding: '7px', textAlign: 'center' }}
                  />
                </div>
              ))}
            </div>

            <button className="calc-btn" onClick={handleCalc}>Update breakdown →</button>
          </div>

          <div id="results">
            {!results ? (
              <div className="calc-card"><div className="placeholder">Calculating...</div></div>
            ) : (
              <div className="calc-card">
                <h2 style={{ marginTop: 0 }}>Budget breakdown</h2>
                <div className="sub" style={{ fontSize: '13.5px', color: 'var(--muted)', marginBottom: '16px' }}>
                  Total allocated: {usd(results.totalAllocated)} · {usd(results.perGuest)} per guest
                </div>

                {results.rows.map((r: any, idx: number) => (
                  <div className="cat-row" key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                    <div className="cat-emoji" style={{ width: '28px', textAlign: 'center', fontSize: '18px', flexShrink: 0 }}>{r.emoji}</div>
                    <div className="cat-info" style={{ flex: 1 }}>
                      <div className="cat-name" style={{ fontWeight: 700, fontSize: '14px' }}>{r.name}</div>
                      <div className="cat-sub" style={{ fontSize: '12px', color: 'var(--muted)' }}>{r.sub}</div>
                    </div>
                    <div className="cat-bar-wrap" style={{ flex: 1, height: '8px', background: 'var(--line)', borderRadius: '4px', overflow: 'hidden', margin: '0 10px' }}>
                      <div className="cat-bar" style={{ height: '100%', borderRadius: '4px', background: 'var(--rose, #9f4157)', width: `${(r.amt / results.maxAmt * 100).toFixed(1)}%` }}></div>
                    </div>
                    <div className="cat-amt" style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: '16px', width: '80px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{usd(r.amt)}</div>
                  </div>
                ))}

                <div className="total-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 0', borderTop: '2px solid var(--line)', marginTop: '8px' }}>
                  <span className="k" style={{ fontWeight: 700, fontSize: '16px' }}>Total vs budget</span>
                  <span className={`v ${results.diff >= 0 ? 'under' : 'over'}`} style={{ fontFamily: "'Fraunces', serif", fontSize: '22px', fontWeight: 600, color: results.diff >= 0 ? 'var(--green, #0b6b53)' : '#a63a1d' }}>
                    {results.diff >= 0 ? '✅ ' + usd(results.diff) + ' remaining' : '⚠ ' + usd(-results.diff) + ' over'}
                  </span>
                </div>

                {Math.abs(results.totalPct - 100) > 0.5 && (
                  <p style={{ fontSize: '12.5px', color: '#a63a1d', marginTop: '10px', marginBottom: 0 }}>
                    ⚠ Your percentages add up to {results.totalPct.toFixed(0)}% — adjust to reach 100%.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="ad-slot" data-ad="mid">Ad · In-content Responsive</div>

        <article className="calc-content">
          <h2>Average wedding costs in the US</h2>
          <p>The average US wedding costs around $30,000–$35,000 in 2026, but costs vary enormously by region. New York and California weddings average over $50,000; Midwest weddings can come in well under $20,000 for the same headcount.</p>
          
          <h3>Where most of the money goes</h3>
          <ul>
            <li><strong>Venue + catering</strong>: typically 45–50% of total budget — the biggest lever.</li>
            <li><strong>Photography/videography</strong>: 10–12% — the memories you keep forever.</li>
            <li><strong>Music/entertainment</strong>: 8–10%.</li>
            <li><strong>Flowers/décor</strong>: 8–10%.</li>
          </ul>
          
          <h3>Ways to save</h3>
          <ul>
            <li>Reduce guest count — each guest typically costs $150–300 in food and drink alone.</li>
            <li>Choose an off-peak date (Friday evening, Sunday, winter months).</li>
            <li>Prioritize 2–3 things that matter most; cut everywhere else.</li>
          </ul>
          <p className="disclaimer">Budget percentages are illustrative averages. Actual costs vary significantly by region, vendor, and personal choices.</p>
        </article>

        <div className="ad-slot" data-ad="bottom">Ad · Responsive</div>

        <CalculatorFooter />
      </div>
    </div>
  );
}
