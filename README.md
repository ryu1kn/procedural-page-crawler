
# Page Crawler

This script does:

* Receive instructions: where to go, what to do
* Execute every instruction one-by-one, making expression result available to the following steps

## Usage

```sh
$ bin/crawl --instructions ./instructions.js --output output.json
```

```js
// instructions.js
module.exports = {

    // Instructions to be executed
    instructions: [
        {
            // URLs to visit
            locations: ['https://a.example.com'],

            // Expression to be executed in the browser. Expression result will become available
            // for the following instructions as `context.instructionResults[INSTRUCTION_INDEX]`
            expression: "[...document.querySelectorAll('.where-to-go-next')].map(el => el.innerText)"
        },
        {
            // locations can be a function
            locations: context => {
                // Use the result of the 1st location of the 1st instruction
                return context.instructionResults[0][0];
            },
            expression: "[...document.querySelectorAll('.what-to-get')].map(el => el.innerText)"
        }
    ],

    // Final result is the result of the 2nd instruction
    output: context => context.instructionResults[1]
}
```

## Test

```sh
$ yarn run test:e2e
```

## Refs

* [Getting Started with Headless Chrome](https://developers.google.com/web/updates/2017/04/headless-chrome)
* [Chrome DevTools Protocol Viewer](https://chromedevtools.github.io/devtools-protocol/tot/)
