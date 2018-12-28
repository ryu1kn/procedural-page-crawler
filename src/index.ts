import {ChromeAdaptor, EvaluationResult} from './lib/chrome-adaptor';
import {Logger, NullLogger} from './lib/logger';

export type Expression = string;
export type Location = string;

interface InstructionStep {
    locations: Location[] | ((c: InstructionContext) => Location[]);
    expression: Expression;
}

interface Instructions {
    instructions: InstructionStep[];
    output: (context: InstructionContext) => CrawlingResult;
}

type CrawlingResult = any;

interface CrawlerParams {
    logger?: Logger;
}

interface InstructionContext {
    instructionResults: EvaluationResult[];
}

interface CrawlerOption {
    instructions: Instructions;
}

export class Crawler {
    private readonly _logger: Logger;
    private readonly chromeAdaptor: ChromeAdaptor;

    constructor(params: CrawlerParams) {
        this._logger = params.logger || new NullLogger();
        this.chromeAdaptor = new ChromeAdaptor();
    }

    async crawl(params: CrawlerOption): Promise<CrawlingResult> {
        try {
            const instructions = params.instructions;
            const instructionContext = await this._executeInstructions(instructions.instructions);
            return instructions.output(instructionContext);
        } finally {
            this.chromeAdaptor.terminate();
        }
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
                return this.chromeAdaptor.evaluateExpression(location, instruction.expression)
                    .then(result => [...results, result]);
            }),
            Promise.resolve([])
        );
        return sequentialEvaluations;
    }
}
