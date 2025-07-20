# Helios Automated Daily Lottery

This repository contains the code for a simple, automated daily lottery DApp built on the Helios blockchain. It serves as a tutorial for using **Chronos**, the native smart contract scheduling service on Helios.

## Quick Start

This section is for users who want to quickly deploy and run the project.

### Prerequisites

*   [Node.js](https://nodejs.org/) (v18 or later)
*   [MetaMask](https://metamask.io/) browser extension

### Setup

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd helios-lottery
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Configure your environment:**
    *   Create a `.env` file by copying the example: `cp .env.example .env`
    *   Open the `.env` file and replace `YOUR_METAMASK_PRIVATE_KEY` with your actual private key (without the `0x` prefix).
    *   Get some testnet HLS from the [Helios Testnet Faucet](https://testnet.helioschain.network) and send it to the wallet associated with your private key. You will need it for deployment and scheduling.

### Deployment and Scheduling

1.  **Compile the contract:**
    ```bash
    npx hardhat compile
    ```

2.  **Deploy the lottery contract:**
    ```bash
    npx hardhat run scripts/deploy.js --network helios_testnet
    ```
    The script will output the address of your deployed `AutomatedDailyLottery` contract. **Copy this address.**

3.  **Schedule the automated task:**
    *   Open the `scripts/schedule.js` file.
    *   Replace the placeholder `YOUR_DEPLOYED_CONTRACT_ADDRESS` with the actual address you just copied.
    *   Run the scheduling script:
        ```bash
        npx hardhat run scripts/schedule.js --network helios_testnet
        ```

### Verification

Your automated lottery is now running! To verify that the Chronos task was scheduled correctly:

1.  Go to the [Helios Explorer](https://explorer.helioschainlabs.org) and search for your deployed lottery contract address.
2.  Go to the **"Read Contract"** tab.
3.  Find the `getCronTaskInfo` function and click "Query".
4.  You will see the `cronId`, the `cronWallet` address, and the `cronWalletBalance` (which should be 1 HLS). This confirms the task is scheduled and funded.

---

## Tutorial: Building From Scratch

This tutorial will guide you through building, deploying, and running the decentralized application from the very beginning.

### Introduction

Our goal is to build a lottery smart contract where users can purchase tickets. The winner selection process will be automatically triggered every 24 hours by the Chronos service, making the lottery truly autonomous and decentralized.

### Step 1: Setting Up the Project

First, we'll set up our development environment using Hardhat, a popular framework for Ethereum development.

1.  **Create a project directory:**
    ```bash
    mkdir helios-lottery
    cd helios-lottery
    ```

2.  **Initialize a Node.js project:**
    ```bash
    npm init -y
    ```

3.  **Install Hardhat and dependencies:**
    ```bash
    npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox dotenv
    ```

4.  **Initialize a Hardhat project:**
    ```bash
    npx hardhat
    ```
    Select "Create a JavaScript project" and accept the defaults.

5.  **Create a `.gitignore` file:**
    Create a file named `.gitignore` in the root of your project and add the following lines to it:
    ```
    node_modules
    .env
    cache
    artifacts
    ```

### Step 2: Configuring Hardhat for Helios

Now, we'll configure Hardhat to connect to the Helios Testnet.

1.  **Create a `.env` file:**
    Create a file named `.env` in the root of your project. This file will store your private key. **Do not share this file with anyone.**
    ```
    PRIVATE_KEY=YOUR_METAMASK_PRIVATE_KEY
    ```
    Replace `YOUR_METAMASK_PRIVATE_KEY` with the private key of the account you want to use for deployment.

2.  **Update `hardhat.config.js`:**
    Replace the content of your `hardhat.config.js` file with the following:
    ```javascript
    require("@nomicfoundation/hardhat-toolbox");
    require("dotenv").config();

    /** @type import('hardhat/config').HardhatUserConfig */
    module.exports = {
      solidity: "0.8.30",
      networks: {
        helios_testnet: {
          url: "https://testnet1.helioschainlabs.org",
          chainId: 42000,
          accounts: [process.env.PRIVATE_KEY],
        },
      },
    };
    ```

### Step 3: The Smart Contract

Now, let's write the `AutomatedDailyLottery` smart contract. We've added functionality to store and retrieve information about the scheduled Chronos task, which makes verification much easier.

Delete the sample `Lock.sol` file in the `contracts` directory and create a new file named `AutomatedDailyLottery.sol`.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

contract AutomatedDailyLottery {
    address[] public players;
    uint256 public ticketPrice;
    address public chronosServiceAddress;
    address public owner;

    // Chronos Task Info
    uint256 public cronId;
    address public cronWallet;

    event LotteryEnter(address indexed player);
    event WinnerPaid(address indexed winner, uint256 amount);
    event CronTaskSet(uint256 indexed cronId, address indexed cronWallet);

    struct CronTaskInfo {
        uint256 cronId;
        address cronWallet;
        uint256 cronWalletBalance;
    }

    modifier onlyChronos() {
        require(msg.sender == chronosServiceAddress, "Only Chronos service can call this function");
        _;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "You are not the owner.");
        _;
    }

    constructor(uint256 _ticketPrice, address _chronosServiceAddress) {
        owner = msg.sender;
        ticketPrice = _ticketPrice;
        chronosServiceAddress = _chronosServiceAddress;
    }

    function enter() public payable {
        require(msg.value >= ticketPrice, "Not enough HLS to enter");
        players.push(msg.sender);
        emit LotteryEnter(msg.sender);
    }

    function drawWinner() public onlyChronos {
        require(players.length > 0, "No players in the lottery");
        uint256 totalAmount = address(this).balance;
        
        uint256 winnerIndex = uint256(keccak256(abi.encodePacked(block.timestamp, block.prevrandao, players))) % players.length;
        address payable winner = payable(players[winnerIndex]);

        (bool success, ) = winner.call{value: totalAmount}("");
        require(success, "Failed to send money");

        emit WinnerPaid(winner, totalAmount);

        players = new address[](0);
    }

    function setCronTaskDetails(uint256 _cronId, address _cronWallet) public onlyOwner {
        cronId = _cronId;
        cronWallet = _cronWallet;
        emit CronTaskSet(_cronId, _cronWallet);
    }

    function getCronTaskInfo() public view returns (CronTaskInfo memory) {
        return CronTaskInfo({
            cronId: cronId,
            cronWallet: cronWallet,
            cronWalletBalance: cronWallet.balance
        });
    }

    function getPlayers() public view returns (address[] memory) {
        return players;
    }

    function getBalance() public view returns (uint256) {
        return address(this).balance;
    }
}
```

### Step 4: The Deployment Script

The deployment script remains the same. It deploys the contract, passing the official Chronos precompile address to the constructor.

Replace the content of the `scripts/deploy.js` file with the following:

```javascript
const hre = require("hardhat");

async function main() {
  const ticketPrice = hre.ethers.parseEther("0.01");
  const chronosServiceAddress = "0x0000000000000000000000000000000000000830"; 

  const lottery = await hre.ethers.deployContract("AutomatedDailyLottery", [ticketPrice, chronosServiceAddress]);

  await lottery.waitForDeployment();

  console.log(
    `AutomatedDailyLottery deployed to: ${lottery.target}`
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
```

### Step 5: Compile and Deploy

This step is the same.

1.  **Compile the contract:**
    ```bash
    npx hardhat compile
    ```

2.  **Deploy the contract:**
    ```bash
    npx hardhat run scripts/deploy.js --network helios_testnet
    ```
    After running the deploy command, **copy the deployed contract address**. You will need it for the next step.

### Step 6: Scheduling and Storing the Task

Now we will create a script that both schedules the task with Chronos and then calls our new `setCronTaskDetails` function to store the task information in our contract.

1.  **Get `chronos.json`:**
    The ABI for the Chronos contract is required to interact with it. A copy is already included in this project's root directory as `chronos.json`. If you were starting from scratch, you would download it from the [helios-core repository](https://github.com/helios-network/helios-core/blob/main/helios-chain/precompiles/chronos/abi.json).

2.  **Create `scripts/schedule.js`:**
    Create a new file in your `scripts` directory called `schedule.js` and add the following code. This script correctly formats the request for the Chronos precompile and extracts the `cronId` and `cronWallet` from the transaction logs to save them to your contract.

    ```javascript
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
    ```

3.  **Run the script:**
    Replace `YOUR_DEPLOYED_CONTRACT_ADDRESS` in the script with your actual address, then run it:
    ```bash
    npx hardhat run scripts/schedule.js --network helios_testnet
    ```

### Step 7: Verifying the Chronos Task

Thanks to the new `getCronTaskInfo` function, verifying the task is now incredibly simple.

1.  Go to the [Helios Explorer](https://explorer.helioschainlabs.org) and search for your deployed lottery contract address.
2.  Go to the **"Read Contract"** tab.
3.  Find the `getCronTaskInfo` function and click "Query".
4.  The explorer will show you the results:
    *   `cronId`: The unique ID of your task. A non-zero value proves it's scheduled.
    *   `cronWallet`: The address of the dedicated wallet created to pay for the task's execution.
    *   `cronWalletBalance`: The amount of HLS held by the cron wallet to pay for future gas fees. This should be `1000000000000000000` (which is 1 HLS in wei).

This provides definitive, on-chain proof that your task is scheduled and funded. After 24 hours, you can also check the "Events" tab on the explorer for a `WinnerPaid` event to confirm the execution was successful.

### Conclusion

Congratulations! You have successfully built and deployed a verifiable, automated daily lottery on the Helios blockchain. You have learned how to use Hardhat, interact with precompiles like Chronos, and create a user-friendly DApp that provides on-chain verification of its automated components.