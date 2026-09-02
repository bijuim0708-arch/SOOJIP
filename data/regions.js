window.SUNEUM_DATA = window.SUNEUM_DATA || {};
window.SUNEUM_DATA.regions = [
  { id: "DAEGU-ALL", name: "대구 전체", shortName: "대구 전체", level: "scope", parentId: "", active: true },
  { id: "DAEGU-METRO", name: "대구광역시", shortName: "대구시", level: "metropolitan", parentId: "DAEGU-ALL", active: true },
  { id: "DAEGU-JUNG", name: "대구광역시 중구", shortName: "중구", level: "district", parentId: "DAEGU-METRO", active: true },
  { id: "DAEGU-DONG", name: "대구광역시 동구", shortName: "동구", level: "district", parentId: "DAEGU-METRO", active: true },
  { id: "DAEGU-SEO", name: "대구광역시 서구", shortName: "서구", level: "district", parentId: "DAEGU-METRO", active: true },
  { id: "DAEGU-NAM", name: "대구광역시 남구", shortName: "남구", level: "district", parentId: "DAEGU-METRO", active: true },
  { id: "DAEGU-BUK", name: "대구광역시 북구", shortName: "북구", level: "district", parentId: "DAEGU-METRO", active: true },
  { id: "DAEGU-SUSEONG", name: "대구광역시 수성구", shortName: "수성구", level: "district", parentId: "DAEGU-METRO", active: true },
  { id: "DAEGU-DALSEO", name: "대구광역시 달서구", shortName: "달서구", level: "district", parentId: "DAEGU-METRO", active: true },
  { id: "DAEGU-DALSEONG", name: "대구광역시 달성군", shortName: "달성군", level: "district", parentId: "DAEGU-METRO", active: true },
  { id: "DAEGU-GUNWI", name: "대구광역시 군위군", shortName: "군위군", level: "district", parentId: "DAEGU-METRO", active: true }
];

window.SUNEUM_DATA.constituencies = [
  { id: "CON-DAEGU-JUNG-NAM", name: "중구·남구", regionIds: ["DAEGU-JUNG", "DAEGU-NAM"] },
  { id: "CON-DAEGU-DONG-GUNWI-A", name: "동구·군위군 갑", regionIds: ["DAEGU-DONG", "DAEGU-GUNWI"] },
  { id: "CON-DAEGU-DONG-GUNWI-B", name: "동구·군위군 을", regionIds: ["DAEGU-DONG", "DAEGU-GUNWI"] },
  { id: "CON-DAEGU-SEO", name: "서구", regionIds: ["DAEGU-SEO"] },
  { id: "CON-DAEGU-BUK-A", name: "북구 갑", regionIds: ["DAEGU-BUK"] },
  { id: "CON-DAEGU-BUK-B", name: "북구 을", regionIds: ["DAEGU-BUK"] },
  { id: "CON-DAEGU-SUSEONG-A", name: "수성구 갑", regionIds: ["DAEGU-SUSEONG"] },
  { id: "CON-DAEGU-SUSEONG-B", name: "수성구 을", regionIds: ["DAEGU-SUSEONG"] },
  { id: "CON-DAEGU-DALSEO-A", name: "달서구 갑", regionIds: ["DAEGU-DALSEO"] },
  { id: "CON-DAEGU-DALSEO-B", name: "달서구 을", regionIds: ["DAEGU-DALSEO"] },
  { id: "CON-DAEGU-DALSEO-C", name: "달서구 병", regionIds: ["DAEGU-DALSEO"] },
  { id: "CON-DAEGU-DALSEONG", name: "달성군", regionIds: ["DAEGU-DALSEONG"] }
];
