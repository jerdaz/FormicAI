let U = require('./util');
const c = require('./constants');
let Operation = require('./operation');
let BaseOp = require('./baseOp');
let CreepOp = require('./creepOp');
let CreepFillerOp = require('./creepFillerOp');
let CreepUpgraderOp = require('./creepUpgraderOp');
let CreepBuilderOp = require('./creepBuilderOp');


module.exports = class CreepRoleOp extends Operation {
    /**@param {Creep} creep */
    /**@param {BaseOp} baseOp */
    constructor(creep, baseOp) {
        super();
        this._baseOp = baseOp;
        this._creepOp = new CreepOp(creep);
    }

    /**@param {Creep} creep */
    initTick(creep) {
        this._creepOp.initTick(creep);
    }

    /**@param {Creep} creep */
    /**@param {BaseOp} baseOp */
    /**@returns CreepRoleOp */
    static getRoleOp(creep, baseOp) {
        let role = parseInt(creep.name.split('_')[1]);
        /**@type CreepRoleOp */
        let ret;
        switch (role) {
            case c.ROLE_FILLER:
                ret = new CreepFillerOp(creep, baseOp);
                break;
            case c.ROLE_UPGRADER:
                ret = new CreepUpgraderOp(creep, baseOp);
                break;
            case c.ROLE_BUILDER:
                ret = new CreepBuilderOp(creep, baseOp);
                break;
            default:
                throw Error;
                break;
        }
        return ret;
    }

    getRole() {
        return parseInt(this._creepOp.getName().split('_')[1]);
    }

    _command() {
        this._creepOp.run();
    }
}