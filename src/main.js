const U = require('./util');
const DebugType = require('./debug');
const MainOp = require('./mainOp');
const version = require('./version');
const c = require('./constants');

// Ensure global Memory object exists when running outside the Screeps engine
// Some environments expose `Memory` as a read-only property on the global
// object, which would throw when assigning to `global.Memory`. Guard against
// this by only assigning when the property is writable or absent.
{
    const desc = Object.getOwnPropertyDescriptor(global, 'Memory');
    if ((!desc || desc.writable) && (typeof global.Memory === 'undefined' || global.Memory === null)) {
        global.Memory = {};
    }
}


let debug = new DebugType;
let mainOp = new MainOp;

module.exports.loop = function() {
    // @ts-ignore
    Game.mainOp = mainOp;
    // @ts-ignore
    Game.shardOp = mainOp._shardOp;
    // @ts-ignore
    Game.debug = debug;
    
    mainOp.initTick();

    mainOp.run();
    if (debug.verbose) {
        debug.printVerboseLog();
        debug.verbose = false;
    }
}
 