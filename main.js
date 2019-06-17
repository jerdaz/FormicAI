'use strict'
let shardOps = require('shardOps');

class Main {
    run() {
        this._strategy();
        this._command();
    }

    _strategy() {};

    _command() {
        shardOps.run();
    };
}


module.exports.loop = function() {
    let main = new Main;
    main.run();
}
