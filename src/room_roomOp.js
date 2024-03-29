const U = require('./util');
const c = require('./constants');
const BaseChildOp = require('./base_childOp');
const RoadOp = require('./room_roadOp')
const HarvestingOp = require('./room_harvestingOp');
const BuildingOp = require('./room_buildingOp');
const ReservationOp = require('./room_reservationOp');
const AttackOp = require('./room_attackOp');

const HOSTILE_SAFE_TIME = 50; // number of ticks a room must not be under attack to be considered 'safe'

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
        this.addChildOp(new ReservationOp(this));
        this.addChildOp(new AttackOp(roomName, this, baseOp.shardOp, baseOp, this));

        this._visualiseRoomInfo = false;



        // calculate room distance from base.
        if (!Memory.rooms[roomName]) Memory.rooms[roomName] = {distanceOffset: Math.random(), unclaimTimer:0}
        this._distanceOffset = Memory.rooms[roomName].distanceOffset || Math.random();
        Memory.rooms[roomName].distanceOffset = this._distanceOffset;
        if (distance == 0) this._distance = 0;
        else this._distance = distance + this._distanceOffset;

        this._roomInfo = this._map._roomInfo[roomName];

        this._verbose = false;
    }

    get roomName() {return this._roomName}
    get name() {return this._roomName}

    //return wether or not the room is (expected to be) safe (not under attack)
    get isSafe() { 
        if (this._roomInfo) {
            if (this._roomInfo.invasion) return false;
            if (this._roomInfo.lastSeen - this._roomInfo.lastSeenAttacker < HOSTILE_SAFE_TIME) return false;
        }
        return true;
    }
        

    get harvestingOps() {return /**@type {HarvestingOp[]} */ (this._childOps[c.OPERATION_HARVESTING]||[])}

    /**@returns {Room|null} */
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
        this._strategy();
    }

    _strategy() {
        if (   this.harvestingOps.length>0 
            && this.room 
            && this.room.controller 
            && ( (this.room.controller.level > 0 && !this.room.controller.my)
                || (!this.room.controller.reservation && !this.room.controller.my)
                || (this.room.controller.reservation && (this.room.controller.reservation.username != this._shardOp.userName) ))
           ) {
            for (let harvestingOp of this._childOps[c.OPERATION_HARVESTING]) {
                this.removeChildOp(harvestingOp)
            }
        } else if (  this.harvestingOps.length == 0 
            && this.room 
            && this.room.controller 
            && (this.room.controller.level == 0  || this.room.controller.my)
            && (this.room.controller.my || (this.room.controller.reservation && this.room.controller.reservation.username == this._shardOp.userName) )
           ) {
        let i = 0;
        for (let source of this.room.find(FIND_SOURCES)) {
            let harvestingOp = new HarvestingOp(this, source.id, i++)
            this.addChildOp(harvestingOp);
        }    
    }
    }
    
    _tactics() {
        //add roomOp to room for debugging
        // @ts-ignore
        if (this.room) this.room.roomOp = this;



    }

    _command() {
        //draw room visualisations
        if(this._visualiseRoomInfo) {
            let roomVisual = new RoomVisual(this.roomName);
            let breadCrumbs = this._map.getBreadCrumbs(this.roomName);
            if (breadCrumbs) {
                let terrainArray = breadCrumbs;
                if (terrainArray) {
                    for (let x =0; x < c.MAX_ROOM_SIZE; x++) {
                        for (let y = 0; y< c.MAX_ROOM_SIZE; y++) {
                            let cost = Math.round(terrainArray[x][y].fatigueCost*10)/10
                            roomVisual.text(cost.toString(),x,y, {color:'yellow', font: 0.5})
                        }
                    }
                }
            }
        }
    }
}
