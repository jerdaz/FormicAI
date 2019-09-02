const U = require('./util');
const c = require('./constants');
const ChildOp = require('./childOp');

const STATE_NONE = 0;
const STATE_RETRIEVING = 1;
const STATE_DELIVERING = 2;
const STATE_MOVING = 3;
const STATE_CLAIMING = 4;
const STATE_FILLING = 5;

module.exports = class CreepOp extends ChildOp {
    /**@param {ShardOp}  shardOp */
    /**@param {Operation}  parent */
    /**@param {BaseOp} [baseOp] */
    constructor(parent, shardOp, baseOp) {
        super(parent);
        this._state = STATE_NONE;
        this._instruct = c.COMMAND_NONE;
        this._sourceId = '';
        this._destId = '';
        this._destPos;
        this._baseOp = baseOp;
    }
    get type() {return c.OPERATION_CREEP}
    get source() {return Game.getObjectById(this._sourceId)}

    /**@param {Creep} creep */
    setCreep(creep) {
        this._creep = creep;
        if (this._firstRun) creep.notifyWhenAttacked( false);
    }

    /**@param {Structure | ConstructionSite} dest */
    instructFill(dest) {
        this._sourceId = ''
        this._destId = dest.id;
        this._instruct = c.COMMAND_FILL
    }

    /**@param {Source} source */
    /**@param {Structure | ConstructionSite} dest */
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

    instrStop() {
        this._instruct = c.COMMAND_NONE;
    }


    _strategy() {
        if (this._creep == undefined ) throw Error('creep undefined');

        switch (this._instruct) {
            case c.COMMAND_NONE:
                if (this._baseOp) {
                    if (this._creep.pos.roomName != this._baseOp.getName()) {
                        this.instructMoveTo(this._baseOp.getBaseCenter());
                    }
                }
                break;
        }      
    }
    
    _command() {
        if (this._creep == undefined ) throw Error('creep undefined');

        let creep = this._creep;
        switch (this._instruct) {
            case c.COMMAND_FILL:
                    if (creep.carry.energy == 0) this._state = STATE_FILLING;
                    if (creep.carry.energy == creep.carryCapacity) {
                        this._state = STATE_DELIVERING;
                        this._sourceId =='';
                    }
                    if (this._state == STATE_NONE) this._state = STATE_FILLING;
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
            case STATE_FILLING:
                if (source.store && source.store.energy == 0) source = undefined;
                if (source.energy === 0) source = undefined;
                if (source.amount === 0) source = undefined;
                if(source == undefined) {
                    source = this._findEnergySource();
                    if (source) this._sourceId = source.id;
                    else this.sourceId = '';
                }
            case STATE_RETRIEVING:
                if (source == null) break;
                creep.moveTo(source, {range:1});
                if      (source instanceof Source)    creep.harvest(source);
                else if (source instanceof Structure) creep.withdraw(source, RESOURCE_ENERGY);
                else if (source instanceof Tombstone) creep.withdraw(source, RESOURCE_ENERGY);
                else if (source instanceof Resource) creep.pickup(source);
                else throw Error('Cannot retrieve from object ' + source + '(room: ' + creep.room.name + ' creep: ' + creep.name + ')');
                break;
            case STATE_DELIVERING:
                if(!dest) this._instruct = c.COMMAND_NONE;
                else {
                    creep.moveTo(dest, {range:1});
                    if      (dest instanceof Structure) creep.transfer(dest, RESOURCE_ENERGY);
                    else if (dest instanceof ConstructionSite) creep.build(dest);
                    else throw Error('Cannot deliver to object ' + dest + '(room: ' + creep.room.name + ' creep: ' + creep.name + ')');
                }
                break;
            case STATE_MOVING:
                if (this._destPos) creep.moveTo(this._destPos);
                break;
            case STATE_CLAIMING:
                if (dest) {
                    creep.moveTo(dest, {range:1});
                    creep.claimController(dest);
                }
        }    
    }

    _findEnergySource() {
        if (!this._creep) throw Error('invalid creep')
        let room = this._creep.room;
        /**@type {RoomObject[]} */
        let roomObjects = [];
        /**@type RoomObject|null */
        let result;
        roomObjects = room.find(FIND_DROPPED_RESOURCES, {filter: {resourceType: RESOURCE_ENERGY}})
        roomObjects = roomObjects.concat(room.find(FIND_TOMBSTONES, {filter: (o) => {return o.store.energy > 0}}), roomObjects)
        result = this._creep.pos.findClosestByPath(roomObjects)
        if (result == null) {
            roomObjects = room.find(FIND_MY_STRUCTURES, {filter: (o) => {return (o.structureType == STRUCTURE_STORAGE || o.structureType == STRUCTURE_TERMINAL
                                                                                    ) && o.store.energy > 0
                                                                             || o.structureType == STRUCTURE_LINK && o.energy > 0;   
                                                                        }
                                                                    })
            roomObjects = roomObjects.concat(room.find(FIND_STRUCTURES, {filter: (o) => {return o.structureType == STRUCTURE_CONTAINER && o.store.energy > 0}}));
            result = this._creep.pos.findClosestByPath(roomObjects);
        }
        if (result == null) {
            roomObjects = room.find(FIND_SOURCES_ACTIVE);
            result = this._creep.pos.findClosestByPath(roomObjects);
        }
        return result
    }

    getPos() {
        if (this._creep == undefined ) throw Error('creep undefined');

        return this._creep.pos;
    }

    getDest() {
        return U.getObj(this._destId);
    }

    getRoom() {
        if (this._creep == undefined ) throw Error('creep undefined');

        return this._creep.room;
    }

    getInstr() {
        return this._instruct;
    }

    /**@param {Number} opType */
    setOperation(opType) {
        if (this._creep == undefined ) throw Error('creep undefined');

        this._creep.memory.operationType = opType;
    }
}

