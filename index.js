import { ethers } from "ethers";
import dotenv from "dotenv";
dotenv.config();

const routerAbi = [
  {
    name: "swapExactTokensForTokens",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "amountIn", type: "uint256" },
      { name: "amountOutMin", type: "uint256" },
      { name: "path", type: "address[]" },
      { name: "to", type: "address" },
      { name: "deadline", type: "uint256" }
    ],
    outputs: [{ name: "amounts", type: "uint256[]" }]
  },
  {
    name: "swapExactETHForTokens",
    type: "function",
    stateMutability: "payable",
    inputs: [
      { name: "amountOutMin", type: "uint256" },
      { name: "path", type: "address[]" },
      { name: "to", type: "address" },
      { name: "deadline", type: "uint256" }
    ],
    outputs: [{ name: "amounts", type: "uint256[]" }]
  },
  {
    name: "swapExactTokensForETH",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "amountIn", type: "uint256" },
      { name: "amountOutMin", type: "uint256" },
      { name: "path", type: "address[]" },
      { name: "to", type: "address" },
      { name: "deadline", type: "uint256" }
    ],
    outputs: [{ name: "amounts", type: "uint256[]" }]
  }
];

const ETH_PLACEHOLDER = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";

async function swapForWallet(privateKey) {
  const provider = new ethers.JsonRpcProvider(process.env.MEGAETH_RPC_URL);
  const wallet = new ethers.Wallet(privateKey, provider);
  const router = new ethers.Contract(process.env.GTE_ROUTER_ADDRESS, routerAbi, wallet);

  const tokenIn = process.env.TOKEN_IN_ADDRESS.toLowerCase();
  const tokenOut = process.env.TOKEN_OUT_ADDRESS.toLowerCase();
  const isETHIn = tokenIn === ETH_PLACEHOLDER;
  const isETHOut = tokenOut === ETH_PLACEHOLDER;
  const decimals = parseInt(process.env.TOKEN_IN_DECIMALS);
  const amountIn = ethers.parseUnits(process.env.AMOUNT_IN, decimals);
  const deadline = Math.floor(Date.now() / 1000) + 60 * 10;
  const path = isETHIn
    ? [ethers.ZeroAddress, tokenOut]
    : isETHOut
    ? [tokenIn, ethers.ZeroAddress]
    : [tokenIn, tokenOut];

  console.log(`🚀 Swap untuk wallet: ${wallet.address}`);

  try {
    if (!isETHIn) {
      const erc20Abi = ["function approve(address spender, uint256 amount) external returns (bool)"];
      const tokenContract = new ethers.Contract(tokenIn, erc20Abi, wallet);
      const approveTx = await tokenContract.approve(process.env.GTE_ROUTER_ADDRESS, amountIn);
      console.log(`✅ Approve TX: ${approveTx.hash}`);
      await approveTx.wait();
    }

    let tx;
    if (isETHIn) {
      tx = await router.swapExactETHForTokens(0, path, wallet.address, deadline, {
        value: amountIn,
        gasLimit: 300000
      });
    } else if (isETHOut) {
      tx = await router.swapExactTokensForETH(amountIn, 0, path, wallet.address, deadline, {
        gasLimit: 300000
      });
    } else {
      tx = await router.swapExactTokensForTokens(amountIn, 0, path, wallet.address, deadline, {
        gasLimit: 300000
      });
    }

    console.log(`🔁 Swap TX: ${tx.hash}`);
    const receipt = await tx.wait();
    console.log(`✅ Berhasil swap pada block: ${receipt.blockNumber}\n`);
  } catch (error) {
    console.error(`❌ Gagal untuk ${wallet.address}:`, error.message);
  }
}

async function main() {
  const privateKeys = process.env.PRIVATE_KEYS.split(",");
  for (const pk of privateKeys) {
    await swapForWallet(pk.trim());
  }
}

main().catch(console.error);
