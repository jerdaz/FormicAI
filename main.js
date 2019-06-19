let U = require('./util');
let Operation = require('./operation');
let ShardOp = require('./shardOp');

class Main extends Operation {
    constructor() {
        super();
        U.l('INIT MAIN');
        this._shardOp = new ShardOp();
    }

    _command() {
        this._shardOp.initTick();
        this._shardOp.run();
    };
}

let main = new Main;

module.exports.loop = function() {
    main.run();
}
