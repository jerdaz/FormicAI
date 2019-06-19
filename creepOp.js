let U = require('./util');
const c = require('./constants');
let Operation = require('./operation');

const STATE_NONE = 0;
const STATE_RETRIEVING = 1;
const STATE_DELIVERING = 2;

module.exports = class CreepOp extends Operation {
    /**@param {Creep} creep */
    constructor(creep) {
        super();
        this._creep = creep;
        /**@type {RoomObject} */
        this._dest;
        /**@type {RoomObject} */
        this._source;
        this._state = STATE_NONE;
    }

    /**@param {Creep} creep */
    initTick(creep) {
        this._creep = creep;
    }

    _command() {
        let source = this._source;
        let dest = this._dest;
        let creep = this._creep;

        switch (this._instruction.command) {
            case c.COMMAND_TRANSFER:
                if (creep.carry.energy == 0) this._state = STATE_RETRIEVING;
                if (creep.carry.energy == creep.carryCapacity) this._state = STATE_DELIVERING;
                break;
        }

        switch (this._state) {
            case STATE_RETRIEVING:
                creep.moveTo(source, {range:1});
                if      (source instanceof Source)    creep.harvest(source);
                else if (source instanceof Structure) creep.withdraw(source, RESOURCE_ENERGY);
                else throw 'Cannot retrieve from object ' + source;
                break;
            case STATE_DELIVERING:
                creep.moveTo(dest, {range:1});
                if      (dest instanceof Structure) creep.transfer(dest, RESOURCE_ENERGY);
                else if (dest instanceof ConstructionSite) creep.build(dest);
                else throw 'Cannot retrieve to object ' + dest;
                break;
        }    
    }

    getName() {
        return this._creep.name;
    }

    getPos() {
        return this._creep.pos;
    }

    getDest() {
        return this._dest;
    }
}


