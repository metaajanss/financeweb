"use client";

import React, { useState, useEffect } from 'react';
import '../calculator.css';
import { useAds } from '@/shared/hooks/use-ads';
import { CalculatorFooter } from '@/shared/components/layout/CalculatorFooter';

interface Lot {
  id: string;
  coin: string;
  buy: number | string;
  sell: number | string;
  qty: number | string;
}

export default function CryptoProfitCalculator() {
  useAds();

  const [lots, setLots] = useState<Lot[]>([
    { id: '1', coin: 'BTC', buy: 38000, sell: 67000, qty: 0.5 },
    { id: '2', coin: 'ETH', buy: 2100, sell: 3400, qty: 3 },
  ]);
  const [holdType, setHoldType] = useState('long');
  const [bracket, setBracket] = useState('0.22');
  const [results, setResults] = useState<any>(null);

  const addLot = () => {
    setLots([...lots, { id: Math.random().toString(), coin: '', buy: '', sell: '', qty: '' }]);
  };

  const removeLot = (id: string) => {
    setLots(lots.filter(l => l.id !== id));
  };

  const updateLot = (id: string, field: keyof Lot, val: string) => {
    setLots(lots.map(l => l.id === id ? { ...l, [field]: val } : l));
  };

  const ltcgRate = (b: string) => {
    const val = parseFloat(b);
    if (val <= 0.12) return 0;
    if (val <= 0.35) return 0.15;
    return 0.20;
  };

  const usd = (n: number) => (n < 0 ? '-$' : '$') + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const pct = (n: number) => (n >= 0 ? '+' : '') + n.toFixed(2) + '%';

  const handleCalc = () => {
    const validLots = lots.map(l => ({
      coin: l.coin || 'Lot',
      buy: parseFloat(String(l.buy)) || 0,
      sell: parseFloat(String(l.sell)) || 0,
      qty: parseFloat(String(l.qty)) || 0
    })).filter(l => l.qty > 0 && l.buy > 0);

    if (validLots.length === 0) {
      setResults({ error: 'Add at least one lot with a buy price and quantity.' });
      return;
    }

    const taxRate = holdType === 'long' ? ltcgRate(bracket) : parseFloat(bracket);

    let totalCost = 0, totalProceeds = 0, totalGain = 0;
    const rows = validLots.map(l => {
      const cost = l.buy * l.qty;
      const proceeds = l.sell * l.qty;
      const gain = proceeds - cost;
      const roi = (gain / cost) * 100;
      totalCost += cost;
      totalProceeds += proceeds;
      totalGain += gain;
      return { coin: l.coin, cost, proceeds, gain, roi };
    });

    const taxOwed = totalGain > 0 ? totalGain * taxRate : 0;
    const netAfterTax = totalProceeds - totalCost - taxOwed;
    const isGain = totalGain >= 0;
    const totalRoi = (totalGain / totalCost) * 100;

    setResults({
      rows,
      totalCost,
      totalProceeds,
      totalGain,
      taxOwed,
      netAfterTax,
      isGain,
      totalRoi,
      taxRate
    });
  };

  useEffect(() => {
    handleCalc();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="calc-container">
      <div className="calc-wrap">
        <header className="calc-header">
          <div className="calc-brand"><span className="dot"></span> PayoffLab</div>
        </header>

        <section className="calc-hero">
          <div className="calc-eyebrow">Crypto Tax Planner</div>
          <h1>Crypto <em>Profit</em> Calculator</h1>
          <p className="calc-lede">Enter your buy and sell prices to calculate capital gain or loss, cost basis, ROI, and an estimated tax — for a single trade or multiple lots. Runs entirely in your browser.</p>
        </section>

        <div className="ad-slot" data-ad="top">Ad · Leaderboard 728×90</div>

        <div className="calc-grid">
          <div className="calc-card">
            <h2>Your trade(s)</h2>
            <div className="sub">Add one lot per purchase. Enter buy price, sell price, and quantity.</div>

            <div className="debt-row head" style={{ gridTemplateColumns: '1fr 1fr 1fr 1fr 28px' }}>
              <span>Coin</span><span>Buy price</span><span>Sell price</span><span>Qty</span><span></span>
            </div>
            
            <div id="lots">
              {lots.map(l => (
                <div key={l.id} className="debt-row" style={{ gridTemplateColumns: '1fr 1fr 1fr 1fr 28px' }}>
                  <input type="text" placeholder="BTC" value={l.coin} onChange={e => updateLot(l.id, 'coin', e.target.value)} />
                  <input type="number" placeholder="Buy $" min="0" step="0.01" value={l.buy} onChange={e => updateLot(l.id, 'buy', e.target.value)} />
                  <input type="number" placeholder="Sell $" min="0" step="0.01" value={l.sell} onChange={e => updateLot(l.id, 'sell', e.target.value)} />
                  <input type="number" placeholder="0" min="0" step="0.0001" value={l.qty} onChange={e => updateLot(l.id, 'qty', e.target.value)} />
                  <button className="rm-btn" title="Remove" onClick={() => removeLot(l.id)}>×</button>
                </div>
              ))}
            </div>
            <button className="add-btn" onClick={addLot}>+ Add another lot</button>

            <div className="extra-row" style={{ marginTop: '20px', paddingTop: '18px', borderTop: '1px solid var(--line)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '13px' }}>
                <label className="field" style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: 'var(--muted)', fontWeight: 600 }}>Hold period
                  <select 
                    value={holdType} 
                    onChange={e => setHoldType(e.target.value)}
                    style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: '15px', padding: '11px', borderRadius: '9px', border: '1px solid var(--line)', width: '100%' }}
                  >
                    <option value="long">Long-term (&gt;1 year)</option>
                    <option value="short">Short-term (≤1 year)</option>
                  </select>
                </label>
                <label className="field" style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: 'var(--muted)', fontWeight: 600 }}>Tax bracket
                  <select 
                    value={bracket} 
                    onChange={e => setBracket(e.target.value)}
                    style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: '15px', padding: '11px', borderRadius: '9px', border: '1px solid var(--line)', width: '100%' }}
                  >
                    <option value="0.10">10%</option>
                    <option value="0.12">12%</option>
                    <option value="0.22">22%</option>
                    <option value="0.24">24%</option>
                    <option value="0.32">32%</option>
                    <option value="0.35">35%</option>
                    <option value="0.37">37%</option>
                  </select>
                </label>
              </div>
              <p style={{ fontSize: '12.5px', color: 'var(--muted)', marginTop: '10px' }}>Long-term gains are taxed at 0%, 15%, or 20% regardless of income bracket. Short-term gains are taxed at your ordinary income rate above.</p>
            </div>

            <button className="calc-btn" onClick={handleCalc}>Calculate profit & tax →</button>
          </div>

          <div id="results">
            {!results ? (
              <div className="calc-card"><div className="placeholder">Calculating...</div></div>
            ) : results.error ? (
              <div className="calc-card"><div className="placeholder">{results.error}</div></div>
            ) : (
              <>
                <div className="verdict" style={{ borderColor: results.isGain ? 'var(--aval)' : 'var(--snow)' }}>
                  <h3>{results.isGain ? 'Capital gain' : 'Capital loss'}</h3>
                  <div className="big" style={{ color: results.isGain ? 'var(--aval)' : 'var(--snow)' }}>
                    {usd(results.totalGain)}
                  </div>
                  <p>Estimated {holdType}-term tax at {(results.taxRate * 100).toFixed(0)}%: <strong>{usd(results.taxOwed)}</strong> · Net after tax: <strong>{usd(results.netAfterTax)}</strong></p>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginTop: '16px' }}>
                  <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: '11px', padding: '15px' }}>
                    <div style={{ fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--muted)', fontWeight: 700, marginBottom: '7px' }}>Total cost basis</div>
                    <div style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(17px, 2.8vw, 22px)', fontWeight: 600 }}>{usd(results.totalCost)}</div>
                  </div>
                  <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: '11px', padding: '15px' }}>
                    <div style={{ fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--muted)', fontWeight: 700, marginBottom: '7px' }}>Total proceeds</div>
                    <div style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(17px, 2.8vw, 22px)', fontWeight: 600 }}>{usd(results.totalProceeds)}</div>
                  </div>
                  <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: '11px', padding: '15px' }}>
                    <div style={{ fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--muted)', fontWeight: 700, marginBottom: '7px' }}>Total ROI</div>
                    <div style={{ color: results.isGain ? 'var(--aval)' : 'var(--snow)', fontFamily: "'Fraunces', serif", fontSize: 'clamp(17px, 2.8vw, 22px)', fontWeight: 600 }}>{pct(results.totalRoi)}</div>
                  </div>
                </div>

                {results.rows.length > 1 && (
                  <div style={{ marginTop: '18px', overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13.5px' }}>
                      <thead>
                        <tr>
                          <th style={{ background: 'var(--aval-soft)', padding: '9px 12px', textAlign: 'left', fontWeight: 700, fontFamily: "'Fraunces', serif" }}>Coin</th>
                          <th style={{ background: 'var(--aval-soft)', padding: '9px 12px', textAlign: 'right', fontWeight: 700, fontFamily: "'Fraunces', serif" }}>Cost basis</th>
                          <th style={{ background: 'var(--aval-soft)', padding: '9px 12px', textAlign: 'right', fontWeight: 700, fontFamily: "'Fraunces', serif" }}>Proceeds</th>
                          <th style={{ background: 'var(--aval-soft)', padding: '9px 12px', textAlign: 'right', fontWeight: 700, fontFamily: "'Fraunces', serif" }}>Gain / Loss</th>
                          <th style={{ background: 'var(--aval-soft)', padding: '9px 12px', textAlign: 'right', fontWeight: 700, fontFamily: "'Fraunces', serif" }}>ROI</th>
                        </tr>
                      </thead>
                      <tbody>
                        {results.rows.map((r: any, i: number) => (
                          <tr key={i}>
                            <td style={{ padding: '8px 12px', borderBottom: '1px solid var(--line)', textAlign: 'left', fontWeight: 600 }}>{r.coin}</td>
                            <td style={{ padding: '8px 12px', borderBottom: '1px solid var(--line)', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{usd(r.cost)}</td>
                            <td style={{ padding: '8px 12px', borderBottom: '1px solid var(--line)', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{usd(r.proceeds)}</td>
                            <td style={{ padding: '8px 12px', borderBottom: '1px solid var(--line)', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: r.gain >= 0 ? 'var(--aval)' : 'var(--snow)', fontWeight: 700 }}>{usd(r.gain)}</td>
                            <td style={{ padding: '8px 12px', borderBottom: '1px solid var(--line)', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: r.roi >= 0 ? 'var(--aval)' : 'var(--snow)', fontWeight: 700 }}>{pct(r.roi)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div className="ad-slot" data-ad="mid">Ad · In-content Responsive</div>

        <article className="calc-content">
          <h2>How crypto capital gains tax works</h2>
          <p>The IRS treats cryptocurrency as property, not currency. Every time you sell, trade, or spend crypto, you trigger a <strong>taxable event</strong>. Your gain or loss is the difference between what you received and your original cost basis.</p>

          <h3>Short-term vs long-term rates</h3>
          <p>If you hold for <strong>12 months or less</strong>, the gain is short-term and taxed at your regular income rate (10–37%). Hold for <strong>more than 12 months</strong> and it&apos;s long-term, taxed at a preferential rate of 0%, 15%, or 20% depending on total income. The difference can be substantial — this is why timing a sale matters.</p>

          <h3>2026 long-term capital gains rates</h3>
          <ul>
            <li><strong>0%</strong> — single filers under $48,350; married under $96,700.</li>
            <li><strong>15%</strong> — single $48,350–$533,400; married $96,700–$600,050.</li>
            <li><strong>20%</strong> — above those thresholds.</li>
          </ul>

          <h3>How to reduce your crypto tax bill</h3>
          <ul>
            <li><strong>Hold more than a year</strong> before selling to qualify for long-term rates.</li>
            <li><strong>Harvest losses</strong> — sell coins that are down to offset gains from winning trades.</li>
            <li><strong>Specific identification</strong> — when selling part of a lot, you can identify which coins you&apos;re selling (e.g., the highest-cost lot) to minimize gain.</li>
          </ul>

          <h2>Frequently asked questions</h2>
          <div className="calc-faq">
            <details><summary>Do I owe taxes if I just hold and don&apos;t sell?</summary><p>No. Holding crypto is not a taxable event. You only owe tax when you sell, trade, or otherwise dispose of it.</p></details>
            <details><summary>What if I moved crypto between my own wallets?</summary><p>Transferring between your own wallets is not a taxable event. You only trigger taxes when you sell or exchange for another asset.</p></details>
            <details><summary>Is this data saved?</summary><p>No. Everything runs locally in your browser. Nothing is stored or sent anywhere.</p></details>
          </div>
          <p className="disclaimer">For educational and estimation purposes only; not tax advice. Crypto tax rules are complex and change frequently. Consult a qualified tax professional or crypto tax software for your actual filing.</p>
        </article>

        <div className="ad-slot" data-ad="bottom">Ad · Responsive</div>

        <CalculatorFooter />
      </div>
    </div>
  );
}
