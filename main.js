'use strict'

function main() {
    strategy();
    command();
}

function strategy() {

}

function command() {
    var shardOps = require('shardOps');
    shardOps.main();
}

module.exports.loop = function () {
    shard();
}
