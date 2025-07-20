const hre = require("hardhat");
const chalk = require("chalk");
const chronosArtifact = require("../chronos.json");

async function main() {
  console.log(chalk.cyan.bold("      _  _         _        _   _         _           _   "));
  console.log(chalk.cyan.bold("     | || |___  __| |___ __| |_| |_ ___  | |__ _ _ __| |_ "));
  console.log(chalk.cyan.bold("     | __ / _ \/ _` / -_) _|  _|  _/ _ \ | / _` | '_ \  _| "));
  console.log(chalk.cyan.bold("     |_||_\___/\__,_\___\__|\__|\__\___/ |_\__,_| .__/\__|"));
  console.log(chalk.cyan.bold("                                               |_|      "));
  console.log(chalk.yellow("============================================================"));
  console.log(chalk.yellow("        Chronos Task Scheduling Script        "));
  console.log(chalk.yellow("============================================================\n"));

  const lotteryAddress = "YOUR_DEPLOYED_CONTRACT_ADDRESS"; // Replace with your contract address
  const chronosAddress = "0x0000000000000000000000000000000000000830";

  if (lotteryAddress === "YOUR_DEPLOYED_CONTRACT_ADDRESS") {
    console.error(chalk.red.bold("❌ Please replace 'YOUR_DEPLOYED_CONTRACT_ADDRESS' with your actual contract address in scripts/schedule.js"));
    process.exit(1);
  }

  console.log(chalk.blue.bold("▶️  Starting Chronos Task Scheduling...\n"));

  const [deployer] = await hre.ethers.getSigners();
  const network = await hre.ethers.provider.getNetwork();
  const balance = await hre.ethers.provider.getBalance(deployer.address);

  console.log(chalk.white.bold("Network:"));
  console.log(chalk.cyan(`  Name: ${network.name}`));
  console.log(chalk.cyan(`  Chain ID: ${network.chainId}`));
  console.log(chalk.white.bold("\nScheduler Account:"));
  console.log(chalk.cyan(`  Address: ${deployer.address}`));
  console.log(chalk.cyan(`  Balance: ${hre.ethers.formatEther(balance)} HLS`));

  const lotteryContract = await hre.ethers.getContractAt("AutomatedDailyLottery", lotteryAddress, deployer);
  const chronosContract = new hre.ethers.Contract(chronosAddress, chronosArtifact.abi, deployer);

  console.log(chalk.magenta.bold("\n   Scheduling the drawWinner function with Chronos..."));

  const lotteryInterface = new hre.ethers.Interface(["function drawWinner()"]);
  const functionFragment = lotteryInterface.getFunction("drawWinner");
  const targetContractABI = `[${functionFragment.format('json')}]`;

  const functionNameToCall = "drawWinner";
  const params = [];
  const frequency = 86400; // 24 hours
  const expiration = 0; // No expiration
  const gasLimit = 400000;
  const maxGasPrice = hre.ethers.parseUnits("2", "gwei");
  const amountToDeposit = hre.ethers.parseEther("1");

  console.log(chalk.white.bold("\nChronos Parameters:"));
  console.log(chalk.cyan(`  Target Contract: ${lotteryAddress}`));
  console.log(chalk.cyan(`  Function to Call: ${functionNameToCall}`));
  console.log(chalk.cyan(`  Frequency: ${frequency} seconds (24 hours)`));
  console.log(chalk.cyan(`  Gas Limit: ${gasLimit}`));
  console.log(chalk.cyan(`  Max Gas Price: ${hre.ethers.formatUnits(maxGasPrice, "gwei")} gwei`));
  console.log(chalk.cyan(`  Amount to Deposit: ${hre.ethers.formatEther(amountToDeposit)} HLS`));

  const tx = await chronosContract.createCron(
    lotteryAddress,
    targetContractABI,
    functionNameToCall,
    params,
    frequency,
    expiration,
    gasLimit,
    maxGasPrice,
    amountToDeposit,
    { value: amountToDeposit }
  );

  console.log(chalk.white.bold(`\n   Transaction sent! Hash: ${tx.hash}`));
  console.log(chalk.cyan(`   View on Explorer: https://explorer.helioschainlabs.org/tx/${tx.hash}`));
  console.log(chalk.magenta("   Waiting for transaction receipt..."));

  const receipt = await tx.wait();

  const event = receipt.logs.find(log => {
    try {
      const parsedLog = chronosContract.interface.parseLog(log);
      return parsedLog.name === "CronCreated";
    } catch (error) {
      return false;
    }
  });

  if (!event) {
    throw new Error("CronCreated event not found in transaction receipt.");
  }

  const { cronId, toAddress: cronWallet } = event.args;
  console.log(chalk.green.bold("\n✅  Cron Task Created Successfully!"));
  console.log(chalk.cyan(`   - Cron ID: `) + chalk.white.bold(cronId));
  console.log(chalk.cyan(`   - Cron Wallet: `) + chalk.white.bold(cronWallet));

  console.log(chalk.magenta.bold("\n   Saving cron details to the Lottery contract..."));
  const setDetailsTx = await lotteryContract.setCronTaskDetails(cronId, cronWallet);
  await setDetailsTx.wait();

  console.log(chalk.green.bold("✅  Cron Details Saved Successfully!"));
  console.log(chalk.cyan(`   Verify by checking the 'getCronTaskInfo' function on the explorer:`));
  console.log(chalk.white.bold(`   https://explorer.helioschainlabs.org/address/${lotteryAddress}#readContract`));
}

main().catch((error) => {
  console.error(chalk.red.bold("\n❌  Scheduling Failed:"), error);
  process.exitCode = 1;
});