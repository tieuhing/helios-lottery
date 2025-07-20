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

  console.log(chalk.blue("▶️  Starting deployment..."));

  const ticketPrice = hre.ethers.parseEther("0.01");
  const chronosServiceAddress = "0x0000000000000000000000000000000000000830"; 

  console.log(chalk.magenta("   Deploying AutomatedDailyLottery contract..."));
  const lottery = await hre.ethers.deployContract("AutomatedDailyLottery", [ticketPrice, chronosServiceAddress]);

  console.log(chalk.magenta("   Waiting for contract to be deployed..."));
  await lottery.waitForDeployment();

  console.log(chalk.green("\n✅  Deployment successful!"));
  console.log(chalk.cyan("   AutomatedDailyLottery deployed to: ") + chalk.bold.white(lottery.target));
}

main().catch((error) => {
  console.error(chalk.red("❌  Deployment failed:"), error);
  process.exitCode = 1;
});