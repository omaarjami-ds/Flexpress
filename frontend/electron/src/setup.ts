import type { CapacitorElectronConfig } from '@capacitor-community/electron';
import {
  CapElectronEventEmitter,
  CapacitorSplashScreen,
  setupCapacitorElectronPlugins,
} from '@capacitor-community/electron';
import chokidar from 'chokidar';
import type { MenuItemConstructorOptions } from 'electron';
import { app, BrowserWindow, Menu, MenuItem, nativeImage, Tray, session, ipcMain, globalShortcut } from 'electron';
import electronIsDev from 'electron-is-dev';
import electronServe from 'electron-serve';
import windowStateKeeper from 'electron-window-state';
import { join } from 'path';

// Define components for a watcher to detect when the webapp is changed so we can reload in Dev mode.
const reloadWatcher = {
  debouncer: null,
  ready: false,
  watcher: null,
};
export function setupReloadWatcher(electronCapacitorApp: ElectronCapacitorApp): void {
  reloadWatcher.watcher = chokidar
    .watch(join(app.getAppPath(), 'app'), {
      ignored: /[/\\]\./,
      persistent: true,
    })
    .on('ready', () => {
      reloadWatcher.ready = true;
    })
    .on('all', (_event, _path) => {
      if (reloadWatcher.ready) {
        clearTimeout(reloadWatcher.debouncer);
        reloadWatcher.debouncer = setTimeout(async () => {
          electronCapacitorApp.getMainWindow().webContents.reload();
          reloadWatcher.ready = false;
          clearTimeout(reloadWatcher.debouncer);
          reloadWatcher.debouncer = null;
          reloadWatcher.watcher = null;
          setupReloadWatcher(electronCapacitorApp);
        }, 1500);
      }
    });
}

// Define our class to manage our app.
export class ElectronCapacitorApp {
  private MainWindow: BrowserWindow | null = null;
  private SplashScreen: CapacitorSplashScreen | null = null;
  private TrayIcon: Tray | null = null;
  private CapacitorFileConfig: CapacitorElectronConfig;
  private TrayMenuTemplate: (MenuItem | MenuItemConstructorOptions)[] = [
    new MenuItem({ label: 'Quit App', role: 'quit' }),
  ];
  private AppMenuBarMenuTemplate: (MenuItem | MenuItemConstructorOptions)[] = [
    { role: process.platform === 'darwin' ? 'appMenu' : 'fileMenu' },
    { role: 'viewMenu' },
  ];
  private mainWindowState;
  private loadWebApp;
  private customScheme: string;

  constructor(
    capacitorFileConfig: CapacitorElectronConfig,
    trayMenuTemplate?: (MenuItemConstructorOptions | MenuItem)[],
    appMenuBarMenuTemplate?: (MenuItemConstructorOptions | MenuItem)[]
  ) {
    this.CapacitorFileConfig = capacitorFileConfig;

    this.customScheme = this.CapacitorFileConfig.electron?.customUrlScheme ?? 'capacitor-electron';

    if (trayMenuTemplate) {
      this.TrayMenuTemplate = trayMenuTemplate;
    }

    if (appMenuBarMenuTemplate) {
      this.AppMenuBarMenuTemplate = appMenuBarMenuTemplate;
    }

    // Setup our web app loader, this lets us load apps like react, vue, and angular without changing their build chains.
    this.loadWebApp = electronServe({
      directory: join(app.getAppPath(), 'app'),
      scheme: this.customScheme,
    });
  }

  // Helper function to load in the app.
  private async loadMainWindow(thisRef: any) {
    if (electronIsDev) {
      try {
        await thisRef.MainWindow.loadURL('http://localhost:3000');
      } catch (e) {
        console.warn('Dev server not available, loading local files...');
        await thisRef.loadWebApp(thisRef.MainWindow);
      }
    } else {
      try {
        await thisRef.loadWebApp(thisRef.MainWindow);
      } catch (e) {
        console.error('Failed to load web app:', e);
      }
    }
  }

  // Expose the mainWindow ref for use outside of the class.
  getMainWindow(): BrowserWindow {
    return this.MainWindow;
  }

  getCustomURLScheme(): string {
    return this.customScheme;
  }

