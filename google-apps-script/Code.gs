const CFG_SHEET = '活動設定';
const DATA_SHEET = '報到紀錄';
const ATTENDANCE_RESET_AT_PROPERTY = 'ATTENDANCE_RESET_AT';
const RESET_PASSWORD_SHA256 = '5723959ba4cced33029abb64cb213b70404d63b2f9e741be83d0be5385cb1c2c';
const EXPECTED_COUNTS = Object.freeze({
  '緊急救護組': 16,
  '安全防護組': 27,
  '避難引導組': 71,
  '通報組': 15,
  '搶救組': 68
});

function onOpen() {
  SpreadsheetApp.getUi().createMenu('報到系統')
    .addItem('初始化工作表', 'initializeCheckinSystem')
    .addItem('套用時間並建立觸發器', 'setupScheduleTriggers')
    .addItem('安裝報到紀錄觸發器', 'installFormSubmitTrigger')
    .addSeparator()
    .addItem('立即開放報到', 'openCheckinNow')
    .addItem('立即停止報到', 'closeCheckinNow')
    .addItem('更新 QR Code', 'refreshQRCode')
    .addToUi();
}

function initializeCheckinSystem() {
  const ss = SpreadsheetApp.getActive();
  PropertiesService.getScriptProperties().setProperty('SPREADSHEET_ID', ss.getId());
  let cfg = ss.getSheetByName(CFG_SHEET) || ss.insertSheet(CFG_SHEET, 0);
  let data = ss.getSheetByName(DATA_SHEET) || ss.insertSheet(DATA_SHEET);

  cfg.clear();
  cfg.getRange('A1:D1').merge().setValue('無紙化報到｜活動設定').setFontSize(16).setFontWeight('bold').setFontColor('#5B3FA6');
  cfg.getRange('A3:B10').setValues([
    ['設定項目', '請在黃色欄位輸入'],
    ['活動名稱', '914緊急救護組'],
    ['報到日期', new Date(2026, 8, 14)],
    ['開始時間', new Date(1899, 11, 30, 7, 30)],
    ['截止時間', new Date(1899, 11, 30, 9, 10)],
    ['Google 表單 ID', ''],
    ['表單公開網址', ''],
    ['目前狀態', '尚未設定']
  ]);
  cfg.getRange('A3:B3').setBackground('#8B7CFF').setFontColor('#FFFFFF').setFontWeight('bold');
  cfg.getRange('B4:B9').setBackground('#FFF3A8');
  cfg.getRange('B5').setNumberFormat('yyyy/mm/dd');
  cfg.getRange('B6:B7').setNumberFormat('hh:mm');
  cfg.setColumnWidth(1, 150); cfg.setColumnWidth(2, 360);
  cfg.setFrozenRows(3); cfg.setHiddenGridlines(true);
  cfg.getRange('D3').setValue('QR Code').setFontWeight('bold').setFontColor('#5B3FA6');

  data = ensureDataSheet_(ss);
  data.getRange('A1:G1').setBackground('#FF69A8').setFontColor('#FFFFFF').setFontWeight('bold');
  data.setFrozenRows(1); data.setHiddenGridlines(true);
  data.setColumnWidths(1, 1, 160); data.setColumnWidths(2, 3, 120); data.setColumnWidth(5, 220); data.setColumnWidth(6, 120); data.setColumnWidth(7, 180);
  refreshQRCode();
  SpreadsheetApp.getUi().alert('初始化完成。請填入表單 ID 與網址，再執行「套用時間並建立觸發器」。');
}

function getSpreadsheet_() {
  const id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  return id ? SpreadsheetApp.openById(id) : SpreadsheetApp.getActive();
}

function ensureDataSheet_(ss) {
  const data = ss.getSheetByName(DATA_SHEET) || ss.insertSheet(DATA_SHEET);
  if (data.getLastRow() === 0) {
    data.getRange('A1:G1').setValues([['時間戳記', '姓名', '身分', '編組', 'Email', '報到結果', '活動名稱']]);
  } else {
    const headers = data.getRange(1, 1, 1, Math.max(data.getLastColumn(), 6)).getDisplayValues()[0];
    if (!headers.includes('編組')) data.insertColumnAfter(3);
    data.getRange('A1:G1').setValues([['時間戳記', '姓名', '身分', '編組', 'Email', '報到結果', '活動名稱']]);
  }
  return data;
}

