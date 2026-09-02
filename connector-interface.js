/**
 * 선이음-동향 수집기 공통 인터페이스 v0.3 · 대구 관내
 *
 * 실제 연결기는 collect()에서 공개정보를 읽고 normalizeItem() 형식의 배열을 반환한다.
 * API 키는 이 폴더나 배포 HTML에 저장하지 않고, 향후 Node.js 실행환경의 환경변수로만 주입한다.
 */

export class BaseConnector {
  constructor(source, options = {}) {
    if (!source?.id || !source?.url) throw new Error("source.id와 source.url이 필요합니다.");
    this.source = source;
    this.options = options;
  }

  async healthCheck() {
    return {
      sourceId: this.source.id,
      ok: false,
      checkedAt: new Date().toISOString(),
      message: "이 연결기는 아직 구현되지 않음"
    };
  }

  async collect() {
    throw new Error("연결기별 collect() 구현이 필요합니다.");
  }

  normalizeItem(raw) {
    return {
      id: raw.id,
      title: raw.title || "제목 확인 필요",
      type: raw.type || "기타 관내 정치동향",
      personIds: raw.personIds || [],
      orgIds: raw.orgIds || [],
      regionIds: raw.regionIds || this.source.regionIds || ["DAEGU-METRO"],
      region: raw.region || "불명확",
      sourceId: this.source.id,
      sourceName: this.source.name,
      url: raw.url || this.source.url,
      publishedAt: raw.publishedAt || "",
      collectedAt: new Date().toISOString(),
      rawExcerpt: raw.rawExcerpt || "",
      summary: raw.summary || "원문 확인 필요",
      eventAt: raw.eventAt || "",
      eventPlace: raw.eventPlace || "",
      organizer: raw.organizer || "",
      futureSchedule: Boolean(raw.futureSchedule),
      regionRelation: raw.regionRelation || "불명확",
      importance: raw.importance || "참고",
      status: "미확인",
      duplicateGroup: "",
      memo: "",
      visibility: "공개",
      sample: false,
      changeType: "신규",
      reportSection: raw.reportSection || "review",
      scheduleStatus: raw.scheduleStatus || ""
    };
  }
}

export function validateNormalizedItem(item) {
  const required = ["id", "title", "type", "regionIds", "sourceId", "sourceName", "url", "collectedAt"];
  const missing = required.filter((key) => !item?.[key]);
  if (!Array.isArray(item?.regionIds) || item.regionIds.length === 0) missing.push("regionIds[]");
  return { valid: missing.length === 0, missing: [...new Set(missing)] };
}
