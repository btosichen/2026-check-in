const CFG_SHEET = '活動設定';
const DATA_SHEET = '報到紀錄';

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

  if (data.getLastRow() === 0) data.getRange('A1:F1').setValues([['時間戳記', '姓名', '身分', 'Email', '報到結果', '活動名稱']]);
  data.getRange('A1:F1').setBackground('#FF69A8').setFontColor('#FFFFFF').setFontWeight('bold');
  data.setFrozenRows(1); data.setHiddenGridlines(true);
  data.setColumnWidths(1, 1, 160); data.setColumnWidths(2, 2, 120); data.setColumnWidth(4, 220); data.setColumnWidth(5, 120); data.setColumnWidth(6, 180);
  refreshQRCode();
  SpreadsheetApp.getUi().alert('初始化完成。請填入表單 ID 與網址，再執行「套用時間並建立觸發器」。');
}

function getConfig_() {
  const sheet = SpreadsheetApp.getActive().getSheetByName(CFG_SHEET);
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
  const sheet = SpreadsheetApp.getActive().getSheetByName(CFG_SHEET);
  if (!sheet) return;
  const url = String(sheet.getRange('B9').getValue()).trim();
  sheet.getRange('D4').clearContent();
  if (url) sheet.getRange('D4').setFormula(`=IMAGE("https://quickchart.io/qr?size=300&text="&ENCODEURL(B9))`);
  sheet.setColumnWidth(4, 240); sheet.setRowHeight(4, 220);
}

function onFormSubmit(e) {
  const ss = SpreadsheetApp.getActive();
  const data = ss.getSheetByName(DATA_SHEET);
  const cfg = ss.getSheetByName(CFG_SHEET);
  const values = e && e.namedValues ? e.namedValues : {};
  const pick = names => { for (const n of names) if (values[n] && values[n][0]) return String(values[n][0]).trim(); return ''; };
  const name = pick(['姓名']);
  const role = pick(['身分']);
  const email = pick(['Email', '電子郵件地址', '電子郵件']).toLowerCase();
  if (!email) return;
  const emails = data.getLastRow() > 1 ? data.getRange(2, 4, data.getLastRow() - 1, 1).getDisplayValues().flat().map(x => x.toLowerCase()) : [];
  const duplicate = emails.includes(email);
  data.appendRow([new Date(), name, role, email, duplicate ? '重複報到' : '報到成功', cfg ? cfg.getRange('B4').getDisplayValue() : '']);
  const row = data.getLastRow();
  data.getRange(row, 1).setNumberFormat('yyyy/mm/dd hh:mm:ss');
  data.getRange(row, 5).setBackground(duplicate ? '#FFD9E7' : '#D9FAEC').setFontColor(duplicate ? '#C43168' : '#0A7B59').setFontWeight('bold');
}

function installFormSubmitTrigger() {
  ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === 'onFormSubmit').forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('onFormSubmit').forSpreadsheet(SpreadsheetApp.getActive()).onFormSubmit().create();
  SpreadsheetApp.getUi().alert('報到紀錄觸發器已安裝。');
}
