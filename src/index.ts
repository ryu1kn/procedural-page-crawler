import chromeLauncher = require('chrome-launcher');
import CDP = require('chrome-remote-interface');
import {LaunchedChrome} from 'chrome-launcher';

type Expression = string;
type Location = string;

interface InstructionStep {
    locations: Location[] | ((c: InstructionContext) => Location[]);
    expression: Expression;
}

interface Instructions {
    instructions: InstructionStep[];
    output: (context: InstructionContext) => CrawlingResult;
}

type CrawlingResult = any;

type EvaluationResult = any;

interface CrawlerParams {
    logger?: Console;
}

interface InstructionContext {
    instructionResults: EvaluationResult[];
}

interface CrawlerOption {
    instructions: Instructions;
}

interface ChromeObjects {
   chrome: LaunchedChrome;
   protocol: any;
   Page: any;
   Runtime: any;
}

export class Crawler {
    private readonly _logger: Console;

    constructor(params: CrawlerParams) {
        this._logger = params.logger;
    }

    async crawl(params: CrawlerOption): Promise<CrawlingResult> {
        const instructions = params.instructions;
        const {protocol, chrome, Page, Runtime} = await this._prepareChrome();
        const instructionContext = await this._executeInstructions(Page, Runtime, instructions.instructions);
        this._terminateChrome(protocol, chrome);
        return instructions.output(instructionContext);
    }

    private _prepareChrome(): Promise<ChromeObjects> {
        return this._launchChrome()
            .then(chrome =>
                CDP({port: chrome.port}).then(protocol => {
                    const {Page, Runtime} = protocol;
                    return Promise.all([Page.enable(), Runtime.enable()])
                        .then(() => ({chrome, protocol, Page, Runtime}));
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

    private _executeInstructions(Page: any, Runtime: any, instructions: InstructionStep[]): Promise<InstructionContext> {
        const initialContext = {Page, Runtime, instructionResults: []};
        return instructions.reduce(
            (promiseOfContext, instruction, index) =>
                promiseOfContext.then(context => {
                    this._logger.log(`> Executing instruction ${index + 1}/${instructions.length}`);
                    return this._executeInstruction(instruction, context).then(result =>
                        Object.assign({}, context, {instructionResults: [...context.instructionResults, result]})
                    );
                }),
            Promise.resolve(initialContext)
        ).then(context => ({instructionResults: context.instructionResults}));
    }

    private _executeInstruction(instruction: InstructionStep, context: any): Promise<EvaluationResult[]> {
        const locations = typeof instruction.locations === 'function' ?
            instruction.locations(context) :
            instruction.locations;
        const sequentialEvaluations = locations.reduce((promise, location, index) =>
            promise.then(results => {
                this._logger.log(`>> Executing location ${index + 1}/${locations.length}`);
                return this._executeExpression(location, instruction.expression, context)
                    .then(result => [...results, result]);
            }),
            Promise.resolve([])
        );
        return sequentialEvaluations;
    }

    private _executeExpression(location: Location, expression: Expression, context): Promise<EvaluationResult> {
        return new Promise((resolve, reject) => {
            context.Page.navigate({url: location});
            context.Page.domContentEventFired(() => {
                const params = {
                    expression,
                    returnByValue: true,
                    awaitPromise: true
                };
                return context.Runtime.evaluate(params).then(resolve, reject);
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

    private _terminateChrome(protocol: any, chrome: any) {
        protocol.close();
        chrome.kill();
    }
}
