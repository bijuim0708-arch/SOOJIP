window.SUNEUM_DATA = window.SUNEUM_DATA || {};
window.SUNEUM_DATA.settings = {
  appId: "SUNEUM-TRENDS-V03",
  version: "0.3.0",
  title: "선이음-동향",
  edition: "국회 법안 실제 API 연결판",
  jurisdiction: "대구광역시",
  referenceTime: "2026-09-02T08:30:00+09:00",
  registryVerifiedAt: "2026-09-02",
  sampleData: true,
  storageKey: "suneum-trends-v03-user-state",
  collectorBaseUrl: "http://127.0.0.1:3217",
  connectedCollectors: ["국회의원 발의법률안"],
  categories: [
    "행사·현장 동정", "법안 대표발의", "법안 공동발의", "언론 언급", "SNS 게시물",
    "향후 일정 안내", "본회의·위원회 회의", "5분 자유발언", "구정질문·시정질문",
    "조례안·의안", "지방자치단체 행사", "지방의회 행사", "기타 관내 정치동향"
  ],
  reportSections: [
    { key: "main", title: "1. 주요 동향" },
    { key: "people", title: "2. 인물별 동향" },
    { key: "legislation", title: "3. 법안·의정활동" },
    { key: "meetings", title: "4. 지방의회 회의·주요 발언" },
    { key: "events", title: "5. 지방자치단체·지방의회 행사" },
    { key: "upcoming", title: "6. 향후 일정" },
    { key: "review", title: "7. 확인이 필요한 사항" },
    { key: "failures", title: "8. 수집 실패 출처" }
  ],
  collectionRules: [
    "대구 관내 공개 정치활동·의정활동·언론보도·행사정보만 관리",
    "기사 본문 전체는 저장하지 않고 제목·언론사·게시일·원문 링크와 필요한 최소 발췌만 보존",
    "동일 사안은 중복 묶음으로 관리하고, 발언자나 원문 위치가 불명확하면 검수 필요로 분류",
    "정치 성향·인물 순위·평판점수·위법 자동판정은 생성하지 않음"
  ]
};
