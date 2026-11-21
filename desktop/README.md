# OpenRound desktop (Electron)

```bash
cd ..; npm run build; cd desktop     # creates desktop/app/index.html
npm install
npm start                            # run
npm run dist:win                     # Windows portable exe and installer (on Windows or in CI)
```

When building for Windows on Linux without Wine, use `"signAndEditExecutable": false` and set the icon and version afterwards with `node patch-exe.mjs dist/win-unpacked/OpenRound.exe`.
