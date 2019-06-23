// @ts-nocheck
U = require('./util')

module.exports = class Debug {
    dumpMain() {
        U.l(Game.main);
    }
}


    /**@param {any} err */
    static log_error(err) {
        this.l(err);
        Game.notify(JSON.stringify(err), 60 * 4);
    }

