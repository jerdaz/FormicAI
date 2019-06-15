'use strict'
var shard = require('shard');

function main() {
    strategy();
    command();
}

function strategy() {

}

function command() {
    shard.main();
}

module.exports.loop = function () {
    shard();
}
