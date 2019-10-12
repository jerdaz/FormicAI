const Debug = require('./debug');
const MainOp = require('./main_mainOp');

let debug = new Debug;
/**@type {any}*/(Game).debug = debug;
let mainOp = new MainOp;

module.exports.loop = function() {
    /**@type {any}*/(Game).debug = debug;
    /**@type {any}*/(Game).main = mainOp;
    mainOp.initTick();
    mainOp.run();
    if (debug.verbose) {
        debug.printVerboseLog();
        debug.verbose = false;
    }
    debug.throwErrors();
}
