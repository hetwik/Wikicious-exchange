/**
 * ════════════════════════════════════════════════════════════════
 *  WIKICIOUS FRONTEND — Contract Hooks (wagmi v2)
 *
 *  All on-chain read and write operations go through these hooks.
 *  Built on wagmi v2 — every hook automatically handles:
 *  - Wallet connection state
 *  - Transaction confirmation
 *  - Error handling
 *
 *  Usage example:
 *    const { deposit, isPending, isSuccess } = useDeposit();
 *    deposit(100); // deposits 100 USDC
 * ════════════════════════════════════════════════════════════════
 */

import {
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  useAccount,
} from 'wagmi';
import { parseUnits, formatUnits, erc20Abi } from 'viem';
import { useCallback } from 'react';
import { CONTRACTS } from '../config';


// ════════════════════════════════════════════════════════════════
//  ABIs
//  Minimal — only the functions used in the frontend.
//  Full ABIs are in backend/src/config.js.
// ════════════════════════════════════════════════════════════════

const VAULT_ABI = [
  { name: 'deposit',      type: 'function', inputs: [{ type: 'uint256' }], outputs: [] },
  { name: 'withdraw',     type: 'function', inputs: [{ type: 'uint256' }], outputs: [] },
  { name: 'freeMargin',   type: 'function', stateMutability: 'view', inputs: [{ type: 'address' }], outputs: [{ type: 'uint256' }] },
  { name: 'lockedMargin', type: 'function', stateMutability: 'view', inputs: [{ type: 'address' }], outputs: [{ type: 'uint256' }] },
];

const PERP_ABI = [
  {
    name: 'placeMarketOrder', type: 'function',
    inputs: [
      { name: 'marketIndex', type: 'uint256' },
      { name: 'isLong',      type: 'bool'    },
      { name: 'collateral',  type: 'uint256' }, // USDC, 6 decimals
      { name: 'leverage',    type: 'uint256' },
      { name: 'takeProfit',  type: 'uint256' }, // price in 18 decimals, 0 to skip
      { name: 'stopLoss',    type: 'uint256' }, // price in 18 decimals, 0 to skip
    ],
    outputs: [{ name: 'orderId', type: 'uint256' }],
  },
  {
    name: 'placeLimitOrder', type: 'function',
    inputs: [
      { name: 'marketIndex', type: 'uint256' },
      { name: 'isLong',      type: 'bool'    },
      { name: 'collateral',  type: 'uint256' },
      { name: 'leverage',    type: 'uint256' },
      { name: 'limitPrice',  type: 'uint256' }, // price in 18 decimals
      { name: 'takeProfit',  type: 'uint256' },
      { name: 'stopLoss',    type: 'uint256' },
    ],
    outputs: [{ name: 'orderId', type: 'uint256' }],
  },
  { name: 'closePosition', type: 'function', inputs: [{ name: 'posId',    type: 'uint256' }], outputs: [] },
  { name: 'cancelOrder',   type: 'function', inputs: [{ name: 'orderId',  type: 'uint256' }], outputs: [] },
];

const AMM_ABI = [
  { name: 'addLiquidity',    type: 'function', inputs: [{ type: 'uint256' }], outputs: [{ type: 'uint256' }] },
  { name: 'removeLiquidity', type: 'function', inputs: [{ type: 'uint256' }], outputs: [{ type: 'uint256' }] },
  { name: 'getWLPPrice',     type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { name: 'totalSupply',     type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
];


// ════════════════════════════════════════════════════════════════
//  USDC Approval
//  Must be called before deposit or trade — USDC requires approval.
// ════════════════════════════════════════════════════════════════

/** Read current USDC allowance for a spender (e.g. WikiVault). */
export function useUSDCAllowance(spender) {
  const { address } = useAccount();
  return useReadContract({
    address:      CONTRACTS.USDC,
    abi:          erc20Abi,
    functionName: 'allowance',
    args:         [address, spender],
    query:        { enabled: !!address && !!spender },
  });
}

/** Approve USDC spending for a contract. */
export function useApproveUSDC() {
  const { writeContract, data, isPending }    = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: data });

  const approve = useCallback((spender, amount) => {
    writeContract({
      address:      CONTRACTS.USDC,
      abi:          erc20Abi,
      functionName: 'approve',
      args:         [spender, amount],
    });
  }, [writeContract]);

  return { approve, isPending: isPending || isConfirming, isSuccess };
}


// ════════════════════════════════════════════════════════════════
//  Vault — Deposit & Withdraw
// ════════════════════════════════════════════════════════════════

/** Read on-chain margin balance (free + locked) for a wallet. */
export function useVaultBalance(address) {
  const freeQuery = useReadContract({
    address:      CONTRACTS.WikiVault,
    abi:          VAULT_ABI,
    functionName: 'freeMargin',
    args:         [address],
    query:        { enabled: !!address },
  });

  const lockedQuery = useReadContract({
    address:      CONTRACTS.WikiVault,
    abi:          VAULT_ABI,
    functionName: 'lockedMargin',
    args:         [address],
    query:        { enabled: !!address },
  });

  return {
    freeMargin:   freeQuery.data   ? formatUnits(freeQuery.data,   6) : '0',
    lockedMargin: lockedQuery.data ? formatUnits(lockedQuery.data, 6) : '0',
    isLoading:    freeQuery.isLoading || lockedQuery.isLoading,
  };
}

/** Deposit USDC into the trading vault. Approve first with useApproveUSDC(). */
export function useDeposit() {
  const { writeContract, data, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess }     = useWaitForTransactionReceipt({ hash: data });

  const deposit = useCallback((usdcAmount) => {
    writeContract({
      address:      CONTRACTS.WikiVault,
      abi:          VAULT_ABI,
      functionName: 'deposit',
      args:         [parseUnits(String(usdcAmount), 6)],
    });
  }, [writeContract]);

  return { deposit, isPending: isPending || isConfirming, isSuccess, error, txHash: data };
}

