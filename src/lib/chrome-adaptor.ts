import chromeLauncher = require('chrome-launcher');
import CDP = require('chrome-remote-interface');
import {LaunchedChrome} from 'chrome-launcher';
import {Expression, Location} from '../index';

export type EvaluationResult = any;

export class ChromeAdaptor {
    private chrome?: LaunchedChrome;
    private protocol?: any;
    private browserReady = false;

    private async prepareBrowser(): Promise<void> {
        await (!this.browserReady && this._prepareBrowser());
    }

    private async _prepareBrowser(): Promise<void> {
        const chrome = await ChromeAdaptor._launchChrome();
        const protocol = await CDP({port: chrome.port});
        await Promise.all([protocol.Page.enable(), protocol.Runtime.enable()]);

        this.chrome = chrome;
        this.protocol = protocol;
        this.browserReady = true;
    }

    private static _launchChrome(): Promise<LaunchedChrome> {
        const width = 1440;
        const height = 600;
        return chromeLauncher.launch({
            chromeFlags: [
                `--window-size=${width},${height}`,
                '--disable-gpu',
                '--headless'
            ]
        });
    }

    async evaluateExpression(location: Location, expression: Expression): Promise<EvaluationResult> {
        await this.prepareBrowser();

        const protocol = this.protocol;
        const result = await new Promise((resolve, reject) => {
            protocol.Page.navigate({url: location});
            protocol.Page.domContentEventFired(() => {
                const params = {
                    expression,
                    returnByValue: true,
                    awaitPromise: true
                };
                return protocol.Runtime.evaluate(params).then(resolve, reject);
            });
        });
        return this._extractResult(result);
    }

    private _extractResult(evaluationResult: any): EvaluationResult {
        if (evaluationResult.exceptionDetails) {
            const errorString = JSON.stringify(evaluationResult.exceptionDetails, null, 2);
            throw new Error(`Expression evaluation failed: ${errorString}`);
        }
        return evaluationResult.result.value;
    }

    terminate(): void {
        if (this.protocol) this.protocol.close();
        if (this.chrome) this.chrome.kill();
    }
}
