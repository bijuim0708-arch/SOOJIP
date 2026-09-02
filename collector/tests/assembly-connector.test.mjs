import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  DAEGU_MEMBERS,
  enrichAssemblyItemWithProposers,
  filterBillsByDays,
  normalizeAssemblyRows,
  normalizeBillProposers,
  normalizeCosponsoredBill,
  parseAssemblyPayload,
  parseBillProposersPayload
} from "../server.mjs";

const fixture = JSON.parse(fs.readFileSync(new URL("../assembly-bills.example.json", import.meta.url), "utf8"));

const proposerFixture = {
  BILLINFOPPSR: [
    {
      head: [
        { list_total_count: 3 },
        { RESULT: { CODE: "INFO-000", MESSAGE: "정상" } }
      ]
    },
    {
      row: [
        {
          BILL_ID: "PRC_TEST",
          PPSR_NM: "김기웅",
          PPSR_POLY_NM: "국민의힘",
          REP_DIV: "대표발의",
          PPSR_ROLE: "발의자",
          PPSR_KIND: "의원",
          NASS_CD: "MP001",
          ERACO: "22",
          PPSR_CN: "1"
        },
        {
          BILL_ID: "PRC_TEST",
          PPSR_NM: "최은석",
          PPSR_POLY_NM: "국민의힘",
          REP_DIV: "",
          PPSR_ROLE: "발의자",
          PPSR_KIND: "의원",
          NASS_CD: "MP002",
          ERACO: "22",
          PPSR_CN: "2"
        },
        {
          BILL_ID: "PRC_TEST",
          PPSR_NM: "홍길동",
          PPSR_POLY_NM: "가상정당",
          REP_DIV: "",
          PPSR_ROLE: "발의자",
          PPSR_KIND: "의원",
          NASS_CD: "MP003",
          ERACO: "22",
          PPSR_CN: "3"
        }
      ]
    }
  ]
};

const reverseProposerFixture = {
  BILLINFOPPSR: [
    {
      head: [
        { list_total_count: 4 },
        { RESULT: { CODE: "INFO-000", MESSAGE: "정상" } }
      ]
    },
    {
      row: [
        {
          BILL_ID: "PRC_REVERSE",
          PPSR_NM: "비대구대표",
          PPSR_POLY_NM: "가상정당",
          REP_DIV: "대표발의",
          PPSR_ROLE: "발의자",
          PPSR_KIND: "의원",
          NASS_CD: "MP100",
          ERACO: "22",
          PPSR_CN: "1"
        },
        {
          BILL_ID: "PRC_REVERSE",
          PPSR_NM: "우재준",
          PPSR_POLY_NM: "국민의힘",
          REP_DIV: "",
          PPSR_ROLE: "발의자",
          PPSR_KIND: "의원",
          NASS_CD: "MP101",
          ERACO: "22",
          PPSR_CN: "2"
        },
        {
          BILL_ID: "PRC_REVERSE",
          PPSR_NM: "추경호",
          PPSR_POLY_NM: "국민의힘",
          REP_DIV: "",
          PPSR_ROLE: "발의자",
          PPSR_KIND: "의원",
          NASS_CD: "MP102",
          ERACO: "22",
          PPSR_CN: "3"
        },
        {
          BILL_ID: "PRC_REVERSE",
          PPSR_NM: "비대구공동",
          PPSR_POLY_NM: "가상정당",
          REP_DIV: "",
          PPSR_ROLE: "발의자",
          PPSR_KIND: "의원",
          NASS_CD: "MP103",
          ERACO: "22",
          PPSR_CN: "4"
        }
      ]
    }
  ]
};

test("열린국회정보 응답에서 행을 추출한다", () => {
  const parsed = parseAssemblyPayload(fixture);
  assert.equal(parsed.total, 1);
  assert.equal(parsed.rows.length, 1);
  assert.equal(parsed.rows[0].BILL_NO, "EXAMPLE-0001");
});

test("루트 RESULT의 INFO-200은 오류가 아니라 빈 결과로 처리한다", () => {
  const parsed = parseAssemblyPayload({
    RESULT: { CODE: "INFO-200", MESSAGE: "해당하는 데이터가 없습니다." }
  });
  assert.equal(parsed.total, 0);
  assert.deepEqual(parsed.rows, []);
  assert.equal(parsed.resultCode, "INFO-200");
  assert.equal(parsed.responseShape, "root-result");
});

test("루트 RESULT의 인증·요청 오류는 실제 오류로 처리한다", () => {
  assert.throws(
    () => parseAssemblyPayload({ RESULT: { CODE: "INFO-100", MESSAGE: "인증키가 필요합니다." } }),
    /INFO-100/
  );
});

test("대구 의원 대표발의 자료를 공통 형식으로 변환한다", () => {
  const member = DAEGU_MEMBERS.find((entry) => entry.name === "김기웅");
  const rows = parseAssemblyPayload(fixture).rows;
  const items = normalizeAssemblyRows([{ member, rows, trustSearchFilter: false }], "2026-09-02T00:00:00.000Z");
  assert.equal(items.length, 1);
  assert.equal(items[0].type, "법안 대표발의");
  assert.deepEqual(items[0].personIds, ["PER-MP-DG-JUNG-NAM"]);
  assert.equal(items[0].sample, false);
  assert.equal(items[0].status, "미확인");
  assert.equal(items[0].sourceId, "SRC-NATIONAL-ASSEMBLY-OPENAPI");
});

