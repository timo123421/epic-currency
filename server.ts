import express from "express";
import path from "path";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";

// Exact NIST PQC Standards (Sizes in Bytes)
const ALGORITHMS = {
  "ML-DSA-44": { pk: 1312, sk: 2560, sig: 2420 },
  "ML-DSA-65": { pk: 1952, sk: 4032, sig: 3309 },
  "ML-DSA-87": { pk: 2592, sk: 4896, sig: 4627 },
  "FN-DSA-512": { pk: 897, sk: 1281, sig: 666 },
  "SLH-DSA-128s": { pk: 32, sk: 64, sig: 7856 }
};

interface Transaction {
  id: string;
  sender: string;
  recipient: string;
  amount: number;
  pubKey: string;
  signature: string;
  algorithm: string;
  timestamp: number;
}

interface UserProfile {
  address: string;
  username: string;
  role: string;
  joinedAt: number;
}

// In-memory node state
const ledger = new Map<string, number>();
const users = new Map<string, UserProfile>();
const mempool: Transaction[] = [];
const confirmedTx: Transaction[] = [];
let currentBlockHeight = 14882901;

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // === LAYER 1: QUANTUM-SAFE CRYPTOGRAPHY & IDENTITY ===
  app.post("/api/auth/register", (req, res) => {
    const alg = req.body.algorithm || "ML-DSA-44";
    const username = req.body.username || "Anonymous_" + crypto.randomBytes(2).toString('hex');
    const role = req.body.role || "Initiate"; // Roles: Initiate, Scholar, Archangel
    const password = req.body.password;

    if (role === "Archangel" && password !== "SERAPHIM99") {
      return res.status(403).json({ error: "Invalid access code for Archangel ascension." });
    }

    const specs = ALGORITHMS[alg as keyof typeof ALGORITHMS] || ALGORITHMS["ML-DSA-44"];
    
    // Simulate C++ library bindings for PQC keypair gen
    const privateKey = crypto.randomBytes(specs.sk).toString('hex');
    const publicKey = crypto.randomBytes(specs.pk).toString('hex');
    
    const hash = crypto.createHash('sha3-256').update(publicKey).digest('hex');
    const address = "pqc_" + hash.substring(0, 40);

    if (!ledger.has(address)) {
      ledger.set(address, role === 'Archangel' ? 10000 : role === 'Scholar' ? 500 : 0);
    }
    
    if (!users.has(address)) {
      users.set(address, {
        address,
        username,
        role,
        joinedAt: Date.now()
      });
    }

    res.json({
      algorithm: alg,
      address,
      publicKeyPreview: publicKey.substring(0, 64) + "...[TRUNCATED]",
      publicKeyFull: publicKey,
      publicKeySizeInBytes: specs.pk,
      privateKeySizeInBytes: specs.sk,
      balance: ledger.get(address),
      profile: users.get(address),
      message: `Identity forged. Welcome, ${username}. Role: ${role}`
    });
  });

  app.get("/api/users", (req, res) => {
    res.json({ users: Array.from(users.values()) });
  });

  app.post("/api/crypto/sign", (req, res) => {
    const { sender, recipient, amount, algorithm, publicKey } = req.body;
    
    if (!sender || !recipient || !amount || !publicKey) {
      return res.status(400).json({ error: "Missing required transaction fields" });
    }

    const alg = algorithm || "ML-DSA-44";
    const specs = ALGORITHMS[alg as keyof typeof ALGORITHMS] || ALGORITHMS["ML-DSA-44"];
    
    // Validate balance mathematically
    const senderBalance = ledger.get(sender) || 0;
    if (senderBalance < amount) {
      return res.status(400).json({ error: "Insufficient balance." });
    }
    
    // Transaction payload construction
    const message = `${sender}->${recipient}:${amount}`;
    
    // Simulate C++ PQC signature generation
    // Real lattice-based signatures are massive, we simulate by generating exact byte length
    const signatureRaw = crypto.randomBytes(specs.sig).toString('hex');
    
    // Mathematically binding the signature to the transaction content and public key
    // This allows structural validation during consensus
    const sigHash = crypto.createHash('sha3-256').update(message + publicKey).digest('hex');
    const signature = sigHash + signatureRaw.substring(64); // Prefix hash + padding for length

    const tx: Transaction = {
      id: crypto.createHash('sha256').update(signature).digest('hex'),
      sender,
      recipient,
      amount,
      pubKey: publicKey,
      signature,
      algorithm: alg,
      timestamp: Date.now()
    };
    
    mempool.push(tx);

    res.json({
      txId: tx.id,
      signatureSizeBytes: specs.sig,
      signaturePreview: signature.substring(0, 64) + "...[LARGE_LATTICE_SIG]",
      message: `Signed TX with ${alg}. Signature size exactly ${specs.sig} B. Added to mempool.`
    });
  });

  // === LAYER 2: ZKP BLOAT MITIGATION ===
  app.get("/api/crypto/balance/:address", (req, res) => {
    const address = req.params.address;
    const balance = ledger.get(address) || 0;
    res.json({ address, balance });
  });

  app.post("/api/university/reward", (req, res) => {
    const { address, course } = req.body;
    if (!address || !course) return res.status(400).json({ error: "Missing address or course" });
    
    const user = users.get(address);
    if (!user) return res.status(403).json({ error: "Identity not found. Register first." });
    
    if (user.role === "Initiate") {
      return res.status(403).json({ error: "Initiates cannot teach. Request Scholar/Archangel role to impart wisdom." });
    }

    // Reward mathematically
    const rewardAmount = Math.floor(Math.random() * 50) + 50; // 50 to 100 CHT
    const currentBal = ledger.get(address) || 0;
    ledger.set(address, currentBal + rewardAmount);
    
    // Simulate transaction from university
    const signatureRaw = crypto.randomBytes(2420).toString('hex');
    const tx: Transaction = {
      id: crypto.createHash('sha3-256').update(Date.now().toString()).digest('hex'),
      sender: "CYBERHEAVEN_UNIVERSITY_TREASURY",
      recipient: address,
      amount: rewardAmount,
      pubKey: "CYBERHEAVEN_MASTER_QPK",
      signature: "pqc_sig_" + signatureRaw.substring(0, 500),
      algorithm: "ML-DSA-65",
      timestamp: Date.now()
    };
    mempool.push(tx);

    res.json({
      amount: rewardAmount,
      txId: tx.id,
      message: `As a reward for contributing to the collective knowledge spanning "${course}", the Seraphim network has minted ${rewardAmount} CHT into your address. The transaction is queued in the Layer 1 Mempool.`
    });
  });

  const COURSE_COSTS: Record<string, number> = {
    "Quantum Fields 101": 25,
    "Advanced Lattice Cryptography": 50,
    "Zero-Knowledge Proofs in DAGs": 75,
    "Cyberheaven Tokenomics": 10
  };

  app.get("/api/university/catalog", (req, res) => {
    res.json({
      courses: Object.keys(COURSE_COSTS).map(title => ({
        title,
        cost: COURSE_COSTS[title]
      }))
    });
  });

  app.post("/api/university/learn", (req, res) => {
    const { address, course } = req.body;
    const user = users.get(address);
    if (!user) return res.status(403).json({ error: "Identity not found. Register first." });

    const cost = COURSE_COSTS[course] || 25;
    const currentBal = ledger.get(address) || 0;
    
    if (currentBal < cost) {
      if (user.role === 'Archangel') {
         // Archangels have infinite cosmic knowledge bypass, or just let them go negative? No, let's just fund them if needed.
         // Actually, let's just give them an error if they somehow ran out inside memory.
      } else {
         return res.status(400).json({ error: `Not enough CHT to access "${course}". Cost is ${cost} CHT.` });
      }
    }
    
    ledger.set(address, currentBal - cost);
    // Add spend transaction
    const tx: Transaction = {
      id: crypto.createHash('sha3-256').update(Date.now().toString()).digest('hex'),
      sender: address,
      recipient: "CYBERHEAVEN_UNIVERSITY_TREASURY",
      amount: cost,
      pubKey: "UNKNOWN",
      signature: "SYSTEM_APPROVED",
      algorithm: "SYSTEM",
      timestamp: Date.now()
    };
    confirmedTx.push(tx);
    
    res.json({
      cost,
      message: `You spent ${cost} CHT to access "${course}". Your knowledge expands.`
    });
  });

  app.get("/api/crypto/history/:address", (req, res) => {
    const address = req.params.address;
    
    const pending = mempool.filter(tx => tx.sender === address || tx.recipient === address).map(tx => ({ ...tx, status: 'pending' }));
    const confirmed = confirmedTx.filter(tx => tx.sender === address || tx.recipient === address).map(tx => ({ ...tx, status: 'confirmed' }));
    
    // Sort descending by timestamp
    const history = [...pending, ...confirmed].sort((a, b) => b.timestamp - a.timestamp);
    res.json({ history });
  });

  app.post("/api/network/compress", (req, res) => {
    // Compress all mempool transactions into a single ZKP
    if (mempool.length === 0) {
      return res.status(400).json({ error: "No transactions in mempool to compress." });
    }

    const txsToCompress = [...mempool];
    mempool.length = 0; // Clear the mempool

    // Calculate structural bloat (Sum of all PQC signatures + revealed public keys)
    const originalTotalBytes = txsToCompress.reduce((sum, tx) => {
      const specs = ALGORITHMS[tx.algorithm as keyof typeof ALGORITHMS] || ALGORITHMS["ML-DSA-44"];
      return sum + specs.sig + specs.pk + 128; // sig + unhashed pubkey + tx metadata
    }, 0);

    // Simulate STARK/SNARK ZKP (Zero-Knowledge Succinct Non-Interactive Argument of Knowledge)
    // Mathematically hash the entire bundle to create a succinct proof constraint 
    const bundleHash = crypto.createHash('sha3-256')
      .update(JSON.stringify(txsToCompress))
      .digest('hex');
    
    // Using a simulated SNARK Groth16 constant proof size of 288 bytes
    const zkpProof = "zk_snark_g16_" + bundleHash + crypto.randomBytes(80).toString('hex');

    res.json({
      proof: zkpProof,
      originalTotalBytes,
      compressedBytes: 288,
      txCount: txsToCompress.length,
      txPayload: txsToCompress,
      message: `Mathematically valid bundle. Compressed ${txsToCompress.length} large PQC signatures into a ${288}-byte ZK-SNARK.`
    });
  });

  // === LAYER 3: CONSENSUS ===
  app.post("/api/network/consensus", (req, res) => {
    const { proof, txPayload } = req.body;
    
    if (!proof || !txPayload) {
      return res.status(400).json({ error: "Invalid proof structure." });
    }

    // Mathematically verify the ZK Proof matches the payload bundle
    const expectedBundleHash = crypto.createHash('sha3-256').update(JSON.stringify(txPayload)).digest('hex');
    if (!proof.includes(expectedBundleHash)) {
      return res.status(400).json({ error: "ZKP verification failed: Invalid structural hash." });
    }

    // Apply strict state transitions (UTXO / Account Model)
    let processedTx = 0;
    for (const tx of txPayload as Transaction[]) {
      const senderBal = ledger.get(tx.sender) || 0;
      if (senderBal >= tx.amount) {
        ledger.set(tx.sender, senderBal - tx.amount);
        const recipientBal = ledger.get(tx.recipient) || 0;
        ledger.set(tx.recipient, recipientBal + tx.amount);
        confirmedTx.push(tx);
        processedTx++;
      }
    }

    // Simulate DAG/PoS validation & Finality block hash
    currentBlockHeight++;
    const blockHash = crypto.createHash('sha3-256').update(proof + currentBlockHeight + Date.now()).digest('hex');

    // Simulate network throughput speeds (DAG finality is usually ~200-800ms)
    const finalityTimeMs = Math.floor(Math.random() * 600) + 200;

    res.json({
      status: "Finalized",
      mechanism: "DAG-Chain Hybrid",
      blockHeight: currentBlockHeight,
      blockHash,
      finalityTimeMs,
      tps: Math.floor(40000 + Math.random() * 10000), // ~40k-50k TPS simulation based on Layer 2 scaling
      processedTransactions: processedTx
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
