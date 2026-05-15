import assert from "assert";

async function run() {
  console.log("Testing full pipeline...");
  const URL = "http://127.0.0.1:3000";

  try {
    // 1. Health check
    const health = await fetch(URL + "/api/users");
    assert(health.ok, "API /api/users is down");
    console.log("✅ API /api/users works");

    let num = Math.random();
    // 2. Register user A (Archangel)
    const reqArch = await fetch(URL + "/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "TesterArch" + num, password: "pwd", role: "Archangel", adminCode: "SERAPHIM99" })
    });
    const archData = await reqArch.json();
    assert(archData.token, "Archangel registration failed: " + archData.error);
    console.log("✅ Archangel registered");
    const archToken = archData.token;
    const archAddress = archData.address;
	
    // 3. Register user B (Initiate)
    const reqInit = await fetch(URL + "/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "TesterInit" + num, password: "pwd" })
    });
    const initData = await reqInit.json();
    assert(initData.token, "Initiate registration failed: " + initData.error);
    console.log("✅ Initiate registered");
    const initToken = initData.token;
    const initAddress = initData.address;

    // 4. Archangel adds balance to Initiate via Vault
    const adjustReq = await fetch(URL + "/api/admin/adjust_balance", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${archToken}` },
      body: JSON.stringify({ targetAddress: initAddress, amountOffset: 100 })
    });
    const adjustData = await adjustReq.json();
    assert(adjustData.success, "Admin adjust balance failed: " + adjustData.error);
    console.log("✅ Vault balance adjustment works");

    // 5. Initiate studies
    const studyReq = await fetch(URL + "/api/university/study", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${initToken}` },
      body: JSON.stringify({ address: initAddress })
    });
    const studyData = await studyReq.json();
    assert(studyReq.ok, "Study failed");
    console.log("✅ Initiate study works");

    console.log("🎉 All Tests Passed");
    process.exit(0);
  } catch (e) {
    console.error("❌ Pipeline failed: ", e);
    process.exit(1);
  }
}
run();
