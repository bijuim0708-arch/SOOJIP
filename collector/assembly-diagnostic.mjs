process.env.SUNEUM_ASSEMBLY_API_KEY = process.env.SUNEUM_ASSEMBLY_API_KEY || "sample";
process.env.SUNEUM_COLLECTOR_PORT = process.env.SUNEUM_COLLECTOR_PORT || "3227";

const { createCollectorServer, HOST, PORT, SERVICE_VERSION } = await import("./server.mjs");
const baseUrl = `http://${HOST}:${PORT}`;
const server = createCollectorServer();

function listen() {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(PORT, HOST, resolve);
  });
}

async function readJson(path) {
  const response = await fetch(`${baseUrl}${path}`, { headers: { Accept: "application/json" } });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.error || `HTTP ${response.status}`);
    error.payload = payload;
    throw error;
  }
  return payload;
}

try {
  console.log("========================================");
  console.log(`SUNEUM SOOJIP Assembly API diagnostic v${SERVICE_VERSION}`);
  console.log("========================================");
  console.log("[1/3] Starting local collector service");
  await listen();

  console.log("[2/3] Checking /health");
  const health = await readJson("/health");
  console.log(`  service version : ${health.version || SERVICE_VERSION}`);
  console.log(`  API mode        : ${health.apiMode || "-"}`);
  console.log(`  target members  : ${health.members ?? "-"}`);
  console.log(`  bill scope      : ${health.billScope || "-"}`);

  console.log("[3/3] Calling Open Assembly sample sync");
  const sync = await readJson("/api/assembly/sync?days=30");
  console.log(`  queried members : ${sync.queriedMembers ?? "-"}`);
  console.log(`  successful      : ${sync.successfulMembers ?? "-"}`);
  console.log(`  returned bills  : ${Array.isArray(sync.items) ? sync.items.length : 0}`);
  console.log(`  partial failure : ${sync.partial ? "yes" : "no"}`);
  if (sync.failedMembers?.length) {
    for (const failure of sync.failedMembers) {
      console.log(`    - ${failure.memberName || failure.memberId}: ${failure.message || "failed"}`);
    }
  }

  console.log("");
  console.log("[SUCCESS] Local collector and Open Assembly request path are working.");
  console.log("The sample key may return limited data. Use an issued key for completeness checks.");
} catch (error) {
  console.error("");
  console.error(`[FAILED] ${error.message}`);
  if (error.payload?.failedMembers?.length) {
    for (const failure of error.payload.failedMembers) {
      console.error(`  - ${failure.memberName || failure.memberId}: ${failure.message || "failed"}`);
    }
  }
  process.exitCode = 1;
} finally {
  if (server.listening) {
    await new Promise((resolve) => server.close(resolve));
  }
}
