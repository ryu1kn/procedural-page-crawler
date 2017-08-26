
const chromeLauncher = require('chrome-launcher');
const CDP = require('chrome-remote-interface');
const fs = require('fs');
const argv = require('minimist')(process.argv.slice(2));

const EXIT_CODE_ERROR = 1;

main(argv).catch(e => {
    setTimeout(() => {
        throw e;
    }, 0);
});

function main(argv) {
    const state = {
        location: argv.location,
        screenshot: argv.screenshot,
        expression: fs.readFileSync(argv.expression, 'utf8')
    };
    return Promise.resolve(state)
        .then(prepareChrome)
        .then(measureTime)
        .then(takeScreenshotIfNeeded)
        .then(terminateChrome)
        .then(printResult);
}

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

function measureTime(state) {
    return new Promise((resolve, reject) => {
        const startTime = new Date();
        state.Page.navigate({url: state.location});
        state.Page.loadEventFired(() => {
            const params = {
                expression: state.expression,
                awaitPromise: true
            };
            return state.Runtime.evaluate(params)
                .then(evaluationResult => ({
                    evaluationResult,
                    elapsedTime: new Date() - startTime
                }))
                .then(resolve, reject);
        });
    }).then(result => Object.assign({}, state, result));
}

function takeScreenshotIfNeeded(state) {
    if (!state.screenshot) return state;
    return state.Page.captureScreenshot()
        .then(screenCapture => {
            fs.writeFileSync(state.screenshot, new Buffer(screenCapture.data, 'base64'));
        })
        .then(() => state);
}

function terminateChrome(state) {
    state.protocol.close();
    state.chrome.kill();
    return state;
}

function printResult(state) {
    console.log('Elapsed time:', state.elapsedTime);
    const evaluationResult = state.evaluationResult;
    if (evaluationResult.exceptionDetails) {
        const errorString = JSON.stringify(evaluationResult.exceptionDetails, true, 2);
        throw new Error(`Expression evaluation failed: ${errorString}`);
    }
    console.log('Script return value:', evaluationResult.result.value);
}
