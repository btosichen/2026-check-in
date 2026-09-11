# 2026 Check-in

學校教師與職員的無紙化活動報到系統。介面採明亮、活潑的日系動漫風格，使用姓名、身分與 Email 辨識報到者，並自動記錄日期和時間。

## 功能

- 姓名、教師／職員、Email 三欄快速報到
- 依伺服器時間限制開始與截止時間
- 同一活動以 Email 防止重複報到
- 自動記錄臺北時區的報到日期與時間
- 手機與桌面響應式介面
- Google 表單＋試算表 GAS 替代方案

## 本機開發

```bash
npm install
npm run dev
```

Web App 的活動名稱和開放時段目前定義於 `app/api/checkin/route.ts`。

## Google 表單／試算表版本

`google-apps-script/Code.gs` 可貼入 Google 試算表的「擴充功能 → Apps Script」。完整步驟請參考 `google-apps-script/使用說明.md`。

GAS 版本支援：

- 在試算表黃色欄位修改活動日期與開始／截止時間
- 自動建立開放及截止觸發器
- Email 重複報到標記
- 自動產生 Google 表單 QR Code

## 隱私

報到資料包含姓名與 Email。正式部署時請限制管理端存取權限，並依學校個資規範保存及刪除資料。
