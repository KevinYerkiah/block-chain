# BLOCKCHAIN.md — Smart Contract Implementation

Read this ENTIRE file before writing any code.

---

## Overview

Build and deploy a smart contract on **Ethereum Sepolia testnet** that stores content hashes of confessions and user records. Wire the existing React frontend to call this contract. The user has already set up their wallet, Alchemy RPC, and has test ETH.

**What the blockchain stores:**
- **Confession hashes** — SHA-256 hash of confession content, written after the 2-minute edit window (only if `opt_in_blockchain = true`)
- **User hashes** — hash of user ID + username at signup
- **Nothing else** — votes, chat messages, profiles stay DB-only

**What the blockchain does NOT store:** actual confession text. The plaintext lives encrypted in Supabase. The blockchain is a tamper-proof audit trail of *what existed and when*.

---

## Setup State (What's Already Done)

The user has already completed these steps manually:

✅ Installed MetaMask browser extension  
✅ Created a wallet and saved the recovery phrase  
✅ Switched network to Ethereum Sepolia  
✅ Created an Alchemy account and an app on Sepolia  
✅ Has their Alchemy RPC URL  
✅ Has their wallet private key saved locally  
✅ Has their wallet address  
✅ Has test ETH in the wallet (funded via Sepolia faucet)  
✅ Created a `.env` file with the three variables below

**The `.env` file already exists** at the project root with these variables:
```
PRIVATE_KEY=<64 hex chars, no 0x prefix>
ALCHEMY_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/Y6FLZ70tWpLgoesrjgXzO
WALLET_ADDRESS=0x...
```

**Do NOT modify `.env`.** Read from it.

---

## Step 1: Create the Hardhat Project

The blockchain code lives in a **separate folder** alongside the React project, not inside it. This keeps the concerns isolated — a compiled smart contract is not a React component.

```bash
# From the PARENT folder of your React project:
mkdir confession-blockchain
cd confession-blockchain

npm init -y
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox dotenv

# Initialize Hardhat — choose "Create a JavaScript project" when prompted
# Say yes to everything else (gitignore, etc.)
npx hardhat init
```

This creates a Hardhat project with `contracts/`, `scripts/`, `test/`, and `hardhat.config.js`.

**Delete the boilerplate** Lock contract and its tests:
```bash
rm contracts/Lock.sol
rm test/Lock.js
# Windows: del instead of rm
```

**Move the `.env` file** from wherever the user created it INTO the `confession-blockchain/` folder. The agent should confirm with the user where their `.env` currently is and instruct them to move it if needed.

**Update `.gitignore`** to include:
```
node_modules
.env
artifacts
cache
```

---

## Step 2: Write the Smart Contract

Create `contracts/ConfessionRegistry.sol`:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ConfessionRegistry
 * @notice Stores tamper-proof hashes of confessions and user records.
 *         The blockchain does NOT store content — only SHA-256 hashes + timestamps.
 *         This lets anyone verify content integrity against the immutable ledger.
 */
