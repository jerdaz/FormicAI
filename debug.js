// @ts-nocheck
U = require('./util')

module.exports = class Debug {
    dumpMain() {
        U.l(Game.main);
    }
}
