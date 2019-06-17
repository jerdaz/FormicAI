'use strict'

module.exports = class SpawnOp {
    /**@param {StructureSpawn} spawn */
    constructor(spawn) {
        this.command = '';
        this._spawnId = spawn.id;
    }

    run() {
        this._strategy();
        this._command();
    }

    _strategy() {}

    _command() {
        let spawn = Game.getObjectById(this._spawnId);
        if (this.command) {
            let capacity = spawn.room.energyCapacityAvailable;
            let bodySize = Math.floor(capacity / 200);
            let body = [];
            for (let i = 0; i< bodySize;i++) body.push(WORK,MOVE,CARRY);
            switch(this.command) {
                case 'spawnFirstFiller':
                    spawn.spawnCreep([WORK,MOVE,CARRY], spawn.room.name + '_' + Math.random() , {memory: {role: 'filler'}});
                    break;
                case 'spawnFiller':
                    spawn.spawnCreep(body, spawn.room.name + '_' + Math.random() , {memory: {role: 'filler'}});
                    break;
                case 'spawnUpgrader':
                    spawn.spawnCreep(body, spawn.room.name + '_' + Math.random() , {memory: {role: 'upgrader'}});
                    break;
                case 'spawnBuilder':
                    spawn.spawnCreep(body, spawn.room.name + '_' + Math.random() , {memory: {role: 'builder'}});
                    break;
            }
        }
    }
}
