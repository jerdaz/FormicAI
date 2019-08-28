let U = require('./util');
const c = require('./constants');
let ShardChildOp = require('./shardChildOp');

module.exports = class BaseChildOp extends ShardChildOp {
    /**@param {BaseOp}  baseOp */
    constructor(baseOp) {
        super(baseOp, baseOp.shardOp, baseOp);
        this._baseOp = baseOp;
        this._baseName = baseOp.getName();
    }

    get baseOp() {return this._baseOp}
}
