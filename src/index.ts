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
    private readonly logger: Logger;
    private readonly chromeAdaptor: ChromeAdaptor;

    constructor(params: CrawlerParams) {
        this.logger = params.logger || new NullLogger();
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

    private async _executeInstructions(instructions: InstructionStep[]): Promise<InstructionContext> {
        const initialContext = {instructionResults: []};
        const finalContext = await instructions.reduce(
            async (promiseOfContext, instruction, index) => {
                const context = await promiseOfContext;
                this.logger.log(`> Executing instruction ${index + 1}/${instructions.length}`);
                const result = await this._executeInstruction(instruction, context);
                return Object.assign({}, context, {instructionResults: [...context.instructionResults, result]});
            },
            Promise.resolve(initialContext)
        );
        return {instructionResults: finalContext.instructionResults};
    }

    private _executeInstruction(instruction: InstructionStep, context: InstructionContext): Promise<EvaluationResult[]> {
        const locations = typeof instruction.locations === 'function' ?
            instruction.locations(context) :
            instruction.locations;
        return locations.reduce(
            async (promise, location, index) => {
                const results = await promise;
                this.logger.log(`>> Executing location ${index + 1}/${locations.length}`);
                const result = await this.chromeAdaptor.evaluateExpression(location, instruction.expression);
                return [...results, result];
            },
            Promise.resolve([])
        );
    }
}
