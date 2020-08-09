const U = require('./util');
const c = require('./constants');
const BaseChildOp = require('./base_childOp');
const RoadOp = require('./room_roadOp')
const HarvestingOp = require('./room_harvestingOp');
const BuildingOp = require('./room_buildingOp');
const ReservationOp = require('./room_reservationOp');

module.exports = class RoomOp extends BaseChildOp {
    /**@param {BaseOp} baseOp
     * @param {String} roomName
     * @param {number} distance the distance (in rooms) from the base room
     */
    constructor(baseOp, roomName, distance) {
        super(baseOp);
        this._roomName = roomName;
        this.addChildOp(new RoadOp(this));
        this.addChildOp(new BuildingOp(this));
        this.addChildOp(new ReservationOp(this))

        //add roomOp to room for debugging
        // @ts-ignore
        Game.rooms[roomName].roomOp = this;


        // calculate room distance from base.
        if (Memory.rooms[roomName] == undefined) Memory.rooms[roomName] = {distanceOffset: Math.random()}
        this._distanceOffset = Memory.rooms[roomName].distanceOffset || Math.random();
        Memory.rooms[roomName].distanceOffset = this._distanceOffset;
        if (distance == 0) this._distance = 0;
        else this._distance = distance + this._distanceOffset;


        this._harvestingOpCreated = false;
        this._verbose = false;
    }

    get roomName() {return this._roomName}

    /**@returns {Room} */
    get room() {
        let result = Game.rooms[this.roomName]
        return result;
    }
    get type() {return c.OPERATION_ROOM}

    /* return the distance in room from the base. This includes a constant random modifier between 0 and 1. Use Math.floor to 
        get the real distance */
    get distance() {return this._distance}

    get buildingOp() {return /**@type {BuildingOp} */ (this._childOps[c.OPERATION_BUILDING][0])}

    _firstRun() {
        this._tactics();
    }

    _strategy() {
        if (   this._harvestingOpCreated 
            && this.room 
            && this.room.controller 
            && ( (this.room.controller.level > 0 && !this.room.controller.my)
                || (this.room.controller.reservation && (this.room.controller.reservation.username != this._shardOp.userName) ))
           ) {
            for (let harvestingOp of this._childOps[c.OPERATION_HARVESTING]) {
                this.removeChildOp(harvestingOp)
            }
            this._harvestingOpCreated = false;
        }
    }
    
    _tactics() {
        if (  !this._harvestingOpCreated 
                && this.room 
                && this.room.controller 
                && (this.room.controller.level == 0  || this.room.controller.my)
                && (!this.room.controller.reservation || (this.room.controller.reservation.username == this._shardOp.userName) )
               ) {
            let i = 0;
            for (let source of this.room.find(FIND_SOURCES)) {
                let harvestingOp = new HarvestingOp(this, source.id, i++)
                this.addChildOp(harvestingOp);
            }    
            this._harvestingOpCreated = true;
        }
    }
}
