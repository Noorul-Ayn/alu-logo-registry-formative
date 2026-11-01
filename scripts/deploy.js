/**
 * Deployment script for the ALU Logo Registry project.
 *
 *   1. Deploys ALUAssetRegistry (ERC-721).
 *   2. Immediately registers the real ALU logo by calling registerAsset() with the
 *      SHA-256 hash of ./alu-logo.png.
 *   3. Deploys ALULogoToken (ERC-20), passing the deployer's wallet as the logo owner so the
 *      full 1,000,000 ALUT supply is minted to them.
 *   4. Saves the deployed addresses to deployments/<network>.json for the future dApp.
 *
 * Run against a local node:
 *   npx hardhat node                                         (terminal 1)
 *   npx hardhat run scripts/deploy.js --network localhost    (terminal 2)
 */
const fs = require("fs");
const path = require("path");
const hre = require("hardhat");
const { sha256File } = require("./hash-logo");

// The SHA-256 hash of the official ALU logo file (alu-logo.png) registered on-chain.
const ALU_LOGO_HASH = "0xf45d877814a52c87c1c341df66ac2ccb4e715074bd0fe90ca435807eb310f4da";
const LOGO_PATH = path.join(__dirname, "..", "alu-logo.png");

async function main() {
  const { ethers, network } = hre;
  const [deployer] = await ethers.getSigners();

  console.log("Network  :", network.name);
  console.log("Deployer :", deployer.address);
  console.log("");

  // --- Safety check: make sure alu-logo.png really is the file whose hash we register ---
  const fileHash = sha256File(LOGO_PATH);
  if (fileHash !== ALU_LOGO_HASH) {
    throw new Error(
      `alu-logo.png hash (${fileHash}) does not match ALU_LOGO_HASH (${ALU_LOGO_HASH}).`
    );
  }
  console.log("ALU logo SHA-256 :", fileHash);

  // --- 1. Deploy ALUAssetRegistry -----------------------------------------------------
  const registry = await ethers.deployContract("ALUAssetRegistry");
  await registry.waitForDeployment();
  const registryAddress = await registry.getAddress();
  console.log("ALUAssetRegistry deployed to:", registryAddress);

  // --- 2. Register the ALU logo -------------------------------------------------------
  const tx = await registry.registerAsset("ALU Official Logo", "image/png", ALU_LOGO_HASH);
  const receipt = await tx.wait();

  // Read the token ID from the AssetRegistered event in the transaction receipt.
  const event = receipt.logs
    .map((log) => {
      try { return registry.interface.parseLog(log); } catch { return null; }
    })
    .find((parsed) => parsed && parsed.name === "AssetRegistered");
  const tokenId = event.args.tokenId;

  const asset = await registry.getAsset(tokenId);
  const [authentic, message] = await registry.verifyLogoIntegrity(tokenId, ALU_LOGO_HASH);

  console.log("ALU logo registered as token ID:", tokenId.toString());
  console.log("  tx hash       :", receipt.hash);
  console.log("  asset name    :", asset.assetName);
  console.log("  file type     :", asset.fileType);
  console.log("  registered by :", asset.registeredBy);
  console.log("  registered at :", new Date(Number(asset.registeredAt) * 1000).toISOString());
  console.log("  integrity     :", authentic, "-", message);
  console.log("");

  // --- 3. Deploy ALULogoToken with the deployer as the logo owner --------------------
  const token = await ethers.deployContract("ALULogoToken", [deployer.address]);
  await token.waitForDeployment();
  const tokenAddress = await token.getAddress();

  const balance = await token.balanceOf(deployer.address);
  console.log("ALULogoToken deployed to:", tokenAddress);
  console.log("  name / symbol :", await token.name(), "/", await token.symbol());
  console.log("  total supply  :", ethers.formatUnits(await token.totalSupply(), 18), "ALUT");
  console.log("  owner balance :", ethers.formatUnits(balance, 18), "ALUT");
  console.log("  owner share   :", (await token.ownershipPercentage(deployer.address)).toString() + "%");

  // --- 4. Save addresses for the next assignment's dApp ------------------------------
  const outDir = path.join(__dirname, "..", "deployments");
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `${network.name}.json`);
  fs.writeFileSync(
    outFile,
    JSON.stringify(
      {
        network: network.name,
        chainId: Number((await ethers.provider.getNetwork()).chainId),
        deployer: deployer.address,
        ALUAssetRegistry: registryAddress,
        ALULogoToken: tokenAddress,
        aluLogo: { tokenId: tokenId.toString(), sha256: ALU_LOGO_HASH, registrationTx: receipt.hash },
      },
      null,
      2
    )
  );
  console.log("");
  console.log("Addresses saved to", path.relative(process.cwd(), outFile));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
