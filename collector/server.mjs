import http from "node:http";
import { pathToFileURL } from "node:url";

export const SERVICE_VERSION = "0.3.0";
export const HOST = "127.0.0.1";
export const PORT = Number.parseInt(process.env.SUNEUM_COLLECTOR_PORT || "3217", 10);
export const ASSEMBLY_ENDPOINT = "nzmimeepazxkubdpn";
export const ASSEMBLY_URL = `https://open.assembly.go.kr/portal/openapi/${ASSEMBLY_ENDPOINT}`;

export const DAEGU_MEMBERS = [
  { id: "PER-MP-DG-JUNG-NAM", name: "김기웅", regionIds: ["DAEGU-JUNG", "DAEGU-NAM"], regions: ["대구광역시 중구", "대구광역시 남구"] },
  { id: "PER-MP-DG-DONG-GUNWI-A", name: "최은석", regionIds: ["DAEGU-DONG", "DAEGU-GUNWI"], regions: ["대구광역시 동구", "대구광역시 군위군"] },
  { id: "PER-MP-DG-DONG-GUNWI-B", name: "강대식", regionIds: ["DAEGU-DONG", "DAEGU-GUNWI"], regions: ["대구광역시 동구", "대구광역시 군위군"] },
  { id: "PER-MP-DG-SEO", name: "김상훈", regionIds: ["DAEGU-SEO"], regions: ["대구광역시 서구"] },
  { id: "PER-MP-DG-BUK-A", name: "우재준", regionIds: ["DAEGU-BUK"], regions: ["대구광역시 북구"] },
  { id: "PER-MP-DG-BUK-B", name: "김승수", regionIds: ["DAEGU-BUK"], regions: ["대구광역시 북구"] },
  { id: "PER-MP-DG-SUSEONG-A", name: "주호영", regionIds: ["DAEGU-SUSEONG"], regions: ["대구광역시 수성구"] },
  { id: "PER-MP-DG-SUSEONG-B", name: "이인선", regionIds: ["DAEGU-SUSEONG"], regions: ["대구광역시 수성구"] },
  { id: "PER-MP-DG-DALSEO-A", name: "유영하", regionIds: ["DAEGU-DALSEO"], regions: ["대구광역시 달서구"] },
  { id: "PER-MP-DG-DALSEO-B", name: "윤재옥", regionIds: ["DAEGU-DALSEO"], regions: ["대구광역시 달서구"] },
  { id: "PER-MP-DG-DALSEO-C", name: "권영진", regionIds: ["DAEGU-DALSEO"], regions: ["대구광역시 달서구"] },
  { id: "PER-MP-DG-DALSEONG", name: "추경호", regionIds: ["DAEGU-DALSEONG"], regions: ["대구광역시 달성군"] }
];

const startedAt = new Date().toISOString();
const cache = new Map();
const requestTimes = [];

function jsonResponse(response, status, payload) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff"
  });
  response.end(JSON.stringify(payload));
}

function cleanText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function dateOnly(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length < 8) return "";
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
}

function safeBillKey(row) {
  return cleanText(row.BILL_NO || row.BILL_ID).replace(/[^A-Za-z0-9가-힣_-]/g, "-");
}

export function parseAssemblyPayload(payload) {
  const bucket = payload?.[ASSEMBLY_ENDPOINT];
  if (!Array.isArray(bucket)) throw new Error("열린국회정보 응답 형식을 확인할 수 없습니다.");
  const head = bucket.flatMap((part) => Array.isArray(part?.head) ? part.head : []);
  const result = head.find((entry) => entry?.RESULT)?.RESULT || {};
  const code = cleanText(result.CODE);
  if (code && code !== "INFO-000" && code !== "INFO-200") {
    throw new Error(cleanText(result.MESSAGE) || `열린국회정보 오류(${code})`);
  }
  const rows = bucket.flatMap((part) => Array.isArray(part?.row) ? part.row : []);
  const total = Number(head.find((entry) => Number.isFinite(Number(entry?.list_total_count)))?.list_total_count || rows.length);
  return { rows, total, resultCode: code || "INFO-000" };
}

function proposerText(row) {
  return [row.PROPOSER, row.RST_PROPOSER, row.PUBL_PROPOSER].map(cleanText).join(" ");
}

function rowMentions(row, memberName) {
  return proposerText(row).replace(/\s/g, "").includes(memberName.replace(/\s/g, ""));
}

function isRepresentative(row, memberName) {
  const compactName = memberName.replace(/\s/g, "");
  const representative = cleanText(row.RST_PROPOSER).replace(/\s/g, "");
  const proposer = cleanText(row.PROPOSER).replace(/\s/g, "");
  return representative.includes(compactName) || proposer.startsWith(compactName);
}

