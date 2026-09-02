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
  console.log(`선이음-秀集 국회 API 진단 v${SERVICE_VERSION}`);
  console.log("========================================");
  console.log("[1/3] 로컬 수집 서비스 시작");
  await listen();

  console.log("[2/3] /health 확인");
  const health = await readJson("/health");
  console.log(`  - 서비스: ${health.service}`);
  console.log(`  - API 모드: ${health.apiMode}`);
  console.log(`  - 대상 의원: ${health.members}명`);
  console.log(`  - 법안 범위: ${health.billScope || "-"}`);

  console.log("[3/3] 열린국회정보 샘플 동기화 확인");
  const sync = await readJson("/api/assembly/sync?days=30");
  console.log(`  - 조회 의원: ${sync.queriedMembers}명`);
  console.log(`  - 성공 의원: ${sync.successfulMembers}명`);
  console.log(`  - 반환 법안: ${Array.isArray(sync.items) ? sync.items.length : 0}건`);
  console.log(`  - 부분 실패: ${sync.partial ? "있음" : "없음"}`);
  if (sync.failedMembers?.length) {
    sync.failedMembers.forEach((failure) => console.log(`    * ${failure.memberName}: ${failure.message}`));
  }
  console.log("");
  console.log("[진단 성공] 로컬 서비스와 열린국회정보 API 요청 경로가 정상입니다.");
  console.log("※ sample 키는 응답 건수가 제한되므로 실제 자료 완전성 검증은 정식 발급키로 별도 확인해야 합니다.");
} catch (error) {
  console.error("");
  console.error(`[진단 실패] ${error.message}`);
  if (error.payload?.failedMembers?.length) {
    error.payload.failedMembers.forEach((failure) => console.error(`  * ${failure.memberName}: ${failure.message}`));
  }
  process.exitCode = 1;
} finally {
  if (server.listening) {
    await new Promise((resolve) => server.close(resolve));
  }
}
