const U = require('./util');
const DebugType = require('./debug');
const MainOp = require('./mainOp');
const version = require('./version');
const c = require('./constants');


let debug = new DebugType;
let mainOp = new MainOp;

module.exports.loop = function() {

    mainOp.initTick();

    mainOp.run();
    if (debug.verbose) {
        debug.printVerboseLog();
        debug.verbose = false;
    }
}
 