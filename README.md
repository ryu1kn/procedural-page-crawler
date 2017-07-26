
# Measure Page Load Time

This script does:

* Load a specified webpage
* Wait until the expression you give is either resolved/rejected
* Print out the elapsed time (do we need it? Can we use `time` unix command instead?)
* Take a screenshot

## Usage

```sh
$ node app --location 'https://PAGE_YOU_WANT_TO_LOAD' \
           --expression EXPRESSION.js \
           --screenshot SCREENSHOT.png
```

You can give an expression in `EXPRESSION.js` that will be evaluated in the chrome.
The expression MUST produce `Promise`.

```js
// EXPRESSION.js - This gets executed in chrome
Promise.resolve('SUCCESS')
```

## Refs

* [Getting Started with Headless Chrome](https://developers.google.com/web/updates/2017/04/headless-chrome)
* [Chrome DevTools Protocol Viewer](https://chromedevtools.github.io/devtools-protocol/tot/)
