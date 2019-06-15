'use strict'

function main() {
    strategy();
    command();
}

function strategy() {

}

function command() {
    let shardOps = require('shardOps');
    shardOps();
}

module.exports.loop = main();

//x