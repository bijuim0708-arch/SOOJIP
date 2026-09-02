window.SUNEUM_DATA = window.SUNEUM_DATA || {};
window.SUNEUM_DATA.sources = (window.SUNEUM_DATA.officialSources || []).concat([
  { id: "SRC-ASSEMBLY-001", name: "국회 의안정보(예시)", type: "국회", url: "https://example.com/assembly", related: "PER-MP-001", method: "API", frequency: "매일 08:00", lastSuccess: "2026-09-02T08:02:00+09:00", lastFailure: "", error: "", active: true, status: "success", memo: "실제 API 미연결" },
  { id: "SRC-MP-BLOG-001", name: "예시-대구국회의원 공식 블로그", type: "블로그", url: "https://example.com/mp/blog", related: "PER-MP-001", method: "RSS", frequency: "매일 08:00", lastSuccess: "2026-09-02T08:05:00+09:00", lastFailure: "", error: "", active: true, status: "success", memo: "예시 출처" },
  { id: "SRC-NEWS-001", name: "지역 언론검색(예시)", type: "언론", url: "https://example.com/news", related: "예시 한빛구", method: "API", frequency: "6시간마다", lastSuccess: "2026-09-02T08:10:00+09:00", lastFailure: "", error: "", active: true, status: "success", memo: "실제 검색 API 미연결" },
  { id: "SRC-COUNCIL-001", name: "한빛구의회 회의록(예시)", type: "지방의회", url: "https://example.com/council/minutes", related: "ORG-COUNCIL-001", method: "웹페이지", frequency: "매일 08:00", lastSuccess: "2026-09-02T08:13:00+09:00", lastFailure: "", error: "", active: true, status: "success", memo: "회의록 구조 확인 필요" },
  { id: "SRC-CITYCOUNCIL-001", name: "새봄광역시의회(예시)", type: "지방의회", url: "https://example.com/citycouncil", related: "ORG-CITYCOUNCIL-001", method: "웹페이지", frequency: "매일 08:00", lastSuccess: "2026-09-01T08:14:00+09:00", lastFailure: "2026-09-02T08:14:00+09:00", error: "응답 형식 변경 확인 필요", active: true, status: "fail", memo: "출처별 연결기 보완 필요" },
  { id: "SRC-LOCAL-001", name: "한빛구청 공지·행사(예시)", type: "지방자치단체", url: "https://example.com/local/events", related: "ORG-LOCAL-001", method: "웹페이지", frequency: "매일 08:00", lastSuccess: "2026-09-02T08:18:00+09:00", lastFailure: "", error: "", active: true, status: "success", memo: "예시 출처" },
  { id: "SRC-YOUTUBE-001", name: "예시-대구구청장 유튜브", type: "유튜브", url: "https://example.com/mayor/youtube", related: "PER-MAYOR-001", method: "API", frequency: "매일 12:00", lastSuccess: "2026-09-01T12:03:00+09:00", lastFailure: "", error: "", active: true, status: "success", memo: "실제 API 미연결" },
  { id: "SRC-SNS-001", name: "공식 SNS 수동확인 목록", type: "SNS", url: "https://example.com/social", related: "예시 한빛구", method: "수동URL", frequency: "수동", lastSuccess: "2026-09-01T17:20:00+09:00", lastFailure: "", error: "", active: false, status: "paused", memo: "플랫폼별 권한 검토 후 연결" }
]);

const sampleSourceRegions = {
  "SRC-ASSEMBLY-001": ["DAEGU-JUNG", "DAEGU-NAM"],
  "SRC-MP-BLOG-001": ["DAEGU-JUNG", "DAEGU-NAM"],
  "SRC-NEWS-001": ["DAEGU-METRO"],
  "SRC-COUNCIL-001": ["DAEGU-SUSEONG"],
  "SRC-CITYCOUNCIL-001": ["DAEGU-METRO"],
  "SRC-LOCAL-001": ["DAEGU-DONG"],
  "SRC-YOUTUBE-001": ["DAEGU-DONG"],
  "SRC-SNS-001": ["DAEGU-METRO"]
};
window.SUNEUM_DATA.sources.forEach((source) => {
  if (sampleSourceRegions[source.id]) {
    source.regionIds = sampleSourceRegions[source.id];
    source.recordKind = "sample";
    source.verificationStatus = "예시데이터";
    source.verifiedAt = "";
  }
});