function getConfig_() {
  const sheet = getSpreadsheet_().getSheetByName(CFG_SHEET);
  if (!sheet) throw new Error('請先執行「初始化工作表」。');
  const v = sheet.getRange('B4:B9').getValues().flat();
  const [eventName, eventDate, startTime, endTime, formId, formUrl] = v;
  if (!(eventDate instanceof Date) || !(startTime instanceof Date) || !(endTime instanceof Date)) throw new Error('日期或時間格式不正確。');
  if (!formId) throw new Error('請填入 Google 表單 ID。');
  return { sheet, eventName, formDate: eventDate, startAt: combineDateTime_(eventDate, startTime), endAt: combineDateTime_(eventDate, endTime), formId: String(formId).trim(), formUrl: String(formUrl).trim() };
}

function combineDateTime_(date, time) { return new Date(date.getFullYear(), date.getMonth(), date.getDate(), time.getHours(), time.getMinutes(), 0); }

function setupScheduleTriggers() {
  const c = getConfig_();
  if (c.endAt <= c.startAt) throw new Error('截止時間必須晚於開始時間。');
  ScriptApp.getProjectTriggers().filter(t => ['scheduledOpenCheckin', 'scheduledCloseCheckin'].includes(t.getHandlerFunction())).forEach(t => ScriptApp.deleteTrigger(t));
  const now = new Date();
  if (c.startAt > now) ScriptApp.newTrigger('scheduledOpenCheckin').timeBased().at(c.startAt).create();
  if (c.endAt > now) ScriptApp.newTrigger('scheduledCloseCheckin').timeBased().at(c.endAt).create();
  const form = FormApp.openById(c.formId);
  form.setAcceptingResponses(now >= c.startAt && now <= c.endAt);
  form.setCustomClosedFormMessage(`本次報到尚未開放或已截止。報到時間：${Utilities.formatDate(c.startAt, 'Asia/Taipei', 'yyyy/MM/dd HH:mm')}－${Utilities.formatDate(c.endAt, 'Asia/Taipei', 'HH:mm')}`);
  c.sheet.getRange('B10').setValue(form.isAcceptingResponses() ? '報到中' : now < c.startAt ? '等待開放' : '已截止');
  refreshQRCode();
  SpreadsheetApp.getUi().alert('時間設定已套用。日後修改日期或時間後，再按一次本功能即可。');
}

function scheduledOpenCheckin() { setFormState_(true, '報到中'); }
function scheduledCloseCheckin() { setFormState_(false, '已截止'); }
function openCheckinNow() { setFormState_(true, '報到中'); }
function closeCheckinNow() { setFormState_(false, '已截止'); }

function setFormState_(accepting, label) {
  const c = getConfig_();
  FormApp.openById(c.formId).setAcceptingResponses(accepting);
  c.sheet.getRange('B10').setValue(label);
}

function refreshQRCode() {
  const sheet = getSpreadsheet_().getSheetByName(CFG_SHEET);
  if (!sheet) return;
  const url = String(sheet.getRange('B9').getValue()).trim();
  sheet.getRange('D4').clearContent();
  if (url) sheet.getRange('D4').setFormula(`=IMAGE("https://quickchart.io/qr?size=300&text="&ENCODEURL(B9))`);
  sheet.setColumnWidth(4, 240); sheet.setRowHeight(4, 220);
}

function onFormSubmit(e) {
  const ss = getSpreadsheet_();
  const cfg = ss.getSheetByName(CFG_SHEET);
  const values = e && e.namedValues ? e.namedValues : {};
  const pick = names => { for (const n of names) if (values[n] && values[n][0]) return String(values[n][0]).trim(); return ''; };
  const name = pick(['姓名']);
  const role = pick(['身分']);
  const team = pick(['編組']);
  const email = pick(['Email', '電子郵件地址', '電子郵件']).toLowerCase();
  if (!email) return;
  const normalizedData = ensureDataSheet_(ss);
  const eventName = cfg ? cfg.getRange('B4').getDisplayValue() : '';
  const emails = getActiveSuccessfulEmails_(normalizedData, eventName);
  const duplicate = emails.includes(email);
  normalizedData.appendRow([new Date(), name, role, team, email, duplicate ? '重複報到' : '報到成功', eventName]);
  const row = normalizedData.getLastRow();
  normalizedData.getRange(row, 1).setNumberFormat('yyyy/mm/dd hh:mm:ss');
  normalizedData.getRange(row, 6).setBackground(duplicate ? '#FFD9E7' : '#D9FAEC').setFontColor(duplicate ? '#C43168' : '#0A7B59').setFontWeight('bold');
}

