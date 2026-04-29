# Agent Guide - Torrent Control (Transmission Edition)

This browser extension is a slimmed-down version focusing strictly on the Transmission RPC API.

## 🏗 Architecture & Data Flow

- **Manifest**: `src/manifest.json`.
- **Background Script**: `src/index.js` handles link catching and context menus.
- **Client Logic**: `src/lib/transmission.js` is the primary client. It supports multiple labels (passed as an array in the `labels` argument of `torrent-add`).
- **Utilities**: `src/util.js` manages the `clientList` (Transmission only) and common URL logic.

## 🛠 Essential Commands

- **Build**: `npm run build`
- **Run**: `npm start`
- **Test**: `npm test` (only `transmission.test.js` remains relevant)

## 💡 Important Gotchas

- **Transmission Multiple Labels**: This project specifically supports passing an array of labels to Transmission. Ensure any UI changes preserve the array format when multiple labels are selected.
- **Magnet Interception**: Redirected through `https://torrent-control.invalid/*`.
- **UI Scaling**: The "Add Torrent" dialog height is set to `450px` in `index.js` to ensure the multiple-select label box is visible.
