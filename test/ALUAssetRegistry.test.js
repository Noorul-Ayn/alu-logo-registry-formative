/**
 * Automated tests for ALUAssetRegistry (ERC-721) and ALULogoToken (ERC-20).
 *
 * Run with:  npx hardhat test
 *
 * The logo hashes are computed from the real files, so the tests prove that the actual
 * ALU logo registers and verifies, and that a copy with ONE pixel changed is detected.
 */
const path = require("path");
const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture, time } = require("@nomicfoundation/hardhat-network-helpers");
const { sha256File } = require("../scripts/hash-logo");

const ALU_LOGO_HASH = sha256File(path.join(__dirname, "..", "alu-logo.png"));
const TAMPERED_LOGO_HASH = sha256File(
  path.join(__dirname, "..", "samples", "alu-logo-one-pixel-changed.png")
);
const ASSET_NAME = "ALU Official Logo";
const FILE_TYPE = "image/png";

/** Converts a whole number of ALUT into base units (18 decimals). */
const alut = (amount) => ethers.parseUnits(amount.toString(), 18);

describe("ALU Logo Registry project", function () {
  // ---------------------------------------------------------------------------------
  // Fixtures: deploy fresh contracts once and snapshot, so every test starts clean.
  // ---------------------------------------------------------------------------------
  async function deployRegistryFixture() {
    const [owner, other] = await ethers.getSigners();
    const registry = await ethers.deployContract("ALUAssetRegistry");
    return { registry, owner, other };
  }

  async function registeredLogoFixture() {
    const { registry, owner, other } = await deployRegistryFixture();
    await registry.registerAsset(ASSET_NAME, FILE_TYPE, ALU_LOGO_HASH);
    return { registry, owner, other, tokenId: 1n };
  }

  async function deployTokenFixture() {
    const [logoOwner, faculty, student] = await ethers.getSigners();
    const token = await ethers.deployContract("ALULogoToken", [logoOwner.address]);
    return { token, logoOwner, faculty, student };
  }

  // ---------------------------------------------------------------------------------
  // Part B - ALUAssetRegistry (5 tests)
  // ---------------------------------------------------------------------------------
  describe("ALUAssetRegistry (ERC-721)", function () {
    it("1. registers the ALU logo successfully and returns a token ID", async function () {
      const { registry, owner } = await loadFixture(deployRegistryFixture);

      // staticCall simulates the call and gives us the function's return value.
      const returnedId = await registry.registerAsset.staticCall(ASSET_NAME, FILE_TYPE, ALU_LOGO_HASH);
      expect(returnedId).to.equal(1n);

      const registeredAt = (await time.latest()) + 1; // timestamp of the next block
      await time.setNextBlockTimestamp(registeredAt);

      await expect(registry.registerAsset(ASSET_NAME, FILE_TYPE, ALU_LOGO_HASH))
        .to.emit(registry, "AssetRegistered")
        .withArgs(1n, owner.address, ALU_LOGO_HASH, ASSET_NAME, FILE_TYPE, registeredAt);

      expect(await registry.ownerOf(1n)).to.equal(owner.address); // NFT minted to caller
      expect(await registry.registeredHashes(ALU_LOGO_HASH)).to.equal(true);
      expect(await registry.totalAssets()).to.equal(1n);
    });

    it("2. rejects a second registration of the same hash", async function () {
      const { registry, other } = await loadFixture(registeredLogoFixture);

      await expect(
        registry.registerAsset(ASSET_NAME, FILE_TYPE, ALU_LOGO_HASH)
      ).to.be.revertedWith("ALUAssetRegistry: this file has already been registered");

      // Also rejected when a different wallet tries to claim the same file.
      await expect(
        registry.connect(other).registerAsset("Fake ALU Logo", FILE_TYPE, ALU_LOGO_HASH)
      ).to.be.revertedWith("ALUAssetRegistry: this file has already been registered");

      expect(await registry.totalAssets()).to.equal(1n);
    });

    it("3. verifyLogoIntegrity() returns true for the correct hash", async function () {
      const { registry, tokenId } = await loadFixture(registeredLogoFixture);

      const [isAuthentic, message] = await registry.verifyLogoIntegrity(tokenId, ALU_LOGO_HASH);
      expect(isAuthentic).to.equal(true);
      expect(message).to.equal("Logo is authentic.");
    });

    it("4. verifyLogoIntegrity() returns false for an incorrect hash (logo with one pixel changed)", async function () {
      const { registry, tokenId } = await loadFixture(registeredLogoFixture);

      expect(TAMPERED_LOGO_HASH).to.not.equal(ALU_LOGO_HASH);
      const [isAuthentic, message] = await registry.verifyLogoIntegrity(tokenId, TAMPERED_LOGO_HASH);
      expect(isAuthentic).to.equal(false);
      expect(message).to.equal("Warning: logo does not match.");
    });

    it("5. getAsset() returns the correct asset name and file type", async function () {
      const { registry, owner, tokenId } = await loadFixture(registeredLogoFixture);

      const asset = await registry.getAsset(tokenId);
      expect(asset.assetName).to.equal(ASSET_NAME);
      expect(asset.fileType).to.equal(FILE_TYPE);
      expect(asset.contentHash).to.equal(ALU_LOGO_HASH);
      expect(asset.registeredBy).to.equal(owner.address);
      expect(asset.registeredAt).to.be.greaterThan(0n);
    });
  });

  // ---------------------------------------------------------------------------------
  // Part C - ALULogoToken (3 tests)
  // ---------------------------------------------------------------------------------
  describe("ALULogoToken (ERC-20)", function () {
    it("6. mints the full 1,000,000 ALUT supply to the logo owner on deployment", async function () {
      const { token, logoOwner } = await loadFixture(deployTokenFixture);

      expect(await token.name()).to.equal("ALU Logo Token");
      expect(await token.symbol()).to.equal("ALUT");
      expect(await token.totalSupply()).to.equal(alut(1_000_000));
      expect(await token.balanceOf(logoOwner.address)).to.equal(alut(1_000_000));
      expect(await token.owner()).to.equal(logoOwner.address);
    });

    it("7. distributeShares() transfers the specified tokens to a recipient (owner only, amount > 0)", async function () {
      const { token, logoOwner, faculty, student } = await loadFixture(deployTokenFixture);
      const amount = alut(100_000);

      await expect(token.distributeShares(faculty.address, amount))
        .to.changeTokenBalances(token, [logoOwner, faculty], [-amount, amount]);

      // Guard rails: zero amounts and non-owners are rejected.
      await expect(token.distributeShares(faculty.address, 0)).to.be.revertedWith(
        "ALULogoToken: amount must be greater than zero"
      );
      await expect(token.connect(faculty).distributeShares(student.address, alut(1)))
        .to.be.revertedWithCustomError(token, "OwnableUnauthorizedAccount")
        .withArgs(faculty.address);
    });

    it("8. ownershipPercentage() returns the correct percentage for a known balance", async function () {
      const { token, logoOwner, faculty, student } = await loadFixture(deployTokenFixture);

      await token.distributeShares(faculty.address, alut(100_000)); // 10%
      await token.distributeShares(student.address, alut(500_000)); // 50%

      expect(await token.ownershipPercentage(faculty.address)).to.equal(10n);
      expect(await token.ownershipPercentage(student.address)).to.equal(50n);
      expect(await token.ownershipPercentage(logoOwner.address)).to.equal(40n);
    });
  });
});
