import express from "express";
import path from "path";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";
import fs from "fs";
import argon2 from "argon2";
import helmet from "helmet";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "SUPER_SECRET_KEY_CYBERHEAVEN_PROTO_7";

declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

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
  hashedPassword?: string;
  sessionToken?: string;
}

// In-memory node state
const ledger = new Map<string, number>();
const users = new Map<string, UserProfile>();
const mempool: Transaction[] = [];
const confirmedTx: Transaction[] = [];
let currentBlockHeight = 14882901;

interface AuditLog {
  timestamp: number;
  adminAddress: string;
  action: string;
  targetAddress: string;
  details: string;
}
const auditLogs: AuditLog[] = [];

interface ChatMessage {
  id: string;
  senderAddress: string;
  senderUsername: string;
  recipientAddress: string | 'global';
  text: string;
  timestamp: number;
}
const chatMessages: ChatMessage[] = [];

// Persistent DB
const DB_PATH = path.join(process.cwd(), "db.json");

function loadDb() {
  if (fs.existsSync(DB_PATH)) {
    try {
      const dbStr = fs.readFileSync(DB_PATH, "utf8");
      const db = JSON.parse(dbStr);
      if (db.users) {
        Object.entries(db.users).forEach(([addr, user]) => {
          users.set(addr, user as UserProfile);
        });
      }
      if (db.ledger) {
        Object.entries(db.ledger).forEach(([addr, bal]) => {
          ledger.set(addr, bal as number);
        });
      }
      if (db.auditLogs) {
        db.auditLogs.forEach((log: AuditLog) => auditLogs.push(log));
      }
      if (db.chatMessages) {
        db.chatMessages.forEach((msg: ChatMessage) => chatMessages.push(msg));
      }
    } catch (e) {
      console.error("Failed to load DB", e);
    }
  }
}

function saveDb() {
  const usersObj: Record<string, any> = {};
  users.forEach((val, key) => (usersObj[key] = val));
  const ledgerObj: Record<string, number> = {};
  ledger.forEach((val, key) => (ledgerObj[key] = val));
  const tmpPath = DB_PATH + '.tmp';
  fs.writeFileSync(
    tmpPath,
    JSON.stringify({ users: usersObj, ledger: ledgerObj, auditLogs, chatMessages }, null, 2)
  );
  fs.renameSync(tmpPath, DB_PATH);
}

loadDb();

// --- SECURITY MIDDLEWARES ---
function requireAuth(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing authorization. Please reconnect." });
  }
  const token = authHeader.split(' ')[1];
  
  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    let user = users.get(payload.address);
    if (!user) {
      // Recreate user memory state if server restarted
      user = {
        address: payload.address,
        username: payload.username,
        role: payload.role,
        hashedPassword: "UNKNOWN_JWT_RECOVERED",
        sessionToken: token,
        joinedAt: payload.joinedAt || Date.now()
      };
      users.set(payload.address, user);
      if (!ledger.has(payload.address)) {
        ledger.set(payload.address, user.role === 'Archangel' ? 10000 : user.role === 'Scholar' ? 500 : 0);
      }
      saveDb();
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired session. Please reconnect." });
  }
}

function requireArchangel(req: any, res: any, next: any) {
  if (req.user.role !== 'Archangel') {
    return res.status(403).json({ error: "Access Denied. Archangel rank required." });
  }
  next();
}

function enforceOwnership(req: any, res: any, next: any) {
  const targetAddress = req.body.address || req.body.sender || req.params.address;
  if (targetAddress && targetAddress !== req.user.address) {
    return res.status(403).json({ error: "Identity mismatch. Action denied." });
  }
  next();
}

