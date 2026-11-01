# ALU Logo Registry: Protecting the ALU Logo on Ethereum

This project registers the official **African Leadership University (ALU) logo** on an Ethereum blockchain so that its ownership and exact file contents are recorded permanently and can be checked by anyone.

It has two smart contracts that work together:

- **`ALUAssetRegistry` (ERC-721)** registers the logo as a unique NFT. It stores the logo's SHA-256 fingerprint, the asset name, the file type, the wallet that registered it and the registration time. It rejects duplicate registrations of the same file, and its free `verifyLogoIntegrity()` function tells anyone whether a logo file they hold is the authentic version or a modified copy.
- **`ALULogoToken` (ERC-20, symbol `ALUT`)** tokenises ownership of that registered logo. Exactly 1,000,000 ALUT are minted to the logo owner at deployment, and the owner can distribute shares to stakeholders (faculty, students, administration) with `distributeShares()`. `ownershipPercentage()` shows what percentage of the logo any wallet owns.

The NFT answers *"which file is the real ALU logo, and who registered it?"*. The ALUT token answers *"who owns what share of that logo?"*. The deploy script deploys both contracts in that order and registers the logo straight away.

---

## ALU logo hash (for independent verification)

| | |
|---|---|
| File | `alu-logo.png` (PNG, 1258 × 228 px, 11,277 bytes) |
| Source | Official ALU website: `https://www.alueducation.com/wp-content/uploads/2023/05/ALU-logo-with-name-min.png` |
| **SHA-256** | **`f45d877814a52c87c1c341df66ac2ccb4e715074bd0fe90ca435807eb310f4da`** |
| As `bytes32` | `0xf45d877814a52c87c1c341df66ac2ccb4e715074bd0fe90ca435807eb310f4da` |

Check it yourself with any of these commands. The output must match the hash above exactly:

```bash
node scripts/hash-logo.js                          # any OS (uses Node.js crypto)
sha256sum alu-logo.png                             # Linux
shasum -a 256 alu-logo.png                         # macOS
certutil -hashfile alu-logo.png SHA256             # Windows (Command Prompt)
Get-FileHash alu-logo.png -Algorithm SHA256        # Windows (PowerShell)
```

`samples/alu-logo-one-pixel-changed.png` is a copy of the logo with exactly one pixel recoloured (pixel 120, 60 changed from red to grey). Its hash is `047c80601ede3d0b671aff492777e3aa66f91fd61b44e99c534b42f68f897439`, which is completely different. The tests and the verify script use it to show that a tampered logo is detected.

---

## Project structure

```
alu-logo-registry/
├── contracts/
│   ├── ALUAssetRegistry.sol      # ERC-721 registration contract (Functions 1-3)
│   └── ALULogoToken.sol          # ERC-20 tokenisation contract (Functions 4-5)
├── scripts/
│   ├── deploy.js                 # deploys both contracts and registers the logo
│   ├── hash-logo.js              # prints the SHA-256 hash of a file
│   └── verify-logo.js            # checks a logo file against the deployed registry
├── test/
│   └── ALUAssetRegistry.test.js  # the 8 automated tests
├── samples/
│   └── alu-logo-one-pixel-changed.png
├── docs/screenshots/             # terminal screenshots used in the report
├── alu-logo.png                  # the official ALU logo (the registered asset)
├── hardhat.config.js
├── package.json / package-lock.json
├── Project_Report.pdf
└── README.md
```

---

## Versions used

| Tool | Version |
|---|---|
| Solidity compiler | **0.8.28** (optimizer on, 200 runs, EVM target `cancun`) |
| Hardhat | **2.29.1** |
| @nomicfoundation/hardhat-toolbox | 6.1.2 (includes ethers v6, chai matchers, network helpers) |
| ethers.js | 6.17.0 |
| OpenZeppelin Contracts | 5.6.1 |
| Node.js | 22 LTS (tested on v22.23.4) |

---

## Setup and usage

### 1. Prerequisites

Install **Node.js 22 LTS** from <https://nodejs.org>, then check it:

```bash
node -v    # should print v22.x
npm -v
```

### 2. Install dependencies

From the project folder:

```bash
npm install
```

This installs Hardhat, the Hardhat Toolbox and OpenZeppelin Contracts at the exact versions in `package-lock.json`.

### 3. Compile the contracts

```bash
npx hardhat compile
```

Expected output: `Compiled 21 Solidity files successfully (evm target: cancun).` The compiled ABIs and bytecode are written to `artifacts/`.

### 4. Run the tests

```bash
npx hardhat test
```

All **8 tests** should pass: 5 for `ALUAssetRegistry` and 3 for `ALULogoToken`. The tests run on Hardhat's built-in in-memory blockchain, so you don't need to start a node first.

### 5. Start a local blockchain node

In a **first terminal**:

```bash
npx hardhat node
```

This starts a local Ethereum network at `http://127.0.0.1:8545` (chain ID `31337`) and prints 20 test accounts, each funded with 10,000 test ETH. Leave it running.

> ⚠️ The private keys printed by `hardhat node` are public. Never send real funds to them.

### 6. Deploy

In a **second terminal**:

```bash
npx hardhat run scripts/deploy.js --network localhost
```

The script:

1. checks that `alu-logo.png` still matches the registered hash,
2. deploys `ALUAssetRegistry`,
3. calls `registerAsset("ALU Official Logo", "image/png", <logo hash>)`, which mints NFT #1 to the deployer,
4. deploys `ALULogoToken`, passing the deployer's address as the logo owner, so all 1,000,000 ALUT are minted to them,
5. saves the addresses to `deployments/localhost.json`.

