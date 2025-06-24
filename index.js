
import { ethers } from "ethers";
import dotenv from "dotenv";

dotenv.config();

const {
  RPC_URL,
  PRIVATE_KEYS,
  ROUTER_ADDRESS,
  TOKEN_IN,
  TOKEN_OUT,
} = process.env;

const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
const privateKeys = PRIVATE_KEYS.split(",");

// Router ABI (Uniswap V2-like)
const ROUTER_ABI = [
  "function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory)",
];

// ERC20 minimal ABI
const ERC20_ABI = [
  "function approve(address spender, uint amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint)",
  "function balanceOf(address account) external view returns (uint)",
  "function decimals() external view returns (uint8)"
];

// Setting swap
const AMOUNT_TO_SWAP = "1"; // tokenIn amount (as string)
const SWAP_COUNT = 5;       // total swap per wallet
const DELAY_MS = 4000;      // delay antar swap (ms)

// Delay function
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function checkBalance(token, wallet, minAmount) {
  const balance = await token.balanceOf(wallet.address);
  if (balance.lt(minAmount)) {
    console.log(`⛔ [${wallet.address}] Saldo tidak cukup: ${ethers.utils.formatUnits(balance)} token`);
    return false;
  }
  return true;
}

async function performSwap(wallet, router, tokenIn, tokenOut) {
  const decimals = await tokenIn.decimals();
  const amountIn = ethers.utils.parseUnits(AMOUNT_TO_SWAP, decimals);
  const minAmountOut = 0; // tidak peduli slippage (testnet only)

  // Cek saldo
  const hasBalance = await checkBalance(tokenIn, wallet, amountIn);
  if (!hasBalance) return;

  // Cek allowance & approve jika perlu
  const allowance = await tokenIn.allowance(wallet.address, router.address);
  if (allowance.lt(amountIn)) {
    console.log(`🔓 [${wallet.address}] Approving token...`);
    const approveTx = await tokenIn.approve(router.address, ethers.constants.MaxUint256);
    await approveTx.wait();
    console.log(`✅ [${wallet.address}] Token approved`);
  }

  // Lakukan swap
  const path = [tokenIn.address, tokenOut.address];
  const deadline = Math.floor(Date.now() / 1000) + 1800; // 30 menit

  const tx = await router.swapExactTokensForTokens(
    amountIn,
    minAmountOut,
    path,
    wallet.address,
    deadline,
    { gasLimit: 300000 }
  );

  console.log(`🔁 [${wallet.address}] Swap sent: ${tx.hash}`);
  const receipt = await tx.wait();
  console.log(`✅ [${wallet.address}] Swap confirmed in block ${receipt.blockNumber}`);
}

async function main() {
  for (const pk of privateKeys) {
    const wallet = new ethers.Wallet(pk, provider);
    console.log(`\n🔐 Akun: ${wallet.address}`);

    const tokenIn = new ethers.Contract(TOKEN_IN, ERC20_ABI, wallet);
    const tokenOut = new ethers.Contract(TOKEN_OUT, ERC20_ABI, wallet);
    const router = new ethers.Contract(ROUTER_ADDRESS, ROUTER_ABI, wallet);

    for (let i = 0; i < SWAP_COUNT; i++) {
      console.log(`\n🚀 Swap ke-${i + 1} untuk ${wallet.address}`);
      try {
        await performSwap(wallet, router, tokenIn, tokenOut);
      } catch (err) {
        console.error(`❌ Gagal swap ke-${i + 1}:`, err.message);
      }
      await delay(DELAY_MS);
    }
  }
}

main().catch(console.error);
