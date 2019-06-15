var shard = require('shard.js');

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
    main();
}
