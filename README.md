# Torrent Control (Transmission Edition)

Add torrent and magnet links directly to your Transmission Bittorrent client.

## Features
- Supports magnet links
- Supports private trackers
- Supports multiple labels (hold `Ctrl`/`Cmd` to select multiple)
- Auto login using HTTP auth / Digest authentication
---

## Development

### Requirements
- [Node.js](https://nodejs.org/)
- [npm](https://www.npmjs.com/)

### Setup and Running
1. Clone the repository and install dependencies:

   ```bash
   git clone https://github.com/Mika-/torrent-control.git
   cd torrent-control
   npm install
   ```

2. Start the extension in a temporary Firefox profile:

   ```bash
   npm start
   ```

### Manual Installation (Firefox/Zen)
1. Open your browser and navigate to `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on...**.
3. Select the `src/manifest.json` file.

### Permanent Installation (Zen/Firefox Dev Edition)
1. Build the extension: `npm run build`.
2. Locate the `.zip` file in `web-ext-artifacts/` and rename it to `.xpi`.
3. In your browser, go to `about:config` and set `xpinstall.signatures.required` to `false`.
4. Go to `about:addons`.
5. Click the gear icon and select **Install Add-on From File...**.
6. Select your `.xpi` file.
