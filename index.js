// /** 
//  * 
//  * Desktop-CGI to Initiate Electron or Different Desktop-CGI Framework
//  * 
//  * 
//  */

'use strict';

const path = require("path");
const fs = require("fs");
const os = require("os");
const cgijs = require("cgijs");
// const electron = require('electron');
const { app, BrowserWindow, Menu, screen, Notification, ipcMain, remote, crashReporter } = require('electron');
// let {getCurrentWindow, globalShortcut} = remote;
const notifier = require('electron-notifications');
const ut = require("./src/utils/encryption");
let { Tray, notes, displayNoteToTray, addNoteToTrayMenu } = require("./src/native/electron_tray");

let ostype = os.type();
let dirname = __dirname;
let trayIcon = null;
let win, tray;

let configini = cgijs.utils().ini.parse(fs.readFileSync('./config.' + ostype.toLowerCase() + '.ini', 'utf-8'));
let environment = (!!process.argv.includes("-e")) ? process.argv[process.argv.indexOf("-e") + 1] : "development";
let install_folder = configini[environment]["install_folder"] || path.join(dirname, "../");
let config_file = configini[environment]["config"] || "/www/configs/config-" + ostype.toLowerCase() + "_demo.json";

let config = JSON.parse(fs.readFileSync(path.join(install_folder, config_file)));

let options = {
    "logger": (loggerFramework) => { }
}

// // // Incorporate this due to UNDEFINED STATUS
// ipcMain.handle('ping', () => 'pong');
// ipcMain.on('monitorTerm', (event, term) => { });
// ipcMain.on('set-ignore-mouse-events', (event, ...args) => {
//     const win = BrowserWindow.fromWebContents(event.sender)
//     win.setIgnoreMouseEvents(...args)
// });
// ipcMain.on('app/minimize', () => {
//     win.minimize();
// });
// ipcMain.on('app/close', () => {
//     app.quit();
// });


// let config;
// if (ostype == "win32" || ostype === "Windows_NT") {
//     config = JSON.parse(fs.readFileSync(path.join(dirname, "../", config_folder, '/config-win_demo.json')));
// } else if (ostype == "linux") {
//     config = JSON.parse(fs.readFileSync(path.join(dirname, "../", config_folder, '/config-linux_demo.json')));
// } else if (ostype == "mac") {
//     config = JSON.parse(fs.readFileSync(path.join(dirname, "../", config_folder, '/config-mac_demo.json')));
// }


let applicationConfiguration = config.app;
// let frameworkDefinition = applicationConfiguration.framework;
let bridge = applicationConfiguration.frameworkBridge;
let frameworkBridge = "desktopcgi-" + bridge + "-bridge";

if (!frameworkBridge) {
    throw Error("Desktop-CGI-Server: index.js: Framework or Framework Bridge Path not provided #002");
}


// // https://www.electronjs.org/docs/latest/api/crash-reporter
// crashReporter.start({ submitURL: 'https://your-domain.com/url-to-submit' })


/** 
 * 
    // // Commenting the Isolation version
    // // let app = require("desktopcgi-" + frameworkDefinition).electron(dirname, frameworkObject, frameworkBridge, menus, config, options);
    // // const electron = frameworkObject;
    // // let { app, BrowserWindow, remote, screen } = frameworkObject;
 * 
*/

// // USAGE:
// // Allows Render Process ReUse in Electron
if (!!applicationConfiguration.allowRendererProcessReuse) {
    // app.allowRendererProcessReuse = true;
    // app.allowRendererProcessReuse = applicationConfiguration.allowRendererProcessReuse;
}

// // USAGE:
// // Ignores Certificate errors in Electron
if (!!applicationConfiguration.ignoreCertificateErrors) {
    app.commandLine.appendSwitch('ignore-certificate-errors');
}

// // USAGE:
// // Disable Hardware acceleration if you get the error:
// // [14880:1207/145651.085:ERROR:gpu_init.cc(457)] Passthrough is not supported, GL is disabled, ANGLE is
// // https://stackoverflow.com/questions/70267992/win10-electron-error-passthrough-is-not-supported-gl-is-disabled-angle-is
//
if (!!applicationConfiguration.disableHardwareAcceleration) {
    app.disableHardwareAcceleration();
}

