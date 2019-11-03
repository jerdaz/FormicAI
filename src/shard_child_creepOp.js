const U = require('./util');
const c = require('./constants');
const ChildOp = require('./meta_childOp');

const STATE_NONE = 0;
const STATE_RETRIEVING = 1;
const STATE_DELIVERING = 2;
const STATE_MOVING = 3;
const STATE_CLAIMING = 4;
const STATE_FINDENERGY = 5;
const STATE_DROPENERGY = 6;

module.exports = class CreepOp extends ChildOp {
    /**
     * @param {ShardOp} shardOp
     * @param {Operation} parent
     * @param {BaseOp} [baseOp] 
     * @param {MapOp} mapOp
     * @param {Creep} creep
     * */
    constructor(parent, shardOp, baseOp, mapOp, creep) {
        super(parent);
        this._state = STATE_NONE;
        this._instruct = c.COMMAND_NONE;
        this._sourceId = '';
        this._destId = '';
        this._destPos = null;
        this._baseOp = baseOp;
        this._creep = creep;
        this._mapOp = mapOp;
        /**@type {RoomPosition | null} */
        this._lastMoveToDest = null
        /**@type {RoomPosition | null} */
        this._lastMoveToInterimDest = null
        this._lastPos = creep.pos
    }
    get type() {return c.OPERATION_CREEP}
    get source() {return Game.getObjectById(this._sourceId)}
    get dest() {
        return U.getObj(this._destId);
    }

    get pos() {
        if (this._creep == undefined ) throw Error('creep undefined');

        return this._creep.pos;
    }


    get room() {
        if (this._creep == undefined ) throw Error('creep undefined');

        return this._creep.room;
    }

    get instruction() {
        return this._instruct;
    }

    /**@param {Creep} creep */
    initTickCreep(creep) {
        this._creep = creep;
    }

    /**@param {Structure | ConstructionSite} dest */
    instructFill(dest) {
        this._sourceId = ''
        this._destId = dest.id;
        this._instruct = c.COMMAND_FILL
    }

    /**
     * @param {Source | Structure} source
     * @param {Structure | ConstructionSite} dest */
    instructTransfer(source, dest) {
        this._sourceId = source.id;
        this._destId = dest.id;
        this._instruct = c.COMMAND_TRANSFER
    }
    
    /**@param {RoomPosition} dest */
    instructMoveTo(dest) {
        this._destPos = dest;
        this._instruct = c.COMMAND_MOVETO
    }

    /**@param {StructureController} controller */
    instructClaimController(controller) {
        this._destId = controller.id
        this._instruct = c.COMMAND_CLAIMCONTROLLER
    }

    instructStop() {
        this._instruct = c.COMMAND_NONE;
    }

    /**
     * @param {Source} source
     * */
    instructHarvest(source) {
        this._instruct = c.COMMAND_HARVEST;
        this._sourceId = source.id;
    }


    // /**@param {Number} opType */
    // setOperation(opType) {
    //     if (this._creep == undefined ) throw Error('creep undefined');

    //     this._creep.memory.operationType = opType;
    // }
    
    _firstRun() {
        this._creep.notifyWhenAttacked(false);
    }


    _tactics() {
        switch (this._instruct) {
            case c.COMMAND_NONE:
                if (this._baseOp) {
                    if (this._creep.pos.roomName != this._baseOp.name) {
                        this.instructMoveTo(this._baseOp.centerPos);
                    }
                }
                break;
        }      
    }
    
    _command() {
        let creep = this._creep;
        switch (this._instruct) {
            case c.COMMAND_HARVEST:
                if (creep.carry.energy == 0) {
                    this._state = STATE_RETRIEVING;
                }
                if (creep.carry.energy == creep.carryCapacity) {
                    this._state = STATE_DROPENERGY;
                }
                if (this._state == STATE_NONE) this._state = STATE_RETRIEVING;
                break;
            case c.COMMAND_FILL:
                if (creep.carry.energy == 0) this._state = STATE_FINDENERGY;
                if (creep.carry.energy == creep.carryCapacity) {
                    this._state = STATE_DELIVERING;
                }
                if (this._state == STATE_NONE) this._state = STATE_FINDENERGY;
                break;
            case c.COMMAND_TRANSFER:
                if (creep.carry.energy == 0) this._state = STATE_RETRIEVING;
                if (creep.carry.energy == creep.carryCapacity) this._state = STATE_DELIVERING;
                if (this._state == STATE_NONE) this._state = STATE_RETRIEVING;
                break;
            case c.COMMAND_MOVETO:
                this._state=STATE_MOVING;
                break;
            case c.COMMAND_CLAIMCONTROLLER:
                this._state=STATE_CLAIMING
                break;
            case c.COMMAND_NONE:
                this._state = STATE_NONE;
                break;
        }

        let source = U.getObj(this._sourceId);
        let dest = U.getObj(this._destId);
        switch (this._state) {
            case STATE_FINDENERGY:
                if (source && source.store && source.store.energy == 0) source = undefined;
                if (source && source.energy === 0) source = undefined;
                if (source && source.amount === 0) source = undefined;
                if(source == undefined) {
                    source = this._findEnergySource();
                    if (source) this._sourceId = source.id;
                    else this._sourceId = '';
                }
                //deliberate fallthrough to retrieving
            case STATE_RETRIEVING:
                if (source == null) break;
                this._moveTo(source.pos, {range:1});
                if      (source instanceof Source)    creep.harvest(source);
                else if (source instanceof Structure) creep.withdraw(source, RESOURCE_ENERGY);
                else if (source instanceof Ruin) creep.withdraw(source, RESOURCE_ENERGY);
                else if (source instanceof Tombstone) creep.withdraw(source, RESOURCE_ENERGY);
                else if (source instanceof Resource) creep.pickup(source);
                else throw Error('Cannot retrieve from object ' + source + '(room: ' + creep.room.name + ' creep: ' + creep.name + ')');
                break;

            case STATE_DROPENERGY:
                if (dest && dest.store && _.size(dest.store) == dest.storeCapacity) dest = undefined;
                if (dest && dest.energy && dest.energy == dest.energyCapacity) dest = undefined;
                if (dest == undefined) {
                    dest = this._findEnergySink();
                    if (dest) this._destId = dest.id;
                    else this._destId = ''
                }
                //deliberate fallthrough to delivering
            case STATE_DELIVERING:
                if(!dest) this._instruct = c.COMMAND_NONE;
                else {
                    this._moveTo(dest.pos, {range:1});
                    if      (dest instanceof Structure) {
                        /**@type {number} */
                        let result = -1000;
                        if (dest.hits < dest.hitsMax) result = creep.repair(dest);
                        if (result != OK) result = creep.transfer(dest, RESOURCE_ENERGY);
                        if (result == OK && dest instanceof StructureController && (dest.sign == null || dest.sign.text != c.MY_SIGN)) creep.signController(dest, c.MY_SIGN);
                    }
                    else if (dest instanceof ConstructionSite) creep.build(dest);
                    else throw Error('Cannot deliver to object ' + dest + '(room: ' + creep.room.name + ' creep: ' + creep.name + ')');
                }
                break;
        
            case STATE_MOVING:
                if (this._destPos) this._moveTo(this._destPos);
                if (_.size(creep.carry) < creep.carryCapacity) {
                    let tombstone = creep.pos.findInRange(FIND_TOMBSTONES, 1, {filter: o => {return o.store.energy > 0}})[0];
                    if (tombstone) creep.withdraw(tombstone, RESOURCE_ENERGY);
                    else {
                        let dropped_energy = creep.pos.findInRange(FIND_DROPPED_RESOURCES, 1, {filter: {resourceType: RESOURCE_ENERGY}})[0];
                        creep.pickup(dropped_energy);
                    }
                }
                break;
            case STATE_CLAIMING:
                if (dest) {
                    this._moveTo(dest.pos, {range:1});
                    if (dest instanceof StructureController) creep.claimController(dest);
                }

            this._lastPos = this._creep.pos;
        }    
    }

    _findEnergySource() {
        let room = this._creep.room;
        /**@type {RoomObject[]} */
        let roomObjects = [];
        /**@type RoomObject|null */
        let result;
        roomObjects = room.find(FIND_DROPPED_RESOURCES, {filter: {resourceType: RESOURCE_ENERGY}})
        roomObjects = roomObjects.concat(room.find(FIND_TOMBSTONES, {filter: (o) => {return o.store.energy > 0}}), roomObjects)
        roomObjects = roomObjects.concat(room.find(FIND_RUINS, {filter: (o) => {return o.store.energy > 0}}), roomObjects)
        roomObjects = roomObjects.concat(room.find(FIND_MY_STRUCTURES, {filter: (o) => {return (o.structureType == STRUCTURE_STORAGE || o.structureType == STRUCTURE_TERMINAL
                                                                                                ) && o.store.energy > 0
                                                                                            || o.structureType == STRUCTURE_LINK && o.energy > 0;   
                                                                                        }   
                                                                        }))
        roomObjects = roomObjects.concat(room.find(FIND_STRUCTURES, {filter: (o) => {return o.structureType == STRUCTURE_CONTAINER && o.store.energy > 0}}));        
        result = this._creep.pos.findClosestByPath(roomObjects)
        if (result == null) {
            result = this._creep.pos.findClosestByPath(FIND_SOURCES_ACTIVE);
        }
        return result
    }

    _findEnergySink() {
        let room = this._creep.room;
        /**@type {RoomObject[]} */
        let roomObjects = [];
        /**@type RoomObject|null */
        let result;
        if (this._baseOp) {
            roomObjects = roomObjects.concat(_.filter(this._baseOp.links, o => {return o.energy < o.energyCapacity} ));
            let storage = this._baseOp.storage
            if (storage && _.size(storage.store) < storage.storeCapacity) roomObjects.push (storage);
        }
        result = this._creep.pos.findClosestByPath(roomObjects);
        return result;        
    }

    /**
     * @arg {RoomPosition} pos 
     * @arg {MoveToOpts} [opts]
    */
    _moveTo(pos, opts) {
        let optsCopy = Object.assign(opts||{});
        /**@type {RoomPosition | null} */
        let dest = pos;
        let myPos = this._creep.pos;
        if (myPos.roomName != dest.roomName) {
            optsCopy.range = 20;
            if (!_.isEqual(dest,this._lastMoveToDest)) this._lastMoveToInterimDest = null;
            if (_.isEqual(dest,this._lastMoveToDest) && myPos.roomName == this._lastPos.roomName && this._lastMoveToInterimDest) dest = this._lastMoveToInterimDest;
            else {
                let route = Game.map.findRoute(this._creep.pos.roomName, pos.roomName, {routeCallback: (roomName, fromRoomName) => 
                    {if(this._mapOp.getHostileOwner(roomName)) return Infinity; }
                });
                if (route instanceof Array && route.length > 2) {
                    dest = new RoomPosition(25,25,route[1].room)
                    this._lastMoveToInterimDest = dest;
                }
            }
        }
        this._creep.moveTo(dest, optsCopy);
        this._lastMoveToDest = pos;
    }
}

