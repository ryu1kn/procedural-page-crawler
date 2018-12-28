import chromeLauncher = require('chrome-launcher');
import CDP = require('chrome-remote-interface');
import {LaunchedChrome} from 'chrome-launcher';

export class ChromeAdaptor {
    public Runtime?: any;
    public Page?: any;
    private chrome?: LaunchedChrome;
    private protocol?: any;

    init(): Promise<void> {
        return this._launchChrome()
            .then(chrome =>
                CDP({port: chrome.port}).then(async protocol => {
                    const {Page, Runtime} = protocol;
                    this.chrome = chrome;
                    this.protocol = protocol;
                    this.Runtime = Runtime;
                    this.Page = Page;
                    await Promise.all([Page.enable(), Runtime.enable()]);
                })
            );
    }

    private _launchChrome(options: {width?: number, height?: number} = {}) {
        const width = options.width || 1440;
        const height = options.height || 600;
        return chromeLauncher.launch({
            chromeFlags: [
                `--window-size=${width},${height}`,
                '--disable-gpu',
                '--headless'
            ]
        });
    }

    terminate(): void {
        this.protocol.close();
        this.chrome.kill();
    }
}