contract ConfessionRegistry {

    struct Record {
        bytes32 contentHash;
        uint256 timestamp;
        bool exists;
    }

    mapping(bytes32 => Record) private confessions;
    mapping(bytes32 => Record) private users;

    event ConfessionStored(bytes32 indexed confessionId, bytes32 contentHash, uint256 timestamp);
    event UserStored(bytes32 indexed userId, bytes32 contentHash, uint256 timestamp);

    /**
     * @notice Writes a confession hash to the blockchain. Called after the 2-minute edit window expires.
     * @param confessionId  UUID of the confession, converted to bytes32
     * @param contentHash   SHA-256 hash of the plaintext confession, as bytes32
     */
    function storeConfession(bytes32 confessionId, bytes32 contentHash) external {
        require(!confessions[confessionId].exists, "Confession already on chain");
        confessions[confessionId] = Record(contentHash, block.timestamp, true);
        emit ConfessionStored(confessionId, contentHash, block.timestamp);
    }

    /**
     * @notice Writes a user record hash to the blockchain. Called at signup.
     * @param userId       UUID of the user, converted to bytes32
     * @param contentHash  Hash of (userId + username), as bytes32
     */
    function storeUser(bytes32 userId, bytes32 contentHash) external {
        require(!users[userId].exists, "User already on chain");
        users[userId] = Record(contentHash, block.timestamp, true);
        emit UserStored(userId, contentHash, block.timestamp);
    }

    /**
     * @notice Verifies a confession hash matches what's on-chain.
     * @return true if the provided hash matches the stored hash
     */
    function verifyConfession(bytes32 confessionId, bytes32 hashToCheck) external view returns (bool) {
        require(confessions[confessionId].exists, "Confession not on chain");
        return confessions[confessionId].contentHash == hashToCheck;
    }

    /**
     * @notice Verifies a user record hash matches what's on-chain.
     */
    function verifyUser(bytes32 userId, bytes32 hashToCheck) external view returns (bool) {
        require(users[userId].exists, "User not on chain");
        return users[userId].contentHash == hashToCheck;
    }

    /**
     * @notice Returns the stored confession record.
     */
    function getConfession(bytes32 confessionId) external view returns (bytes32 contentHash, uint256 timestamp) {
        require(confessions[confessionId].exists, "Confession not on chain");
        Record memory r = confessions[confessionId];
        return (r.contentHash, r.timestamp);
    }

    /**
     * @notice Returns the stored user record.
     */
    function getUser(bytes32 userId) external view returns (bytes32 contentHash, uint256 timestamp) {
        require(users[userId].exists, "User not on chain");
        Record memory r = users[userId];
        return (r.contentHash, r.timestamp);
    }

    /**
     * @notice Checks if a confession is on-chain without reverting.
     */
    function isConfessionOnChain(bytes32 confessionId) external view returns (bool) {
        return confessions[confessionId].exists;
    }

    /**
     * @notice Checks if a user is on-chain without reverting.
     */
    function isUserOnChain(bytes32 userId) external view returns (bool) {
        return users[userId].exists;
    }
}
```

---

## Step 3: Configure Hardhat

Replace `hardhat.config.js` with:

```javascript
require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const PRIVATE_KEY = process.env.PRIVATE_KEY;
const ALCHEMY_RPC_URL = process.env.ALCHEMY_RPC_URL;

if (!PRIVATE_KEY || !ALCHEMY_RPC_URL) {
    throw new Error("Missing PRIVATE_KEY or ALCHEMY_RPC_URL in .env");
}

// Add 0x prefix if the user pasted the key without it
const formattedKey = PRIVATE_KEY.startsWith("0x") ? PRIVATE_KEY : `0x${PRIVATE_KEY}`;

module.exports = {
    solidity: {
        version: "0.8.20",
        settings: {
            optimizer: {
                enabled: true,
                runs: 200,
            },
        },
    },
    networks: {
        hardhat: {
            // Local development network
        },
        sepolia: {
            url: ALCHEMY_RPC_URL,
            accounts: [formattedKey],
            chainId: 11155111,
        },
    },
};
```

---

## Step 4: Write the Deployment Script

Create `scripts/deploy.js`:

```javascript
const hre = require("hardhat");

