#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import {Crawler} from '../index';

const argv = require('minimist')(process.argv.slice(2));

const logger = argv.verbose ? console : undefined;
const crawler = new Crawler({logger});
const rulePath = path.resolve(argv.rule);
const params = {
    rule: require(rulePath)
};

crawler.crawl(params)
    .then(processResult)
    .catch(e => {
        setTimeout(() => {
            throw e;
        }, 0);
    });

function processResult(result) {
    const data = JSON.stringify(result, null, 2);
    fs.writeFileSync(argv.output, data, 'utf8');
}
