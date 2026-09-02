import assert from "node:assert/strict";
import test from "node:test";
import { ALL_BILL_PAGE_LIMIT, ALL_BILL_PAGE_SIZE, SERVICE_VERSION } from "../server.mjs";

test("공동발의 역검색 전체 법안 조회는 대용량 페이지를 사용한다", () => {
  assert.equal(SERVICE_VERSION, "0.3.6");
  assert.equal(ALL_BILL_PAGE_SIZE, 1000);
  assert.equal(ALL_BILL_PAGE_LIMIT, 50);
  assert.ok(ALL_BILL_PAGE_SIZE * ALL_BILL_PAGE_LIMIT >= 50000);
});
