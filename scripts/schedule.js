const hre = require("hardhat");
const chronosArtifact = require("../chronos.json");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const lotteryAddress = "YOUR_DEPLOYED_CONTRACT_ADDRESS"; // Replace with your contract address
  const chronosAddress = "0x0000000000000000000000000000000000000830";

  if (lotteryAddress === "YOUR_DEPLOYED_CONTRACT_ADDRESS") {
    console.error("Please replace 'YOUR_DEPLOYED_CONTRACT_ADDRESS' with your actual contract address in scripts/schedule.js");
    process.exit(1);
  }

  const lotteryContract = await hre.ethers.getContractAt("AutomatedDailyLottery", lotteryAddress, deployer);
  const chronosContract = new hre.ethers.Contract(chronosAddress, chronosArtifact.abi, deployer);

  console.log("Scheduling the drawWinner function with Chronos...");

  // The Chronos precompile requires the full JSON ABI of the function, not just the signature.
  const lotteryInterface = new hre.ethers.Interface(["function drawWinner()"]);
  const functionFragment = lotteryInterface.getFunction("drawWinner");
  // The precompile expects a JSON string representing an array of function ABIs.
  const targetContractABI = `[${functionFragment.format('json')}]`;

  const functionNameToCall = "drawWinner";
  const params = []; // No parameters for drawWinner
  const frequency = 86400; // 24 hours in seconds
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

  console.log(`Transaction sent! Hash: ${tx.hash}`);
  console.log("Waiting for transaction receipt...");

  const receipt = await tx.wait();

  // Find the CronCreated event in the logs
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
  console.log(`Cron task created successfully!`);
  console.log(`  - Cron ID: ${cronId}`);
  console.log(`  - Cron Wallet: ${cronWallet}`);

  console.log("Saving cron details to the Lottery contract...");
  const setDetailsTx = await lotteryContract.setCronTaskDetails(cronId, cronWallet);
  await setDetailsTx.wait();

  console.log("Cron details saved successfully!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});