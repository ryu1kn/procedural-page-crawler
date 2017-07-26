
const chromeLauncher = require('chrome-launcher');
const CDP = require('chrome-remote-interface');
const fs = require('fs');
const argv = require('minimist')(process.argv.slice(2));

const EXIT_CODE_ERROR = 1;

main(argv);

async function main(argv) {
    const chrome = await launchChrome();
    const protocol = await CDP({port: chrome.port});
    const {Page, Runtime} = protocol;
    await Promise.all([Page.enable(), Runtime.enable()]);

    const expression = fs.readFileSync(argv.script, 'utf8');

    const startTime = new Date();

    Page.navigate({url: argv.location});
    Page.loadEventFired(async () => {
        const evaluationResult = await Runtime.evaluate({
            expression,
            awaitPromise: true
        });
        const elapsedTime = new Date() - startTime;

        if (argv.screenshot) {
            const screenCapture = await Page.captureScreenshot();
            fs.writeFileSync(argv.screenshot, new Buffer(screenCapture.data, 'base64'))
        }

        protocol.close();
        chrome.kill();

        console.log('Elapsed time:', elapsedTime);
        if (evaluationResult.exceptionDetails) {
            console.error(evaluationResult.exceptionDetails);
            process.exit(EXIT_CODE_ERROR);
        }
        console.log('Script return value:', evaluationResult.result.value);
    });
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
