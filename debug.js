let U = require('./util')

module.exports = class Debug {
    constructor(){
        /**@type {Error[]} */
        this._errors = [];
        /**@type {Boolean} */
        this._verbose = false;
    }

    //Print entire AI state as json.
    dumpMain() {
        U.l(/**@type {any}) */(Game).main);
    }

    /**@returns {Boolean} */
    get verbose(){
        return this.verbose;
    }

    /**@param {Boolean} newVerbose*/
    set verbose(newVerbose) {
        this._verbose = newVerbose
    }

    //log an error
    /**@param {Error} err */
    logError(err) {
        this._errors.push(err);
    }

    //prints errors to console and deletes them
    printErrors() {
        for(let err in this._errors) {
            U.l(err);
        }
        this._errors = []
    }

    //throws all logged errors
    throwErrors() {
        for(let err in this._errors) throw err;
    }
}
