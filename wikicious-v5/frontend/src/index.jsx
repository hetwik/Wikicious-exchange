import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import '@rainbow-me/rainbowkit/styles.css';
import { wagmiConfig } from './config';
import './index.css';

import TradePage              from './pages/TradePage';
import MarketsPage            from './pages/MarketsPage';
import SpotTradingPage        from './pages/SpotTradingPage';
import SwapPage               from './pages/SwapPage';
import ForexPage              from './pages/ForexPage';
import MetalsPage             from './pages/MetalsPage';
import OrderBookPage          from './pages/OrderBookPage';
import IndexPerpsPage         from './pages/IndexPerpsPage';
import PortfolioMarginPage    from './pages/PortfolioMarginPage';
import VirtualAMMPage         from './pages/VirtualAMMPage';
import OTCDeskPage            from './pages/OTCDeskPage';
import PermissionlessMarketsPage from './pages/PermissionlessMarketsPage';
import RWAMarketPage          from './pages/RWAMarketPage';
import BotHubPage             from './pages/BotHubPage';
import AlgoTradingPage        from './pages/AlgoTradingPage';
import CopyTradingPage        from './pages/CopyTradingPage';
import RebalancingBotsPage    from './pages/RebalancingBotsPage';
import WalletPage             from './pages/WalletPage';
import SmartWalletPage        from './pages/SmartWalletPage';
import StakingPage            from './pages/StakingPage';
import LiquidStakingPage      from './pages/LiquidStakingPage';
import LendingPage            from './pages/LendingPage';
import YieldSlicingPage       from './pages/YieldSlicingPage';
import OptionsVaultsPage      from './pages/OptionsVaultsPage';
import StrategyVaultsPage     from './pages/StrategyVaultsPage';
import ManagedVaultsPage      from './pages/ManagedVaultsPage';
import LiquidRestakingPage    from './pages/LiquidRestakingPage';
import FundingArbPage         from './pages/FundingArbPage';
import InsuranceYieldPage     from './pages/InsuranceYieldPage';
import PoolPage               from './pages/PoolPage';
import LiquidityPoolsPage     from './pages/LiquidityPoolsPage';
import POLPage                from './pages/POLPage';
import ZapPage                from './pages/ZapPage';
import MakerRebatePage        from './pages/MakerRebatePage';
import MakerRewardsPage       from './pages/MakerRewardsPage';
import VolumeTiersPage        from './pages/VolumeTiersPage';
import BridgePage             from './pages/BridgePage';
import CrossChainPage         from './pages/CrossChainPage';
import LaunchpadPage          from './pages/LaunchpadPage';
import LaunchPoolPage         from './pages/LaunchPoolPage';
import IEOPlatformPage        from './pages/IEOPlatformPage';
import PropChallengePage      from './pages/PropChallengePage';
import TraderPassPage         from './pages/TraderPassPage';
import TraderSubscriptionPage from './pages/TraderSubscriptionPage';
import AnalyticsPage          from './pages/AnalyticsPage';
import RevenueDashboardPage   from './pages/RevenueDashboardPage';
import RevenueSplitterPage    from './pages/RevenueSplitterPage';
import KaasDashboardPage      from './pages/KaasDashboardPage';
import BuybackBurnPage        from './pages/BuybackBurnPage';
import LiqInsurancePage       from './pages/LiqInsurancePage';
import ExternalInsurancePage  from './pages/ExternalInsurancePage';
import AIGuardrailsPage       from './pages/AIGuardrailsPage';
import WhiteLabelPage         from './pages/WhiteLabelPage';
import DAOTreasuryPage        from './pages/DAOTreasuryPage';
import GasRebatePage          from './pages/GasRebatePage';
import AgenticDAOPage         from './pages/AgenticDAOPage';
import InstitutionalPage      from './pages/InstitutionalPage';
import FiatOnRampPage         from './pages/FiatOnRampPage';
import PredictionMarketsPage  from './pages/PredictionMarketsPage';

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 10_000 } } });

