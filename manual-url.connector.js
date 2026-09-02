import { BaseConnector } from "../connector-interface.js";

export class ManualUrlConnector extends BaseConnector {
  async collect() {
    throw new Error("공개 URL 수동 등록 연결기는 아직 구현되지 않았습니다.");
  }
}
