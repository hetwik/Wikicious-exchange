# Wikicious V5 — Security Policy

## Bug Bounty Program

We run a public bug bounty program on **Immunefi**. All valid vulnerabilities
receive rewards based on severity.

| Severity | Scope                                         | Reward         |
|----------|-----------------------------------------------|----------------|
| Critical | Direct loss of funds, unauthorized withdrawals | Up to $500,000 |
| High     | Temporary freeze, oracle manipulation, DoS     | Up to $50,000  |
| Medium   | Governance manipulation, price oracle issues   | Up to $10,000  |
| Low      | Non-critical bugs, informational findings      | Up to $1,000   |

**Immunefi page:** https://immunefi.com/bounty/wikicious (set up before mainnet)

### Scope

**In-scope contracts:**
- WikiVault.sol
- WikiPerp.sol
- WikiVirtualAMM.sol (100× max leverage)
- WikiOracle.sol
- WikiLending.sol
- WikiSpot.sol
- WikiBridge.sol
- WikiCrossChainRouter.sol
- WikiMultisigGuard.sol
- WikiTVLGuard.sol
- WikiRateLimiter.sol
- WikiStaking.sol
- WikiRevenueSplitter.sol

**Out of scope:**
- Frontend phishing attacks
- Spam/DoS of the API layer
- Issues requiring physical access to hardware
- Issues in third-party contracts (Chainlink, Pyth, LayerZero, Aave)

### Rules
- No testing on mainnet — use Arbitrum Sepolia testnet
- Responsible disclosure — do NOT share vulnerabilities publicly before fix
- First reporter gets the reward for duplicate reports
- Social engineering attacks are out of scope

### Disclosure Process
1. Email: security@wikicious.io
2. PGP key: [publish before launch]
3. Response within 24 hours
4. Fix timeline communicated within 72 hours
5. Reward paid within 7 days of fix deployment

---

## Security Architecture

### Access Control Hierarchy

```
WikiMultisigGuard (3-of-5)
  └── WikiTimelockController (48h delay)
        └── Contract Owner Functions
              ├── setOperator()
              ├── withdrawProtocolFees()
              ├── setWithdrawalLimits()
              └── setOracle()

WikiMultisigGuard (immediate — no timelock)
  └── pause() / unpause() / activateCircuitBreaker()
```

### TVL Staging

| Stage    | TVL Cap  | Access           |
|----------|----------|------------------|
| LAUNCH   | $500K    | Whitelist only   |
| BETA     | $5M      | Invite-only      |
| PUBLIC   | $50M     | Open             |
| GROWTH   | $500M    | Open             |
| UNLIMITED| No cap   | After 12+ months |

Stage advances require 3-of-5 multisig approval + 48h timelock.

### Key Security Invariants

1. **Vault solvency**: `contractBalance >= totalLocked + insuranceFund + protocolFees` always
2. **No user balance creation**: users can never withdraw more than they deposited
3. **Oracle bounds**: prices always validated between [minPrice, maxPrice] per Chainlink circuit breaker
4. **OI caps**: open interest per side is hard-capped per market
5. **Rate limits**: per-user max $100K/hour, global max $10M/hour withdrawals
6. **Timelock**: all governance actions with fund impact have 48h mandatory delay

### External Audits

| Auditor              | Date     | Report          | Scope                |
|----------------------|----------|-----------------|----------------------|
| [Pending — pre-launch] | Q2 2026 | TBD             | All core contracts   |
| [Planned — post-launch] | Q4 2026 | TBD            | New features         |

**We do not launch on mainnet until at least one professional audit is complete.**

### Known Limitations (Not Bugs)

- Guardian oracle prices are trusted — guardian compromise could allow price manipulation
  **Mitigation**: guardian is a hardware-secured multisig; TWAP validation bounds manipulation
- Chainlink feeds may be unavailable during L2 sequencer downtime
  **Mitigation**: sequencer uptime feed checked; Pyth fallback available
- vAMM virtual reserves can drift from market price during low-activity periods
  **Mitigation**: 8h funding rate pulls price toward oracle index price

### Deployment Checklist (Before Mainnet)

- [ ] Minimum one professional external audit published
- [ ] All audit findings resolved or explicitly accepted with rationale
- [ ] Immunefi bug bounty live with minimum $100K pool funded
- [ ] 3-of-5 Gnosis Safe multisig operational on hardware wallets
- [ ] TimelockController deployed and set as owner on all critical contracts
- [ ] TVLGuard set to LAUNCH stage ($500K cap, whitelist-only)
- [ ] Incident response playbook tested on testnet (`./scripts/incident_response.sh`)
- [ ] Oracle guardian set to multisig (not deployer EOA)
- [ ] Testnet deployment operational for minimum 2 weeks with no critical bugs
- [ ] $500K insurance fund pre-funded