async function main() {
    console.log("Deploying ConfessionRegistry to", hre.network.name, "...");

    const [deployer] = await hre.ethers.getSigners();
    console.log("Deployer address:", deployer.address);

    const balance = await hre.ethers.provider.getBalance(deployer.address);
    console.log("Deployer balance:", hre.ethers.formatEther(balance), "ETH");

    if (balance === 0n) {
        throw new Error("Deployer has no ETH. Get Sepolia test ETH from a faucet first.");
    }

    const ConfessionRegistry = await hre.ethers.getContractFactory("ConfessionRegistry");
    const contract = await ConfessionRegistry.deploy();
    await contract.waitForDeployment();

    const address = await contract.getAddress();
    console.log("\n✅ Contract deployed at:", address);
    console.log("\n📋 Copy this address into your React project's .env as VITE_CONTRACT_ADDRESS");
    console.log("🔗 View on Etherscan: https://sepolia.etherscan.io/address/" + address);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
```

---

## Step 5: Write the Test File

Create `test/ConfessionRegistry.js`:

```javascript
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ConfessionRegistry", function () {
    let contract;
    let owner;

    const sampleConfessionId = "0x" + "a".repeat(64);
    const sampleHash = "0x" + "b".repeat(64);
    const sampleUserId = "0x" + "c".repeat(64);
    const sampleUserHash = "0x" + "d".repeat(64);

    beforeEach(async function () {
        [owner] = await ethers.getSigners();
        const ConfessionRegistry = await ethers.getContractFactory("ConfessionRegistry");
        contract = await ConfessionRegistry.deploy();
        await contract.waitForDeployment();
    });

    describe("Confessions", function () {
        it("stores a confession hash", async function () {
            await contract.storeConfession(sampleConfessionId, sampleHash);
            const [hash, timestamp] = await contract.getConfession(sampleConfessionId);
            expect(hash).to.equal(sampleHash);
            expect(timestamp).to.be.greaterThan(0);
        });

        it("verifies a matching hash", async function () {
            await contract.storeConfession(sampleConfessionId, sampleHash);
            expect(await contract.verifyConfession(sampleConfessionId, sampleHash)).to.be.true;
        });

        it("rejects a mismatching hash", async function () {
            await contract.storeConfession(sampleConfessionId, sampleHash);
            const wrongHash = "0x" + "e".repeat(64);
            expect(await contract.verifyConfession(sampleConfessionId, wrongHash)).to.be.false;
        });

        it("prevents duplicate storage", async function () {
            await contract.storeConfession(sampleConfessionId, sampleHash);
            await expect(
                contract.storeConfession(sampleConfessionId, sampleHash)
            ).to.be.revertedWith("Confession already on chain");
        });

        it("emits ConfessionStored event", async function () {
            await expect(contract.storeConfession(sampleConfessionId, sampleHash))
                .to.emit(contract, "ConfessionStored");
        });
    });

    describe("Users", function () {
        it("stores and verifies a user", async function () {
            await contract.storeUser(sampleUserId, sampleUserHash);
            expect(await contract.verifyUser(sampleUserId, sampleUserHash)).to.be.true;
        });

        it("reports on-chain status correctly", async function () {
            expect(await contract.isUserOnChain(sampleUserId)).to.be.false;
            await contract.storeUser(sampleUserId, sampleUserHash);
            expect(await contract.isUserOnChain(sampleUserId)).to.be.true;
        });
    });
});
```

---

## Step 6: Compile, Test, Deploy

Run these commands in order. **Stop and report to the user if any step fails.**

```bash
# 1. Compile the contract — creates artifacts/
npx hardhat compile

# 2. Run local tests — verifies the contract logic
npx hardhat test

# 3. Deploy to Sepolia
npx hardhat run scripts/deploy.js --network sepolia
```

The deployment script will print the contract address. **Save this address** — it's needed for the React project.

---

## Step 7: Extract the ABI for the React Project

The React project needs the contract's ABI (Application Binary Interface) to know how to call it. After `npx hardhat compile`, Hardhat generates the ABI inside `artifacts/contracts/ConfessionRegistry.sol/ConfessionRegistry.json`.

Create a small script `scripts/export-abi.js`:

```javascript
const fs = require("fs");
const path = require("path");

const artifactPath = path.join(
    __dirname,
    "../artifacts/contracts/ConfessionRegistry.sol/ConfessionRegistry.json"
);

const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
const abi = artifact.abi;

// Path to the React project's src/abi folder
// Adjust this path based on the actual location of the React project
const REACT_ABI_DIR = path.join(__dirname, "../../confessions-platform/src/abi");

if (!fs.existsSync(REACT_ABI_DIR)) {
    fs.mkdirSync(REACT_ABI_DIR, { recursive: true });
}

fs.writeFileSync(
    path.join(REACT_ABI_DIR, "ConfessionRegistry.json"),
    JSON.stringify(abi, null, 2)
);

console.log("✅ ABI exported to", REACT_ABI_DIR);
```

**Ask the user** what their React project folder is named if it isn't obviously `confessions-platform`. Adjust the `REACT_ABI_DIR` path accordingly.

Run it:
```bash
node scripts/export-abi.js
```

---

## Step 8: Wire the React Frontend

Now switch to the React project folder (separate from the Hardhat project).

**Install ethers in the React project:**
```bash
cd ../confessions-platform   # or wherever the React project lives
npm install ethers
```

**Add to the React project's `.env`** (create one if it doesn't exist — it's separate from Hardhat's .env):
```
VITE_CONTRACT_ADDRESS=<paste the deployed contract address>
VITE_ALCHEMY_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/Y6FLZ70tWpLgoesrjgXzO
```

Make sure `.env` is in `.gitignore`.

---

## Step 9: Create the Blockchain Service

Create `src/security/blockchainService.js` in the React project:

```javascript
import { ethers } from 'ethers';
import ConfessionRegistryABI from '../abi/ConfessionRegistry.json';

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS;
const RPC_URL = import.meta.env.VITE_ALCHEMY_RPC_URL;

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Convert a UUID string (with dashes) to bytes32 format for the contract.
 * Example: "550e8400-e29b-41d4-a716-446655440000" → "0x550e8400e29b41d4a716446655440000000000000000000000000000000000"
 */
