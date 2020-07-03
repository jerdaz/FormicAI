let U = require('./util');
const c = require('./constants');
let ShardChildOp = require('./shard_childOp');

module.exports = class BaseChildOp extends ShardChildOp {
    /**
     * @param {BaseOp}  baseOp
     * @param {RoomOp} [roomOp]
     * @param {Number} [instance]
     */
    constructor(baseOp, roomOp, instance) {
        super(baseOp, baseOp.shardOp, baseOp, roomOp, instance);
        this._baseOp = baseOp;
        this._baseName = baseOp.name;
    }

    get baseOp() {return this._baseOp}

    get roomName() {return this._baseName};
}
