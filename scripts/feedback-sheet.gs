/**
 * 구글 시트에 붙여 넣는 Apps Script.
 * 1) 새 스프레드시트 → 확장 프로그램 → Apps Script
 * 2) 이 파일을 붙여 넣고 저장
 * 3) 배포 → 새 배포 → 유형: 웹 앱
 *    실행 계정: 나, 액세스: 모든 사용자
 * 4) 나온 URL을 Vercel FEEDBACK_SHEETS_WEBHOOK_URL 에 넣는다
 */
function doPost(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("feedback") || ss.insertSheet("feedback");
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(["시각", "평가", "질문", "의견", "답변", "검색ID", "id"]);
  }
  const data = JSON.parse(e.postData.contents);
  sheet.appendRow([
    data.createdAt || new Date().toISOString(),
    data.rating === "up" ? "도움됨" : "도움되지 않음",
    data.query || "",
    data.comment || "",
    data.answer || "",
    data.searchLogId || "",
    data.id || "",
  ]);
  return ContentService.createTextOutput(JSON.stringify({ ok: true })).setMimeType(
    ContentService.MimeType.JSON,
  );
}

function doGet() {
  return ContentService.createTextOutput("feedback sheet ok");
}
