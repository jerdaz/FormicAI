let U = require('./util');
let Operation = require('./operation');
let ShardOp = require('./shardOp');
let Debug = require('./debug');

class Main extends Operation {
    constructor() {
        super();
        U.l('INIT MAIN');
        for (let memObj in Memory) {
            // @ts-ignore
            delete Memory[memObj];
        }
        this._shardOp = new ShardOp();
    }

    initTick() {
        this._shardOp.initTick();
    }

    _command() {
        this._shardOp.run();
    };
}
let debug = new Debug;
/**@type {any}*/(Game).debug = debug;
let main = new Main;

module.exports.loop = function() {
    /**@type {any}*/(Game).debug = debug;
    /**@type {any}*/(Game).main = main;
    main.initTick();
    main.run();
    if (debug.verbose) {
        debug.printVerboseLog();
        debug.verbose = false;
    }
    debug.throwErrors();
}
