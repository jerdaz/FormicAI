const U = require('./util');
const { stringify } = require('./util');

module.exports = class Debug {
    constructor(){
        /**@type {Error[]} */
        this._errors = [];
        /**@type {Boolean} */
        this._verbose = false;
        /**@type {Object[]} */
        this._verboseLog = [];
    }

    //Print entire AI state as json.
    dumpMain() {
        U.l(/**@type {any}) */(Game).main);
    }

    /**@returns {Boolean} */
    get verbose(){
        return this._verbose;
    }

    /**@param {Boolean} newVerbose*/
    set verbose(newVerbose) {
        this._verbose = newVerbose
    }

    //log an error
    /**@param {Error} err */
    static logError(err) {
        let message = err.message;
        let stack = err.stack;
        if (stack) {
            message += '\n'
            message += stack;
        }
        for (let line of message.split('\n')) U.l(line)
        Game.notify(JSON.stringify(message));
    }

    //log state of an object in verbose log
    /**
     * @param {String} state
     * @param {Object} object */
    logState(state, object) {
        this._verboseLog.push(object.constructor.name + ' - ' + state);
        this._verboseLog.push(Object.assign({}, object));
        if (this._errors.length > 0) {
            this._verboseLog.push(this._errors);
            this._errors = [];
        }
    }

    printVerboseLog() {
        U.l(this._verboseLog);
    }

    //prints errors to console and deletes them
    printErrors() {
        for(let err of this._errors) {
            U.l(err);
        }
        this._errors = []
    }

    //throws all logged errors
    throwErrors() {
        for(let err of this._errors) throw err;
    }
}
