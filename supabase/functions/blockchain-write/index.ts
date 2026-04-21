import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { ethers } from "https://esm.sh/ethers@6.11.1";

const PRIVATE_KEY = Deno.env.get("BLOCKCHAIN_PRIVATE_KEY")!;
const RPC_URL = Deno.env.get("ALCHEMY_RPC_URL")!;
const CONTRACT_ADDRESS = Deno.env.get("CONTRACT_ADDRESS")!;

const ABI = [
  "function storeConfession(bytes32 confessionId, bytes32 contentHash) external",
  "function storeUser(bytes32 userId, bytes32 contentHash) external",
];

function uuidToBytes32(uuid: string): string {
  const hex = uuid.replace(/-/g, "");
  return "0x" + hex.padEnd(64, "0");
}

function hashToBytes32(hash: string): string {
  const clean = hash.startsWith("0x") ? hash.slice(2) : hash;
  return "0x" + clean.padEnd(64, "0");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No auth token" }), {
        status: 401,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    const { action, confessionId, contentHash, userId, username } = await req.json();

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, wallet);

    let tx;

    if (action === "storeConfession") {
      tx = await contract.storeConfession(
        uuidToBytes32(confessionId),
        hashToBytes32(contentHash)
      );
    } else if (action === "storeUser") {
      const userDataHash = ethers.keccak256(ethers.toUtf8Bytes(userId + username));
      tx = await contract.storeUser(
        uuidToBytes32(userId),
        userDataHash
      );
    } else {
      return new Response(JSON.stringify({ error: "Invalid action" }), {
        status: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    const receipt = await tx.wait();

    return new Response(
      JSON.stringify({ success: true, txHash: receipt.hash }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      }
    );
  }
});