function uuidToBytes32(uuid) {
    const hex = uuid.replace(/-/g, '');
    // Pad to 64 chars (32 bytes)
    return '0x' + hex.padEnd(64, '0');
}

/**
 * Convert a hex hash string to bytes32. If it already has 0x, use as-is.
 */
function hashToBytes32(hash) {
    const clean = hash.startsWith('0x') ? hash.slice(2) : hash;
    if (clean.length !== 64) {
        throw new Error(`Invalid hash length: ${clean.length}, expected 64 hex chars`);
    }
    return '0x' + clean;
}

/**
 * Read-only provider using Alchemy RPC directly.
 * Used for all verify/read operations — no wallet needed.
 */
function getReadProvider() {
    return new ethers.JsonRpcProvider(RPC_URL);
}

/**
 * Wallet-backed provider using MetaMask.
 * Used for write operations (storing hashes) — user must approve in MetaMask.
 */
async function getWriteContract() {
    if (!window.ethereum) {
        throw new Error('MetaMask is not installed. Install it from metamask.io to write to blockchain.');
    }

    const provider = new ethers.BrowserProvider(window.ethereum);
    await provider.send('eth_requestAccounts', []);  // prompt user to connect if needed

    // Check network — must be Sepolia (chainId 0xaa36a7 = 11155111)
    const network = await provider.getNetwork();
    if (network.chainId !== 11155111n) {
        throw new Error('Please switch MetaMask to Sepolia network.');
    }

    const signer = await provider.getSigner();
    return new ethers.Contract(CONTRACT_ADDRESS, ConfessionRegistryABI, signer);
}

function getReadContract() {
    const provider = getReadProvider();
    return new ethers.Contract(CONTRACT_ADDRESS, ConfessionRegistryABI, provider);
}

// ─────────────────────────────────────────────────────────────
// WRITE OPERATIONS (require MetaMask)
// ─────────────────────────────────────────────────────────────

/**
 * Store a confession hash on-chain. Called after the 2-minute edit window.
 * @returns { success, txHash, error }
 */
export async function storeConfessionOnChain(confessionId, contentHash) {
    try {
        const contract = await getWriteContract();
        const tx = await contract.storeConfession(
            uuidToBytes32(confessionId),
            hashToBytes32(contentHash)
        );
        const receipt = await tx.wait();
        return { success: true, txHash: receipt.hash };
    } catch (err) {
        console.error('storeConfessionOnChain error:', err);
        return { success: false, error: err.message };
    }
}

/**
 * Store a user hash on-chain. Called at signup.
 */
export async function storeUserOnChain(userId, username) {
    try {
        // Hash the user data — SHA-256 of (userId + username)
        const encoder = new TextEncoder();
        const data = encoder.encode(userId + username);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        const contract = await getWriteContract();
        const tx = await contract.storeUser(
            uuidToBytes32(userId),
            hashToBytes32(hashHex)
        );
        const receipt = await tx.wait();
        return { success: true, txHash: receipt.hash, userHash: hashHex };
    } catch (err) {
        console.error('storeUserOnChain error:', err);
        return { success: false, error: err.message };
    }
}

// ─────────────────────────────────────────────────────────────
// READ OPERATIONS (no wallet needed — uses Alchemy directly)
// ─────────────────────────────────────────────────────────────

/**
 * Verify a confession's content hash matches what's on-chain.
 * @returns { verified, onChain, error }
 */
