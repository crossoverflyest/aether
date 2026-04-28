import { app, BrowserWindow, Menu, MenuItemConstructorOptions, shell } from "electron";

const isDev = process.env.NODE_ENV === "development";
const isMac = process.platform === "darwin";

export function buildAppMenu(getWindow: () => BrowserWindow | null): Menu {
  const send = (channel: string) => {
    const win = getWindow();
    if (win && !win.isDestroyed()) win.webContents.send(channel);
  };

  const fileMenu: MenuItemConstructorOptions = {
    label: "ファイル",
    submenu: [
      {
        label: "ニュースを更新",
        accelerator: "CmdOrCtrl+R",
        click: () => send("menu:refreshNews"),
      },
      {
        label: "設定…",
        accelerator: "CmdOrCtrl+,",
        click: () => send("menu:openSettings"),
      },
      { type: "separator" },
      isMac ? { role: "close", label: "ウィンドウを閉じる" }
            : { role: "quit",  label: "終了" },
    ],
  };

  const editMenu: MenuItemConstructorOptions = {
    label: "編集",
    submenu: [
      { role: "undo",      label: "元に戻す" },
      { role: "redo",      label: "やり直し" },
      { type: "separator" },
      { role: "cut",       label: "切り取り" },
      { role: "copy",      label: "コピー" },
      { role: "paste",     label: "貼り付け" },
      { role: "selectAll", label: "すべて選択" },
    ],
  };

  const viewMenu: MenuItemConstructorOptions = {
    label: "表示",
    submenu: [
      { role: "reload",         label: "再読み込み" },
      { role: "forceReload",    label: "強制再読み込み" },
      { type: "separator" },
      { role: "resetZoom",      label: "実際のサイズ" },
      { role: "zoomIn",         label: "拡大" },
      { role: "zoomOut",        label: "縮小" },
      { type: "separator" },
      { role: "togglefullscreen", label: "全画面表示の切替" },
      ...(isDev
        ? [
            { type: "separator" } as const,
            { role: "toggleDevTools", label: "開発者ツール" } as const,
          ]
        : []),
    ],
  };

  const windowMenu: MenuItemConstructorOptions = {
    label: "ウィンドウ",
    submenu: [
      { role: "minimize", label: "最小化" },
      { role: "zoom",     label: "ズーム" },
      ...(isMac
        ? [
            { type: "separator" } as const,
            { role: "front" } as const,
          ]
        : []),
    ],
  };

  const helpMenu: MenuItemConstructorOptions = {
    label: "ヘルプ",
    submenu: [
      {
        label: "GitHub リポジトリ",
        click: () => { shell.openExternal("https://github.com/crossoverflyest/news-desktop"); },
      },
      {
        label: `バージョン: ${app.getVersion()}`,
        enabled: false,
      },
    ],
  };

  const template: MenuItemConstructorOptions[] = [];

  if (isMac) {
    template.push({
      label: app.name,
      submenu: [
        { role: "about",    label: `${app.name} について` },
        { type: "separator" },
        { role: "services", label: "サービス" },
        { type: "separator" },
        { role: "hide",        label: `${app.name} を隠す` },
        { role: "hideOthers",  label: "ほかを隠す" },
        { role: "unhide",      label: "すべてを表示" },
        { type: "separator" },
        { role: "quit", label: "終了" },
      ],
    });
  }

  template.push(fileMenu, editMenu, viewMenu, windowMenu, helpMenu);

  return Menu.buildFromTemplate(template);
}
