import { BaseConnector } from "../connector-interface.js";

export class CouncilMinutesConnector extends BaseConnector {
  async collect() {
    throw new Error("의회별 회의록 연결기는 아직 구현되지 않았습니다.");
  }
}
