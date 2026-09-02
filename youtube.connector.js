import { BaseConnector } from "../connector-interface.js";

export class YoutubeConnector extends BaseConnector {
  async collect() {
    throw new Error("v0.4에서 공식 API 권한과 할당량을 확인한 뒤 구현합니다.");
  }
}

