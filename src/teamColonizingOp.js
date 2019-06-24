let U = require('./util');
const c = require('./constants');
let CreepTeamOp = require('./teamOp');
let SpawningOp = require('./spawningOp');
/**@typedef {import('./baseOp')} BaseOp  */

module.exports = class CreepTeamColonizingOp extends CreepTeamOp {
    /**@param {BaseOp} baseOp */
    /**@param {SpawningOp} spawningOp*/
    constructor(baseOp, spawningOp) {
        super(baseOp, spawningOp);
        /**@type {string} */
        this._lastRoomName = '';
    }

    _strategy() {
        let nCreep = 0;
        if (this._baseOp.getDirective() == c.DIRECTIVE_COLONIZE) nCreep = 1;
        this._spawningOp.ltRequestSpawn(c.OPERATION_COLONIZING, {body:[MOVE,CLAIM], maxLength: 2, minLength:2}, nCreep)

        for (let creepName in this._creepOps) {
            let creepOp = this._creepOps[creepName];
            let room = creepOp.getRoom();
            if (room.controller && !room.controller.my && room.controller.owner == null && room.controller.reservation == null) {
                creepOp.instructClaimController(room.controller);
            }
            else if (room.name != this._lastRoomName || creepOp.getInstr() != c.COMMAND_MOVETO) {
                let exits = /**@type {{[index:string]:string}} */(Game.map.describeExits(room.name))
                if (_.size(exits) > 1 ) {
                    for (let exit in exits) if (exits[exit] == this._lastRoomName) delete exits[exit];
                }
                /**@type {string | undefined} */
                let destRoomName = _.sample(exits);
                let exit_side = 0;
                if (destRoomName) exit_side = room.findExitTo(destRoomName);
                let dest;
                if (exit_side>0) {
                    dest = /**@type {RoomPosition} */(creepOp.getPos().findClosestByPath(/**@type {any}*/ (exit_side)));
                    if (dest) creepOp.instructMoveTo(dest)
                    this._lastRoomName = room.name;
                }
            }
        }
    }
}
