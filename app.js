(function () {
  "use strict";

  const DATA = window.SUNEUM_DATA;
  const SETTINGS = DATA.settings;
  const STORAGE_KEY = SETTINGS.storageKey;
  const ASSEMBLY_SOURCE_ID = "SRC-NATIONAL-ASSEMBLY-OPENAPI";
  const initialReportIds = DATA.items.filter((item) => item.status === "보고서반영").map((item) => item.id);
  const initialFocusPersonIds = DATA.people.filter((person) => person.focusDefault).map((person) => person.id);
  const defaultState = {
    schemaVersion: 3,
    peopleAdded: [],
    peopleOverrides: {},
    sourcesAdded: [],
    sourcesOverrides: {},
    itemMeta: {},
    liveItems: [],
    connectorState: {
      assembly: { status: "unknown", apiMode: "", lastCheckedAt: "", lastSyncAt: "", lastItemCount: 0, lastMessage: "", partial: false, failedMembers: [] }
    },
    selectedItemIds: initialReportIds,
    focusPersonIds: initialFocusPersonIds,
    reportEdits: {},
    reportNote: "",
    preferences: { inboxMode: "card", selectedRegionId: "DAEGU-ALL" }
  };

  let state = loadState();
  let uiSelected = new Set();
  let activePersonId = "";
  let activeView = "dashboard";

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (!saved || saved.schemaVersion !== 3) return structuredClone(defaultState);
      return {
        ...structuredClone(defaultState),
        ...saved,
        peopleAdded: Array.isArray(saved.peopleAdded) ? saved.peopleAdded : [],
        peopleOverrides: saved.peopleOverrides || {},
        sourcesAdded: Array.isArray(saved.sourcesAdded) ? saved.sourcesAdded : [],
        sourcesOverrides: saved.sourcesOverrides || {},
        itemMeta: saved.itemMeta || {},
        liveItems: Array.isArray(saved.liveItems) ? saved.liveItems : [],
        connectorState: {
          assembly: { ...defaultState.connectorState.assembly, ...(saved.connectorState?.assembly || {}) }
        },
        selectedItemIds: Array.isArray(saved.selectedItemIds) ? saved.selectedItemIds : initialReportIds,
        focusPersonIds: Array.isArray(saved.focusPersonIds) ? saved.focusPersonIds : initialFocusPersonIds,
        reportEdits: saved.reportEdits || {},
        preferences: { ...defaultState.preferences, ...(saved.preferences || {}) }
      };
    } catch (error) {
      return structuredClone(defaultState);
    }
  }

  function persistState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      toast("변경사항을 저장하지 못했습니다. 브라우저 저장공간을 확인해 주세요.");
    }
  }

  function getPeople() {
    return DATA.people
      .map((person) => ({ ...person, ...(state.peopleOverrides[person.id] || {}) }))
      .concat(state.peopleAdded.map((person) => ({ ...person })));
  }

  function getSources() {
    return DATA.sources
      .map((source) => ({ ...source, ...(state.sourcesOverrides[source.id] || {}) }))
      .concat(state.sourcesAdded.map((source) => ({ ...source })));
  }

  function getItems() {
    return DATA.items.concat(state.liveItems).map((item) => ({ ...item, ...(state.itemMeta[item.id] || {}) }));
  }

  function selectedRegionId() { return state.preferences.selectedRegionId || "DAEGU-ALL"; }
  function selectedRegion() { return DATA.regions.find((region) => region.id === selectedRegionId()) || DATA.regions[0]; }
  function matchesRegion(record) {
    const regionId = selectedRegionId();
    if (regionId === "DAEGU-ALL" || regionId === "DAEGU-METRO") return true;
    return Array.isArray(record.regionIds) && record.regionIds.includes(regionId);
  }
  function getScopedPeople() { return getPeople().filter(matchesRegion); }
  function getScopedSources() { return getSources().filter(matchesRegion); }
  function getScopedItems() { return getItems().filter(matchesRegion); }
  function isFocusedPerson(id) { return state.focusPersonIds.includes(id); }

  function findPerson(id) { return getPeople().find((person) => person.id === id); }
  function findOrganization(id) { return DATA.organizations.find((org) => org.id === id); }
  function findSource(id) { return getSources().find((source) => source.id === id); }
  function findItem(id) { return getItems().find((item) => item.id === id); }

  function escapeHTML(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function formatDateTime(value, withSeconds = false) {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat("ko-KR", {
      year: "numeric", month: "2-digit", day: "2-digit", weekday: "short",
      hour: "2-digit", minute: "2-digit", second: withSeconds ? "2-digit" : undefined,
      hour12: false
    }).format(date);
  }

  function formatShortDate(value) {
    if (!value) return "미정";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat("ko-KR", { month: "2-digit", day: "2-digit", weekday: "short" }).format(date);
  }

  function personNames(ids) {
    return (ids || []).map((id) => findPerson(id)?.name || id).join(", ") || "관련 인물 없음";
  }

  function organizationNames(ids) {
    return (ids || []).map((id) => findOrganization(id)?.name || id).join(", ") || "-";
  }

  function statusClass(status) {
    return {
      "미확인": "status-unverified",
      "원문확인": "status-verified",
      "보고서반영": "status-report",
      "제외": "status-excluded"
    }[status] || "status-unverified";
  }

  function importanceClass(value) {
    return value === "높음" ? "importance-high" : value === "보통" ? "importance-normal" : "importance-reference";
  }

  function itemDataBadge(item) {
    if (item.sample !== false) return '<span class="mini-badge demo-badge">예시 데이터</span>';
    if (item.dataOrigin === "official_api") return '<span class="mini-badge actual-badge">공식 API</span>';
    return '<span class="mini-badge actual-badge">공개 원문</span>';
  }

  function itemDataLabel(item) {
    if (item.sample !== false) return "예시 데이터 · 실제 자료 아님";
    if (item.dataOrigin === "official_api") return "공식 API 응답 · 원문 확인 필요";
    return "공개 원문 기반 · 원문 확인 필요";
  }

  function sourceStatusLabel(source) {
    if (!source.active || source.status === "paused") return "중지";
    return source.status === "fail" ? "실패" : "정상";
  }

  function referenceDate() { return new Date(SETTINGS.referenceTime); }
  function referenceDay() { return SETTINGS.referenceTime.slice(0, 10); }

  function toast(message) {
    const node = document.createElement("div");
    node.className = "toast";
    node.textContent = message;
    $("#toastRegion").appendChild(node);
    window.setTimeout(() => node.remove(), 2800);
  }

  function navigate(view) {
    activeView = view;
    $$(".view").forEach((section) => section.classList.toggle("is-active", section.id === `view-${view}`));
    $$(".nav-item").forEach((button) => {
      const active = button.dataset.view === view;
      button.classList.toggle("is-active", active);
      if (active) button.setAttribute("aria-current", "page"); else button.removeAttribute("aria-current");
    });
    const labels = {
      dashboard: ["오늘의 동향", "관내 정치동향 검토"],
      inbox: ["수집함", "수집자료 검토"],
      people: ["인물별 동향", "관리 대상과 활동"],
      meetings: ["의회·회의록", "회의 발언 검토"],
      schedule: ["일정", "향후 정치·행사 일정"],
      report: ["일일보고서", "보고서 초안 작성"],
      sources: ["출처 관리", "수집 출처와 상태"]
    };
    $("#breadcrumb").textContent = labels[view][0];
    $("#pageTitle").textContent = labels[view][1];
    document.body.classList.remove("menu-open");
    renderView(view);
    $("#mainContent").focus({ preventScroll: true });
  }

  function renderView(view) {
    if (view === "dashboard") renderDashboard();
    if (view === "inbox") renderInbox();
    if (view === "people") renderPeople();
    if (view === "meetings") renderMeetings();
    if (view === "schedule") renderSchedule();
    if (view === "report") renderReport();
    if (view === "sources") renderSources();
    renderNavCounts();
  }

  function renderNavCounts() {
    const items = getScopedItems();
    $("#navInboxCount").textContent = items.filter((item) => item.status === "미확인").length;
    $("#navReportCount").textContent = state.selectedItemIds.map(findItem).filter(Boolean).filter(matchesRegion).length;
  }

  function renderDashboard() {
    const items = getScopedItems();
    const sources = getScopedSources();
    const people = getScopedPeople();
    const scope = selectedRegion();
    $("#dashboardScopeName").textContent = scope.name;
    const actualItems = items.filter((item) => item.sample === false).length;
    $("#dashboardDataMode").textContent = actualItems ? `공식 API ${actualItems}건 · 예시자료 병행` : "예시 데이터";
    const todayItems = items.filter((item) => item.collectedAt.slice(0, 10) === referenceDay());
    const upcoming = items.filter((item) => item.futureSchedule && item.eventAt && new Date(item.eventAt) >= referenceDate());
    const metrics = [
      { label: "오늘 새 자료", value: todayItems.length, note: "기준시각까지", className: "" },
      { label: "원문 미확인", value: items.filter((item) => item.status === "미확인").length, note: "담당자 확인 필요", className: "is-alert" },
      { label: "중요도 높음", value: items.filter((item) => item.importance === "높음" && item.status !== "제외").length, note: "제외자료 미포함", className: "is-danger" },
      { label: "향후 7일 일정", value: upcoming.filter((item) => (new Date(item.eventAt) - referenceDate()) / 86400000 <= 7).length, note: "일시 명시 자료", className: "" },
      { label: "수집 실패 출처", value: sources.filter((source) => source.active && source.status === "fail").length, note: "다른 출처는 계속 작동", className: "is-danger" }
    ];
    $("#metricGrid").innerHTML = metrics.map((metric) => `
      <article class="metric-card ${metric.className}"><span>${metric.label}</span><strong>${metric.value}</strong><small>${metric.note}</small></article>
    `).join("");

    const officialPeople = people.filter((person) => person.recordKind === "verified_registry");
    const officialSources = sources.filter((source) => source.recordKind === "official_registry");
    const reviewSources = officialSources.filter((source) => source.verificationStatus !== "공식주소확인");
    $("#scopeOverview").innerHTML = `
      <div class="scope-card is-note"><span>현재 관할</span><strong>${escapeHTML(scope.name)} 기준으로 모든 화면을 필터링합니다.</strong></div>
      <div class="scope-card"><span>공식명부 인물</span><strong>${officialPeople.length}명</strong></div>
      <div class="scope-card"><span>공식 출처 후보</span><strong>${officialSources.length}개</strong></div>
      <div class="scope-card"><span>주소 재확인 대상</span><strong>${reviewSources.length}개</strong></div>
      <div class="scope-card"><span>지방직 명부</span><strong>공식 재확인 필요</strong></div>`;

    const priorities = items
      .filter((item) => item.importance === "높음" && item.status !== "제외")
      .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
      .slice(0, 5);
    $("#priorityItems").innerHTML = priorities.map((item, index) => `
      <article class="priority-item">
        <span class="priority-rank">${String(index + 1).padStart(2, "0")}</span>
        <div><h4>${escapeHTML(item.title)}</h4><p>${escapeHTML(item.summary)}</p><div class="priority-item-meta"><span class="mini-badge ${statusClass(item.status)}">${item.status}</span>${itemDataBadge(item)}<span class="mini-badge importance-high">${escapeHTML(item.region)}</span></div></div>
        <button class="text-button" type="button" data-open-item="${item.id}">상세</button>
      </article>
    `).join("") || `<div class="empty-state"><strong>우선 확인할 자료가 없습니다.</strong></div>`;

    $("#upcomingList").innerHTML = upcoming
      .sort((a, b) => new Date(a.eventAt) - new Date(b.eventAt))
      .slice(0, 5)
      .map((item) => `<div class="timeline-item"><time class="timeline-date">${formatShortDate(item.eventAt)}</time><div><strong>${escapeHTML(item.title)}</strong><span>${escapeHTML(item.eventPlace || "장소 미정")} · ${escapeHTML(item.scheduleStatus || "예정")}</span></div></div>`)
      .join("") || `<div class="empty-state"><span>일시가 확인된 향후 일정이 없습니다.</span></div>`;

    const health = {
      success: sources.filter((source) => source.active && source.status === "success").length,
      fail: sources.filter((source) => source.active && source.status === "fail").length,
      paused: sources.filter((source) => !source.active || source.status === "paused").length
    };
    $("#sourceHealth").innerHTML = `
      <div class="health-card is-success"><span>정상</span><strong>${health.success}</strong><span>최근 응답 성공</span></div>
      <div class="health-card is-fail"><span>실패</span><strong>${health.fail}</strong><span>개별 출처 확인</span></div>
      <div class="health-card is-paused"><span>중지</span><strong>${health.paused}</strong><span>수동·비활성</span></div>`;

    const changes = ["신규", "수정", "유지"].map((type) => ({ type, count: items.filter((item) => item.changeType === type).length }));
    $("#changeSummary").innerHTML = changes.map((change) => `<div class="change-row"><span>${change.type} 자료</span><strong>${change.count}건</strong></div>`).join("") +
      `<div class="change-row"><span>중복 묶음</span><strong>${new Set(items.map((item) => item.duplicateGroup).filter(Boolean)).size}건</strong></div>`;
  }

  function populateInboxFilters() {
    const typeSelect = $("#filterType");
    const personSelect = $("#filterPerson");
    if (typeSelect.options.length === 1) {
      SETTINGS.categories.forEach((category) => typeSelect.add(new Option(category, category)));
    }
    const previousPerson = personSelect.value;
    personSelect.innerHTML = '<option value="">전체 인물</option>';
    getScopedPeople().forEach((person) => personSelect.add(new Option(person.name, person.id)));
    if (getScopedPeople().some((person) => person.id === previousPerson)) personSelect.value = previousPerson;
  }

  function filteredInboxItems() {
    const query = $("#inboxSearch").value.trim().toLowerCase();
    const type = $("#filterType").value;
    const person = $("#filterPerson").value;
    const importance = $("#filterImportance").value;
    const status = $("#filterStatus").value;
    return getScopedItems().filter((item) => {
      const haystack = [item.title, item.summary, item.region, personNames(item.personIds), item.sourceName].join(" ").toLowerCase();
      return (!query || haystack.includes(query)) && (!type || item.type === type) && (!person || item.personIds.includes(person)) && (!importance || item.importance === importance) && (!status || item.status === status);
    }).sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
  }

  function renderInbox() {
    populateInboxFilters();
    const items = filteredInboxItems();
    const mode = state.preferences.inboxMode;
    $$("[data-view-mode]").forEach((button) => button.classList.toggle("is-active", button.dataset.viewMode === mode));
    $("#inboxItems").classList.toggle("is-list", mode === "list");
    $("#inboxItems").innerHTML = items.map((item) => `
      <article class="item-card ${uiSelected.has(item.id) ? "is-selected" : ""}">
        <input class="card-select" type="checkbox" aria-label="${escapeHTML(item.title)} 선택" data-select-item="${item.id}" ${uiSelected.has(item.id) ? "checked" : ""}>
        <div class="item-card-head"><span class="type-badge">${escapeHTML(item.type)}</span>${itemDataBadge(item)}</div>
        <div>
          <h3>${escapeHTML(item.title)}</h3>
          <p class="item-summary">${escapeHTML(item.summary)}</p>
          <div class="item-meta"><span>관련 인물 · ${escapeHTML(personNames(item.personIds))}</span><span>지역 · ${escapeHTML(item.region)}</span><span>게시 · ${formatDateTime(item.publishedAt)}</span><span>출처 · ${escapeHTML(item.sourceName)}</span></div>
        </div>
        <footer class="item-card-footer"><div class="status-stack"><span class="mini-badge ${importanceClass(item.importance)}">${item.importance}</span><span class="mini-badge ${statusClass(item.status)}">${item.status}</span></div><button class="text-button" type="button" data-open-item="${item.id}">상세보기</button></footer>
      </article>
    `).join("");
    $("#inboxResultCount").textContent = `${items.length}건`;
    $("#inboxEmpty").hidden = items.length > 0;
    renderBulkBar();
  }

  function renderBulkBar() {
    $("#bulkBar").hidden = uiSelected.size === 0;
    $("#selectedCount").textContent = uiSelected.size;
  }

  function updateItem(id, patch) {
    state.itemMeta[id] = { ...(state.itemMeta[id] || {}), ...patch };
    persistState();
  }

  function applyItemAction(ids, action) {
    const itemIds = Array.from(ids);
    if (!itemIds.length) return;
    if (action === "duplicate" && itemIds.length < 2) {
      toast("중복으로 묶을 자료를 2건 이상 선택해 주세요.");
      return;
    }
    let duplicateId = "";
    if (action === "duplicate") duplicateId = `DUP-CUSTOM-${new Date().toISOString().replace(/\D/g, "").slice(0, 14)}`;
    itemIds.forEach((id) => {
      if (action === "report") {
        updateItem(id, { status: "보고서반영" });
        if (!state.selectedItemIds.includes(id)) state.selectedItemIds.push(id);
      }
      if (action === "verified") updateItem(id, { status: "원문확인" });
      if (action === "exclude") {
        updateItem(id, { status: "제외" });
        state.selectedItemIds = state.selectedItemIds.filter((itemId) => itemId !== id);
      }
      if (action === "duplicate") updateItem(id, { duplicateGroup: duplicateId });
    });
    persistState();
    if (action !== "clear") uiSelected.clear();
    toast({ report: "보고서에 반영했습니다.", verified: "원문 확인 상태로 변경했습니다.", exclude: "선택 자료를 제외했습니다.", duplicate: "선택 자료를 중복 묶음으로 표시했습니다." }[action] || "처리했습니다.");
    renderView(activeView);
  }

  function openItemDialog(id) {
    const item = findItem(id);
    if (!item) return;
    $("#itemDialogType").textContent = item.type;
    $("#itemDialogTitle").textContent = item.title;
    const meetingFields = item.meeting ? `
      <div class="detail-field"><span>회의·안건</span><strong>${escapeHTML(item.meeting.session)} · ${escapeHTML(item.meeting.agenda)}</strong></div>
      <div class="detail-field"><span>발언자·위치</span><strong>${escapeHTML(item.meeting.speaker)} · ${escapeHTML(item.meeting.location)}</strong></div>
      <div class="detail-field is-wide"><span>발언 원문</span><p>${item.meeting.verified && item.meeting.originalText ? escapeHTML(item.meeting.originalText) : "원문 확인 필요 — 구체적인 발언 내용을 생성하지 않습니다."}</p></div>` : "";
    $("#itemDialogBody").innerHTML = `
      <div class="detail-grid">
        <div class="detail-field"><span>자료 구분</span><strong>${escapeHTML(itemDataLabel(item))}</strong></div>
        <div class="detail-field"><span>확인상태</span><strong>${escapeHTML(item.status)}</strong></div>
        <div class="detail-field"><span>관련 인물</span><strong>${escapeHTML(personNames(item.personIds))}</strong></div>
        <div class="detail-field"><span>관련 기관</span><strong>${escapeHTML(organizationNames(item.orgIds))}</strong></div>
        <div class="detail-field"><span>지역·관련성</span><strong>${escapeHTML(item.region)} · ${escapeHTML(item.regionRelation)}</strong></div>
        <div class="detail-field"><span>중요도·공개등급</span><strong>${escapeHTML(item.importance)} · ${escapeHTML(item.visibility)}</strong></div>
        <div class="detail-field"><span>게시일시</span><strong>${formatDateTime(item.publishedAt)}</strong></div>
        <div class="detail-field"><span>수집일시</span><strong>${formatDateTime(item.collectedAt)}</strong></div>
        <div class="detail-field is-wide"><span>원문 발췌</span><p>${escapeHTML(item.rawExcerpt || "원문 확인 필요")}</p></div>
        <div class="detail-field is-wide"><span>${item.aiGenerated ? "AI 요약" : item.summaryMethod === "rule_based" ? "규칙 기반 요약" : "요약"}</span><p>${escapeHTML(item.summary)}</p></div>
        ${meetingFields}
        <div class="detail-field is-wide"><span>담당자 메모</span><p>${escapeHTML(item.memo || "-")}</p></div>
        <div class="detail-field is-wide"><span>출처</span><p>${escapeHTML(item.sourceName)} · <a href="${escapeHTML(item.url)}" target="_blank" rel="noopener noreferrer">원문 새 창에서 열기</a></p></div>
      </div>
      <div class="detail-actions">
        <button class="button button-secondary" type="button" data-item-action="verified" data-item-id="${item.id}">원문 확인</button>
        <button class="button button-primary" type="button" data-item-action="report" data-item-id="${item.id}">보고서 반영</button>
        <button class="button button-danger" type="button" data-item-action="exclude" data-item-id="${item.id}">제외</button>
      </div>`;
    $("#itemDialog").showModal();
  }

  function renderPeople() {
    const query = $("#peopleSearch").value.trim().toLowerCase();
    const focusOnly = $("#focusPeopleOnly").checked;
    const recordKind = $("#peopleRecordKind").value;
    const people = getScopedPeople()
      .filter((person) => !focusOnly || isFocusedPerson(person.id))
      .filter((person) => !recordKind || person.recordKind === recordKind)
      .filter((person) => [person.name, person.type, person.position, person.district, person.affiliation].join(" ").toLowerCase().includes(query));
    if (!activePersonId || !people.some((person) => person.id === activePersonId)) activePersonId = people[0]?.id || "";
    $("#peopleList").innerHTML = people.map((person) => `
      <button class="person-list-item ${person.id === activePersonId ? "is-active" : ""}" type="button" data-person-id="${person.id}">
        <span class="person-avatar">${escapeHTML(person.name.slice(0, 1))}</span><span><strong>${escapeHTML(person.name)}</strong><span>${escapeHTML(person.position)} · ${escapeHTML(person.district)}</span></span><span class="person-list-state">${isFocusedPerson(person.id) ? '<span class="focus-mark">★ 중점</span>' : ""}<span>${person.active ? "활성" : "중지"}</span></span>
      </button>`).join("") || '<div class="empty-state"><strong>조건에 맞는 인물이 없습니다.</strong></div>';
    renderPersonDetail();
  }

  function renderPersonDetail() {
    const person = findPerson(activePersonId);
    if (!person) {
      $("#personDetail").innerHTML = `<div class="empty-state"><strong>등록된 인물이 없습니다.</strong></div>`;
      return;
    }
    const items = getScopedItems().filter((item) => item.personIds.includes(person.id));
    const sourceLinks = [
      ["홈페이지", person.homepage], ["블로그", person.blog], ["유튜브", person.youtube], ["페이스북", person.facebook],
      ["인스타그램", person.instagram], ["Threads", person.threads], ["기타 SNS", person.otherSns]
    ].filter((entry) => entry[1]);
    const registeredSources = getScopedSources().filter((source) => source.related === person.id);
    const verificationClass = person.verificationStatus === "공식명부확인" ? "" : "is-review";
    $("#personDetail").innerHTML = `
      <div class="person-profile-head">
        <div class="person-identity"><span class="person-avatar">${escapeHTML(person.name.slice(0, 1))}</span><div><h3>${escapeHTML(person.name)}</h3><p>${escapeHTML(person.position)} · ${escapeHTML(person.district)} · ${escapeHTML(person.affiliation || "소속 미등록")}</p><span class="profile-status ${person.active ? "is-active" : "is-inactive"}">${person.active ? "활성 관리대상" : "비활성"}</span><span class="verification-badge ${verificationClass}">${escapeHTML(person.verificationStatus || "담당자 확인")}</span></div></div>
        <div><button class="focus-button ${isFocusedPerson(person.id) ? "is-focused" : ""}" type="button" data-focus-person="${person.id}">${isFocusedPerson(person.id) ? "★ 중점관리" : "☆ 중점관리"}</button> <button class="button button-secondary button-small" type="button" data-edit-person="${person.id}">정보 수정</button> <button class="button button-secondary button-small" type="button" data-toggle-person="${person.id}">${person.active ? "비활성화" : "활성화"}</button></div>
      </div>
      <div class="profile-grid">
        <div class="profile-stat"><span>전체 동향</span><strong>${items.length}</strong></div>
        <div class="profile-stat"><span>최근 행사·SNS</span><strong>${items.filter((item) => ["행사·현장 동정", "SNS 게시물"].includes(item.type)).length}</strong></div>
        <div class="profile-stat"><span>법안·의정</span><strong>${items.filter((item) => item.type.includes("법안") || item.type.includes("의안") || item.meeting).length}</strong></div>
        <div class="profile-stat"><span>향후 일정</span><strong>${items.filter((item) => item.futureSchedule).length}</strong></div>
      </div>
      <h4>등록된 공식 출처</h4>
      <div class="source-links">${sourceLinks.map(([label, url]) => `<a href="${escapeHTML(url)}" target="_blank" rel="noopener noreferrer">${label}</a>`).join("") || `<span>공식 링크 미등록</span>`}</div>
      <p class="eyebrow">출처 최종 확인</p>
      <div class="source-links">${person.verificationSource ? `<a href="${escapeHTML(person.verificationSource)}" target="_blank" rel="noopener noreferrer">명부 확인 근거 · ${escapeHTML(person.lastVerified || "확인일 미등록")}</a>` : ""}${registeredSources.map((source) => `<span>${escapeHTML(source.name)} · ${source.lastSuccess ? formatDateTime(source.lastSuccess) : "수집기 미연결"}</span>`).join("") || (!person.verificationSource ? `<span>연결 출처 없음</span>` : "")}</div>
      <h4>최근 동향</h4>
      <div class="mini-activity-list">${items.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt)).slice(0, 6).map((item) => `<div class="mini-activity"><strong>${escapeHTML(item.title)}</strong><span>${escapeHTML(item.type)} · ${formatDateTime(item.publishedAt)} · ${escapeHTML(item.status)}</span></div>`).join("") || `<div class="empty-state"><span>연결된 동향이 없습니다.</span></div>`}</div>`;
  }

  function openPersonForm(person) {
    const form = $("#personForm");
    form.reset();
    $("#personDialogTitle").textContent = person ? "인물 정보 수정" : "인물 등록";
    const values = person || { active: true };
    [...form.elements].forEach((element) => {
      if (!element.name) return;
      let value = values[element.name] ?? "";
      if (element.name === "aliases" && Array.isArray(value)) value = value.join(", ");
      if (element.name === "active") value = String(values.active !== false);
      element.value = value;
    });
    form.elements.regionId.value = person?.regionIds?.[0] || (selectedRegionId() === "DAEGU-ALL" ? "DAEGU-METRO" : selectedRegionId());
    $("#personDialog").showModal();
  }

  function savePerson(form) {
    const values = Object.fromEntries(new FormData(form).entries());
    const existing = values.id ? findPerson(values.id) : null;
    const person = {
      ...(existing || {}), ...values,
      id: values.id || makeId("PER-CUSTOM"),
      aliases: values.aliases.split(",").map((value) => value.trim()).filter(Boolean),
      active: values.active === "true",
      regionIds: existing && existing.recordKind !== "user" ? existing.regionIds : [values.regionId],
      recordKind: existing?.recordKind || "user",
      verificationStatus: existing?.verificationStatus || "담당자등록",
      lastVerified: new Date().toISOString().slice(0, 10)
    };
    delete person.regionId;
    if (existing && DATA.people.some((base) => base.id === person.id)) state.peopleOverrides[person.id] = person;
    else if (existing) state.peopleAdded = state.peopleAdded.map((entry) => entry.id === person.id ? person : entry);
    else state.peopleAdded.push(person);
    activePersonId = person.id;
    persistState();
    $("#personDialog").close();
    toast(existing ? "인물 정보를 수정했습니다." : "인물을 등록했습니다.");
    renderPeople();
  }

  function togglePerson(id) {
    const person = findPerson(id);
    if (!person) return;
    const next = { ...person, active: !person.active };
    if (DATA.people.some((base) => base.id === id)) state.peopleOverrides[id] = next;
    else state.peopleAdded = state.peopleAdded.map((entry) => entry.id === id ? next : entry);
    persistState();
    toast(next.active ? "관리 대상을 활성화했습니다." : "관리 대상을 비활성화했습니다.");
    renderPeople();
  }

  function toggleFocusPerson(id) {
    if (isFocusedPerson(id)) state.focusPersonIds = state.focusPersonIds.filter((personId) => personId !== id);
    else state.focusPersonIds.push(id);
    persistState();
    toast(isFocusedPerson(id) ? "중점관리 대상으로 표시했습니다." : "중점관리 표시를 해제했습니다.");
    renderPeople();
  }

  function populateMeetingFilters() {
    const meetings = getScopedItems().filter((item) => item.meeting).map((item) => item.meeting);
    const councils = [...new Set(meetings.map((meeting) => meeting.council))];
    const speakers = [...new Set(meetings.map((meeting) => meeting.speaker))];
    const councilSelect = $("#meetingCouncilFilter");
    const speakerSelect = $("#meetingSpeakerFilter");
    const previousCouncil = councilSelect.value;
    const previousSpeaker = speakerSelect.value;
    councilSelect.innerHTML = '<option value="">전체 의회</option>';
    speakerSelect.innerHTML = '<option value="">전체 발언자</option>';
    councils.forEach((value) => councilSelect.add(new Option(value, value)));
    speakers.forEach((value) => speakerSelect.add(new Option(value, value)));
    if (councils.includes(previousCouncil)) councilSelect.value = previousCouncil;
    if (speakers.includes(previousSpeaker)) speakerSelect.value = previousSpeaker;
  }

  function renderMeetings() {
    populateMeetingFilters();
    const council = $("#meetingCouncilFilter").value;
    const speaker = $("#meetingSpeakerFilter").value;
    const query = $("#meetingSearch").value.trim().toLowerCase();
    const items = getScopedItems().filter((item) => item.meeting)
      .filter((item) => !council || item.meeting.council === council)
      .filter((item) => !speaker || item.meeting.speaker === speaker)
      .filter((item) => !query || [item.title, item.meeting.agenda, item.meeting.originalText, item.meeting.summary].join(" ").toLowerCase().includes(query));
    $("#meetingList").innerHTML = items.map((item) => `
      <article class="meeting-card">
        <header class="meeting-card-head"><div><span class="type-badge">${escapeHTML(item.type)}</span>${itemDataBadge(item)}<h3>${escapeHTML(item.title)}</h3><p>${escapeHTML(item.meeting.council)} · ${escapeHTML(item.meeting.session)} · ${escapeHTML(item.meeting.meetingName)} · ${escapeHTML(item.meeting.meetingDate)}</p></div><span class="mini-badge ${item.meeting.verified ? "status-verified" : "status-unverified"}">${item.meeting.verified ? "원문 위치 확인" : "원문 확인 필요"}</span></header>
        <div class="meeting-compare">
          <section class="meeting-column"><h4>발언 원문 · ${escapeHTML(item.meeting.location)}</h4>${item.meeting.verified && item.meeting.originalText ? `<blockquote>${escapeHTML(item.meeting.originalText)}</blockquote>` : `<p>발언 원문이 확인되지 않아 구체적인 내용을 표시하지 않습니다.</p>`}</section>
          <section class="meeting-column"><h4>주요부분 요약</h4><p>${escapeHTML(item.meeting.summary)}</p></section>
        </div>
        <footer class="meeting-foot"><span>발언자: ${escapeHTML(item.meeting.speaker)} · 후속: ${escapeHTML(item.meeting.followUp || "-")}</span><button class="button button-primary button-small" type="button" data-item-action="report" data-item-id="${item.id}">보고서 반영</button></footer>
      </article>`).join("") || `<div class="empty-state"><strong>조건에 맞는 회의록이 없습니다.</strong></div>`;
  }

  function scheduleGroup(item) {
    if (!item.eventAt) return "날짜 미확정";
    const event = new Date(item.eventAt);
    const ref = referenceDate();
    const eventDay = new Date(event.getFullYear(), event.getMonth(), event.getDate());
    const refDay = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
    const diff = Math.round((eventDay - refDay) / 86400000);
    if (diff === 0) return "오늘";
    if (diff > 0 && diff <= 6) return "이번 주";
    if (diff > 6 && diff <= 13) return "다음 주";
    return "날짜 미확정";
  }

  function renderSchedule() {
    const items = getScopedItems().filter((item) => item.futureSchedule || ["개최예정", "변경", "취소", "날짜 미확정"].includes(item.scheduleStatus));
    const statuses = ["개최예정", "변경", "취소", "날짜 미확정"];
    $("#scheduleSummary").innerHTML = statuses.map((status) => `<div class="schedule-stat"><span>${status}</span><strong>${items.filter((item) => item.scheduleStatus === status).length}</strong></div>`).join("");
    const groups = ["오늘", "이번 주", "다음 주", "날짜 미확정"];
    $("#scheduleGroups").innerHTML = groups.map((group) => {
      const groupItems = items.filter((item) => scheduleGroup(item) === group).sort((a, b) => (a.eventAt || "z").localeCompare(b.eventAt || "z"));
      return `<section class="schedule-column"><header class="schedule-column-head"><h3>${group}</h3><b>${groupItems.length}</b></header>${groupItems.map((item) => `
        <article class="schedule-card ${item.scheduleStatus === "취소" ? "is-cancelled" : item.scheduleStatus === "변경" ? "is-changed" : ""}">
          <time>${item.eventAt ? formatDateTime(item.eventAt) : "일시 확인 필요"}</time><strong>${escapeHTML(item.title)}</strong><span>${escapeHTML(item.eventPlace || "장소 미정")}</span><span>${escapeHTML(personNames(item.personIds))} · ${escapeHTML(item.scheduleStatus)}</span><button class="text-button" type="button" data-open-item="${item.id}">근거 보기</button>
        </article>`).join("") || `<div class="empty-state"><span>등록 일정 없음</span></div>`}</section>`;
    }).join("");
  }

  function reportSentence(item) {
    return state.reportEdits[item.id] || `[${item.type}] ${personNames(item.personIds)} 관련, ${item.summary}`;
  }

  function renderReport() {
    const selected = state.selectedItemIds.map(findItem).filter(Boolean).filter(matchesRegion).filter((item) => item.status !== "제외");
    $("#reportSourceCount").textContent = `${selected.length}건`;
    $("#reportSourceList").innerHTML = selected.map((item) => `<div class="report-source-item"><strong>${escapeHTML(item.title)}</strong><span>${escapeHTML(item.type)} · ${escapeHTML(item.status)}</span><button type="button" data-remove-report="${item.id}">반영 취소</button></div>`).join("") || `<div class="empty-state"><strong>반영 자료가 없습니다.</strong><span>수집함에서 자료를 선택해 주세요.</span></div>`;
    $("#reportReferenceTime").textContent = formatDateTime(SETTINGS.referenceTime);
    $("#reportScopeName").textContent = selectedRegion().name;
    const actualCount = selected.filter((item) => item.sample === false).length;
    $("#reportDataLabel").textContent = actualCount ? `내부 검토용 · 실제 API ${actualCount}건 포함` : "내부 검토용 · 예시자료";
    $("#reportSections").innerHTML = SETTINGS.reportSections.map((section) => {
      if (section.key === "failures") {
        const failures = getScopedSources().filter((source) => source.active && source.status === "fail");
        return `<section class="report-section"><h4>${section.title}</h4>${failures.length ? `<ol>${failures.map((source) => `<li>${escapeHTML(source.name)}: ${escapeHTML(source.error || "수집 실패")}<span>마지막 성공: ${source.lastSuccess ? formatDateTime(source.lastSuccess) : "기록 없음"}</span></li>`).join("")}</ol>` : `<div class="report-empty">확인된 수집 실패 출처가 없습니다.</div>`}</section>`;
      }
      const sectionItems = selected.filter((item) => item.reportSection === section.key);
      return `<section class="report-section"><h4>${section.title}</h4>${sectionItems.length ? `<ol>${sectionItems.map((item) => `<li><div class="editable-report-line" contenteditable="true" role="textbox" aria-label="${escapeHTML(item.title)} 보고문 수정" data-report-edit="${item.id}">${escapeHTML(reportSentence(item))}</div><span>출처: ${escapeHTML(item.sourceName)} · 게시 ${formatDateTime(item.publishedAt)} · 원문 ${escapeHTML(item.url)}</span></li>`).join("")}</ol>` : `<div class="report-empty">선택된 자료가 없습니다.</div>`}</section>`;
    }).join("");
    $("#reportGeneralNote").value = state.reportNote;
  }

  function removeReportItem(id) {
    state.selectedItemIds = state.selectedItemIds.filter((itemId) => itemId !== id);
    updateItem(id, { status: "원문확인" });
    persistState();
    renderReport();
    renderNavCounts();
    toast("보고서 반영을 취소했습니다.");
  }

  function reportText() {
    const clone = $("#reportDocument").cloneNode(true);
    clone.querySelectorAll("textarea").forEach((node) => {
      const text = document.createElement("div");
      text.textContent = node.value || "-";
      node.replaceWith(text);
    });
    return clone.innerText.replace(/\n{3,}/g, "\n\n").trim();
  }

  function copyReport() {
    const text = reportText();
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(() => toast("보고서를 복사했습니다.")).catch(() => fallbackCopy(text));
    } else fallbackCopy(text);
  }

  function fallbackCopy(text) {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
    toast("보고서를 복사했습니다.");
  }

  function saveReportHTML() {
    const title = `일일_정치동향_${referenceDay().replaceAll("-", "")}`;
    const report = $("#reportDocument").cloneNode(true);
    report.querySelectorAll("[contenteditable]").forEach((node) => node.removeAttribute("contenteditable"));
    report.querySelectorAll("textarea").forEach((node) => {
      const text = document.createElement("p");
      text.textContent = node.value || "-";
      node.replaceWith(text);
    });
    const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>${title}</title><style>body{font-family:'Malgun Gothic',sans-serif;max-width:900px;margin:40px auto;line-height:1.65;color:#182535}h3{text-align:center;font-size:26px;border-bottom:3px double #173657;padding-bottom:15px}h4{background:#173657;color:white;padding:8px 10px}li{margin:10px 0}li span{display:block;color:#667;font-size:12px}.report-disclaimer{margin-top:30px;border-top:1px solid #ccc;padding-top:10px;font-size:12px;color:#667}textarea{width:100%;border:0;white-space:pre-wrap}</style></head><body>${report.innerHTML}</body></html>`;
    downloadBlob(`${title}.html`, html, "text/html;charset=utf-8");
    toast("보고서 HTML을 저장했습니다.");
  }

  function assemblyState() {
    return state.connectorState.assembly;
  }

  function assemblyModeLabel(value) {
    return value === "issued-key" ? "정식 발급키" : value === "sample" ? "샘플 키 · 응답 제한" : "-";
  }

  function updateAssemblySource(patch) {
    const source = findSource(ASSEMBLY_SOURCE_ID);
    if (!source) return;
    state.sourcesOverrides[ASSEMBLY_SOURCE_ID] = { ...source, ...patch };
  }

  function renderAssemblyConnector() {
    const connector = assemblyState();
    const stateNode = $("#assemblyConnectorStatus");
    const label = connector.status === "success"
      ? (connector.partial ? "부분 성공" : "연결됨")
      : connector.status === "fail" ? "연결 실패"
        : connector.status === "busy" ? "처리 중" : "확인 전";
    stateNode.textContent = label;
    stateNode.className = `connector-state is-${connector.status || "unknown"}`;
    $("#assemblyApiMode").textContent = assemblyModeLabel(connector.apiMode);
    $("#assemblyLastChecked").textContent = formatDateTime(connector.lastCheckedAt);
    $("#assemblyLastSync").textContent = formatDateTime(connector.lastSyncAt);
    $("#assemblySyncResult").textContent = connector.lastSyncAt ? `${connector.lastItemCount}건 · ${connector.partial ? "일부 의원 실패" : "완료"}` : "아직 동기화하지 않음";
    const message = $("#assemblyConnectorMessage");
    message.textContent = connector.lastMessage || "먼저 collector 폴더의 샘플 또는 정식키 실행 파일을 열어 로컬 수집 서비스를 실행하세요.";
    message.classList.toggle("is-error", connector.status === "fail");
    const busy = connector.status === "busy";
    $("#checkAssemblyConnectionButton").disabled = busy;
    $("#syncAssemblyButton").disabled = busy;
  }

  async function collectorRequest(path) {
    const response = await fetch(`${SETTINGS.collectorBaseUrl}${path}`, { method: "GET", headers: { Accept: "application/json" } });
    let payload = {};
    try { payload = await response.json(); } catch (error) { payload = {}; }
    if (!response.ok) {
      const failure = new Error(payload.error || `로컬 수집 서비스 오류(HTTP ${response.status})`);
      failure.payload = payload;
      throw failure;
    }
    return payload;
  }

  function setAssemblyBusy(message) {
    state.connectorState.assembly = { ...assemblyState(), status: "busy", lastMessage: message };
    persistState();
    renderAssemblyConnector();
  }

  async function checkAssemblyConnection() {
    setAssemblyBusy("로컬 수집 서비스 상태를 확인하고 있습니다.");
    const checkedAt = new Date().toISOString();
    try {
      const payload = await collectorRequest("/health");
      state.connectorState.assembly = {
        ...assemblyState(), status: "success", apiMode: payload.apiMode || "", lastCheckedAt: checkedAt,
        lastMessage: `로컬 수집 서비스 v${payload.version || "-"} 연결됨 · 대구 국회의원 ${payload.members || 12}명 대상`
      };
      persistState();
      toast("국회 법안 수집 서비스에 연결했습니다.");
    } catch (error) {
      state.connectorState.assembly = {
        ...assemblyState(), status: "fail", lastCheckedAt: checkedAt,
        lastMessage: "연결할 수 없습니다. collector 폴더의 실행 파일을 먼저 열고 이 창을 유지하세요."
      };
      updateAssemblySource({ status: "fail", lastFailure: checkedAt, error: "로컬 수집 서비스 미실행 또는 연결 실패" });
      persistState();
      toast("국회 수집 서비스가 실행 중인지 확인해 주세요.");
    }
    renderSources();
  }

  async function syncAssemblyBills() {
    const source = findSource(ASSEMBLY_SOURCE_ID);
    if (!source?.active) {
      toast("출처 목록에서 열린국회정보를 먼저 활성화해 주세요.");
      return;
    }
    const days = Number.parseInt($("#assemblyDays").value || "30", 10);
    setAssemblyBusy(`열린국회정보에서 최근 ${days}일 법안을 수집하고 있습니다.`);
    const checkedAt = new Date().toISOString();
    try {
      const payload = await collectorRequest(`/api/assembly/sync?days=${encodeURIComponent(days)}`);
      const incoming = Array.isArray(payload.items) ? payload.items : [];
      const existingIds = new Set(state.liveItems.map((item) => item.id));
      const merged = new Map(state.liveItems.map((item) => [item.id, item]));
      incoming.forEach((item) => merged.set(item.id, { ...(merged.get(item.id) || {}), ...item, sample: false }));
      state.liveItems = [...merged.values()];
      const newCount = incoming.filter((item) => !existingIds.has(item.id)).length;
      const failedNames = (payload.failedMembers || []).map((failure) => failure.memberName).filter(Boolean);
      const partialText = failedNames.length ? ` · 실패 의원: ${failedNames.join(", ")}` : "";
      state.connectorState.assembly = {
        ...assemblyState(), status: "success", apiMode: payload.apiMode || "", lastCheckedAt: checkedAt,
        lastSyncAt: payload.fetchedAt || checkedAt, lastItemCount: incoming.length, partial: Boolean(payload.partial),
        failedMembers: payload.failedMembers || [],
        lastMessage: `${payload.notice || "동기화를 완료했습니다."} · 신규 ${newCount}건, 갱신 ${incoming.length - newCount}건${partialText}`
      };
      updateAssemblySource({
        status: "success", lastSuccess: payload.fetchedAt || checkedAt, error: payload.partial ? `일부 의원 수집 실패: ${failedNames.join(", ")}` : ""
      });
      persistState();
      toast(`국회 법안 ${incoming.length}건을 동기화했습니다.`);
      renderView(activeView);
    } catch (error) {
      const failures = error.payload?.failedMembers || [];
      const failedNames = failures.map((failure) => failure.memberName).filter(Boolean);
      state.connectorState.assembly = {
        ...assemblyState(), status: "fail", apiMode: error.payload?.apiMode || assemblyState().apiMode,
        lastCheckedAt: checkedAt, partial: false, failedMembers: failures,
        lastMessage: `${error.message || "국회 API 수집 실패"}${failedNames.length ? ` · ${failedNames.join(", ")}` : ""}`
      };
      updateAssemblySource({ status: "fail", lastFailure: checkedAt, error: error.message || "국회 API 수집 실패" });
      persistState();
      toast("국회 법안 동기화에 실패했습니다. 오류 내용을 확인해 주세요.");
      renderSources();
    }
  }

  function renderSources() {
    renderAssemblyConnector();
    $("#collectionRules").innerHTML = SETTINGS.collectionRules.map((rule, index) => `<div class="rule-card"><strong>원칙 ${index + 1}</strong>${escapeHTML(rule)}</div>`).join("");
    $("#sourceTableBody").innerHTML = getScopedSources().map((source) => {
      const label = sourceStatusLabel(source);
      const statusClassName = label === "정상" ? "is-success" : label === "실패" ? "is-fail" : "is-paused";
      const last = source.status === "fail" ? `${formatDateTime(source.lastFailure)}<br><small>${escapeHTML(source.error)}</small>` : source.lastSuccess ? formatDateTime(source.lastSuccess) : (source.recordKind === "official_registry" ? "수집기 미연결" : "기록 없음");
      const verificationClass = source.verificationStatus === "공식주소확인" ? "status-verified" : "status-unverified";
      return `<tr><td><span class="source-status ${statusClassName}">${label}</span></td><td><strong><a href="${escapeHTML(source.url)}" target="_blank" rel="noopener noreferrer">${escapeHTML(source.name)}</a></strong><br><small>${escapeHTML(source.id)}</small></td><td><span class="mini-badge ${verificationClass}">${escapeHTML(source.verificationStatus || "담당자확인")}</span></td><td>${escapeHTML(source.type)}</td><td>${escapeHTML(source.method)}</td><td>${escapeHTML(source.frequency)}</td><td>${last}</td><td><div class="table-actions"><button type="button" data-edit-source="${source.id}">수정</button><button type="button" data-toggle-source="${source.id}">${source.active ? "중지" : "활성"}</button></div></td></tr>`;
    }).join("") || '<tr><td colspan="8">현재 관할에 등록된 출처가 없습니다.</td></tr>';
  }

  function openSourceForm(source) {
    const form = $("#sourceForm");
    form.reset();
    $("#sourceDialogTitle").textContent = source ? "출처 정보 수정" : "출처 등록";
    const values = source || { active: true };
    [...form.elements].forEach((element) => {
      if (!element.name) return;
      let value = values[element.name] ?? "";
      if (element.name === "active") value = String(values.active !== false);
      element.value = value;
    });
    form.elements.regionId.value = source?.regionIds?.[0] || (selectedRegionId() === "DAEGU-ALL" ? "DAEGU-METRO" : selectedRegionId());
    $("#sourceDialog").showModal();
  }

  function saveSource(form) {
    const values = Object.fromEntries(new FormData(form).entries());
    const existing = values.id ? findSource(values.id) : null;
    const source = {
      ...(existing || {}), ...values,
      id: values.id || makeId("SRC-CUSTOM"), active: values.active === "true",
      regionIds: existing && existing.recordKind !== "user" ? existing.regionIds : [values.regionId],
      recordKind: existing?.recordKind || "user",
      verificationStatus: existing?.verificationStatus || "담당자등록",
      status: existing?.status || "paused", lastSuccess: existing?.lastSuccess || "", lastFailure: existing?.lastFailure || "", error: existing?.error || ""
    };
    delete source.regionId;
    if (existing && DATA.sources.some((base) => base.id === source.id)) state.sourcesOverrides[source.id] = source;
    else if (existing) state.sourcesAdded = state.sourcesAdded.map((entry) => entry.id === source.id ? source : entry);
    else state.sourcesAdded.push(source);
    persistState();
    $("#sourceDialog").close();
    toast(existing ? "출처 정보를 수정했습니다." : "출처를 등록했습니다.");
    renderSources();
  }

  function toggleSource(id) {
    const source = findSource(id);
    if (!source) return;
    const next = { ...source, active: !source.active, status: source.active ? "paused" : (source.lastSuccess ? "success" : "paused") };
    if (DATA.sources.some((base) => base.id === id)) state.sourcesOverrides[id] = next;
    else state.sourcesAdded = state.sourcesAdded.map((entry) => entry.id === id ? next : entry);
    persistState();
    toast(next.active ? "출처를 활성화했습니다." : "출처 수집을 중지했습니다.");
    renderSources();
  }

  function makeId(prefix) {
    const stamp = new Date().toISOString().replace(/\D/g, "").slice(0, 14);
    const random = Math.random().toString(36).slice(2, 7).toUpperCase();
    return `${prefix}-${stamp}-${random}`;
  }

  function downloadBlob(filename, content, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function exportData() {
    const payload = { appId: SETTINGS.appId, version: SETTINGS.version, exportedAt: new Date().toISOString(), state };
    downloadBlob(`선이음-동향_사용자자료_${new Date().toISOString().slice(0, 10).replaceAll("-", "")}.json`, JSON.stringify(payload, null, 2), "application/json;charset=utf-8");
    toast("사용자 자료를 백업했습니다.");
  }

  async function importData(file) {
    try {
      const payload = JSON.parse(await file.text());
      const supportedAppIds = [SETTINGS.appId, "SUNEUM-TRENDS-V02", "SUNEUM-TRENDS-V01"];
      if (!supportedAppIds.includes(payload.appId) || !payload.state) throw new Error("invalid");
      if (!window.confirm("현재 브라우저에 저장된 검토상태와 등록정보를 백업파일 내용으로 바꾸시겠습니까?")) return;
      const importedState = structuredClone(payload.state);
      importedState.peopleAdded = (importedState.peopleAdded || []).map((person) => ({ regionIds: ["DAEGU-METRO"], recordKind: "user", verificationStatus: "담당자등록", ...person }));
      importedState.sourcesAdded = (importedState.sourcesAdded || []).map((source) => ({ regionIds: ["DAEGU-METRO"], recordKind: "user", verificationStatus: "담당자등록", ...source }));
      state = {
        ...structuredClone(defaultState),
        ...importedState,
        schemaVersion: 3,
        liveItems: Array.isArray(importedState.liveItems) ? importedState.liveItems : [],
        connectorState: {
          assembly: { ...defaultState.connectorState.assembly, ...(importedState.connectorState?.assembly || {}) }
        },
        focusPersonIds: Array.isArray(importedState.focusPersonIds) ? importedState.focusPersonIds : initialFocusPersonIds,
        preferences: { ...defaultState.preferences, ...(importedState.preferences || {}) }
      };
      persistState();
      activePersonId = "";
      toast(payload.appId === SETTINGS.appId ? "백업자료를 복원했습니다." : "이전 버전 백업자료를 v0.3 형식으로 복원했습니다.");
      renderView(activeView);
    } catch (error) {
      toast("선이음-동향에서 만든 올바른 백업파일이 아닙니다.");
    } finally {
      $("#importDataInput").value = "";
    }
  }

  function bindEvents() {
    $("#primaryNav").addEventListener("click", (event) => {
      const button = event.target.closest("[data-view]");
      if (button) navigate(button.dataset.view);
    });
    document.addEventListener("click", (event) => {
      const goView = event.target.closest("[data-go-view]");
      if (goView) navigate(goView.dataset.goView);
      const openItem = event.target.closest("[data-open-item]");
      if (openItem) openItemDialog(openItem.dataset.openItem);
      const close = event.target.closest("[data-close-dialog]");
      if (close) $("#" + close.dataset.closeDialog).close();
      const itemAction = event.target.closest("[data-item-action]");
      if (itemAction) {
        applyItemAction(new Set([itemAction.dataset.itemId]), itemAction.dataset.itemAction);
        if ($("#itemDialog").open) $("#itemDialog").close();
      }
      const personButton = event.target.closest("[data-person-id]");
      if (personButton) { activePersonId = personButton.dataset.personId; renderPeople(); }
      const editPerson = event.target.closest("[data-edit-person]");
      if (editPerson) openPersonForm(findPerson(editPerson.dataset.editPerson));
      const togglePersonButton = event.target.closest("[data-toggle-person]");
      if (togglePersonButton) togglePerson(togglePersonButton.dataset.togglePerson);
      const focusPersonButton = event.target.closest("[data-focus-person]");
      if (focusPersonButton) toggleFocusPerson(focusPersonButton.dataset.focusPerson);
      const editSource = event.target.closest("[data-edit-source]");
      if (editSource) openSourceForm(findSource(editSource.dataset.editSource));
      const toggleSourceButton = event.target.closest("[data-toggle-source]");
      if (toggleSourceButton) toggleSource(toggleSourceButton.dataset.toggleSource);
      const removeReport = event.target.closest("[data-remove-report]");
      if (removeReport) removeReportItem(removeReport.dataset.removeReport);
    });

    $("#inboxItems").addEventListener("change", (event) => {
      const checkbox = event.target.closest("[data-select-item]");
      if (!checkbox) return;
      if (checkbox.checked) uiSelected.add(checkbox.dataset.selectItem); else uiSelected.delete(checkbox.dataset.selectItem);
      renderInbox();
    });
    $$("#inboxSearch, #filterType, #filterPerson, #filterImportance, #filterStatus").forEach((control) => control.addEventListener(control.tagName === "INPUT" ? "input" : "change", renderInbox));
    $("#clearFiltersButton").addEventListener("click", () => {
      $("#inboxSearch").value = ""; $("#filterType").value = ""; $("#filterPerson").value = ""; $("#filterImportance").value = ""; $("#filterStatus").value = ""; renderInbox();
    });
    $$("[data-view-mode]").forEach((button) => button.addEventListener("click", () => { state.preferences.inboxMode = button.dataset.viewMode; persistState(); renderInbox(); }));
    $("#bulkBar").addEventListener("click", (event) => {
      const action = event.target.closest("[data-bulk-action]")?.dataset.bulkAction;
      if (!action) return;
      if (action === "clear") { uiSelected.clear(); renderInbox(); } else applyItemAction(uiSelected, action);
    });

    $("#peopleSearch").addEventListener("input", renderPeople);
    $("#focusPeopleOnly").addEventListener("change", renderPeople);
    $("#peopleRecordKind").addEventListener("change", renderPeople);
    $("#addPersonButton").addEventListener("click", () => openPersonForm(null));
    $("#personForm").addEventListener("submit", (event) => { event.preventDefault(); savePerson(event.currentTarget); });
    $$("#meetingCouncilFilter, #meetingSpeakerFilter").forEach((control) => control.addEventListener("change", renderMeetings));
    $("#meetingSearch").addEventListener("input", renderMeetings);
    $("#addSourceButton").addEventListener("click", () => openSourceForm(null));
    $("#sourceForm").addEventListener("submit", (event) => { event.preventDefault(); saveSource(event.currentTarget); });
    $("#checkAssemblyConnectionButton").addEventListener("click", checkAssemblyConnection);
    $("#syncAssemblyButton").addEventListener("click", syncAssemblyBills);

    $("#reportSections").addEventListener("input", (event) => {
      const editable = event.target.closest("[data-report-edit]");
      if (!editable) return;
      state.reportEdits[editable.dataset.reportEdit] = editable.textContent.trim();
      persistState();
    });
    $("#reportGeneralNote").addEventListener("input", (event) => { state.reportNote = event.target.value; persistState(); });
    $("#copyReportButton").addEventListener("click", copyReport);
    $("#saveReportButton").addEventListener("click", saveReportHTML);
    $("#printReportButton").addEventListener("click", () => window.print());
    $("#exportDataButton").addEventListener("click", exportData);
    $("#importDataInput").addEventListener("change", (event) => { if (event.target.files[0]) importData(event.target.files[0]); });
    $("#globalRegionFilter").addEventListener("change", (event) => {
      state.preferences.selectedRegionId = event.target.value;
      activePersonId = "";
      uiSelected.clear();
      persistState();
      renderView(activeView);
      toast(`${selectedRegion().name} 기준으로 전환했습니다.`);
    });
    $("#mobileMenuButton").addEventListener("click", () => document.body.classList.toggle("menu-open"));
    document.addEventListener("keydown", (event) => { if (event.key === "Escape") document.body.classList.remove("menu-open"); });
  }

  function init() {
    $("#referenceTime").textContent = formatDateTime(SETTINGS.referenceTime);
    const regionFilter = $("#globalRegionFilter");
    DATA.regions.forEach((region) => regionFilter.add(new Option(region.name, region.id)));
    $$('#personForm select[name="regionId"], #sourceForm select[name="regionId"]').forEach((select) => {
      DATA.regions.filter((region) => region.id !== "DAEGU-ALL").forEach((region) => select.add(new Option(region.name, region.id)));
    });
    regionFilter.value = selectedRegionId();
    activePersonId = getScopedPeople().find((person) => person.active)?.id || getScopedPeople()[0]?.id || "";
    bindEvents();
    renderView("dashboard");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
