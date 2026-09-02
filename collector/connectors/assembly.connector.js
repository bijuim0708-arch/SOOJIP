import { BaseConnector } from "./connector-interface.js";

export class AssemblyConnector extends BaseConnector {
  async collect() {
    throw new Error("v0.3 국회 법안 수집은 collector/server.mjs의 로컬 HTTP 인터페이스를 사용합니다.");
  }
}
