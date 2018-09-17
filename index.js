
const chromeLauncher = require('chrome-launcher');
const CDP = require('chrome-remote-interface');

class Crawler {

    constructor(params) {
        this._logger = params.logger;
    }

    crawl(params) {
        const state = {
            settings: params.instructions
        };
        return Promise.resolve(state)
            .then(state => this._prepareChrome(state))
            .then(state => this._executeInstructions(state))
            .then(state => this._terminateChrome(state))
            .then(state => this._buildResult(state));
    }

    _prepareChrome(state) {
        return this._launchChrome()
            .then(chrome =>
                CDP({port: chrome.port}).then(protocol => {
                    const {Page, Runtime} = protocol;
                    return Promise.all([Page.enable(), Runtime.enable()])
                        .then(() => ({chrome, protocol, Page, Runtime}));
                })
            )
            .then(chromeObjects => Object.assign({}, state, chromeObjects));
    }

    _launchChrome(options = {}) {
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

    _executeInstructions(state) {
        const initialContext = {
            Page: state.Page,
            Runtime: state.Runtime,
            instructionResults: []
        };
        return state.settings.instructions.reduce(
            (promiseOfContext, instruction, index) =>
                promiseOfContext.then(context => {
                    this._logger.log(`> Executing instruction ${index + 1}/${state.settings.instructions.length}`);
                    return this._executeInstruction(instruction, context).then(result =>
                        Object.assign({}, context, {instructionResults: [...context.instructionResults, result]})
                    );
                }),
            Promise.resolve(initialContext)
        ).then(context => Object.assign({}, state, {
            instructionContext: {instructionResults: context.instructionResults}
        }));
    }

    _executeInstruction(instruction, context) {
        const locations = typeof instruction.locations === 'function' ?
            instruction.locations(context) :
            instruction.locations;
        const sequentialEvaluations = locations.reduce((promise, location, index) =>
            promise.then(results => {
                this._logger.log(`>> Executing location ${index + 1}/${locations.length}`);
                return this._executeExpression(location, instruction.expression, context)
                    .then(result => [...results, result])
            }),
            Promise.resolve([])
        );
        return sequentialEvaluations;
    }

    _executeExpression(location, expression, context) {
        return new Promise((resolve, reject) => {
            context.Page.navigate({url: location});
            context.Page.domContentEventFired(() => {
                const params = {
                    expression,
                    awaitPromise: true
                };
                return context.Runtime.evaluate(params).then(resolve, reject);
            });
        })
        .then(result => this._extractResult(result));
    }

    _extractResult(evaluationResult) {
        if (evaluationResult.exceptionDetails) {
            const errorString = JSON.stringify(evaluationResult.exceptionDetails, true, 2);
            throw new Error(`Expression evaluation failed: ${errorString}`);
        }
        return evaluationResult.result.value;
    }

    _terminateChrome(state) {
        state.protocol.close();
        state.chrome.kill();
        return state;
    }

    _buildResult(state) {
        return state.settings.output(state.instructionContext);
    }

}

module.exports = Crawler;
