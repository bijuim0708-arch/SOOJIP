window.SUNEUM_DATA = window.SUNEUM_DATA || {};

const officialInstitutionSources = (window.SUNEUM_DATA.organizations || [])
  .filter((organization) => organization.verificationStatus !== "예시데이터")
  .map((organization) => ({
  id: `SRC-${organization.id.replace(/^ORG-/, "")}`,
  name: `${organization.name} 공식 누리집`,
  type: organization.type,
  url: organization.homepage,
  related: organization.id,
  regionIds: organization.regionIds,
  method: "웹페이지",
  frequency: "매일 08:00",
  lastSuccess: "",
  lastFailure: "",
  error: "",
  active: true,
  status: "paused",
  recordKind: "official_registry",
  verificationStatus: organization.verificationStatus,
  verifiedAt: organization.verifiedAt,
  memo: organization.verificationStatus === "공식주소확인" ? "공식 주소 등록 완료 · 수집기 미연결" : "실제 연결 전 주소와 페이지 구조 재확인 필요"
  }));

window.SUNEUM_DATA.officialSources = [
  {
    id: "SRC-NATIONAL-ASSEMBLY-OPENAPI", name: "열린국회정보 OpenAPI", type: "국회",
    url: "https://open.assembly.go.kr/portal/openapi/main.do", related: "대구 지역구 국회의원 12명",
    regionIds: ["DAEGU-METRO"], method: "API", frequency: "매일 08:00", lastSuccess: "", lastFailure: "", error: "",
    active: true, status: "paused", recordKind: "official_registry", verificationStatus: "공식주소확인", verifiedAt: "2026-09-02",
    connectorId: "assembly-bills", connectedIn: "v0.3",
    memo: "v0.3 국회의원 발의법률안 연결 · 인증키는 로컬 서비스 환경변수로만 사용"
  },
  {
    id: "SRC-NEC-22-ELECTED", name: "중앙선거관리위원회 제22대 당선인 명부", type: "선거관리",
    url: "https://img.nec.go.kr/cmm/dozen/view.do?bcIdx=233924&cbIdx=1129&fileNo=1", related: "대구 지역구 국회의원 12명",
    regionIds: ["DAEGU-METRO"], method: "수동URL", frequency: "수동", lastSuccess: "", lastFailure: "", error: "",
    active: true, status: "paused", recordKind: "official_registry", verificationStatus: "공식주소확인", verifiedAt: "2026-09-02",
    memo: "인물 기본명부 확인 근거 · 자동수집 대상 아님"
  },
  ...officialInstitutionSources
];
