import assert from "node:assert/strict";
import test from "node:test";
import {
  ALL_BILL_PAGE_LIMIT,
  ALL_BILL_PAGE_SIZE,
  FETCH_RETRY_ATTEMPTS,
  SERVICE_VERSION,
  describeFetchError
} from "../server.mjs";

test("공동발의 역검색은 중간 크기 페이지와 충분한 총 조회 한도를 사용한다", () => {
  assert.equal(SERVICE_VERSION, "0.3.6");
  assert.equal(ALL_BILL_PAGE_SIZE, 500);
  assert.equal(ALL_BILL_PAGE_LIMIT, 100);
  assert.ok(ALL_BILL_PAGE_SIZE * ALL_BILL_PAGE_LIMIT >= 50000);
});

test("네트워크 재시도 횟수를 고정한다", () => {
  assert.equal(FETCH_RETRY_ATTEMPTS, 3);
});

test("fetch 오류는 원인 코드와 메시지를 함께 표시한다", () => {
  const error = new Error("fetch failed", { cause: Object.assign(new Error("socket closed"), { code: "UND_ERR_SOCKET" }) });
  const message = describeFetchError(error);
  assert.match(message, /fetch failed/);
  assert.match(message, /UND_ERR_SOCKET/);
  assert.match(message, /socket closed/);
});
