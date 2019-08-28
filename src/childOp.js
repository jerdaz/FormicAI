let U = require('./util')
const c = require('./constants');
const Operation = require('./operation');

//unique id of Operation
let idIndex = 0;

module.exports = class ChildOp extends Operation{
    /**@param {Operation} parent */
    constructor(parent) {
        super()
        this._parent = parent;
    }
}
