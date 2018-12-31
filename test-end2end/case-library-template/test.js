const {Crawler} = require('procedural-page-crawler');
const {join} = require('path');
const assert = require('assert');

const crawler = new Crawler();
const rule = require(join(__dirname, 'rule.js'));

crawler.crawl({rule})
    .then(output => {
        assert.equal('About | Procedural Page Crawler', output);
    })
    .catch(e => {
        setTimeout(() => { throw e; });
    });
