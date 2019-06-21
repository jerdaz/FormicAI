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

    _command() {
        this._shardOp.initTick();
        this._shardOp.run();
    };
}

let main = new Main;
let debug = new Debug;

module.exports.loop = function() {
    // @ts-ignore
    Game.debug = debug;
    // @ts-ignore
    Game.main = main;
    main.run(); 
}
