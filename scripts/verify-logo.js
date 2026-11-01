/**
 * Checks whether a logo file is the authentic, registered ALU logo.
 * Anyone can run this: it hashes the file locally and calls the free (view) function
 * verifyLogoIntegrity() on the deployed ALUAssetRegistry.
 *
 * Usage (after running scripts/deploy.js on the same network):
 *   npx hardhat run scripts/verify-logo.js --network localhost
 *   LOGO_FILE=samples/alu-logo-one-pixel-changed.png npx hardhat run scripts/verify-logo.js --network localhost
 *
 * On Windows PowerShell set the variable first:  $env:LOGO_FILE="samples/alu-logo-one-pixel-changed.png"
 */
const fs = require("fs");
const path = require("path");
const hre = require("hardhat");
const { sha256File } = require("./hash-logo");

async function main() {
  const { ethers, network } = hre;
  const deploymentFile = path.join(__dirname, "..", "deployments", `${network.name}.json`);
  if (!fs.existsSync(deploymentFile)) {
    throw new Error(`No deployment found for "${network.name}". Run scripts/deploy.js first.`);
  }
  const deployment = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));

  const logoFile = path.resolve(process.env.LOGO_FILE || path.join(__dirname, "..", "alu-logo.png"));
  const tokenId = BigInt(process.env.TOKEN_ID || deployment.aluLogo.tokenId);
  const hash = sha256File(logoFile);

  const registry = await ethers.getContractAt("ALUAssetRegistry", deployment.ALUAssetRegistry);
  const [authentic, message] = await registry.verifyLogoIntegrity(tokenId, hash);

  console.log("File checked   :", path.relative(process.cwd(), logoFile));
  console.log("File SHA-256   :", hash);
  console.log("Token ID       :", tokenId.toString());
  console.log("Result         :", authentic, "-", message);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
