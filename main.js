'use strict'

function main() {
    strategy();
    command();
}

function strategy() {

}

function command() {
    var shardOps = require('shardOps');
    shardOps();
}

module.exports.loop = main();

