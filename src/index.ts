import {ChromeAdaptor} from './lib/chrome-adaptor';

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

export class Crawler {
    private readonly _logger: Console;
    private readonly chromeAdaptor: ChromeAdaptor;

    constructor(params: CrawlerParams) {
        this._logger = params.logger;
        this.chromeAdaptor = new ChromeAdaptor();
    }

    async crawl(params: CrawlerOption): Promise<CrawlingResult> {
        const instructions = params.instructions;
        await this.chromeAdaptor.init();
        const instructionContext = await this._executeInstructions(instructions.instructions);
        this.chromeAdaptor.terminate();
        return instructions.output(instructionContext);
    }

    private _executeInstructions(instructions: InstructionStep[]): Promise<InstructionContext> {
        const initialContext = {instructionResults: []};
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

    private _executeInstruction(instruction: InstructionStep, context: InstructionContext): Promise<EvaluationResult[]> {
        const locations = typeof instruction.locations === 'function' ?
            instruction.locations(context) :
            instruction.locations;
        const sequentialEvaluations = locations.reduce((promise, location, index) =>
            promise.then(results => {
                this._logger.log(`>> Executing location ${index + 1}/${locations.length}`);
                return this._executeExpression(location, instruction.expression)
                    .then(result => [...results, result]);
            }),
            Promise.resolve([])
        );
        return sequentialEvaluations;
    }

    private _executeExpression(location: Location, expression: Expression): Promise<EvaluationResult> {
        const adaptor = this.chromeAdaptor;
        return new Promise((resolve, reject) => {
            adaptor.Page.navigate({url: location});
            adaptor.Page.domContentEventFired(() => {
                const params = {
                    expression,
                    returnByValue: true,
                    awaitPromise: true
                };
                return adaptor.Runtime.evaluate(params).then(resolve, reject);
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
}