On a freshly started node the addresses are always:

| Contract | Address |
|---|---|
| ALUAssetRegistry | `0x5FbDB2315678afecb367f032d93F642f64180aa3` |
| ALULogoToken | `0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0` |

### 7. Verify a logo file against the blockchain

```bash
# The genuine logo  ->  true - Logo is authentic.
npx hardhat run scripts/verify-logo.js --network localhost

# The one-pixel-changed copy  ->  false - Warning: logo does not match.
LOGO_FILE=samples/alu-logo-one-pixel-changed.png npx hardhat run scripts/verify-logo.js --network localhost
```

On Windows PowerShell, set the variable first: `$env:LOGO_FILE="samples/alu-logo-one-pixel-changed.png"`.

### npm shortcuts

`npm run compile`, `npm test`, `npm run node`, `npm run deploy:local`, `npm run hash`

---

## Contract reference

### ALUAssetRegistry (ERC-721, name "ALU Asset Registry", symbol "ALUAR")

| Function | Type | What it does |
|---|---|---|
| `registerAsset(string assetName, string fileType, bytes32 contentHash) → uint256` | transaction | Rejects empty or already-registered hashes, increments the counter, saves the `AssetMetadata`, marks the hash as used, mints the NFT to the caller with `_safeMint()`, emits `AssetRegistered` and returns the new token ID. |
| `verifyLogoIntegrity(uint256 tokenId, bytes32 contentHash) → (bool, string)` | view (free) | Returns `(true, "Logo is authentic.")` if the hash matches the stored one, otherwise `(false, "Warning: logo does not match.")`. |
| `getAsset(uint256 tokenId) → AssetMetadata` | view (free) | Returns the full registration record. |
| `totalAssets() → uint256` | view (free) | Number of registered assets. |
| `assets(uint256)` / `registeredHashes(bytes32)` | public mappings | The two required mappings. |

### ALULogoToken (ERC-20, name "ALU Logo Token", symbol "ALUT", 18 decimals)

| Function | Type | What it does |
|---|---|---|
| `constructor(address logoOwner)` | deployment | Mints the fixed 1,000,000 ALUT supply to `logoOwner` and makes them the contract owner. |
| `distributeShares(address recipient, uint256 amount)` | transaction, `onlyOwner` | Requires `amount > 0`, then transfers `amount` ALUT (in base units, 18 decimals) from the owner to `recipient`. |
| `ownershipPercentage(address account) → uint256` | view (free) | `balance × 100 / totalSupply`, rounded down. 500,000 ALUT returns `50`. |

In ethers.js, use `ethers.parseUnits("100000", 18)` to express 100,000 ALUT.

---

## Problems encountered and how they were resolved

1. **`npm install hardhat` installs Hardhat 3.** Hardhat 3 is now the default npm release. It uses ES modules and a different API (`network.connect()`, a new test runner setup), so the CommonJS layout this assignment expects (`hardhat.config.js`, `require("hardhat")` in `scripts/deploy.js`) did not work out of the box. **Fix:** pinned `hardhat@2.29.1` and `@nomicfoundation/hardhat-toolbox@6.1.2` (the `hh2` release line).
2. **Compilation failed with `The "mcopy" instruction is only available for Cancun-compatible VMs`.** OpenZeppelin 5.6 uses the `mcopy` opcode, but Hardhat 2 compiles for the older `paris` EVM by default. **Fix:** set `evmVersion: "cancun"` in `hardhat.config.js`.
3. **OpenZeppelin v5 removed `Counters.sol`**, which older tutorials use for token IDs. **Fix:** a simple `uint256 private _tokenIdCounter` that is incremented before each mint.
4. **OpenZeppelin v5 `Ownable` requires an initial owner in the constructor.** **Fix:** `Ownable(logoOwner)`. This also means the wallet holding the tokens is the wallet allowed to distribute them, so `distributeShares()` always transfers from the right balance.
5. **Re-entrancy risk in `registerAsset()`.** `_safeMint()` calls `onERC721Received()` on the receiver if it is a contract. If the hash were only marked as used *after* minting, a malicious contract could re-enter and register the same file twice. **Fix:** followed the checks-effects-interactions pattern. The metadata and the "hash used" flag are written before `_safeMint()` is called.
6. **Verifying a non-existent token with an all-zero hash would have returned "authentic"**, because unset storage is zero. **Fix:** `registerAsset()` rejects `bytes32(0)`, and `verifyLogoIntegrity()` and `getAsset()` revert with `token does not exist` for unregistered IDs.
7. **Hash format mismatch.** Hashing tools print 64 hex characters, but a Solidity `bytes32` argument needs a `0x` prefix. **Fix:** `scripts/hash-logo.js` prints both forms, and the deploy script checks the file against the hard-coded hash before registering.

---

## Notes for the next assignment (dApp)

- Contract ABIs are in `artifacts/contracts/<Name>.sol/<Name>.json` after compiling.
- `deployments/localhost.json` holds the deployed addresses and the logo's token ID.
- To connect MetaMask to the local node, add a network with RPC URL `http://127.0.0.1:8545` and chain ID `31337`, then import one of the test private keys.
- `verifyLogoIntegrity()` and `getAsset()` are view functions, so a front-end can call them without the user paying gas.
