# 2026 Check-in

學校教師與職員的無紙化活動報到系統。介面採明亮、活潑的日系動漫風格，使用姓名、身分與 Email 辨識報到者，並自動記錄日期和時間。

## 功能

- 姓名、教師／職員、編組、Email 四欄快速報到
- 依伺服器時間限制開始與截止時間
- 同一活動以 Email 防止重複報到
- 自動記錄臺北時區的報到日期與時間
- 網頁底部固定顯示五個編組的應到與實到人數，每 15 秒更新
- 指揮官可用密碼保護的按鈕將實到人數歸零，原始報到紀錄仍保留
- 右下角齒輪以相同密碼驗證後開啟管理試算表，試算表網址不放在公開前端
- 報到表下方標示「臺北市立陽明高中總務處製作」
- `0914.jpg` 主視覺已去背並最佳化為 512×768 透明 PNG
- 手機與桌面響應式介面
- Google 表單＋試算表 GAS 替代方案

## 本機開發

```bash
npm install
npm run dev
```

Web App 透過 `ymsh-emergency-checkin-proxy.btosichen.workers.dev` 讀寫 Google Apps Script；活動名稱和開放時段仍在 Google 試算表設定。

## 純 HTML／GitHub Pages 版本

根目錄的 `index.html` 保留原本的 GitHub Pages 網址，並自動轉往正式報到站。舊 QR Code 與書籤不必更換；正式站會經由 Cloudflare Worker 存取 GAS，避開校園 Wi-Fi 封鎖 `script.google.com` 的問題。

Worker 的可讀版程式位於 `cloudflare-worker/worker.js`。活動時間直接在 Google 試算表的黃色欄位修改，正式站會從 Worker 讀取最新設定。

## Google 表單／試算表版本

`google-apps-script/Code.gs` 可貼入 Google 試算表的「擴充功能 → Apps Script」。完整步驟請參考 `google-apps-script/使用說明.md`。

GAS 版本支援：

- 在試算表黃色欄位修改活動日期與開始／截止時間
- 自動建立開放及截止觸發器
- Email 重複報到標記
- 自動產生 Google 表單 QR Code

## 隱私

報到資料包含姓名與 Email。正式部署時請限制管理端存取權限，並依學校個資規範保存及刪除資料。
