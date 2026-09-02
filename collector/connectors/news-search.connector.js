import { BaseConnector } from "../connector-interface.js";

export class NewsSearchConnector extends BaseConnector {
  async collect() {
    throw new Error("v0.3에서 공식 검색 API 이용조건과 중복기사 처리규칙을 확정한 뒤 구현합니다.");
  }
}

