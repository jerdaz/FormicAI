let U = require('./util');
const c = require('./constants');
const BaseChildOp = require('./base_childOp')

module.exports = class RoomChildOp extends BaseChildOp {
    /**
     * @param {RoomOp} roomOp
     * @param {Number} [instance]
     */
    constructor(roomOp, instance) {
        super(roomOp.baseOp, roomOp, instance);
        this._roomName = roomOp.roomName
        this._parent = roomOp;
        this._roomOp = roomOp;
        this._isMainRoom = (this._roomName == this._baseName)
    }

    get roomName() {return this._roomName}

    get isMainRoom() {return this._isMainRoom}

}
