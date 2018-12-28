import chromeLauncher = require('chrome-launcher');
import CDP = require('chrome-remote-interface');
import {LaunchedChrome} from 'chrome-launcher';
import {Expression, Location} from '../index';

export type EvaluationResult = any;

export class ChromeAdaptor {
    private Runtime?: any;
    private Page?: any;
    private chrome?: LaunchedChrome;
    private protocol?: any;
    private browserReady = false;

    private async prepareBrowser(): Promise<void> {
        if (this.browserReady) return Promise.resolve();

        const chrome = await ChromeAdaptor._launchChrome();
        const protocol = await CDP({port: chrome.port});
        const {Page, Runtime} = protocol;
        this.chrome = chrome;
        this.protocol = protocol;
        this.Runtime = Runtime;
        this.Page = Page;
        await Promise.all([Page.enable(), Runtime.enable()]);
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

        const result = await new Promise((resolve, reject) => {
            this.Page.navigate({url: location});
            this.Page.domContentEventFired(() => {
                const params = {
                    expression,
                    returnByValue: true,
                    awaitPromise: true
                };
                return this.Runtime.evaluate(params).then(resolve, reject);
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
        this.protocol && this.protocol.close();
        this.chrome && this.chrome.kill();
    }
}