function installFormSubmitTrigger() {
  ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === 'onFormSubmit').forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('onFormSubmit').forSpreadsheet(getSpreadsheet_()).onFormSubmit().create();
  SpreadsheetApp.getUi().alert('報到紀錄觸發器已安裝。');
}

function getPublicConfig_() {
  const sheet = getSpreadsheet_().getSheetByName(CFG_SHEET);
  if (!sheet) throw new Error('找不到活動設定工作表。');
  const v = sheet.getRange('B4:B7').getValues().flat();
  const eventDate = v[1], startTime = v[2], endTime = v[3];
  return {
    eventName: String(v[0] || '現場報到'),
    startAt: combineDateTime_(eventDate, startTime),
    endAt: combineDateTime_(eventDate, endTime)
  };
}

function getAttendanceCounts_() {
  const teams = Object.keys(EXPECTED_COUNTS);
  const counts = teams.reduce((result, team) => {
    result[team] = 0;
    return result;
  }, {});
  const eventName = getPublicConfig_().eventName;
  const data = ensureDataSheet_(getSpreadsheet_());
  const lastRow = data.getLastRow();
  const resetAt = getAttendanceResetAt_();
  if (lastRow > 1) {
    data.getRange(2, 1, lastRow - 1, 7).getValues().forEach(row => {
      const team = String(row[3] || '').trim();
      const result = String(row[5] || '').trim();
      const rowEventName = String(row[6] || '').trim();
      const timestamp = row[0] instanceof Date ? row[0] : new Date(row[0]);
      if (timestamp > resetAt && result === '報到成功' && rowEventName === eventName && Object.prototype.hasOwnProperty.call(counts, team)) {
        counts[team] += 1;
      }
    });
  }
  return {
    ok: true,
    eventName,
    counts,
    expected: EXPECTED_COUNTS,
    total: teams.reduce((sum, team) => sum + counts[team], 0),
    totalExpected: teams.reduce((sum, team) => sum + EXPECTED_COUNTS[team], 0),
    resetAt: resetAt.getTime() > 0 ? resetAt.toISOString() : null,
    updatedAt: new Date().toISOString()
  };
}

function getAttendanceResetAt_() {
  const value = PropertiesService.getScriptProperties().getProperty(ATTENDANCE_RESET_AT_PROPERTY);
  const date = value ? new Date(value) : new Date(0);
  return isNaN(date.getTime()) ? new Date(0) : date;
}

function getActiveSuccessfulEmails_(data, eventName) {
  const lastRow = data.getLastRow();
  if (lastRow <= 1) return [];
  const resetAt = getAttendanceResetAt_();
  return data.getRange(2, 1, lastRow - 1, 7).getValues()
    .filter(row => {
      const timestamp = row[0] instanceof Date ? row[0] : new Date(row[0]);
      return timestamp > resetAt && String(row[5] || '').trim() === '報到成功' && String(row[6] || '').trim() === eventName;
    })
    .map(row => String(row[4] || '').trim().toLowerCase());
}

function digestHex_(value) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(value || ''), Utilities.Charset.UTF_8)
    .map(byte => ((byte + 256) % 256).toString(16).padStart(2, '0'))
    .join('');
}

function passwordMatches_(password) {
  const actual = digestHex_(password);
  let difference = actual.length ^ RESET_PASSWORD_SHA256.length;
  for (let i = 0; i < Math.max(actual.length, RESET_PASSWORD_SHA256.length); i += 1) {
    difference |= (actual.charCodeAt(i) || 0) ^ (RESET_PASSWORD_SHA256.charCodeAt(i) || 0);
  }
  return difference === 0;
}

function jsonpOutput_(callback, payload) {
  return ContentService.createTextOutput(callback + '(' + JSON.stringify(payload) + ');')
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}