export function normalizeAssemblyRows(memberResults, collectedAt = new Date().toISOString()) {
  const merged = new Map();

  memberResults.forEach(({ member, rows, trustSearchFilter = false }) => {
    rows.forEach((row) => {
      const mentions = rowMentions(row, member.name);
      if (!mentions && !trustSearchFilter) return;
      const key = safeBillKey(row);
      if (!key) return;
      const current = merged.get(key) || { row, members: new Map(), representativeIds: new Set(), matchBasis: new Set() };
      current.members.set(member.id, member);
      if (isRepresentative(row, member.name)) current.representativeIds.add(member.id);
      current.matchBasis.add(mentions ? "API 제안자 필드" : "API 제안자 검색조건");
      merged.set(key, current);
    });
  });

  return [...merged.entries()].map(([key, entry]) => {
    const row = entry.row;
    const members = [...entry.members.values()];
    const representativeMembers = members.filter((member) => entry.representativeIds.has(member.id));
    const isLead = representativeMembers.length > 0;
    const personIds = members.map((member) => member.id);
    const regionIds = [...new Set(members.flatMap((member) => member.regionIds))];
    const regions = [...new Set(members.flatMap((member) => member.regions))];
    const names = members.map((member) => member.name);
    const leadNames = representativeMembers.map((member) => member.name);
    const billName = cleanText(row.BILL_NAME) || "법률안명 확인 필요";
    const billNo = cleanText(row.BILL_NO);
    const proposedDate = dateOnly(row.PROPOSE_DT);
    const processResult = cleanText(row.PROC_RESULT) || "처리상태 확인 필요";
    const proposer = cleanText(row.PROPOSER || row.RST_PROPOSER || row.PUBL_PROPOSER) || "제안자 확인 필요";
    const detailLink = /^https:\/\//i.test(cleanText(row.DETAIL_LINK))
      ? cleanText(row.DETAIL_LINK)
      : (row.BILL_ID ? `https://likms.assembly.go.kr/bill/billDetail.do?billId=${encodeURIComponent(row.BILL_ID)}` : "https://open.assembly.go.kr/portal/openapi/main.do");
    const summary = isLead
      ? `${leadNames.join("·")} 의원이 「${billName}」을 대표발의한 것으로 열린국회정보에 등록됨.`
      : `${names.join("·")} 의원이 「${billName}」 공동발의 명단에 포함된 것으로 열린국회정보에 등록됨.`;

    return {
      id: `ITEM-ASSEMBLY-${key}`,
      title: billName,
      type: isLead ? "법안 대표발의" : "법안 공동발의",
      personIds,
      orgIds: [],
      regionIds,
      region: regions.join("·") || "대구광역시",
      sourceId: "SRC-NATIONAL-ASSEMBLY-OPENAPI",
      sourceName: "열린국회정보 · 국회의원 발의법률안",
      url: detailLink,
      publishedAt: proposedDate ? `${proposedDate}T00:00:00+09:00` : "",
      collectedAt,
      rawExcerpt: `의안번호 ${billNo || "확인 필요"} · 제안일 ${proposedDate || "확인 필요"} · 제안자 ${proposer} · 처리결과 ${processResult}`,
      summary,
      summaryMethod: "rule_based",
      aiGenerated: false,
      eventAt: proposedDate ? `${proposedDate}T00:00:00+09:00` : "",
      eventPlace: "국회",
      organizer: "대한민국 국회",
      futureSchedule: false,
      regionRelation: "간접",
      importance: "보통",
      status: "미확인",
      duplicateGroup: "",
      memo: "API 자동수집 자료 · 원문 확인 후 보고서 반영",
      visibility: "공개",
      sample: false,
      dataOrigin: "official_api",
      verificationStatus: "API응답",
      changeType: "신규",
      reportSection: "legislation",
      scheduleStatus: "",
      apiMeta: {
        endpoint: ASSEMBLY_ENDPOINT,
        billId: cleanText(row.BILL_ID),
        billNo,
        assembly: cleanText(row.AGE) || "22",
        committee: cleanText(row.CURR_COMMITTEE || row.COMMITTEE),
        processResult,
        matchBasis: [...entry.matchBasis]
      }
    };
  }).sort((a, b) => String(b.publishedAt).localeCompare(String(a.publishedAt)));
}