function App() {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={darkTheme({ accentColor: '#5B7FFF', borderRadius: 'medium' })}>
          <BrowserRouter>
            <Routes>
              <Route path="/trade"              element={<Navigate to="/trade/BTCUSDT" replace />} />
              <Route path="/trade/:symbol"      element={<TradePage />} />
              <Route path="/markets"            element={<MarketsPage />} />
              <Route path="/spot"               element={<SpotTradingPage />} />
              <Route path="/swap"               element={<SwapPage />} />
              <Route path="/forex"              element={<ForexPage />} />
              <Route path="/metals"             element={<MetalsPage />} />
              <Route path="/orderbook"          element={<OrderBookPage />} />
              <Route path="/index-perps"        element={<IndexPerpsPage />} />
              <Route path="/portfolio-margin"   element={<PortfolioMarginPage />} />
              <Route path="/vamm"               element={<VirtualAMMPage />} />
              <Route path="/otc"                element={<OTCDeskPage />} />
              <Route path="/permissionless"     element={<PermissionlessMarketsPage />} />
              <Route path="/rwa"                element={<RWAMarketPage />} />
              <Route path="/bots"               element={<BotHubPage />} />
              <Route path="/algo-trading"       element={<AlgoTradingPage />} />
              <Route path="/copy-trading"       element={<CopyTradingPage />} />
              <Route path="/rebalancer"         element={<RebalancingBotsPage />} />
              <Route path="/wallet"             element={<WalletPage />} />
              <Route path="/smart-wallet"       element={<SmartWalletPage />} />
              <Route path="/staking"            element={<StakingPage />} />
              <Route path="/liquid-staking"     element={<LiquidStakingPage />} />
              <Route path="/lending"            element={<LendingPage />} />
              <Route path="/yield-slice"        element={<YieldSlicingPage />} />
              <Route path="/options-vaults"     element={<OptionsVaultsPage />} />
              <Route path="/strategy-vaults"    element={<StrategyVaultsPage />} />
              <Route path="/managed-vaults"     element={<ManagedVaultsPage />} />
              <Route path="/liquid-restaking"   element={<LiquidRestakingPage />} />
              <Route path="/funding-arb"        element={<FundingArbPage />} />
              <Route path="/insurance-yield"    element={<InsuranceYieldPage />} />
              <Route path="/pool"               element={<PoolPage />} />
              <Route path="/pools"              element={<LiquidityPoolsPage />} />
              <Route path="/pol"                element={<POLPage />} />
              <Route path="/zap"                element={<ZapPage />} />
              <Route path="/maker-rebates"      element={<MakerRebatePage />} />
              <Route path="/maker-rewards"      element={<MakerRewardsPage />} />
              <Route path="/volume-tiers"       element={<VolumeTiersPage />} />
              <Route path="/bridge"             element={<BridgePage />} />
              <Route path="/crosschain"         element={<CrossChainPage />} />
              <Route path="/launchpad"          element={<LaunchpadPage />} />
              <Route path="/launchpool"         element={<LaunchPoolPage />} />
              <Route path="/ieo"                element={<IEOPlatformPage />} />
              <Route path="/prop-challenge"     element={<PropChallengePage />} />
              <Route path="/trader-pass"        element={<TraderPassPage />} />
              <Route path="/subscriptions"      element={<TraderSubscriptionPage />} />
              <Route path="/analytics"          element={<AnalyticsPage />} />
              <Route path="/revenue"            element={<RevenueDashboardPage />} />
              <Route path="/revenue-splitter"   element={<RevenueSplitterPage />} />
              <Route path="/kaas"               element={<KaasDashboardPage />} />
              <Route path="/buyback-burn"       element={<BuybackBurnPage />} />
              <Route path="/liq-insurance"      element={<LiqInsurancePage />} />
              <Route path="/ext-insurance"      element={<ExternalInsurancePage />} />
              <Route path="/ai-guardrails"      element={<AIGuardrailsPage />} />
              <Route path="/white-label"        element={<WhiteLabelPage />} />
              <Route path="/dao-treasury"       element={<DAOTreasuryPage />} />
              <Route path="/gas-rebate"         element={<GasRebatePage />} />
              <Route path="/agentic-dao"        element={<AgenticDAOPage />} />
              <Route path="/institutional"      element={<InstitutionalPage />} />
              <Route path="/fiat-onramp"        element={<FiatOnRampPage />} />
              <Route path="/predictions"        element={<PredictionMarketsPage />} />
              <Route path="/"                   element={<Navigate to="/trade/BTCUSDT" replace />} />
              <Route path="*"                   element={<Navigate to="/trade/BTCUSDT" replace />} />
            
      <Route path="/affiliate"          element={<AffiliatePage />} />
      <Route path="/liquidation-market" element={<LiquidationMarketPage />} />
      <Route path="/index-basket"       element={<IndexBasketPage />} />
      <Route path="/token-vesting"      element={<TokenVestingPage />} />
      <Route path="/gauge-voting"       element={<GaugeVotingPage />} />
      </Routes>
          </BrowserRouter>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
