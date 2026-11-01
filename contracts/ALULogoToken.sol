// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title  ALULogoToken (ALUT)
 * @notice ERC-20 token that represents fractional ownership shares of the official ALU logo,
 *         which is registered as an NFT in ALUAssetRegistry.
 *
 *         - Fixed supply: exactly 1,000,000 ALUT are minted once, at deployment, to the
 *           original logo owner. There is no mint function, so the supply can never grow.
 *         - The logo owner (contract owner) hands out shares to stakeholders such as
 *           faculty, students or administration with distributeShares().
 *         - ownershipPercentage() shows what share of the logo any wallet owns.
 *
 * @dev    Uses the standard 18 decimals, so 1 ALUT = 10^18 base units. Amounts passed to
 *         distributeShares() are in base units, exactly like ERC-20 transfer()
 *         (in ethers.js: ethers.parseUnits("100000", 18) for 100,000 ALUT).
 */
contract ALULogoToken is ERC20, Ownable {
    /// @notice The fixed total supply: 1,000,000 whole tokens (with 18 decimals).
    uint256 public constant TOTAL_SUPPLY = 1_000_000 * 10 ** 18;

    /// @notice Emitted whenever the owner distributes ownership shares.
    event SharesDistributed(address indexed recipient, uint256 amount);

    /**
     * @param logoOwner Wallet of the original logo owner. Receives the full supply and
     *                  becomes the contract owner (the only account allowed to distribute).
     */
    constructor(address logoOwner) ERC20("ALU Logo Token", "ALUT") Ownable(logoOwner) {
        _mint(logoOwner, TOTAL_SUPPLY);
    }

    // ---------------------------------------------------------------------
    // Function 4: distributeShares
    // ---------------------------------------------------------------------

    /**
     * @notice Transfers ownership shares from the owner's balance to a stakeholder.
     * @dev    Restricted with onlyOwner. Reverts if amount is zero, if the recipient is the
     *         zero address, or if the owner does not hold enough tokens.
     * @param  recipient Wallet that receives the shares.
     * @param  amount    Number of ALUT in base units (18 decimals).
     */
    function distributeShares(address recipient, uint256 amount) external onlyOwner {
        require(amount > 0, "ALULogoToken: amount must be greater than zero");
        _transfer(owner(), recipient, amount);
        emit SharesDistributed(recipient, amount);
    }

    // ---------------------------------------------------------------------
    // Function 5: ownershipPercentage
    // ---------------------------------------------------------------------

    /**
     * @notice Returns the percentage of the logo a wallet owns, as a whole number.
     * @dev    balance * 100 / totalSupply, rounded down. 500,000 ALUT returns 50.
     *         Holdings below 1% return 0.
     * @param  account Wallet address to check.
     * @return Whole-number percentage (0-100).
     */
    function ownershipPercentage(address account) external view returns (uint256) {
        return (balanceOf(account) * 100) / totalSupply();
    }
}
