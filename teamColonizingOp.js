let U = require('./util');
const c = require('./constants');
let CreepTeamOp = require('./teamOp');

module.exports = class CreepTeamColonizingOp extends CreepTeamOp {
    _strategy() {
        let nCreep = 0;
        if (this._baseOp.getDirective() == c.DIRECTIVE_COLONIZE) nCreep = 1;
        this._spawningOp.ltRequestSpawn(c.OPERATION_COLONIZING, {body:[MOVE,CLAIM], maxLength: 2, minLength:2}, nCreep)

        for (let creepName in this._creepOps) {
            let creepOp = this._creepOps[creepName];
            let dest = creepOp.getDest();
        }
    }
}
