const {join} = require('path');
const assert = require('assert');

const rule = require(join(__dirname, 'rule.js'));

import('procedural-page-crawler')
    .then(({Crawler}) => new Crawler().crawl({rule}))
    .then(output => {
        assert.equal('About | Procedural Page Crawler', output);
    })
    .catch(e => {
        setTimeout(() => { throw e; });
    });