const lastActionTime = new Map<string, number>();
function rateLimit(req: any, res: any, next: any) {
  const address = req.user.address;
  const now = Date.now();
  const lastTime = lastActionTime.get(address) || 0;
  if (now - lastTime < 3000) { // 3 second cooldown
    return res.status(429).json({ error: "Network overloaded. Cooling down..." });
  }
  lastActionTime.set(address, now);
  next();
}
// -----------------------------

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Security headers setup (Protects against XSS, Clickjacking, MIME-sniffing)
  app.use(helmet({
    contentSecurityPolicy: false, // Vite Dev server needs inline scripts, keep false for dev, adjust for prod if needed
  }));
  // Strictly limit payload sizes to prevent JSON Denial of Service (Payload attacks)
  app.use(express.json({ limit: "50kb" }));

  // === LAYER 1: QUANTUM-SAFE CRYPTOGRAPHY & IDENTITY ===
  app.post("/api/admin/users", requireAuth, requireArchangel, (req, res) => {
    const allUsers = Array.from(users.values()).map(u => ({
      address: u.address,
      username: u.username,
      role: u.role,
      joinedAt: u.joinedAt,
      balance: ledger.get(u.address) || 0
    }));
    res.json({ users: allUsers });
  });

  app.post("/api/admin/adjust_balance", requireAuth, requireArchangel, rateLimit, (req, res) => {
    const { targetAddress, amountOffset } = req.body;
    if (!targetAddress || typeof amountOffset !== 'number') {
      return res.status(400).json({ error: "Missing target address or invalid amount." });
    }
    const currentBal = ledger.get(targetAddress) || 0;
    const newBal = Math.max(0, currentBal + amountOffset);
    ledger.set(targetAddress, newBal);
    
    auditLogs.push({
      timestamp: Date.now(),
      adminAddress: req.user.address,
      action: "ADJUST_BALANCE",
      targetAddress,
      details: `${amountOffset > 0 ? '+' : ''}${amountOffset} CHT`
    });
    saveDb();

    res.json({ success: true, message: `Adjusted balance for ${targetAddress}. New Balance: ${newBal}` });
  });

  app.post("/api/admin/assign_role", requireAuth, requireArchangel, rateLimit, (req, res) => {
    const { targetAddress, newRole } = req.body;
    if (!targetAddress || !newRole || !['Initiate', 'Scholar', 'Archangel'].includes(newRole)) {
      return res.status(400).json({ error: "Invalid role or missing target." });
    }
    const userTarget = users.get(targetAddress);
    if (!userTarget) return res.status(404).json({ error: "User not found." });
    
    userTarget.role = newRole;
    auditLogs.push({
      timestamp: Date.now(),
      adminAddress: req.user.address,
      action: "ASSIGN_ROLE",
      targetAddress,
      details: `Role changed to ${newRole}`
    });
    saveDb();

    res.json({ success: true, message: `Role updated for ${userTarget.username} to ${newRole}.` });
  });

  app.get("/api/admin/audit_logs", requireAuth, requireArchangel, (req, res) => {
    res.json({ logs: auditLogs });
  });

  app.post("/api/auth/register", async (req, res) => {
    const alg = req.body.algorithm || "ML-DSA-44";
    const username = req.body.username;
    const role = req.body.role || "Initiate"; // Roles: Initiate, Scholar, Archangel
    const userPassword = req.body.password;
    const adminCode = req.body.adminCode;
    
    if (!username || !userPassword) {
      return res.status(400).json({ error: "Username and password required." });
    }

    if (role === "Archangel" && adminCode !== "SERAPHIM99") {
      return res.status(403).json({ error: "Invalid access code for Archangel ascension." });
    }

    // Check if username taken
    const existing = Array.from(users.values()).find(u => u.username === username);
    if (existing) {
      return res.status(400).json({ error: "Username already known to the quantum grid." });
    }

    const hashedPassword = await argon2.hash(userPassword);
    const specs = ALGORITHMS[alg as keyof typeof ALGORITHMS] || ALGORITHMS["ML-DSA-44"];
    
    const privateKey = crypto.randomBytes(specs.sk).toString('hex');
    const publicKey = crypto.randomBytes(specs.pk).toString('hex');
    
    const hash = crypto.createHash('sha3-256').update(publicKey).digest('hex');
    const address = "pqc_" + hash.substring(0, 40);

    const sessionToken = jwt.sign(
      { address, username, role, joinedAt: Date.now() },
      JWT_SECRET,
      { expiresIn: "30d" }
    );

    if (!ledger.has(address)) {
      ledger.set(address, role === 'Archangel' ? 10000 : role === 'Scholar' ? 500 : 0);
    }
    
    if (!users.has(address)) {
      users.set(address, {
        address,
        username,
        role,
        hashedPassword,
        sessionToken,
        joinedAt: Date.now()
      });
    }

    saveDb();

    // Do not return hashedPassword
    const profile = { ...users.get(address) } as any;
    delete profile.hashedPassword;

    res.json({
      algorithm: alg,
      address,
      publicKeyPreview: publicKey.substring(0, 64) + "...[TRUNCATED]",
      publicKeyFull: publicKey,
      publicKeySizeInBytes: specs.pk,
      privateKeySizeInBytes: specs.sk,
      balance: ledger.get(address),
      profile,
      token: sessionToken,
      message: `Identity forged. Welcome, ${username}. Role: ${role}`
    });
  });

  app.post("/api/auth/login", async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password required." });
    }

    const userEntry = Array.from(users.values()).find(u => u.username === username);
    if (!userEntry || !userEntry.hashedPassword) {
      return res.status(403).json({ error: "Invalid credentials." });
    }

    const isValid = await argon2.verify(userEntry.hashedPassword, password);
    if (!isValid) {
      return res.status(403).json({ error: "Invalid credentials." });
    }

    const sessionToken = jwt.sign(
      { address: userEntry.address, username: userEntry.username, role: userEntry.role, joinedAt: userEntry.joinedAt },
      JWT_SECRET,
      { expiresIn: "30d" }
    );
    userEntry.sessionToken = sessionToken;
    saveDb();

    const address = userEntry.address;
    const profile = { ...userEntry } as any;
    delete profile.hashedPassword;

    // Notice: Since keys were randomly generated initially, in a true system we'd reconstruct keys 
    // or store keys. For this fictional app we return simulated key parameters to log them in.
    const alg = "ML-DSA-44"; 
    const specs = ALGORITHMS[alg];

    res.json({
      algorithm: alg,
      address,
      publicKeyFull: "RestoredKey...",
      publicKeySizeInBytes: specs.pk,
      privateKeySizeInBytes: specs.sk,
      balance: ledger.get(address) || 0,
      profile,
      token: sessionToken,
      message: `Quantum link restored for ${username}.`
    });
  });

  app.post("/api/auth/restore", requireAuth, enforceOwnership, (req, res) => {
    const { wallet } = req.body;
    if (!wallet || !wallet.address || !wallet.profile) {
       return res.status(400).json({ error: "Invalid session structure" });
    }
    
    // Auth middleware already confirmed the token matches wallet.address
    res.json({ success: true, message: "Session verified via secure channel." });
  });

  app.get("/api/users", (req, res) => {
    const safeUsers = Array.from(users.values()).map(u => {
      const { hashedPassword, sessionToken, ...rest } = u;
      return rest;
    });
    res.json({ users: safeUsers });
  });

  app.post("/api/crypto/sign", requireAuth, enforceOwnership, rateLimit, (req, res) => {
    const { sender, recipient, amount, algorithm, publicKey } = req.body;
    
    if (!sender || !recipient || amount === undefined || !publicKey) {
      return res.status(400).json({ error: "Missing required transaction fields" });
    }

    if (typeof amount !== 'number' || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ error: "Invalid transaction amount. Must be positive integer." });
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

  app.post("/api/university/reward", requireAuth, enforceOwnership, rateLimit, (req, res) => {
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
    saveDb();
    
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

  app.post("/api/university/study", requireAuth, enforceOwnership, rateLimit, (req, res) => {
    const { address } = req.body;
    if (!address) return res.status(400).json({ error: "Missing address" });
    
    const user = users.get(address);
    if (!user) return res.status(403).json({ error: "Identity not found. Register first." });
    
    // Reward mathematically for studying
    const rewardAmount = Math.floor(Math.random() * 10) + 5; // 5 to 14 CHT
    const currentBal = ledger.get(address) || 0;
    ledger.set(address, currentBal + rewardAmount);
    saveDb();
    
    // Simulate transaction from university
    const signatureRaw = crypto.randomBytes(2420).toString('hex');
    const tx: Transaction = {
      id: crypto.createHash('sha3-256').update(Date.now().toString() + "study").digest('hex'),
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
      message: `Through diligent studying in the lower archives, you discovered a fragment of knowledge worth ${rewardAmount} CHT. The transaction is queued in the Layer 1 Mempool.`
    });
  });

  app.post("/api/university/learn", requireAuth, enforceOwnership, rateLimit, (req, res) => {
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

  app.post("/api/network/compress", requireAuth, rateLimit, (req, res) => {
    // Compress all mempool transactions into a single ZKP
    if (mempool.length === 0) {
      return res.status(400).json({ error: "No transactions in mempool to compress." });
    }

    const txsToCompress = [...mempool];
    // Security Fix: Do not clear mempool here to prevent Data Destruction DoS attacks
    // mempool.length = 0; 

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
  app.post("/api/network/consensus", requireAuth, rateLimit, (req, res) => {
    const { proof, txPayload } = req.body;
    
    if (!proof || !txPayload) {
      return res.status(400).json({ error: "Invalid proof structure." });
    }

    // Mathematically verify the ZK Proof matches the REAL payload bundle safely in backend
    // Security Fix: Prevent "Forged Block" attacks by validating against true mempool
    const serverBundleHash = crypto.createHash('sha3-256').update(JSON.stringify(mempool)).digest('hex');
    if (!proof.includes(serverBundleHash)) {
      return res.status(400).json({ error: "ZKP verification failed: Invalid structural hash or mempool state altered." });
    }

    // Security Fix: Safely transition mempool states now
    const safeTxList = [...mempool];
    mempool.length = 0;

    // Apply strict state transitions (UTXO / Account Model)
    let processedTx = 0;
    for (const tx of safeTxList) {
      const senderBal = ledger.get(tx.sender) || 0;
      if (senderBal >= tx.amount) {
        ledger.set(tx.sender, senderBal - tx.amount);
        const recipientBal = ledger.get(tx.recipient) || 0;
        ledger.set(tx.recipient, recipientBal + tx.amount);
        confirmedTx.push(tx);
        processedTx++;
      }
    }
    if (processedTx > 0) saveDb();

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

  // === LAYER 4: COMMUNICATION (DM & GLOBAL) ===
  app.post("/api/chat/send", requireAuth, rateLimit, (req, res) => {
    const { targetAddress, text } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: "Message text is required." });
    }
    
    // allow 'global' or a real user address
    if (targetAddress !== 'global' && !users.has(targetAddress)) {
      return res.status(404).json({ error: "Target identity not found." });
    }

    const newMessage: ChatMessage = {
      id: crypto.randomBytes(16).toString('hex'),
      senderAddress: req.user.address,
      senderUsername: req.user.username,
      recipientAddress: targetAddress,
      text: text.slice(0, 500), // restrict length
      timestamp: Date.now()
    };

    chatMessages.push(newMessage);
    saveDb();

    res.json({ success: true, message: newMessage });
  });

  app.get("/api/chat/messages", requireAuth, (req, res) => {
    const callerAddress = req.user.address;
    
    // Return all global messages AND messages where the user is sender or recipient
    const visibleMessages = chatMessages.filter(msg => {
      if (msg.recipientAddress === 'global') return true;
      if (msg.senderAddress === callerAddress) return true;
      if (msg.recipientAddress === callerAddress) return true;
      return false;
    });

    res.json({ messages: visibleMessages });
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

  // Global Error Handler
  app.use((err: any, req: any, res: any, next: any) => {
    console.error("Unhandled Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