export async function verifyConfessionOnChain(confessionId, contentHash) {
    try {
        const contract = getReadContract();
        const isOnChain = await contract.isConfessionOnChain(uuidToBytes32(confessionId));

        if (!isOnChain) {
            return { verified: false, onChain: false };
        }

        const verified = await contract.verifyConfession(
            uuidToBytes32(confessionId),
            hashToBytes32(contentHash)
        );
        return { verified, onChain: true };
    } catch (err) {
        console.error('verifyConfessionOnChain error:', err);
        return { verified: false, onChain: false, error: err.message };
    }
}

/**
 * Fetch the on-chain record for a confession (hash + timestamp).
 */
export async function getConfessionFromChain(confessionId) {
    try {
        const contract = getReadContract();
        const isOnChain = await contract.isConfessionOnChain(uuidToBytes32(confessionId));

        if (!isOnChain) {
            return { found: false };
        }

        const [contentHash, timestamp] = await contract.getConfession(uuidToBytes32(confessionId));
        return {
            found: true,
            contentHash,
            timestamp: Number(timestamp),   // bigint → number
        };
    } catch (err) {
        console.error('getConfessionFromChain error:', err);
        return { found: false, error: err.message };
    }
}

/**
 * Check if a confession is on-chain (without fetching data).
 */
export async function isConfessionOnChain(confessionId) {
    try {
        const contract = getReadContract();
        return await contract.isConfessionOnChain(uuidToBytes32(confessionId));
    } catch (err) {
        return false;
    }
}
```

---

## Step 10: Replace Frontend TODO Stubs

Find every `// TODO: Blockchain team` comment in the existing React code and replace with calls to `blockchainService.js`.

### Location 1: The "Verify Integrity" button handler

In `src/components/ActionBar.jsx` (or wherever the verify button logic lives), replace the stub:

```javascript
// BEFORE (stub)
// TODO: Blockchain team — call verify

// AFTER
import { verifyConfessionOnChain } from '../security/blockchainService';

async function handleVerify() {
    setVerifying(true);
    try {
        const result = await verifyConfessionOnChain(confessionId, contentHash);

        if (!result.onChain) {
            setVerifyStatus({
                icon: '⏳',
                color: 'warning',
                message: 'Not yet on blockchain — still within edit window',
            });
        } else if (result.verified) {
            setVerifyStatus({
                icon: '🛡️',
                color: 'success',
                message: 'Integrity verified — content matches blockchain',
            });
        } else {
            setVerifyStatus({
                icon: '🚨',
                color: 'danger',
                message: 'ALERT: Content does not match blockchain record',
            });
        }
    } finally {
        setVerifying(false);
    }
}
```

### Location 2: The background "write to blockchain after 2 minutes" trigger

In `src/pages/HomePage.jsx` (the global feed), add a useEffect that runs whenever the feed loads:

```javascript
import { storeConfessionOnChain } from '../security/blockchainService';
import { supabase } from '../config/supabase';

useEffect(() => {
    async function processExpiredConfessions() {
        // Find confessions that opted into blockchain, haven't been written yet,
        // and whose edit window has passed — AND belong to the current user
        const { data: expired } = await supabase
            .from('confessions')
            .select('id, content_hash')
            .eq('user_id', currentUser.id)
            .eq('opt_in_blockchain', true)
            .eq('is_on_chain', false)
            .lt('edit_window_expires_at', new Date().toISOString())
            .limit(5);   // process 5 at a time, don't spam MetaMask

        if (!expired || expired.length === 0) return;

        for (const c of expired) {
            const result = await storeConfessionOnChain(c.id, c.content_hash);

            if (result.success) {
                await supabase
                    .from('confessions')
                    .update({
                        is_on_chain: true,
                        blockchain_tx_hash: result.txHash,
                    })
                    .eq('id', c.id);

                await supabase
                    .from('blockchain_sync_log')
                    .insert({
                        entity_type: 'confession',
                        entity_id: c.id,
                        tx_hash: result.txHash,
                        status: 'confirmed',
                    });
            }
        }
    }

    processExpiredConfessions();
}, [confessions, currentUser]);
```

**Only the user who posted the confession can write it on-chain** (because the signing wallet must match the user). This is fine — every user is responsible for their own confessions going on-chain.

### Location 3: Register flow

In the registration handler (`src/pages/RegisterPage.jsx` or wherever `signUp` is wired), after the Supabase insert succeeds, optionally call:

