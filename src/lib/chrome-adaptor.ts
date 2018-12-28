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

    evaluateExpression(location: Location, expression: Expression): Promise<EvaluationResult> {
        return new Promise((resolve, reject) => {
            this.Page.navigate({url: location});
            this.Page.domContentEventFired(() => {
                const params = {
                    expression,
                    returnByValue: true,
                    awaitPromise: true
                };
                return this.Runtime.evaluate(params).then(resolve, reject);
            });
        })
            .then(result => this._extractResult(result));
    }

    private _extractResult(evaluationResult: any): EvaluationResult {
        if (evaluationResult.exceptionDetails) {
            const errorString = JSON.stringify(evaluationResult.exceptionDetails, null, 2);
            throw new Error(`Expression evaluation failed: ${errorString}`);
        }
        return evaluationResult.result.value;
    }

    terminate(): void {
        this.protocol.close();
        this.chrome.kill();
    }
}
