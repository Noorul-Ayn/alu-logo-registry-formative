// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";

/**
 * @title  ALUAssetRegistry
 * @notice Registers digital assets (starting with the official ALU logo) on Ethereum as
 *         ERC-721 non-fungible tokens. For every asset the contract permanently stores the
 *         file's SHA-256 fingerprint, who registered it and when.
 *
 *         Why this protects the logo:
 *         - The SHA-256 hash is a unique fingerprint of the exact bytes of the logo file.
 *           Changing even one pixel produces a completely different hash.
 *         - Once written, the record cannot be edited or deleted, so it is a permanent,
 *           timestamped proof of what the official logo is and who registered it.
 *         - Anyone can call verifyLogoIntegrity() with the hash of a file they hold to check
 *           whether it is the authentic logo or a modified copy.
 *
 * @dev    Built on OpenZeppelin Contracts v5 (ERC721). Token IDs start at 1.
 */
contract ALUAssetRegistry is ERC721 {
    // ---------------------------------------------------------------------
    // Data structure
    // ---------------------------------------------------------------------

    /// @notice Everything recorded about a registered asset.
    struct AssetMetadata {
        string assetName;      // human-readable name, e.g. "ALU Official Logo"
        string fileType;       // file/MIME type, e.g. "image/png"
        bytes32 contentHash;   // SHA-256 hash of the file's bytes
        address registeredBy;  // wallet address that registered the asset
        uint256 registeredAt;  // Unix timestamp (seconds) of the registration block
    }

    // ---------------------------------------------------------------------
    // State
    // ---------------------------------------------------------------------

    /// @dev Counter used to generate token IDs. The first asset gets ID 1.
    uint256 private _tokenIdCounter;

    /// @notice Mapping 1: token ID => registration details (readable by anyone).
    mapping(uint256 => AssetMetadata) public assets;

    /// @notice Mapping 2: content hash => true if that exact file is already registered.
    ///         Used to reject duplicate registrations of the same file.
    mapping(bytes32 => bool) public registeredHashes;

    // ---------------------------------------------------------------------
    // Events
    // ---------------------------------------------------------------------

    /// @notice Emitted every time a new asset is registered and its NFT is minted.
    event AssetRegistered(
        uint256 indexed tokenId,
        address indexed registeredBy,
        bytes32 indexed contentHash,
        string assetName,
        string fileType,
        uint256 registeredAt
    );

    // ---------------------------------------------------------------------
    // Constructor
    // ---------------------------------------------------------------------

    /// @notice Sets the ERC-721 collection name and symbol.
    constructor() ERC721("ALU Asset Registry", "ALUAR") {}

    // ---------------------------------------------------------------------
    // Function 1: registerAsset
    // ---------------------------------------------------------------------

    /**
     * @notice Registers a new digital asset and mints an NFT for it to the caller.
     * @param  assetName    Human-readable name of the asset (e.g. "ALU Official Logo").
     * @param  fileType     File type of the asset (e.g. "image/png").
     * @param  contentHash  SHA-256 hash of the asset file, as bytes32 (0x + 64 hex chars).
     * @return tokenId      The ID of the newly minted NFT.
     *
     * @dev    The function follows the checks-effects-interactions pattern: all state is
     *         written BEFORE _safeMint(), because _safeMint() calls onERC721Received() on
     *         the receiver if it is a contract. Saving the metadata and marking the hash
     *         as used first means a malicious receiver cannot re-enter this function and
     *         register the same hash twice.
     */
    function registerAsset(
        string calldata assetName,
        string calldata fileType,
        bytes32 contentHash
    ) external returns (uint256 tokenId) {
        // --- Checks ---
        require(contentHash != bytes32(0), "ALUAssetRegistry: content hash cannot be empty");
        require(!registeredHashes[contentHash], "ALUAssetRegistry: this file has already been registered");

        // --- Effects ---
        _tokenIdCounter += 1;              // increment the counter
        tokenId = _tokenIdCounter;

        assets[tokenId] = AssetMetadata({  // save the metadata
            assetName: assetName,
            fileType: fileType,
            contentHash: contentHash,
            registeredBy: msg.sender,
            registeredAt: block.timestamp
        });
        registeredHashes[contentHash] = true; // mark the hash as used

        // --- Interaction ---
        _safeMint(msg.sender, tokenId);    // mint the NFT to the caller

        emit AssetRegistered(tokenId, msg.sender, contentHash, assetName, fileType, block.timestamp);
        return tokenId;
    }

    // ---------------------------------------------------------------------
    // Function 2: verifyLogoIntegrity
    // ---------------------------------------------------------------------

    /**
     * @notice Checks whether a file's hash matches the hash stored for a token.
     * @dev    A `view` function: it only reads data, so calling it costs no gas.
     *         Reverts if the token ID has never been registered.
     * @param  tokenId      The token ID of the registered asset.
     * @param  contentHash  SHA-256 hash of the file the caller wants to check.
     * @return isAuthentic  true if the hashes match, false otherwise.
     * @return message      "Logo is authentic." or "Warning: logo does not match."
     */
    function verifyLogoIntegrity(uint256 tokenId, bytes32 contentHash)
        external
        view
        returns (bool isAuthentic, string memory message)
    {
        _requireRegistered(tokenId);

        if (assets[tokenId].contentHash == contentHash) {
            return (true, "Logo is authentic.");
        }
        return (false, "Warning: logo does not match.");
    }

    // ---------------------------------------------------------------------
    // Function 3: getAsset
    // ---------------------------------------------------------------------

    /**
     * @notice Returns the full registration record for a token.
     * @dev    Reverts if the token ID has never been registered.
     * @param  tokenId  The token ID to look up.
     * @return The AssetMetadata struct for that token.
     */
    function getAsset(uint256 tokenId) external view returns (AssetMetadata memory) {
        _requireRegistered(tokenId);
        return assets[tokenId];
    }

    // ---------------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------------

    /// @notice Total number of assets registered so far (also the latest token ID).
    function totalAssets() external view returns (uint256) {
        return _tokenIdCounter;
    }

    /// @dev Reverts with a clear message if `tokenId` was never minted.
    function _requireRegistered(uint256 tokenId) internal view {
        require(_ownerOf(tokenId) != address(0), "ALUAssetRegistry: token does not exist");
    }
}