// // USAGE:
// // Allor or disallow Insecure localhost
if (!!applicationConfiguration.allowInsecureLocalhost) {
    // app.commandLine.appendSwitch('allow-insecure-localhost', 'true');
    app.commandLine.appendSwitch('allow-insecure-localhost', applicationConfiguration.allowInsecureLocalhost);
}

// // Provide the app root for the executable
// global.appRoot = process.cwd();
// global.appRoot = dirname;
if (!!applicationConfiguration.appRoot && applicationConfiguration.appRoot !== "") {
    global.appRoot = applicationConfiguration.appRoot;
}

function showNotification(title, body) {
    new Notification({ title: title, body: body }).show();
}

// https://www.electronjs.org/docs/latest/tutorial/windows-taskbar
// Apply taskbar customization: PENDING

// https://www.electronjs.org/docs/latest/tutorial/spellchecker
// Apply spell checkers

// const gotTheLock = app.requestSingleInstanceLock();

/**
 *
 * createWindow
 * 
 * Logic for creating the electron window
 *
 * @param {*} dirname
 * 
 * @param {*} config
 * 
 * @param {*} options
 * 
 */
async function createWindow(dirname, config, options) {

    console.log("Desktop-CGI-Server: index.js: ready Event invoked #001");

    let menus = "default";
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;
    // let frameworkObject = require((!!frameworkDefinition) ? frameworkDefinition : "electron");
    menus = (!!applicationConfiguration.menus) ? path.join(dirname, applicationConfiguration.menus) : menus;

    console.log("Desktop-CGI-Server: index.js: Desktop-CGI App started: #002");

    // 
    // The following has been commented for use with independent npm package
    // TODO: Separate the desktop-cgi-application's electron (desktopcgi-electron) and express (express-bridge) server
    // 
    // let result = await require(frameworkBridge)(dirname, config, options);
    let result = await require("./src/index")(dirname, config, options);

    console.log(result);

    let win = new BrowserWindow({
        // fullscreen: true,
        // fullscreenable: false,
        // fullscreenWindowTitle: false,
        // useContentSize: true,
        width: width,
        height: height,
        backgroundColor: '#FFF',
        show: false,
        titleBarStyle: 'hidden',
        titleBarOverlay: true,
        transparent: false,
        webPreferences: {
            // https://www.electronjs.org/docs/latest/tutorial/multithreading
            // contextIsolation: false,
            // nodeIntegration: true,
            // nodeIntegrationInWorker: true,
            preload: path.join(dirname, "src", 'preload.js')
        }
    });

    win.setIgnoreMouseEvents(true);

    // // Loader decides whether a file is loaded using loadFile or a server is loaded using loadURL
    // // Options: file, server
    if (config.server.loader === "file") {
        console.log("Desktop-CGI-Server: index.js: Desktop-CGI App loading file: #003");
        win.loadFile(path.join(dirname, config.server.file));
    } else if (config.server.loader === "server") {
        console.log("Desktop-CGI-Server: index.js: Desktop-CGI App loading server at protocol:host:port: #004 ", config.server.protocol, config.server.host, config.server.port);
        win.loadURL('http://' + config.server.host + ':' + config.server.port);
    } else {
        console.log("Desktop-CGI-Server: index.js: Desktop-CGI App loading server at protocol:host:port: #005 ", config.server.protocol, config.server.host, config.server.port);
        win.loadURL('http://' + config.server.host + ':' + config.server.port);
    }

    console.log("Desktop-CGI-Server: index.js: Desktop-CGI App Menus loading : #006");

    if (menus === "default" || menus === null || menus === undefined) {
        require("./src/native/electron_menu");
    } else {
        require(menus);
    }

    win.on('closed', function (win) {
        console.log("Desktop-CGI-Server: index.js: browserWindow.closed Event invoked #007");
        win = null;
        apps = {};
    }.bind(null, win));

    win.once('ready-to-show', () => {
        console.log("Desktop-CGI-Server: index.js: browserWindow.ready-to-show Event invoked #008");
        win.show();
    });

    win.webContents.on("did-fail-load", function () {
        console.log("Desktop-CGI-Server: index.js: browserWindow.webContents.did-fail-load Event invoked #009");
        win.loadURL('http://localhost:' + config.server.port + "/err");
    }.bind(win));

    // Web Content Loading
    // https://www.electronjs.org/docs/api/web-contents

    if (!!applicationConfiguration.tray && !!applicationConfiguration.trayIcon) {
        let contextMenu
        try {
            trayIcon = new Tray(path.join(applicationConfiguration.basePath, applicationConfiguration.trayIcon));
            contextMenu = Menu.buildFromTemplate(notes.map(addNoteToTrayMenu));
        } catch (e) {
            console.log("Desktop-CGI-Server: index.js: Error in tray icon #010 ", e.toString())
        };
        trayIcon.setToolTip(!!applicationConfiguration.trayTooltip ? applicationConfiguration.trayTooltip : "DesktopCGI Application");
        trayIcon.setContextMenu(contextMenu);
    }

    win.webContents.on('dom-ready', () => {
        console.log("Desktop-CGI-Server: index.js: app.webContents.dom-ready Event invoked #011");
        displayNoteToTray(notes[0], win);
    });

    return win;
}


