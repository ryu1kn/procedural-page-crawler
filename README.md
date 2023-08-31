![Build](https://github.com/ryu1kn/procedural-page-crawler/workflows/Build/badge.svg?branch=master)

# Procedural Page Crawler

This crawler does:

* Receive instructions: where to go, what to do
* Execute every instruction one-by-one, making expression result available to the following steps

You can use this as a command line tool or a JS library.

## Prerequisite

This crawler uses Headless Chrome, so Chrome needs to be installed on your machine.

## Disclaimer

This tool started off as a one-time JS script that helps another project. Later I found myself using
this in several of my other projects. When I changed the language to TypeScript, I needed to compile and
publish it to a npm registry instead of directly installing it from its github repo; so here you see this.
You're welcome to use this but I just want to make sure that you have a right expectation... 🙂

## Usage

### Use it as a command line tool

```sh
$ node_modules/.bin/crawl --rule ./rule.js --output output.json
```

Here, `rule.js` would look like this. The result will be written to `output.json`.

```js
// rule.js
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

    // Here, the final result is the result of the 2nd instruction
    output: context => context.instructionResults[1]
}
```

### Use it as a library

You can do:

```js
import {Crawler} from 'procedural-page-crawler';

// Or, if you're still using CommonJS module and not EcmaScript module, then
// const {Crawler} = await import('procedural-page-crawler');

const crawler = new Crawler();
const rule = {/* The same structure rule you give when you use the Crawler as a command line tool */};

crawler.crawl({rule}).then(output => {
    // `output` is the result of `rule.output` evaluation.
});
```

For more information on how to use it as a library, see `src/bin/crawl.ts`.

## Test

```sh
$ yarn run test:e2e
```

## Refs

* [Getting Started with Headless Chrome](https://developers.google.com/web/updates/2017/04/headless-chrome)
* [Chrome DevTools Protocol Viewer](https://chromedevtools.github.io/devtools-protocol/tot/)
