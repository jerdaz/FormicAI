let U = require('./util')
const c = require('./constants');
const Operation = require('./000_operation');

module.exports = class ChildOp extends Operation{
    /**@param {Operation} parent */
    constructor(parent) {
        super()
        this._parent = parent;
    }
}
