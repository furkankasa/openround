// OpenRound desktop shell: one window, native save/open dialogs, PDF report export. No network access.
const { app, BrowserWindow, ipcMain, dialog, Menu, shell } = require('electron');
const path = require('path'), fs = require('fs');

const FILTERS = {
  json: [{ name: 'OpenRound project', extensions: ['json'] }], csv: [{ name: 'CSV', extensions: ['csv'] }],
  dxf: [{ name: 'DXF drawing', extensions: ['dxf'] }], pdf: [{ name: 'PDF', extensions: ['pdf'] }],
  html: [{ name: 'HTML', extensions: ['html'] }], zip: [{ name: 'ZIP', extensions: ['zip'] }]
};
let win, lastDir = app.getPath('documents');

function createWindow() {
  win = new BrowserWindow({
    width: 1600, height: 980, minWidth: 1100, minHeight: 700, title: 'OpenRound', backgroundColor: '#1E252B', show: false,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true, spellcheck: false }
  });
  win.loadFile(path.join(__dirname, 'app', 'index.html'));
  win.once('ready-to-show', () => { win.maximize(); win.show(); });
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:/.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith('file:')) { e.preventDefault(); if (/^https?:/.test(url)) shell.openExternal(url); } });
}

ipcMain.handle('save-file', async (_e, name, data) => {
  const ext = path.extname(name).slice(1).toLowerCase();
  const r = await dialog.showSaveDialog(win, { defaultPath: path.join(lastDir, name), filters: FILTERS[ext] || [] });
  if (r.canceled || !r.filePath) return { saved: false };
  fs.writeFileSync(r.filePath, typeof data === 'string' ? data : Buffer.from(data));
  lastDir = path.dirname(r.filePath);
  return { saved: true, path: r.filePath };
});

ipcMain.handle('save-report-pdf', async (_e, name, html) => {
  const r = await dialog.showSaveDialog(win, { defaultPath: path.join(lastDir, name), filters: FILTERS.pdf });
  if (r.canceled || !r.filePath) return { saved: false };
  const tmp = path.join(app.getPath('temp'), 'openround-report-' + Date.now() + '.html');
  fs.writeFileSync(tmp, html);
  const pw = new BrowserWindow({ show: false, webPreferences: { sandbox: true } });
  try {
    await pw.loadFile(tmp);
    const pdf = await pw.webContents.printToPDF({ pageSize: 'A4', landscape: false, printBackground: true, margins: { marginType: 'default' } });
    fs.writeFileSync(r.filePath, pdf);
  } finally { pw.destroy(); fs.rmSync(tmp, { force: true }); }
  lastDir = path.dirname(r.filePath);
  shell.openPath(r.filePath);
  return { saved: true, path: r.filePath };
});

function menu() {
  const send = js => () => win && win.webContents.executeJavaScript(js).catch(() => {});
  const t = [
    { label: 'File', submenu: [
      { label: 'Open project…', accelerator: 'CmdOrCtrl+O', click: send("document.getElementById('load').click()") },
      { label: 'Save project…', accelerator: 'CmdOrCtrl+S', click: send("document.getElementById('save').click()") },
      { type: 'separator' },
      { label: 'Export hole list (CSV)…', click: send("document.getElementById('csv').click()") },
      { label: 'Export drawing (DXF)…', accelerator: 'CmdOrCtrl+E', click: send("document.getElementById('dxf').click()") },
      { label: 'Report (PDF)…', accelerator: 'CmdOrCtrl+P', click: send("document.getElementById('print').click()") },
      { type: 'separator' }, { role: 'quit' }] },
    { label: 'Edit', submenu: [{ role: 'undo' }, { role: 'redo' }, { type: 'separator' }, { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' }] },
    { label: 'View', submenu: [
      { label: 'Fit drawing', accelerator: 'F', registerAccelerator: false, click: send("document.getElementById('zfit').click()") },
      { label: 'Toggle results panel', accelerator: 'CmdOrCtrl+R', click: send("document.getElementById('panelBtn').click()") },
      { label: 'Toggle dark / light', accelerator: 'CmdOrCtrl+T', click: send("document.getElementById('themeBtn').click()") },
      { type: 'separator' }, { role: 'resetZoom', label: 'Interface zoom 100%' }, { role: 'zoomIn', label: 'Interface zoom in' }, { role: 'zoomOut', label: 'Interface zoom out' },
      { type: 'separator' }, { role: 'togglefullscreen' }] },
    { label: 'Help', submenu: [
      { label: 'Method & references', click: send("document.getElementById('helpBtn').click()") },
      { label: 'NIOSH DRIFT background report', click: () => shell.openExternal('https://doi.org/10.26616/NIOSHPUB2019129') },
      { type: 'separator' },
      { label: 'About OpenRound', click: () => dialog.showMessageBox(win, { type: 'info', title: 'OpenRound', message: 'OpenRound ' + app.getVersion(),
          detail: 'Drift round blast design and perimeter damage analysis.\nIndependent implementation of methods published in NIOSH Pub. 2019-129 (public domain) and Persson, Holmberg & Lee (1994). Not a NIOSH product.\nConceptual design tool — verify with field trials.' }) }] }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(t));
}

app.whenReady().then(() => { menu(); createWindow(); });
app.on('window-all-closed', () => app.quit());
