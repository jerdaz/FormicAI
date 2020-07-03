const U = require('./util');
const c = require('./constants');
const BaseChildOp = require('./base_childOp');
const RoadOp = require('./room_roadOp')
const HarvestingOp = require('./room_harvestingOp');

module.exports = class roomOp extends BaseChildOp {
    /**@param {BaseOp} baseOp
     * @param {String} roomName
     */
    constructor(baseOp, roomName) {
        super(baseOp);
        this._roomName = roomName;
        this.addChildOp(new RoadOp(this));


        this._harvestingOpCreated = false;
        this._verbose = false;
    }

    get roomName() {return this._roomName}
    /**@returns {Room | undefined} */
    get room() {return Game.rooms[this.roomName]}
    get type() {return c.OPERATION_ROOM}

    _firstRun() {
        this._tactics();
    }
    
    _tactics() {
        if (!this._harvestingOpCreated && this.room) {
            let i = 0;
            for (let source of this.room.find(FIND_SOURCES)) {
                let harvestingOp = new HarvestingOp(this, source.id, i++)
                this.addChildOp(harvestingOp);
                this._harvestingOpCreated = true;
            }    
        }
    }
}
