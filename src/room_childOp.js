let U = require('./util');
const c = require('./constants');
let BaseChildOp = require('./base_childOp')

module.exports = class RoomChildOp extends BaseChildOp {
    /**
     * @param {RoomOp} roomOp
     * @param {Number} [instance]
     */
    constructor(roomOp, instance) {
        super(roomOp.baseOp, instance);
        this._roomName = roomOp.roomName
        this._parent = roomOp;
    }

}
