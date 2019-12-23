const U = require('./util');
const c = require('./constants');
const ShardChildOp = require('./shard_shardChildOp');

module.exports = class ColonizingOp extends ShardChildOp {
    /**
     * @param {ShardOp}  shardOp
     * @param {Operation}  parent
     * @param {BaseOp} [baseOp] */
    constructor(parent, shardOp, baseOp) {
        super(parent, shardOp, baseOp);
        /**@type {{[creepName:string]: string}} */
        this._lastRoomName = {};
    }
    
    get type() {return c.OPERATION_COLONIZING}

    _tactics() {
        // if running under a base give spawn requests.
        if (this._baseOp) {
            let nCreep = 0;
            if (this._baseOp.directive == c.DIRECTIVE_COLONIZE) nCreep = 1;
            this._baseOp.spawningOp.ltRequestSpawn(this, {body:[MOVE,CLAIM], maxLength: 2, minLength:2}, nCreep)
        }

        for (let creepName in this._creepOps) {
            let creep = U.getCreep(creepName);
            if (!creep) throw Error();
            let creepOp = this._creepOps[creepName];
            let room = creepOp.room;
            if (creep.name.startsWith('shard') && ! creep.name.startsWith(Game.shard.name)) {
                // creep is not in the correct shard.
                let portalRoomName = this._map.findClosestPortalRoom(room.name);
                if(portalRoomName != room.name) {
                    creepOp.instructMoveTo(new RoomPosition(25, 25, portalRoomName));
                } else {
                    let destShard = creep.name.substr(0,6);
                    let portal = room.find(FIND_STRUCTURES, {filter: (/**@type {any} */o) => {return o.structureType == STRUCTURE_PORTAL && o.destination.shard == destShard}})[0];
                    if (portal) creepOp.instructMoveTo(portal.pos)
                }
            } else {
                let lastPart = _.last(creep.body)
                if (!lastPart) throw Error();
                if (lastPart.type == WORK) { 
                    // creep is a colonizing builder
                    /**@type {Structure | ConstructionSite | null}  */
                    let dest = creep.pos.findClosestByPath(FIND_CONSTRUCTION_SITES);
                    if (dest == undefined && room.controller && room.controller.my) dest = room.controller;
                    let targetRoom ;
                    if (dest != undefined && dest.room != undefined) targetRoom = dest.room.name;
                    else targetRoom = this._map.findClosestBaseByPath(room.name,1, false, c.TICKS_HOUR);
                    if (!targetRoom) continue;
                    if (room.name!= targetRoom) creepOp.instructMoveTo(new RoomPosition(25,25, targetRoom));
                    else {
                        let source = creep.pos.findClosestByPath(FIND_SOURCES_ACTIVE)
                        if (source && dest) creepOp.instructTransfer(source, dest);
                    }
                } else {
                    // creep is a claimer
                    let lastRoomName = this._lastRoomName[creep.name];
                    if (room.controller && !room.controller.my && room.controller.owner == null && room.controller.reservation == null) {
                        creepOp.instructClaimController(room.controller);
                    }
                    else if (room.name != lastRoomName || creepOp.instruction != c.COMMAND_MOVETO) {
                        /**@type {string | undefined} */
                        let destRoomName
                        /**@type {Structure[]}*/
                        let portals = [];
                        if (lastRoomName) portals = creep.room.find(FIND_STRUCTURES, {filter: (o) => { return o.structureType == STRUCTURE_PORTAL && !(o.destination instanceof RoomPosition) }});
                        if (portals.length>0) {
                            let portal = _.sample(portals)
                            if (portal) creepOp.instructMoveTo(portal.pos)
                            this._lastRoomName[creep.name] = room.name;
                        } else {
                            let exits = /**@type {{[index:string]:string}} */(this._map.describeExits(room.name))
                            let roomNames = [];
                            for (let exit in exits) if (exits[exit] != lastRoomName && Game.map.isRoomAvailable(exits[exit])) roomNames.push(exits[exit]);
                            roomNames.sort((a,b) => {
                                    let scoutInfoA = this._map.getRoomInfo(a);
                                    let scoutInfoB = this._map.getRoomInfo(b);
                                    if (scoutInfoA && scoutInfoB) return scoutInfoB.lastSeen - scoutInfoA.lastSeen + Math.random() - 0.5;
                                    return 0;
                                })
                            if (roomNames.length > 0) destRoomName = roomNames.pop();
                            else destRoomName = lastRoomName
                            if (destRoomName) {
                                let dest = new RoomPosition(25, 25, destRoomName);
                                if (dest) creepOp.instructMoveTo(dest)
                                this._lastRoomName[creep.name] = room.name;
                            }
                        }
                    }
                }
            }
        }
    }
}
