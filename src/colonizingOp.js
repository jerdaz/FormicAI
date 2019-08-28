const U = require('./util');
const c = require('./constants');
const ShardChildOp = require('./shardChildOp');

module.exports = class ColonizingOp extends ShardChildOp {
    /**@param {ShardOp}  shardOp */
    /**@param {Operation}  parent */
    /**@param {BaseOp} [baseOp] */
    constructor(parent, shardOp, baseOp) {
        super(parent, shardOp, baseOp);
        /**@type {{[creepName:string]: string}} */
        this._lastRoomName = {};
    }

    _strategy() {
        // if running under a base give spawn requests.
        if (this._baseOp) {
            let nCreep = 0;
            if (this._baseOp.getDirective() == c.DIRECTIVE_COLONIZE && this._baseOp.getMaxSpawnEnergy() >= U.getCreepCost([MOVE,CLAIM])) nCreep = 1;
            this._baseOp.spawningOp.ltRequestSpawn(this, {body:[MOVE,CLAIM], maxLength: 2, minLength:2}, nCreep)
        }

        for (let creepName in this._creepOps) {
            let creep = U.getCreep(creepName);
            if (!creep) throw Error();
            let creepOp = this._creepOps[creepName];
            let room = creepOp.getRoom();
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
                    else if (room.name != lastRoomName || creepOp.getInstr() != c.COMMAND_MOVETO) {
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
                            for (let exit in exits) if (exits[exit] != lastRoomName) roomNames.push(exits[exit]);
                            roomNames.sort((a,b) => {
                                    return this._map.getLastSeen(b) - this._map.getLastSeen(a) + Math.random() - 0.5;
                                })
                            if (roomNames.length > 0) destRoomName = roomNames.pop();
                            else destRoomName = lastRoomName
                            let exit_side = 0;
                            if (destRoomName) exit_side = room.findExitTo(destRoomName);
                            let dest;
                            if (exit_side>0) {
                                dest = /**@type {RoomPosition} */(creepOp.getPos().findClosestByPath(/**@type {any}*/ (exit_side)));
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