  unregisterAllShortcuts(): void {
    globalShortcut.unregisterAll();
  }

  async init(): Promise<void> {
    const iconPath = join(app.getAppPath(), 'assets', 'appIcon.png');
    const icon = nativeImage.createFromPath(iconPath);
    
    this.mainWindowState = windowStateKeeper({
      defaultWidth: 1200,
      defaultHeight: 900,
    });
    // Setup preload script path and construct our main window.
    const preloadPath = join(app.getAppPath(), 'build', 'src', 'preload.js');
    this.MainWindow = new BrowserWindow({
      icon,
      show: true, // Forcer l'affichage immédiat
      fullscreen: false,
      x: this.mainWindowState.x,
      y: this.mainWindowState.y,
      width: this.mainWindowState.width,
      height: this.mainWindowState.height,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
        preload: preloadPath,
      },
    });
    this.mainWindowState.manage(this.MainWindow);

    // Activer les DevTools systématiquement pour voir les erreurs
    this.MainWindow.webContents.openDevTools();

    if (this.CapacitorFileConfig.backgroundColor) {
      this.MainWindow.setBackgroundColor(this.CapacitorFileConfig.electron.backgroundColor);
    }
    
    this.loadMainWindow(this);

    // Handle when all of our windows are close (platforms have their own expectations).
    this.MainWindow.on('closed', () => {
      if (this.SplashScreen?.getSplashWindow() && !this.SplashScreen.getSplashWindow().isDestroyed()) {
        this.SplashScreen.getSplashWindow().close();
      }
    });

    // When the tray icon is enabled, setup the options.
    if (this.CapacitorFileConfig.electron?.trayIconAndMenuEnabled) {
      this.TrayIcon = new Tray(icon);
      this.TrayIcon.on('double-click', () => {
        if (this.MainWindow) {
          if (this.MainWindow.isVisible()) {
            this.MainWindow.hide();
          } else {
            this.MainWindow.show();
            this.MainWindow.focus();
          }
        }
      });
      this.TrayIcon.on('click', () => {
        if (this.MainWindow) {
          if (this.MainWindow.isVisible()) {
            this.MainWindow.hide();
          } else {
            this.MainWindow.show();
            this.MainWindow.focus();
          }
        }
      });
      this.TrayIcon.setToolTip(app.getName());
      this.TrayIcon.setContextMenu(Menu.buildFromTemplate(this.TrayMenuTemplate));
    }

    // Setup the main manu bar at the top of our window.
    Menu.setApplicationMenu(null);
    this.MainWindow.setMenuBarVisibility(false);

    // Link electron plugins into the system.
    setupCapacitorElectronPlugins();

    this.MainWindow.webContents.on('dom-ready', () => {
      CapElectronEventEmitter.emit('CAPELECTRON_DeeplinkListenerInitialized', '');
    });


    // Handle window controls via IPC
    ipcMain.on('window-reload', () => {
      this.MainWindow?.webContents.reload();
    });
    ipcMain.on('window-goback', () => {
      if (this.MainWindow?.webContents.canGoBack()) {
        this.MainWindow.webContents.goBack();
      }
    });
    ipcMain.on('window-exit', () => {
      app.quit();
    });

    // Setup global keyboard shortcuts
    globalShortcut.register('Ctrl+R', () => {
      this.MainWindow?.webContents.reload();
    });
    globalShortcut.register('Alt+Left', () => {
      if (this.MainWindow?.webContents.canGoBack()) {
        this.MainWindow.webContents.goBack();
      }
    });
    globalShortcut.register('Alt+Q', () => {
      app.quit();
    });
    globalShortcut.register('F5', () => {
      this.MainWindow?.webContents.reload();
    });
  }
}

// Set a CSP up for our application based on the custom scheme
export function setupContentSecurityPolicy(customScheme: string): void {
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          electronIsDev
            ? `default-src ${customScheme}://* 'unsafe-inline' devtools://* 'unsafe-eval' data: https:; connect-src ${customScheme}://* https: http:; img-src ${customScheme}://* https: data:;`
            : `default-src ${customScheme}://* 'unsafe-inline' data: https:; connect-src ${customScheme}://* https: http:; img-src ${customScheme}://* https: data:;`,
        ],
      },
    });
  });
}
