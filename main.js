let ShardOps = require('./shardOps');

class Main {
    constructor() {
        this._shardOps = new ShardOps();
    }

    run() {
        this._strategy();
        this._command();
    }

    _strategy() {};

    _command() {
        this._shardOps.run();
    };
}


module.exports.loop = function() {
    let main = new Main;
    main.run();
}
