import { BaseConnector } from "../connector-interface.js";

export class BlogSearchConnector extends BaseConnector {
  async collect() {
    throw new Error("v0.3에서 공식 블로그·검색 API를 연결합니다.");
  }
}

