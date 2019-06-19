let c = require('./constants');

module.exports = class Operation {
    constructor() {
        this._firstRun = true;
        /**@type {Instruction} */
        this._instruction = {command: c.COMMAND_NONE};
    }

    /**@param {Instruction} instruction */
    setInstr(instruction) {
        this._instruction = instruction;
    }

    /**@returns {Instruction} instruction */
    getInstr() {
        return this._instruction;
    }

    run() {
        this._support();
        this._strategy();
        this._command();
        if (this._firstRun) this._firstRun = false;
    }

    _support() {}
    _strategy() {}
    _command() {}
}
