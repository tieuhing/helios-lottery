const fs = require("fs");
const path = require("path");
const chalk = require("chalk");
const { network } = require("hardhat");

async function main() {
  console.log(chalk.yellow("============================================================"));
  console.log(chalk.yellow("        Verification Input Extractor Script        "));
  console.log(chalk.yellow("============================================================\n"));

  // 1. Get Contract Address from command line arguments
  const contractAddress = process.argv[2];
  if (!contractAddress) {
    console.error(chalk.red.bold("❌ Error: Missing contract address."));
    console.error(chalk.cyan("   Please provide the deployed contract address as an argument:"));
    console.error(chalk.white("   npx hardhat run scripts/extract-input.js <YOUR_CONTRACT_ADDRESS>\n"));
    process.exit(1);
  }

  console.log(chalk.blue.bold(`▶️  Generating verification files for contract at: ${contractAddress}\n`));

  const contractName = "AutomatedDailyLottery";
  const buildInfoDir = path.resolve(__dirname, "..", "artifacts", "build-info");
  const outputDir = path.resolve(__dirname, "..", "output");

  // 2. Clean and create the output directory
  try {
    if (fs.existsSync(outputDir)) {
      fs.rmSync(outputDir, { recursive: true, force: true });
    }
    fs.mkdirSync(outputDir, { recursive: true });
    console.log(chalk.cyan(`   Output directory cleaned and created at: ${outputDir}`));
  } catch (error) {
      console.error(chalk.red.bold("\n❌  Error managing output directory:"), error.message);
      process.exit(1);
  }

  try {
    const files = fs.readdirSync(buildInfoDir);
    let latestBuildFile = "";
    let latestMtime = 0;

    for (const file of files) {
      if (file.endsWith(".json")) {
        const filePath = path.join(buildInfoDir, file);
        const stats = fs.statSync(filePath);
        if (stats.mtimeMs > latestMtime) {
          latestMtime = stats.mtimeMs;
          latestBuildFile = filePath;
        }
      }
    }

    if (!latestBuildFile) {
      throw new Error("No build-info file found. Please compile your contract first with 'npx hardhat compile'");
    }

    console.log(chalk.cyan(`   Found latest build file: ${path.basename(latestBuildFile)}`));

    const buildInfo = JSON.parse(fs.readFileSync(latestBuildFile, "utf8"));
    
    // 3. Generate and save the verify-input.json
    const verificationInput = buildInfo.input;
    const outputJsonPath = path.join(outputDir, "verify-input.json");
    fs.writeFileSync(outputJsonPath, JSON.stringify(verificationInput, null, 2));

    console.log(chalk.green.bold("\n✅  Successfully created verification input file!"));
    console.log(chalk.cyan("   File saved to: ") + chalk.white.bold(outputJsonPath));

    // 4. Create the tutorial markdown file with the contract address
    const explorerUrl = `https://explorer.helioschainlabs.org/address/${contractAddress}`;
    const tutorialContent = `
# How to Verify Your Smart Contract

This guide contains the specific details needed to verify the \`${contractName}\` smart contract on the Helios Explorer.

- **Contract Address:** \`${contractAddress}\`
- **Explorer Link:** [${explorerUrl}](${explorerUrl})

### Verification Steps

1.  **Go to the Verification Page:**
    Navigate directly to your contract's "Verify and Publish" page on the [Helios Explorer](https://explorer.helioschainlabs.org). You can usually find this link under the "Contract" tab on your contract's main page.

2.  **Fill in the Verification Form:**
    *   **Contract Address:** \`${contractAddress}\` (this should be pre-filled).
    *   **Compiler Type:** Select **Solidity (Standard-Json-Input)**. This is the most important step.
    *   **Compiler Version:** Choose the exact compiler version used for this project: **v0.8.30+commit.f5f4413c**.
    *   **License:** Select \`MIT License (MIT)\`, as specified in the source file.

3.  **Upload the JSON Input File:**
    Drag and drop the \`verify-input.json\` file (located in this same \`output\` directory) into the upload area on the verification page.

4.  **Verify and Publish:**
    Click the "Verify and Publish" button. After a few moments, the page will refresh, and you should see a success message with a green checkmark.

Your contract is now verified! You can proceed with scheduling the task.
`;

    const outputMdPath = path.join(outputDir, "verify-smart-contracts.md");
    fs.writeFileSync(outputMdPath, tutorialContent.trim());
    
    console.log(chalk.green.bold("\n✅  Successfully created verification tutorial!"));
    console.log(chalk.cyan("   File saved to: ") + chalk.white.bold(outputMdPath));
    console.log(chalk.cyan("\n   All files are ready in the 'output' directory."));

  } catch (error) {
    console.error(chalk.red.bold("\n❌  Error creating verification input:"), error.message);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});