function doGet(e) {
  const callback = String((e && e.parameter && e.parameter.callback) || 'receiveCheckinConfig');
  if (!/^[A-Za-z_$][0-9A-Za-z_$\.]*$/.test(callback)) return ContentService.createTextOutput('Invalid callback');
  try {
    if (e && e.parameter && e.parameter.action === 'counts') {
      return jsonpOutput_(callback, getAttendanceCounts_());
    }
    const c = getPublicConfig_();
    const payload = { ok: true, eventName: c.eventName, startAt: c.startAt.toISOString(), endAt: c.endAt.toISOString(), serverTime: new Date().toISOString() };
    return jsonpOutput_(callback, payload);
  } catch (err) {
    return jsonpOutput_(callback, { ok: false, error: String(err.message || err) });
  }
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const p = (e && e.parameter) || {};
    if (p.action === 'resetCounts') {
      if (!passwordMatches_(p.password)) return resultPage_(false, '密碼錯誤', '實到人數未清除，請關閉此頁後重新操作。');
      const now = new Date();
      PropertiesService.getScriptProperties().setProperty(ATTENDANCE_RESET_AT_PROPERTY, now.toISOString());
      return resultPage_(true, '實到人數已清除', '各組實到已歸零；原始報到紀錄仍安全保留在試算表中。');
    }
    const name = String(p.name || '').trim().replace(/\s+/g, ' ');
    const role = String(p.role || '');
    const team = String(p.team || '');
    const email = String(p.email || '').trim().toLowerCase();
    const c = getPublicConfig_();
    const now = new Date();
    if (now < c.startAt) return resultPage_(false, '報到尚未開始', '開放時間：' + formatTime_(c.startAt));
    if (now > c.endAt) return resultPage_(false, '報到已截止', '截止時間：' + formatTime_(c.endAt));
    if (name.length < 2 || name.length > 40) return resultPage_(false, '姓名格式不正確', '請返回後重新輸入。');
    if (role !== '教師' && role !== '職員') return resultPage_(false, '請選擇身分', '身分必須是教師或職員。');
    const allowedTeams = ['緊急救護組', '安全防護組', '避難引導組', '通報組', '搶救組'];
    if (!allowedTeams.includes(team)) return resultPage_(false, '請選擇編組', '請返回後選擇所屬編組。');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return resultPage_(false, 'Email 格式不正確', '請返回後重新輸入。');

    const ss = getSpreadsheet_();
    const data = ensureDataSheet_(ss);
    const emails = getActiveSuccessfulEmails_(data, c.eventName);
    const duplicate = emails.includes(email);
    if (!duplicate) {
      data.appendRow([now, name, role, team, email, '報到成功', c.eventName]);
      const row = data.getLastRow();
      data.getRange(row, 1).setNumberFormat('yyyy/mm/dd hh:mm:ss');
      data.getRange(row, 6).setBackground('#D9FAEC').setFontColor('#0A7B59').setFontWeight('bold');
    }
    return resultPage_(true, duplicate ? '已經報到過囉！' : '報到完成！', duplicate ? '這個 Email 已有報到紀錄。' : '報到時間：' + formatTime_(now));
  } catch (err) {
    return resultPage_(false, '目前無法完成報到', String(err.message || err));
  } finally {
    lock.releaseLock();
  }
}

function formatTime_(date) { return Utilities.formatDate(date, 'Asia/Taipei', 'yyyy/MM/dd HH:mm:ss'); }

function resultPage_(success, title, detail) {
  const color = success ? '#20C997' : '#FF6B8A';
  const icon = success ? '✓' : '!';
  const html = `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:linear-gradient(135deg,#fff5a8,#ffd4e9 50%,#bef6ff);font-family:Arial,'Microsoft JhengHei',sans-serif;color:#40345c}.card{width:min(86vw,390px);padding:42px 28px;text-align:center;background:#fff;border:4px solid #fff;border-radius:32px;box-shadow:0 22px 0 #6a57b026,0 32px 70px #59479533}.icon{width:76px;height:76px;margin:auto;display:grid;place-items:center;border-radius:50%;background:${color};color:#fff;font-size:46px;font-weight:900}h1{font-size:30px;margin:22px 0 10px}p{font-size:17px;line-height:1.7;color:#716482}.back{display:inline-block;margin-top:22px;padding:14px 28px;border-radius:16px;background:linear-gradient(90deg,#ff5fa5,#8b7cff,#27cadb);color:#fff;text-decoration:none;font-weight:800}</style></head><body><main class="card"><div class="icon">${icon}</div><h1>${title}</h1><p>${detail}</p><a class="back" href="javascript:history.back()">返回報到頁</a></main></body></html>`;
  return HtmlService.createHtmlOutput(html).setTitle(title).addMetaTag('viewport', 'width=device-width, initial-scale=1');
}
