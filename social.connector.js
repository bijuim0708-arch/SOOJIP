import { BaseConnector } from "../connector-interface.js";

export class SocialConnector extends BaseConnector {
  async collect() {
    throw new Error("v0.4에서 플랫폼별 공식 API 또는 수동 URL 방식을 선택해 구현합니다.");
  }
}