```javascript
import { storeUserOnChain } from '../security/blockchainService';

// After supabase.from('users').insert(...) succeeds:
const chainResult = await storeUserOnChain(newUser.id, newUser.username);
if (chainResult.success) {
    await supabase
        .from('users')
        .update({ blockchain_tx_hash: chainResult.txHash })
        .eq('id', newUser.id);
}
```

MetaMask will pop up and ask the user to sign this transaction. If they reject, that's fine — the account still exists in Supabase, just not on-chain. Add a friendly note during signup: "We'll ask MetaMask to confirm your account on the blockchain. You can skip this if you prefer."

---

## Step 11: MetaMask Connection UX

The user needs MetaMask installed to write to the blockchain. Add a graceful fallback:

In any component that calls write operations, wrap the call with a check:

```javascript
if (!window.ethereum) {
    alert('To write to the blockchain, install MetaMask from metamask.io');
    return;
}
```

Optionally build a small `src/components/ConnectWalletButton.jsx` that shows:
- "Connect MetaMask" if no wallet is connected
- The truncated wallet address if connected

But this is low-priority polish — the write functions already handle prompting.

---

## Summary of Files Created / Modified

| Folder | File | Action |
|---|---|---|
| `confession-blockchain/` | `contracts/ConfessionRegistry.sol` | CREATE |
| `confession-blockchain/` | `scripts/deploy.js` | CREATE |
| `confession-blockchain/` | `scripts/export-abi.js` | CREATE |
| `confession-blockchain/` | `test/ConfessionRegistry.js` | CREATE |
| `confession-blockchain/` | `hardhat.config.js` | MODIFY (replace contents) |
| `confession-blockchain/` | `.gitignore` | MODIFY (add `.env`) |
| `confessions-platform/` | `.env` | CREATE or MODIFY (add `VITE_CONTRACT_ADDRESS` + `VITE_ALCHEMY_RPC_URL`) |
| `confessions-platform/` | `src/abi/ConfessionRegistry.json` | CREATE (via export-abi script) |
| `confessions-platform/` | `src/security/blockchainService.js` | CREATE |
| `confessions-platform/` | `src/components/ActionBar.jsx` | MODIFY (wire verify button) |
| `confessions-platform/` | `src/pages/HomePage.jsx` | MODIFY (add blockchain write effect) |
| `confessions-platform/` | `src/pages/RegisterPage.jsx` | MODIFY (optional on-chain user write) |

**Do NOT modify:**
- The `.env` file's existing values
- `src/config/supabase.js`
- `src/config/colors.js`
- Any `src/security/` files except to CREATE `blockchainService.js`
- Database schema (it already has `blockchain_tx_hash` and `is_on_chain` columns)

---

## Testing Checklist

After everything is wired:

1. **Contract deployed?** Check the Sepolia Etherscan link printed by the deploy script — you should see the contract at that address.
2. **ABI exported?** Verify `confessions-platform/src/abi/ConfessionRegistry.json` exists.
3. **React .env has contract address?** Verify `VITE_CONTRACT_ADDRESS` is set.
4. **Post a test confession** with "Add to blockchain" checked.
5. **Wait 2 minutes**, refresh the home page — MetaMask should pop up asking to sign the `storeConfession` transaction.
6. **After signing**, the confession should have `is_on_chain = true` in Supabase.
7. **Click "Verify Integrity"** on that confession — should show green "verified".
8. **Manually edit** the `encrypted_content` or `content_hash` in Supabase (simulate tampering), then click Verify again — should show red "does not match blockchain record".

---

## Notes for the Agent

- Use **Hardhat 2.x** conventions (the current stable version)
- Use **ethers v6** in the React frontend (`BrowserProvider`, `JsonRpcProvider`, `getSigner()` are async)
- All paths in this file assume the blockchain project and React project are **sibling folders**. If the user's layout differs, adjust paths in `export-abi.js` accordingly.
- If `npx hardhat compile` fails with a Solidity version error, check that the `pragma solidity ^0.8.20` in the contract matches the `version: "0.8.20"` in `hardhat.config.js`.
- If the deployment script fails with "insufficient funds", the user needs to claim more Sepolia test ETH from a faucet.
- The existing React frontend uses CSS Modules, plain JavaScript (no TypeScript), and colors imported from `src/config/colors.js`. Follow the same conventions when modifying components.