console.log("Desktop-CGI-Server: index.js: setting app paths #012");

// app = createWindow();

// // // // electron.app.setPath('temp', process.cwd() + applicationConfiguration.temp);
// // // // electron.app.setPath('cache', process.cwd() + applicationConfiguration.cache);
// // // // electron.app.setPath('downloads', process.cwd() + applicationConfiguration.downloads);
// // // // electron.app.setPath('userData', process.cwd() + applicationConfiguration.userData);
// // // // electron.app.setPath('logs', process.cwd() + applicationConfiguration.logs);
// // // // electron.app.setPath('recent', process.cwd() + applicationConfiguration.recent);

app.setPath('temp', path.join(dirname, applicationConfiguration.temp));
app.setPath('cache', path.join(dirname, applicationConfiguration.cache));
app.setPath('downloads', path.join(dirname, applicationConfiguration.downloads));
app.setPath('userData', path.join(dirname, applicationConfiguration.userData));
app.setPath('logs', path.join(dirname, applicationConfiguration.logs));
app.setPath('recent', path.join(dirname, applicationConfiguration.recent));


// // Failed to set path error
// // electron.app.setPath('crashDump', applicationConfiguration.crashDump)
// electron.app.setPath('appData', process.cwd() + applicationConfiguration.appData);


// // Failed to set path error
// // app.setPath('crashDump', path.join(dirname, applicationConfiguration.crashDump))
app.setPath('appData', path.join(dirname, applicationConfiguration.appData));


// // 
// // Alternatively, use following AppData path based on OS
// // aix, darwin, freebsd, linux, openbsd, sunos, win32
// // 
// // os.type 
// //   "Darwin" for MacOS, "Linux" for Linux and "Windows_NT" for windows
// // os.arch
// //   "x32", "x64", "arm", "arm64", "s390", "s390x", "mipsel", "ia32", "mips", "ppc" and "ppc64".
// // os.platform
// //   "aix", "android", "darwin", "freebsd", "linux", "openbsd", "sunos", and "win32"
// // 
// // if (process.platform === 'win32' || process.platform === '') {
// //     app.setPath('appData', '%APPDATA%')
// // } else if (process.platform === 'darwin') {
// //     app.setPath('appData', '$XDG_CONFIG_HOME')
// // } else if (process.platform === 'linux') {
// //     app.setPath('appData', '~/Library/Application Support')
// // }
// // 

app.whenReady().then(function () {
    console.log("Desktop-CGI-Server: index.js: app.whenReady Event invoked #013");
    win = createWindow(dirname, config, options);

    const icon = nativeImage.createFromPath('path/to/asset.png');

    app.on('activate', () => {
        console.log("Desktop-CGI-Server: index.js: app.activate Event invoked #014");
        if (win === null) {
            if (BrowserWindow.getAllWindows().length === 0) createWindow(dirname, config, options);
        }
    });
}.bind(null, config, options, win));

app.on('window-all-closed', () => {
    console.log("Desktop-CGI-Server: index.js: app.window-all-closed Event invoked #015");
    if (process.platform !== 'darwin') {
        app.quit();
        // apps = {};
        app = {};
    }
});
