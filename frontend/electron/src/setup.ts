import { CapacitorElectronConfig } from '@capacitor-community/electron';
import { setupCapacitorElectronPlugins } from '@capacitor-community/electron';
import { app, BrowserWindow, Menu, nativeImage, ipcMain, globalShortcut } from 'electron';
import electronIsDev from 'electron-is-dev';
import electronServe from 'electron-serve';
import windowStateKeeper from 'electron-window-state';
import { join } from 'path';

export class ElectronCapacitorApp {
  private MainWindow: BrowserWindow | null = null;
  private CapacitorFileConfig: CapacitorElectronConfig;
  private customScheme: string;
  private loadWebApp: any;

  constructor(
    capacitorFileConfig: CapacitorElectronConfig,
    _trayMenuTemplate?: any,
    _appMenuBarMenuTemplate?: any
  ) {
    this.CapacitorFileConfig = capacitorFileConfig;
    this.customScheme = this.CapacitorFileConfig.electron?.customUrlScheme ?? 'capacitor-electron';
    
    this.loadWebApp = electronServe({
      directory: join(app.getAppPath(), 'app'),
      scheme: this.customScheme,
    });
  }

  getMainWindow(): BrowserWindow {
    return this.MainWindow!;
  }

  getCustomURLScheme(): string {
    return this.customScheme;
  }

  unregisterAllShortcuts(): void {
    globalShortcut.unregisterAll();
  }

  async init(): Promise<void> {
    const iconPath = join(app.getAppPath(), 'assets', 'logo.png');
    const icon = nativeImage.createFromPath(iconPath);

    const mainWindowState = windowStateKeeper({
      defaultWidth: 1200,
      defaultHeight: 900,
    });

    const preloadPath = join(app.getAppPath(), 'build', 'src', 'preload.js');

    this.MainWindow = new BrowserWindow({
      icon,
      show: true,
      x: mainWindowState.x,
      y: mainWindowState.y,
      width: mainWindowState.width,
      height: mainWindowState.height,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: preloadPath,
      },
    });

    mainWindowState.manage(this.MainWindow);
    Menu.setApplicationMenu(null);
    this.MainWindow.setMenuBarVisibility(false);

    // Ouvrir les outils de développement pour le débogage
    this.MainWindow.webContents.openDevTools();

    if (electronIsDev) {
      try {
        await this.MainWindow.loadURL('http://localhost:3000');
      } catch (e) {
        await this.loadWebApp(this.MainWindow);
      }
    } else {
      await this.loadWebApp(this.MainWindow);
    }

    setupCapacitorElectronPlugins();

    ipcMain.on('window-reload', () => {
      this.MainWindow?.webContents.reload();
    });
    ipcMain.on('window-exit', () => {
      app.quit();
    });
  }
}

export function setupContentSecurityPolicy(_customScheme: string): void {}
export function setupReloadWatcher(_electronCapacitorApp: any): void {}
