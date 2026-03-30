/**
 * ════════════════════════════════════════════════════════════════
 *  WIKICIOUS — Bots Screen
 *
 *  Main hub for the automated trading bot system.
 *  Three tabs:
 *    My Bots     — manage active bots, view PnL, start/pause/stop
 *    Marketplace — browse & create new bots from strategy templates
 *    Copy Trade  — browse master traders, subscribe to copy them
 * ════════════════════════════════════════════════════════════════
 */
import { useState } from 'react';
import { useAccount } from 'wagmi';
import MyBotsTab       from './MyBotsTab';
import StrategyMarket  from './StrategyMarket';
import CopyTradingTab  from '../copy/CopyTradingTab';

const TABS = [
  { key: 'my',       label: '🤖 My Bots'      },
  { key: 'market',   label: '⚡ Strategies'    },
  { key: 'copy',     label: '📋 Copy Trading'  },
];

export default function BotsScreen() {
  const [tab, setTab] = useState('my');
  const { address }   = useAccount();

  return (
    <div className="bots-screen">
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="bots-header">
        <div className="bots-title">
          <h1>Auto Trading</h1>
          <p>Set strategies, copy traders, and let the bots do the work.</p>
        </div>
        {!address && (
          <div className="bots-connect-notice">
            Connect wallet to create and manage bots
          </div>
        )}
      </div>

      {/* ── Tabs ────────────────────────────────────────────── */}
      <div className="bots-tabs">
        {TABS.map(t => (
          <button
            key={t.key}
            className={`bots-tab${tab === t.key ? ' active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab Content ─────────────────────────────────────── */}
      <div className="bots-content">
        {tab === 'my'     && <MyBotsTab     address={address} />}
        {tab === 'market' && <StrategyMarket address={address} />}
        {tab === 'copy'   && <CopyTradingTab address={address} />}
      </div>
    </div>
  );
}
