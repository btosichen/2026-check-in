# 2026 Check-in

學校教師與職員的無紙化活動報到系統。介面採明亮、活潑的日系動漫風格，使用姓名、身分與 Email 辨識報到者，並自動記錄日期和時間。

## 功能

- 姓名、教師／職員、編組、Email 四欄快速報到
- 依伺服器時間限制開始與截止時間
- 同一活動以 Email 防止重複報到
- 自動記錄臺北時區的報到日期與時間
- 網頁底部固定顯示五個編組的應到與實到人數，每 15 秒更新
- 指揮官可用密碼保護的按鈕將實到人數歸零，原始報到紀錄仍保留
- `0914.jpg` 主視覺已去背並最佳化為 512×768 透明 PNG
- 手機與桌面響應式介面
- Google 表單＋試算表 GAS 替代方案

## 本機開發

```bash
npm install
npm run dev
```

Web App 的活動名稱和開放時段目前定義於 `app/api/checkin/route.ts`。

## 純 HTML／GitHub Pages 版本

根目錄的 `index.html` 不需要 Node.js，可直接由 GitHub Pages 顯示。它使用 Google Apps Script 寫入試算表：

1. 將 `google-apps-script/Code.gs` 貼入試算表的 Apps Script。
2. 執行「初始化工作表」。
3. 將 Apps Script 部署成網頁應用程式，執行身分選擇自己，存取權選擇所有人。
4. 把部署網址貼到 `index.html` 的 `GAS_URL`。
5. 在 GitHub repository 的 Settings → Pages，選擇 `main` 分支與根目錄。

活動時間直接在 Google 試算表的黃色欄位修改；HTML 會從 GAS 讀取最新設定。

## Google 表單／試算表版本

`google-apps-script/Code.gs` 可貼入 Google 試算表的「擴充功能 → Apps Script」。完整步驟請參考 `google-apps-script/使用說明.md`。

GAS 版本支援：

- 在試算表黃色欄位修改活動日期與開始／截止時間
- 自動建立開放及截止觸發器
- Email 重複報到標記
- 自動產生 Google 表單 QR Code

## 隱私

報到資料包含姓名與 Email。正式部署時請限制管理端存取權限，並依學校個資規範保存及刪除資料。
