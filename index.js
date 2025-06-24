
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

// ABI router Uniswap-like
const ROUTER_ABI = [
  "function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory)",
];

// Token approve ABI
const ERC20_ABI = [
  "function approve(address spender, uint amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint)",
  "function balanceOf(address account) external view returns (uint)",
  "function decimals() view returns (uint8)",
];

const AMOUNT_TO_SWAP = "1"; // jumlah tokenIn yang di-swap
const SLIPPAGE = 0.05; // 5%
const SWAP_COUNT = 5; // jumlah swap per akun
const DELAY_MS = 5000;

const delay = ms => new Promise(res => setTimeout(res, ms));

async function performSwap(wallet, router, tokenIn, tokenOut) {
  const decimals = await tokenIn.decimals();
  const amountIn = ethers.utils.parseUnits(AMOUNT_TO_SWAP, decimals);
  const minAmountOut = amountIn.sub(amountIn.mul(SLIPPAGE * 100).div(100));

  // Approve token if needed
  const allowance = await tokenIn.allowance(wallet.address, router.address);
  if (allowance.lt(amountIn)) {
    const approveTx = await tokenIn.approve(router.address, ethers.constants.MaxUint256);
    console.log(`🟡 [${wallet.address}] Approving token...`);
    await approveTx.wait();
    console.log(`✅ [${wallet.address}] Token approved`);
  }

  const path = [tokenIn.address, tokenOut.address];
  const deadline = Math.floor(Date.now() / 1000) + 1800; // 30 menit

  const tx = await router.swapExactTokensForTokens(
    amountIn,
    minAmountOut,
    path,
    wallet.address,
    deadline,
    { gasLimit: 400000 }
  );

  console.log(`🔁 [${wallet.address}] Swap sent: ${tx.hash}`);
  const receipt = await tx.wait();
  console.log(`✅ [${wallet.address}] Swap confirmed in block ${receipt.blockNumber}`);
}

async function main() {
  for (const pk of privateKeys) {
    const wallet = new ethers.Wallet(pk, provider);
    console.log(`\n🔐 Menggunakan akun: ${wallet.address}`);

    const tokenIn = new ethers.Contract(TOKEN_IN, ERC20_ABI, wallet);
    const tokenOut = new ethers.Contract(TOKEN_OUT, ERC20_ABI, wallet);
    const router = new ethers.Contract(ROUTER_ADDRESS, ROUTER_ABI, wallet);

    for (let i = 0; i < SWAP_COUNT; i++) {
      console.log(`🚀 Swap ke-${i + 1} untuk ${wallet.address}`);
      try {
        await performSwap(wallet, router, tokenIn, tokenOut);
      } catch (err) {
        console.error(`❌ Gagal swap ke-${i + 1}:`, err.message);
				const balanceOk = await checkBalance(tokenIn, wallet, amountIn);
if (!balanceOk) return;
      }
      await delay(DELAY_MS);
    }
  }
}

main().catch(console.error);
