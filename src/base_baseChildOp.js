let U = require('./util');
const c = require('./constants');
let ShardChildOp = require('./shard_shardChildOp');

module.exports = class BaseChildOp extends ShardChildOp {
    /**
     * @param {BaseOp}  baseOp
     * @param {Number} [instance]
     */
    constructor(baseOp, instance) {
        super(baseOp, baseOp.shardOp, baseOp, instance);
        this._baseOp = baseOp;
        this._baseName = baseOp.name;
    }

    get baseOp() {return this._baseOp}
}
