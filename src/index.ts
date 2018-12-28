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
            const instructionResults = await this._executeInstructions(instructions.instructions);
            return instructions.output({instructionResults});
        } finally {
            this.chromeAdaptor.terminate();
        }
    }

    private _executeInstructions(instructions: InstructionStep[]): Promise<EvaluationResult[]> {
        return instructions.reduce(
            async (promiseOfResults, instruction, index) => {
                const prevResults = await promiseOfResults;
                this.logger.log(`> Executing instruction ${index + 1}/${instructions.length}`);
                const newResult = await this._executeInstruction(instruction, {instructionResults: prevResults});
                return [...prevResults, newResult];
            },
            Promise.resolve([])
        );
    }

    private _executeInstruction(instruction: InstructionStep, context: InstructionContext): Promise<EvaluationResult[]> {
        const locations = typeof instruction.locations === 'function' ?
            instruction.locations(context) :
            instruction.locations;
        return locations.reduce(
            async (promise, location, index) => {
                const locationResults = await promise;
                this.logger.log(`>> Executing location ${index + 1}/${locations.length}`);
                const newLocationResult = await this.chromeAdaptor.evaluateExpression(location, instruction.expression);
                return [...locationResults, newLocationResult];
            },
            Promise.resolve([])
        );
    }
}
