import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { DAEGU_MEMBERS, normalizeAssemblyRows, parseAssemblyPayload } from "../server.mjs";

const fixture = JSON.parse(fs.readFileSync(new URL("../assembly-bills.example.json", import.meta.url), "utf8"));

test("열린국회정보 응답에서 행을 추출한다", () => {
  const parsed = parseAssemblyPayload(fixture);
  assert.equal(parsed.total, 1);
  assert.equal(parsed.rows.length, 1);
  assert.equal(parsed.rows[0].BILL_NO, "EXAMPLE-0001");
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
