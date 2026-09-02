# 선이음-秀集

대구 관내 정치·의정 동향을 수집·검토·보고하는 선이음 프로젝트입니다.

현재 v0.3 기준으로 열린국회정보의 국회의원 발의법률안 연결기가 실제 구현되어 있으며, 지방의회·지자체·뉴스·블로그·SNS 연결기는 후속 확장을 위한 구조를 갖추고 있습니다.

## 실행

- 웹/Pages 진입점: `index.html`
- 로컬 호환 실행 파일: `선이음-동향_실행.html`
- 사용설명서: `선이음-동향_사용설명서.html`

## 저장소 구조

```text
SOOJIP/
├─ index.html
├─ 선이음-동향_실행.html
├─ 선이음-동향_사용설명서.html
├─ assets/
│  ├─ css/styles.css
│  └─ js/app.js
├─ data/
│  ├─ settings.js
│  ├─ regions.js
│  ├─ organizations.js
│  ├─ people.js
│  ├─ official-sources.js
│  ├─ sources.js
│  └─ items.js
├─ collector/
│  ├─ server.mjs
│  ├─ assembly-bills.example.json
│  ├─ start-with-key.ps1
│  ├─ 국회연결_샘플실행.bat
│  ├─ 국회연결_정식키실행.bat
│  ├─ connectors/
│  └─ tests/
├─ docs/
└─ CHANGELOG.md
```

## 개발 원칙

- `main`은 안정 버전으로 유지합니다.
- 기능 수정은 별도 브랜치에서 진행하고 Pull Request로 검토합니다.
- API 키·토큰·비밀번호는 저장소에 커밋하지 않습니다.
- 실제 수집자료와 예시자료를 구분합니다.
- 대구 관내 공개정보를 기본 범위로 합니다.

## 다음 확장 순서

1. 열린국회정보 의안·의원 연결 안정화
2. 대구광역시의회 및 구·군의회 회의록·의사일정
3. 대구시 및 구·군 행사·공지·보도자료
4. 뉴스·블로그 검색
5. 유튜브·SNS

> 기존 파일명 `선이음-동향_실행.html`은 로컬 호환성을 위해 당분간 유지하지만, 프로젝트 표기명은 `선이음-秀集`으로 사용합니다.
