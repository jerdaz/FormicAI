let ShardOp = require('./shardOp');

console.log('GLOBAL INIT');

class Main {
    constructor() {
        this._shardOp = new ShardOp();
    }

    run() {
        this._strategy();
        this._command();
    }

    _strategy() {};

    _command() {
        this._shardOp.run();
    };
}


module.exports.loop = function() {
    let main = new Main;
    main.run();
}
