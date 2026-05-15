# Cyberheaven University Protocol - System Architecture

This document details the complete end-to-end architecture of the **Cyberheaven Gate** simulator.

## 1. System ASCII Architecture Diagram

Below is the complete architectural flow, leaving nothing hidden. It maps the interactions from the client's browser, through the Node.js Express layer, into ephemeral memory, and finally persisting to the JSON database.

```text
      +-----------------------------------------------------------------------+
      |                       PLAYER BROWSER (FRONTEND)                       |
      |                                                                       |
      |  +-------------------+    +--------------------+    +--------------+  |
      |  |                   |    |                    |    |              |  |
      |  |   Terminal UI     |<-->|  Polling Engine    |<-->| LocalStorage |  |
      |  |  (Input/Display)  |    |  (5s Intervals)    |    | (cyberheaven_|  |
      |  |                   |    |                    |    |   wallet)    |  |
      |  +--------+----------+    +---------+----------+    +------+-------+  |
      +-----------|-------------------------|----------------------|----------+
                  |                         |                      |
    User Actions  | 1. HTTP POST (Commands) | 2. HTTP GET / POST   | 3. On Load
     (Chat, send) |    /api/crypto/sign     |    /api/users        |    /api/auth/
     (Auth)       |    /api/auth/*          |    /api/crypto/*     |    restore
                  v                         v                      v
      +-----------------------------------------------------------------------+
      |                         EXPRESS.JS BACKEND                            |
      |                                                                       |
      |  +-----------------------+ +---------------------------------------+  |
      |  | Auth & Security Layer | |        Network & Ledger Engine        |  |
      |  | --------------------- | | ------------------------------------- |  |
      |  | - Argon2 Hashing      | | - Mempool (Pending Tx)                |  |
      |  | - User Registration   | | - L2 ZK Compression (/compress)       |  |
      |  | - PQC Key Simulation  | | - L1 Finality Consensus (/consensus)  |  |
      |  +-----------+-----------+ +-------------------+-------------------+  |
      |              |                                 |                      |
      |              v                                 v                      |
      |  +-----------------------------------------------------------------+  |
      |  |                       IN-MEMORY STATE                           |  |
      |  |                                                                 |  |
      |  |   [ users (Map) ]     [ ledger (Map) ]     [ mempool (Array) ]  |  |
      |  +--------------------------------+--------------------------------+  |
      |                                   |                                   |
      |                                   | 4. saveDb() flush to disk         |
      |                                   v                                   |
      +-----------------------------------------------------------------------+
                                          |
                                          v
      +-----------------------------------------------------------------------+
      |                          PERSISTENT STORAGE                           |
      |                                                                       |
      |  /db.json                                                             |
      |  {                                                                    |
      |    "users":  { "addr1": { "role", "hashedPassword": "...", ... } },   |
      |    "ledger": { "addr1": 1050, "addr2": 50 }                           |
      |  }                                                                    |
      +-----------------------------------------------------------------------+
```

---

## 2. Component Architecture Details

### A. Authentication & Identity Engine (Layer 1)
When users generate an identity through the UI:
1.  **Registration**: We simulate the generation of Post-Quantum Cryptographic keypairs (using ML-DSA/FN-DSA parameters).
2.  **Persistence**: The backend hashes the user's plain-text password using **Argon2** and stores the user profile, hashed password, and local wallet state into `db.json`. 
3.  **Role Access Control**: 
    *   *Initiate*: Default role.
    *   *Scholar*: Mentor role.
    *   *Archangel*: Administrator role, requiring a strict access code (`SERAPHIM99`) during registration to prevent unauthorized elevation.
4.  **Client Session**: The frontend saves the identity profile securely into `localStorage` (`cyberheaven_wallet`). When the app refreshes, it makes a POST request to `/api/auth/restore` to seamlessly rebuild the connection without needing a manual login unless the session was severed.

### B. Network Ledger & Consensus Simulator (Layer 2 & 3)
The system features a fictional L1/L2 blockchain architecture supporting the exchange of CHT (Cyberheaven Tokens):
1.  **Mempool**: Commands like `/transfer` trigger `/api/crypto/sign` on the backend, generating a simulated quantum-safe signature and adding the transaction to a global Mempool in memory.
2.  **ZK Compression & Finality**: The `/api/network/compress` and `/api/network/consensus` endpoints simulate a Zero-Knowledge rollup processing pipeline. Calling these finalizes the block, moving pending mempool transactions into the immutable `confirmedTx` ledger arrays and updating the persistent `db.json` balances.
3.  **Real-Time Polling Engine**: A robust 5-second interval loop in `App.tsx` dynamically polls the server to:
    *   Fetch active network users.
    *   Check for newly received transfers and drop visual notifications into the activity feed ("INCOMING TRANSFER").
    *   Update user's local balance seamlessly without manual refreshes.

### C. Application Terminal Interface (Terminal UI)
The core UI acts as a Discord/Terminal hybrid allowing user commands:
*   `/help` - Lists active operations.
*   `/teach <message>` - Broadcasts knowledge strings.
*   `/mine` - Submits computing power to the grid (grants a fractional CHT reward).
*   `/transfer <amount> <address>` - Triggers the ledger execution transfer logic.
*   `/network` - Forces a consensus cycle on pending mempool transactions.
*   `/history` - Retrieves the user's specific past transaction blocks.

## 3. Storage Hierarchy
Because the environment is containerized and stateless by default, state is maintained via two key strategies:
1.  **In-Memory Runtime**: `users`, `mempool`, and `confirmedTx` Arrays/Maps hold highly concurrent fast-access data logic.
2.  **Persistent Sync**: The backend explicitly calls `saveDb()` upon any state mutation (registration, transferring tokens, mining). This serializes the maps to `/db.json`, preventing data loss across automatic server spin-downs.

## 4. Production Build Flow
The server entry point (`server.ts`) initializes an Express application:
*   **In Development**: Handles Vite middleware to enable rapid frontend injection.
*   **In Production**: Compiles using `esbuild` down to a single `dist/server.cjs` file, cleanly avoiding relative pathing conflicts, and serves the static `dist/` frontend directory.
