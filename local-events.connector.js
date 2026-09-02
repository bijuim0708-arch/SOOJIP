import { BaseConnector } from "../connector-interface.js";

export class LocalEventsConnector extends BaseConnector {
  async collect() {
    throw new Error("지자체·의회 공지와 행사 목록 연결기는 아직 구현되지 않았습니다.");
  }
}
