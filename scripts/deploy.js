const hre = require("hardhat");
const chalk = require("chalk");

async function main() {
  console.log(chalk.cyan.bold("      _  _         _        _   _         _           _   "));
  console.log(chalk.cyan.bold("     | || |___  __| |___ __| |_| |_ ___  | |__ _ _ __| |_ "));
  console.log(chalk.cyan.bold("     | __ / _ \/ _` / -_) _|  _|  _/ _ \ | / _` | '_ \  _|"));
  console.log(chalk.cyan.bold("     |_||_\___/\__,_\___\__|\__|\__\___/ |_\__,_| .__/\__|"));
  console.log(chalk.cyan.bold("                                               |_|      "));
  console.log(chalk.yellow("============================================================"));
  console.log(chalk.yellow("      Automated Daily Lottery Deployment Script      "));
  console.log(chalk.yellow("============================================================\n"));

  console.log(chalk.blue.bold("▶️  Starting Deployment...\n"));

  const [deployer] = await hre.ethers.getSigners();
  const network = await hre.ethers.provider.getNetwork();
  const balance = await hre.ethers.provider.getBalance(deployer.address);

  console.log(chalk.white.bold("Network:"));
  console.log(chalk.cyan(`  Name: ${network.name}`));
  console.log(chalk.cyan(`  Chain ID: ${network.chainId}`));
  console.log(chalk.white.bold("\nDeployer Account:"));
  console.log(chalk.cyan(`  Address: ${deployer.address}`));
  console.log(chalk.cyan(`  Balance: ${hre.ethers.formatEther(balance)} HLS`));

  const ticketPrice = hre.ethers.parseEther("0.01");
  const chronosServiceAddress = "0x0000000000000000000000000000000000000830"; 

  console.log(chalk.white.bold("\nDeployment Parameters:"));
  console.log(chalk.cyan(`  Ticket Price: ${hre.ethers.formatEther(ticketPrice)} HLS`));
  console.log(chalk.cyan(`  Chronos Service Address: ${chronosServiceAddress}`));

  console.log(chalk.magenta.bold("\n   Deploying AutomatedDailyLottery contract..."));
  const lottery = await hre.ethers.deployContract("AutomatedDailyLottery", [ticketPrice, chronosServiceAddress]);

  console.log(chalk.magenta("   Waiting for contract to be deployed..."));
  await lottery.waitForDeployment();

  const explorerUrl = `https://explorer.helioschainlabs.org/address/${lottery.target}`;
  console.log(chalk.green.bold("\n✅  Deployment Successful!"));
  console.log(chalk.cyan("   Contract deployed to: ") + chalk.white.bold(lottery.target));
  console.log(chalk.cyan("   View on Explorer: ") + chalk.white.bold(explorerUrl));
}

main().catch((error) => {
  console.error(chalk.red.bold("\n❌  Deployment Failed:"), error);
  process.exitCode = 1;
});
