'use strict'
let shardOps = require('shardOps');

function main() {
    strategy();
    command();
}

function strategy() {

}

function command() {
    shardOps();
}

module.exports.loop = main();