async function fetchWithTimeout(url, timeoutMs = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal, headers: { Accept: "application/json" } });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchMemberBills(member, apiKey, pageSize) {
  const cacheKey = `${member.name}:${pageSize}:${apiKey === "sample" ? "sample" : "full"}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.savedAt < 10 * 60 * 1000) return { ...cached.value, cached: true };

  const params = new URLSearchParams({ KEY: apiKey, Type: "json", pIndex: "1", pSize: String(pageSize), AGE: "22", PROPOSER: member.name });
  const response = await fetchWithTimeout(`${ASSEMBLY_URL}?${params.toString()}`);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const parsed = parseAssemblyPayload(await response.json());
  const value = { member, rows: parsed.rows, total: parsed.total, trustSearchFilter: apiKey !== "sample", cached: false };
  cache.set(cacheKey, { savedAt: Date.now(), value });
  return value;
}

async function mapConcurrent(values, limit, mapper) {
  const results = new Array(values.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, values.length) }, async () => {
    while (cursor < values.length) {
      const index = cursor++;
      try { results[index] = { status: "fulfilled", value: await mapper(values[index]) }; }
      catch (error) { results[index] = { status: "rejected", reason: error }; }
    }
  });
  await Promise.all(workers);
  return results;
}

async function syncAssemblyBills(apiKey, days) {
  const sampleMode = apiKey === "sample";
  const pageSize = sampleMode ? 5 : 100;
  const settled = await mapConcurrent(DAEGU_MEMBERS, 3, (member) => fetchMemberBills(member, apiKey, pageSize));
  const successes = settled.filter((result) => result.status === "fulfilled").map((result) => result.value);
  const failures = settled.map((result, index) => ({ result, member: DAEGU_MEMBERS[index] }))
    .filter(({ result }) => result.status === "rejected")
    .map(({ result, member }) => ({ memberId: member.id, memberName: member.name, message: cleanText(result.reason?.message) || "수집 실패" }));
  if (!successes.length) throw Object.assign(new Error("열린국회정보에 연결하지 못했습니다."), { failures });

  const since = new Date(Date.now() - days * 86400000);
  since.setHours(0, 0, 0, 0);
  const normalized = normalizeAssemblyRows(successes).filter((item) => !item.publishedAt || new Date(item.publishedAt) >= since);
  return {
    serviceVersion: SERVICE_VERSION,
    fetchedAt: new Date().toISOString(),
    apiMode: sampleMode ? "sample" : "issued-key",
    rangeDays: days,
    queriedMembers: DAEGU_MEMBERS.length,
    successfulMembers: successes.length,
    failedMembers: failures,
    partial: failures.length > 0,
    items: normalized,
    notice: sampleMode
      ? "sample 키는 응답 건수가 제한됩니다. 전체 동기화에는 열린국회정보에서 발급한 인증키가 필요합니다."
      : "정식 인증키로 조회했습니다. 모든 자료는 원문 확인 후 사용하세요."
  };
}

function allowRequest() {
  const cutoff = Date.now() - 60_000;
  while (requestTimes.length && requestTimes[0] < cutoff) requestTimes.shift();
  if (requestTimes.length >= 30) return false;
  requestTimes.push(Date.now());
  return true;
}

export function createCollectorServer() {
  return http.createServer(async (request, response) => {
    if (request.method === "OPTIONS") return jsonResponse(response, 204, {});
    if (request.method !== "GET") return jsonResponse(response, 405, { error: "GET 요청만 지원합니다." });
    if (!allowRequest()) return jsonResponse(response, 429, { error: "요청이 너무 많습니다. 잠시 후 다시 시도하세요." });

    const url = new URL(request.url || "/", `http://${HOST}:${PORT}`);
    if (url.pathname === "/health") {
      const apiKey = process.env.SUNEUM_ASSEMBLY_API_KEY || "sample";
      return jsonResponse(response, 200, {
        ok: true,
        service: "선이음-동향 국회 연결기",
        version: SERVICE_VERSION,
        apiMode: apiKey === "sample" ? "sample" : "issued-key",
        members: DAEGU_MEMBERS.length,
        startedAt,
        cacheEntries: cache.size
      });
    }

    if (url.pathname === "/api/assembly/sync") {
      const days = Math.min(3650, Math.max(1, Number.parseInt(url.searchParams.get("days") || "30", 10) || 30));
      const apiKey = cleanText(process.env.SUNEUM_ASSEMBLY_API_KEY || "sample");
      try {
        return jsonResponse(response, 200, await syncAssemblyBills(apiKey, days));
      } catch (error) {
        return jsonResponse(response, 502, {
          error: cleanText(error.message) || "국회 API 수집 실패",
          failedMembers: error.failures || [],
          apiMode: apiKey === "sample" ? "sample" : "issued-key"
        });
      }
    }

    return jsonResponse(response, 404, { error: "지원하지 않는 주소입니다." });
  });
}

export function startCollectorServer() {
  const server = createCollectorServer();
  server.listen(PORT, HOST, () => {
    const mode = (process.env.SUNEUM_ASSEMBLY_API_KEY || "sample") === "sample" ? "샘플 키" : "발급 키";
    console.log(`선이음-동향 국회 연결기 v${SERVICE_VERSION}`);
    console.log(`상태: http://${HOST}:${PORT}/health`);
    console.log(`인증: ${mode} · API 키 값은 표시하거나 저장하지 않습니다.`);
    console.log("이 창을 닫으면 국회 자동수집 연결이 종료됩니다.");
  });
  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) startCollectorServer();
