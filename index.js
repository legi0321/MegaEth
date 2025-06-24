
import { ethers } from "ethers";
import dotenv from "dotenv";

dotenv.config();

const {
  RPC_URL,
  PRIVATE_KEYS,
  ROUTER_ADDRESS,
  TOKEN_OUT
} = process.env;

const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
const privateKeys = PRIVATE_KEYS.split(",");

const ROUTER_ABI = [
  "function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) payable external returns (uint[] memory)"
];

const ERC20_ABI = [
  "function decimals() view returns (uint8)"
];

// 🔁 Ganti nilai ini sesuai keinginan kamu:
const AMOUNT_ETH_TO_SWAP = "0.0032"; // <- langsung edit di sini

const SWAP_COUNT = 5;
const DELAY_MS = 4000;
const delay = ms => new Promise(res => setTimeout(res, ms));

async function performEthToTokenSwap(wallet, router, tokenOut) {
  const amountInETH = ethers.utils.parseEther(AMOUNT_ETH_TO_SWAP);
  const balance = await wallet.getBalance();

  if (balance.lt(amountInETH)) {
    console.log(`⛔ [${wallet.address}] Saldo ETH tidak cukup (${ethers.utils.formatEther(balance)} ETH)`);
    return;
  }

  const path = ["0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", tokenOut.address];
  const deadline = Math.floor(Date.now() / 1000) + 1800;

  try {
    const tx = await router.swapExactETHForTokens(
      0,
      path,
      wallet.address,
      deadline,
      {
        value: amountInETH,
        gasLimit: 300000
      }
    );
    console.log(`🔁 [${wallet.address}] Swap ${AMOUNT_ETH_TO_SWAP} ETH sent: ${tx.hash}`);
    const receipt = await tx.wait();
    console.log(`✅ Swap sukses di blok ${receipt.blockNumber}`);
  } catch (err) {
    console.error(`❌ Gagal swap:`, err.message);
  }
}

async function main() {
  for (const pk of privateKeys) {
    const wallet = new ethers.Wallet(pk, provider);
    console.log(`\n🔐 Akun: ${wallet.address}`);

    const tokenOut = new ethers.Contract(TOKEN_OUT, ERC20_ABI, provider);
    const router = new ethers.Contract(ROUTER_ADDRESS, ROUTER_ABI, wallet);

    for (let i = 0; i < SWAP_COUNT; i++) {
      console.log(`\n🚀 Swap ETH ke-${i + 1} untuk ${wallet.address}`);
      await performEthToTokenSwap(wallet, router, tokenOut);
      await delay(DELAY_MS);
    }
  }
}

main().catch(console.error);
