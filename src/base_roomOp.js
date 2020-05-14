const U = require('./util');
const c = require('./constants');
const BaseChildOp = require('./base_childOp');

module.exports = class roomOp extends BaseChildOp {
    /**@param {BaseOp} baseOp
     * @param {String} roomName
     */
    constructor(baseOp, roomName) {
        super(baseOp);
        /**@type {{x:number, y:number, cost:number}[]} */
        this._roadSites = [];
        this._roomName = roomName;
        this._verbose = false;
    }
    get type() {return c.OPERATION_ROOM}

    _firstRun() {
        this._strategy();
    }

    _strategy() {
        //determine road locations
        let roomInfo = this._map.getRoomInfo(this._roomName);
        if (!roomInfo) return;
        let fatigueCost = roomInfo.fatigueCost;
        /**@type {{x:number, y:number, cost:number}[]} */
        let roadSites = []
        for (let x =0; x<50; x++) {
            for (let y=0; y<50; y++) {
                let pos = new RoomPosition(x,y,this._roomName);
                if (fatigueCost[x][y] > 0) {
                    let hasRoad = _.filter(pos.lookFor(LOOK_STRUCTURES),{type:STRUCTURE_ROAD}).length > 0;
                    if (!hasRoad) roadSites.push ({x: x, y:y, cost:fatigueCost[x][y]});
                }
            }
        }
        // sort descending by cost
        roadSites.sort((a,b) => {
            return b.cost - a.cost;
        })
        this._log(roadSites);
        this._roadSites = roadSites;
    }

    _tactics() {
        //place road building sites
        let room = Game.rooms[this._roomName];
        if (this._roadSites.length > 0 && room.find(FIND_CONSTRUCTION_SITES).length < 2) {
            let site = this._roadSites[0]
            let result = room.createConstructionSite(site.x,site.y, STRUCTURE_ROAD);
            if (result == OK) this._roadSites.shift();
        }
    }
}
