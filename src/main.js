const Debug = require('./debug');
const MainOp = require('./mainOp');
const version = require('./version');
const c = require('./constants');

let debug = new Debug;
let mainOp = new MainOp;

module.exports.loop = function() {
    /**@type {any}*/(Game).debug = debug;
    /**@type {any}*/(Game).main = mainOp;
    /**@type {any}*/(Game).shardOp = mainOp.childOps[c.OPERATION_SHARD][0];
    mainOp.initTick();
    mainOp.run();
    if (debug.verbose) {
        debug.printVerboseLog();
        debug.verbose = false;
    }
    debug.throwErrors();
}
