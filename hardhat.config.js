require("@nomicfoundation/hardhat-toolbox");

/**
 * Hardhat configuration for the ALU Logo Registry project.
 *
 * - `hardhat`   : in-process blockchain used automatically by `npx hardhat test`
 * - `localhost` : the standalone local node started with `npx hardhat node`
 * - `sepolia`   : optional public testnet, only enabled when SEPOLIA_RPC_URL and
 *                 PRIVATE_KEY are set as environment variables (never commit keys!)
 *
 * @type import('hardhat/config').HardhatUserConfig
 */
const networks = {
  localhost: {
    url: "http://127.0.0.1:8545",
    chainId: 31337,
  },
};

if (process.env.SEPOLIA_RPC_URL && process.env.PRIVATE_KEY) {
  networks.sepolia = {
    url: process.env.SEPOLIA_RPC_URL,
    accounts: [process.env.PRIVATE_KEY],
  };
}

module.exports = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      // OpenZeppelin Contracts v5.6 uses the `mcopy` opcode, which only exists from the
      // Cancun upgrade onwards. Hardhat 2 compiles for "paris" by default, so we set it here.
      evmVersion: "cancun",
    },
  },
  networks,
};
