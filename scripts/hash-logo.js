/**
 * Generates the SHA-256 hash of a file (by default the ALU logo) using Node.js.
 *
 * Usage:
 *   node scripts/hash-logo.js                 -> hashes ./alu-logo.png
 *   node scripts/hash-logo.js path/to/file    -> hashes any other file
 *
 * The output in "bytes32" form (0x + 64 hex characters) is the value passed as
 * `contentHash` to ALUAssetRegistry.registerAsset() and verifyLogoIntegrity().
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

/** Returns the SHA-256 hash of a file as a 0x-prefixed bytes32 hex string. */
function sha256File(filePath) {
  const fileBytes = fs.readFileSync(filePath);
  return "0x" + crypto.createHash("sha256").update(fileBytes).digest("hex");
}

module.exports = { sha256File };

// Only print when run directly (not when imported by deploy.js or the tests).
if (require.main === module) {
  const target = path.resolve(process.argv[2] || path.join(__dirname, "..", "alu-logo.png"));
  const hash = sha256File(target);
  const size = fs.statSync(target).size;

  console.log("File           :", path.basename(target));
  console.log("Size           :", size, "bytes");
  console.log("SHA-256 (hex)  :", hash.slice(2));
  console.log("bytes32 value  :", hash);
}
