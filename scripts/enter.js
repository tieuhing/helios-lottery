const hre = require("hardhat");
const chalk = require("chalk");

async function main() {
  console.log(chalk.yellow("============================================================"));
  console.log(chalk.yellow("             Lottery Entry Script             "));
  console.log(chalk.yellow("============================================================\n"));

  // ------------------------------------------------------------------
  // 1. Enter your deployed contract address here
  // ------------------------------------------------------------------
  const lotteryAddress = "YOUR_DEPLOYED_CONTRACT_ADDRESS"; 
  // ------------------------------------------------------------------

  if (lotteryAddress === "YOUR_DEPLOYED_CONTRACT_ADDRESS") {
    console.error(chalk.red.bold("❌ Please replace 'YOUR_DEPLOYED_CONTRACT_ADDRESS' with your actual contract address in scripts/enter.js"));
    process.exit(1);
  }

  console.log(chalk.blue.bold("▶️  Attempting to enter the lottery...\n"));

  const [deployer] = await hre.ethers.getSigners();
  const balance = await hre.ethers.provider.getBalance(deployer.address);

  console.log(chalk.white.bold("Your Account:"));
  console.log(chalk.cyan(`  Address: ${deployer.address}`));
  console.log(chalk.cyan(`  Balance: ${hre.ethers.formatEther(balance)} HLS`));

  const lotteryContract = await hre.ethers.getContractAt("AutomatedDailyLottery", lotteryAddress, deployer);
  
  const ticketPrice = await lotteryContract.ticketPrice();
  console.log(chalk.white.bold("\nLottery Details:"));
  console.log(chalk.cyan(`  Contract Address: ${lotteryAddress}`));
  console.log(chalk.cyan(`  Ticket Price: ${hre.ethers.formatEther(ticketPrice)} HLS`));

  if (balance < ticketPrice) {
    console.error(chalk.red.bold("\n❌ You do not have enough HLS in your account to purchase a ticket."));
    process.exit(1);
  }

  console.log(chalk.magenta.bold("\n   Sending transaction to enter the lottery..."));

  try {
    const tx = await lotteryContract.enter({ 
      value: ticketPrice 
    });

    console.log(chalk.white.bold(`\n   Transaction sent! Hash: ${tx.hash}`));
    console.log(chalk.cyan(`   View on Explorer: https://explorer.helioschainlabs.org/tx/${tx.hash}`));
    console.log(chalk.magenta("   Waiting for transaction to be confirmed..."));

    await tx.wait();

    console.log(chalk.green.bold("\n✅  Successfully entered the lottery!"));
    
    const newBalance = await hre.ethers.provider.getBalance(deployer.address);
    console.log(chalk.white.bold("\nYour New Account Balance:"));
    console.log(chalk.cyan(`  ${hre.ethers.formatEther(newBalance)} HLS`));

  } catch (error) {
    console.error(chalk.red.bold("\n❌  Failed to enter lottery:"), error.reason || error.message);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});