
const chromeLauncher = require('chrome-launcher');
const CDP = require('chrome-remote-interface');

module.exports = function main(params) {
    const state = {
        settings: require(params.instructions)
    };
    return Promise.resolve(state)
        .then(prepareChrome)
        .then(executeInstructions)
        .then(terminateChrome)
        .then(buildResult);
};

function prepareChrome(state) {
    return launchChrome()
        .then(chrome =>
            CDP({port: chrome.port}).then(protocol => {
                const {Page, Runtime} = protocol;
                return Promise.all([Page.enable(), Runtime.enable()])
                    .then(() => ({chrome, protocol, Page, Runtime}));
            })
        )
        .then(chromeObjects => Object.assign({}, state, chromeObjects));
}

function launchChrome(options = {}) {
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

function executeInstructions(state) {
    const initialContext = {
        Page: state.Page,
        Runtime: state.Runtime,
        instructionResults: []
    };
    return state.settings.instructions.reduce(
        (promiseOfContext, instruction, index) =>
            promiseOfContext.then(context => {
                console.log(`> Executing instruction ${index + 1}/${state.settings.instructions.length}`);
                return executeInstruction(instruction, context).then(result =>
                    Object.assign({}, context, {instructionResults: [...context.instructionResults, result]})
                );
            }),
        Promise.resolve(initialContext)
    ).then(context => Object.assign({}, state, {
        instructionContext: {instructionResults: context.instructionResults}
    }));
}

function executeInstruction(instruction, context) {
    const locations = typeof instruction.locations === 'function' ?
        instruction.locations(context) :
        instruction.locations;
    const sequentialEvaluations = locations.reduce((promise, location, index) =>
        promise.then(results => {
            console.log(`>> Executing location ${index + 1}/${locations.length}`);
            return executeExpression(location, instruction.expression, context)
                .then(result => [...results, result])
        }),
        Promise.resolve([])
    );
    return sequentialEvaluations;
}

function executeExpression(location, expression, context) {
    return new Promise((resolve, reject) => {
        context.Page.navigate({url: location});
        context.Page.loadEventFired(() => {
            const params = {
                expression,
                awaitPromise: true
            };
            return context.Runtime.evaluate(params).then(resolve, reject);
        });
    })
    .then(result => JSON.parse(extractResult(result)));
}

function extractResult(evaluationResult) {
    if (evaluationResult.exceptionDetails) {
        const errorString = JSON.stringify(evaluationResult.exceptionDetails, true, 2);
        throw new Error(`Expression evaluation failed: ${errorString}`);
    }
    return evaluationResult.result.value;
}

function terminateChrome(state) {
    state.protocol.close();
    state.chrome.kill();
    return state;
}

function buildResult(state) {
    return state.settings.output(state.instructionContext);
}
