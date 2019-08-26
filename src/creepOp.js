let U = require('./util');
const c = require('./constants');
let Operation = require('./operation').Operation;
let BaseOp = require('./baseOp').BaseOp;
let ShardOp = require('./shardOp').ShardOp;
let ShardChildOp = require('./shardOp').ShardChildOp;

const STATE_NONE = 0;
const STATE_RETRIEVING = 1;
const STATE_DELIVERING = 2;
const STATE_MOVING = 3;
const STATE_CLAIMING = 4;

class CreepOp extends ShardChildOp {
    /**@param {ShardOp}  shardOp */
    /**@param {Operation}  parent */
    /**@param {BaseOp} [baseOp] */
    constructor(parent, shardOp, baseOp) {
        super(parent, shardOp);
        this._state = STATE_NONE;
        this._instruct = c.COMMAND_NONE;
        this._sourceId = '';
        this._destId = '';
        this._destPos;
        this._baseOp = baseOp;
    }

    /**@param {Creep} creep */
    setCreep(creep) {
        this._creep = creep;
        if (this._firstRun) creep.notifyWhenAttacked( false);
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

        let source = U.getObj(this._sourceId);
        let dest = U.getObj(this._destId);
        let creep = this._creep;


        switch (this._instruct) {
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

        switch (this._state) {
            case STATE_RETRIEVING:
                creep.moveTo(source, {range:1});
                if      (source instanceof Source)    creep.harvest(source);
                else if (source instanceof Structure) creep.withdraw(source, RESOURCE_ENERGY);
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

module.exports.CreepOp = CreepOp;
