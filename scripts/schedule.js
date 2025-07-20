const hre = require("hardhat");
const chalk = require("chalk");
const chronosArtifact = require("../chronos.json");

async function main() {
  console.log(chalk.cyan.bold("      _  _         _        _   _         _           _   "));
  console.log(chalk.cyan.bold("     | || |___  __| |___ __| |_| |_ ___  | |__ _ _ __| |_ "));
  console.log(chalk.cyan.bold("     | __ / _ \/ _` / -_) _|  _|  _/ _ \ | / _` | '_ \  _|"));
  console.log(chalk.cyan.bold("     |_||_\___/\__,_\___\__|\__|\__\___/ |_\__,_| .__/\__|\n"));
  console.log(chalk.cyan.bold("                                               |_|      "));
  console.log(chalk.yellow("============================================================"));
  console.log(chalk.yellow("        Chronos Task Scheduling Script        "));
  console.log(chalk.yellow("============================================================\n"));

  const lotteryAddress = "YOUR_DEPLOYED_CONTRACT_ADDRESS"; // Replace with your contract address
  const chronosAddress = "0x0000000000000000000000000000000000000830";

  if (lotteryAddress === "YOUR_DEPLOYED_CONTRACT_ADDRESS") {
    console.error(chalk.red("❌ Please replace 'YOUR_DEPLOYED_CONTRACT_ADDRESS' with your actual contract address in scripts/schedule.js"));
    process.exit(1);
  }

  console.log(chalk.blue("▶️  Starting Chronos task scheduling..."));
  console.log(chalk.white(`   Lottery Contract: ${lotteryAddress}`));

  const [deployer] = await hre.ethers.getSigners();
  const lotteryContract = await hre.ethers.getContractAt("AutomatedDailyLottery", lotteryAddress, deployer);
  const chronosContract = new hre.ethers.Contract(chronosAddress, chronosArtifact.abi, deployer);

  console.log(chalk.magenta("\n   Scheduling the drawWinner function with Chronos..."));

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

  console.log(chalk.white(`   Transaction sent! Hash: ${tx.hash}`));
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
  console.log(chalk.green("\n✅  Cron task created successfully!"));
  console.log(chalk.cyan(`   - Cron ID: `) + chalk.white.bold(cronId));
  console.log(chalk.cyan(`   - Cron Wallet: `) + chalk.white.bold(cronWallet));

  console.log(chalk.magenta("\n   Saving cron details to the Lottery contract..."));
  const setDetailsTx = await lotteryContract.setCronTaskDetails(cronId, cronWallet);
  await setDetailsTx.wait();

  console.log(chalk.green("✅  Cron details saved successfully!"));
}

main().catch((error) => {
  console.error(chalk.red("❌  Scheduling failed:"), error);
  process.exitCode = 1;
});