test("제안자 필드에 없는 의원은 샘플 응답에서 연결하지 않는다", () => {
  const member = DAEGU_MEMBERS.find((entry) => entry.name === "추경호");
  const rows = parseAssemblyPayload(fixture).rows;
  assert.equal(normalizeAssemblyRows([{ member, rows, trustSearchFilter: false }]).length, 0);
});

test("정식키의 PROPOSER 검색 결과는 대표발의 검색조건으로 취급한다", () => {
  const member = DAEGU_MEMBERS.find((entry) => entry.name === "김기웅");
  const row = {
    ...parseAssemblyPayload(fixture).rows[0],
    PROPOSER: "의원 등 10인",
    RST_PROPOSER: "",
    PUBL_PROPOSER: ""
  };
  const items = normalizeAssemblyRows([{ member, rows: [row], trustSearchFilter: true, searchKind: "representative" }]);
  assert.equal(items.length, 1);
  assert.equal(items[0].type, "법안 대표발의");
  assert.ok(items[0].apiMeta.matchBasis.includes("API 대표발의자 검색조건"));
});

test("BILLINFOPPSR 응답에서 대표발의자와 공동발의자를 구분한다", () => {
  const parsed = parseBillProposersPayload(proposerFixture);
  assert.equal(parsed.total, 3);
  const proposers = normalizeBillProposers(parsed.rows);
  assert.equal(proposers.length, 3);
  assert.equal(proposers.filter((entry) => entry.representative).length, 1);
  assert.equal(proposers.filter((entry) => !entry.representative).length, 2);
  assert.equal(proposers[0].name, "김기웅");
  assert.equal(proposers[1].party, "국민의힘");
});

test("대표발의 법안에 공동발의자 상세와 대구 공동발의자 정보를 보강한다", () => {
  const member = DAEGU_MEMBERS.find((entry) => entry.name === "김기웅");
  const baseItem = normalizeAssemblyRows([
    { member, rows: parseAssemblyPayload(fixture).rows, trustSearchFilter: false }
  ], "2026-09-02T00:00:00.000Z")[0];
  const detail = {
    proposers: normalizeBillProposers(parseBillProposersPayload(proposerFixture).rows),
    possiblyTruncated: false
  };
  const enriched = enrichAssemblyItemWithProposers(baseItem, detail);
  assert.equal(enriched.verificationStatus, "API응답+제안자정보");
  assert.equal(enriched.apiMeta.proposerCount, 3);
  assert.equal(enriched.apiMeta.leadProposerCount, 1);
  assert.equal(enriched.apiMeta.coProposerCount, 2);
  assert.deepEqual(enriched.apiMeta.daeguCoProposerNames, ["최은석"]);
  assert.ok(enriched.rawExcerpt.includes("공동발의 최은석·홍길동"));
  assert.ok(enriched.summary.includes("공동발의 2명"));
});

test("다른 의원 대표발의 법안의 대구 공동발의자를 역검색 자료로 변환한다", () => {
  const row = {
    ...parseAssemblyPayload(fixture).rows[0],
    BILL_ID: "PRC_REVERSE",
    BILL_NO: "2220999",
    BILL_NAME: "공동발의 역검색 시험법률안",
    PROPOSE_DT: "20260901",
    PROPOSER: "비대구대표의원 등 4인",
    RST_PROPOSER: "비대구대표"
  };
  const detail = {
    proposers: normalizeBillProposers(parseBillProposersPayload(reverseProposerFixture).rows),
    possiblyTruncated: false
  };
  const item = normalizeCosponsoredBill(row, detail, "2026-09-02T00:00:00.000Z");
  assert.ok(item);
  assert.equal(item.type, "법안 공동발의");
  assert.deepEqual(item.personIds.sort(), ["PER-MP-DG-BUK-A", "PER-MP-DG-DALSEONG"].sort());
  assert.deepEqual(item.apiMeta.daeguCoProposerNames.sort(), ["우재준", "추경호"].sort());
  assert.deepEqual(item.apiMeta.leadProposerNames, ["비대구대표"]);
  assert.ok(item.summary.includes("우재준·추경호"));
  assert.equal(item.apiMeta.reverseScan, true);
});

test("대구 의원이 대표발의자인 법안은 공동발의 역검색 결과에서 제외한다", () => {
  const row = {
    ...parseAssemblyPayload(fixture).rows[0],
    BILL_ID: "PRC_TEST",
    BILL_NO: "2220998",
    PROPOSE_DT: "20260901"
  };
  const detail = {
    proposers: normalizeBillProposers(parseBillProposersPayload(proposerFixture).rows),
    possiblyTruncated: false
  };
  assert.equal(normalizeCosponsoredBill(row, detail), null);
});

test("선택 기간의 법안만 공동발의 역검색 후보로 남긴다", () => {
  const rows = [
    { BILL_ID: "NEW", PROPOSE_DT: "20260901" },
    { BILL_ID: "OLD", PROPOSE_DT: "20260701" },
    { BILL_ID: "UNKNOWN", PROPOSE_DT: "" }
  ];
  const filtered = filterBillsByDays(rows, 30, new Date("2026-09-02T12:00:00+09:00"));
  assert.deepEqual(filtered.map((row) => row.BILL_ID), ["NEW"]);
});
