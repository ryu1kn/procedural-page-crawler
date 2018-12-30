[![Build Status](https://travis-ci.org/ryu1kn/page-crawler.svg?branch=master)](https://travis-ci.org/ryu1kn/page-crawler)

# Procedural Page Crawler

This script does:

* Receive instructions: where to go, what to do
* Execute every instruction one-by-one, making expression result available to the following steps

## Disclaimer

This tool started off as a one-time JS script that helps another project. Later I found myself using
this in several of my other projects. When I changed the language to TypeScript, I needed to compile and
publish it to a npm registry instead of directly installing it from its github repo; so here you see this.
You're welcome to use this but I just want to make sure that you have a right expectation... 🙂

## Usage

```sh
$ bin/crawl --rule ./rule.js --output output.json
```

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

## Test

```sh
$ yarn run test:e2e
```

## Refs

* [Getting Started with Headless Chrome](https://developers.google.com/web/updates/2017/04/headless-chrome)
* [Chrome DevTools Protocol Viewer](https://chromedevtools.github.io/devtools-protocol/tot/)