/** Withdraw USDC from the trading vault back to your wallet. */
export function useWithdraw() {
  const { writeContract, data, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess }     = useWaitForTransactionReceipt({ hash: data });

  const withdraw = useCallback((usdcAmount) => {
    writeContract({
      address:      CONTRACTS.WikiVault,
      abi:          VAULT_ABI,
      functionName: 'withdraw',
      args:         [parseUnits(String(usdcAmount), 6)],
    });
  }, [writeContract]);

  return { withdraw, isPending: isPending || isConfirming, isSuccess, error, txHash: data };
}


// ════════════════════════════════════════════════════════════════
//  Perpetuals — Place & Manage Orders
// ════════════════════════════════════════════════════════════════

/**
 * Place market or limit orders.
 *
 * Example — market long 100 USDC at 10x on BTC:
 *   placeMarketOrder({ marketIndex: 0, isLong: true, collateral: 100, leverage: 10 })
 *
 * Example — limit short with TP/SL:
 *   placeLimitOrder({ marketIndex: 0, isLong: false, collateral: 50, leverage: 5,
 *                     limitPrice: 70000, takeProfit: 60000, stopLoss: 72000 })
 */
export function usePlaceOrder() {
  const { writeContract, data, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess }     = useWaitForTransactionReceipt({ hash: data });

  const placeMarketOrder = useCallback(({
    marketIndex,
    isLong,
    collateral,
    leverage,
    takeProfit = 0,
    stopLoss   = 0,
  }) => {
    writeContract({
      address:      CONTRACTS.WikiPerp,
      abi:          PERP_ABI,
      functionName: 'placeMarketOrder',
      args: [
        BigInt(marketIndex),
        isLong,
        parseUnits(String(collateral), 6),                            // USDC — 6 decimals
        BigInt(leverage),
        takeProfit ? parseUnits(String(takeProfit), 18) : 0n,         // price — 18 decimals
        stopLoss   ? parseUnits(String(stopLoss),   18) : 0n,
      ],
    });
  }, [writeContract]);

  const placeLimitOrder = useCallback(({
    marketIndex,
    isLong,
    collateral,
    leverage,
    limitPrice,
    takeProfit = 0,
    stopLoss   = 0,
  }) => {
    writeContract({
      address:      CONTRACTS.WikiPerp,
      abi:          PERP_ABI,
      functionName: 'placeLimitOrder',
      args: [
        BigInt(marketIndex),
        isLong,
        parseUnits(String(collateral), 6),
        BigInt(leverage),
        parseUnits(String(limitPrice), 18),
        takeProfit ? parseUnits(String(takeProfit), 18) : 0n,
        stopLoss   ? parseUnits(String(stopLoss),   18) : 0n,
      ],
    });
  }, [writeContract]);

  return { placeMarketOrder, placeLimitOrder, isPending: isPending || isConfirming, isSuccess, error, txHash: data };
}

/** Close an open position by position ID. */
export function useClosePosition() {
  const { writeContract, data, isPending } = useWriteContract();
  const { isSuccess }                       = useWaitForTransactionReceipt({ hash: data });

  const close = useCallback((posId) => {
    writeContract({
      address:      CONTRACTS.WikiPerp,
      abi:          PERP_ABI,
      functionName: 'closePosition',
      args:         [BigInt(posId)],
    });
  }, [writeContract]);

  return { close, isPending, isSuccess, txHash: data };
}

/** Cancel a pending limit order by order ID. */
export function useCancelOrder() {
  const { writeContract, data, isPending } = useWriteContract();
  const { isSuccess }                       = useWaitForTransactionReceipt({ hash: data });

  const cancel = useCallback((orderId) => {
    writeContract({
      address:      CONTRACTS.WikiPerp,
      abi:          PERP_ABI,
      functionName: 'cancelOrder',
      args:         [BigInt(orderId)],
    });
  }, [writeContract]);

  return { cancel, isPending, isSuccess, txHash: data };
}


// ════════════════════════════════════════════════════════════════
//  AMM Pool — Add / Remove Liquidity
// ════════════════════════════════════════════════════════════════

/** Read current WLP token price in USDC. */
export function useWLPPrice() {
  return useReadContract({
    address:      CONTRACTS.WikiAMM,
    abi:          AMM_ABI,
    functionName: 'getWLPPrice',
  });
}

/** Add USDC liquidity to the pool. Receive WLP tokens in return. */
export function useAddLiquidity() {
  const { writeContract, data, isPending } = useWriteContract();
  const { isSuccess }                       = useWaitForTransactionReceipt({ hash: data });

  const add = useCallback((usdcAmount) => {
    writeContract({
      address:      CONTRACTS.WikiAMM,
      abi:          AMM_ABI,
      functionName: 'addLiquidity',
      args:         [parseUnits(String(usdcAmount), 6)],
    });
  }, [writeContract]);

  return { add, isPending, isSuccess, txHash: data };
}

/** Remove liquidity by burning WLP tokens. Receive USDC in return. */
export function useRemoveLiquidity() {
  const { writeContract, data, isPending } = useWriteContract();
  const { isSuccess }                       = useWaitForTransactionReceipt({ hash: data });

  const remove = useCallback((wlpAmount) => {
    writeContract({
      address:      CONTRACTS.WikiAMM,
      abi:          AMM_ABI,
      functionName: 'removeLiquidity',
      args:         [parseUnits(String(wlpAmount), 18)], // WLP — 18 decimals
    });
  }, [writeContract]);

  return { remove, isPending, isSuccess, txHash: data };
}
