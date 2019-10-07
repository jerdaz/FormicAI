module.exports = class Util {
    constructor() {
        this.trace = false;
    }

    /**@param {any} message Logs message to console*/
    static l(message){
        console.log(this.stringify(message));
    }

    /**@param {any} message Logs message to console*/
    lt(message){
        if (this.trace) Util.l(message);
    }

    /**
     * @param {number} x
     * @returns {boolean} returns true with a chance one in X */
    static chance(x) {
        return Math.floor(Math.random() * x) == 0;
    }

    /**@param {string} id */
    static getObj(id) {
        return Game.getObjectById(id);
    }

    /**
     * @param {string} creepName
     * @returns {Creep} returns creep with creepName */
    static getCreep(creepName) {
        let creep = Game.creeps[creepName];
        if (creep) return creep;
        throw 'creepname not found'
    }

    /**@param {any} obj */
    static stringify(obj) {
        // Note: cache should not be re-used by repeated calls to JSON.stringify.
        /**@type {any} */
        var cache = [];
        return JSON.stringify(obj, function(key, value) {
            if (typeof value === 'object' && value !== null) {
                if (cache.indexOf(value) !== -1) {
                    // Duplicate reference found, discard key
                    return;
                } else if (key == '_parent' || key == '_baseOp') return;
                // Store value in our collection
                cache.push(value);
            }
            return value;
        });
    }

    /**
     * @param {String} shardName
     * @returns {Number} */
    static getShardID(shardName) {
        return (parseInt(shardName.slice(-1)));
    }

    /**@param {BodyPartConstant[]} body */
    static getCreepCost (body) {
        var cost = 0;
        for (var i=0; i<body.length;i++) cost += BODYPART_COST[body[i]];
        return cost;
    }    

    /**
     * @param {RoomPosition} pos
     * @returns {Boolean} */
    static isWalkable(pos) {
        let room = Game.rooms[pos.roomName]
        let objects = room.lookAt(pos);
        for (let object of objects) {
            if (object.type == LOOK_TERRAIN && object.terrain == "wall") return false;
            if (object.type == LOOK_STRUCTURES && object.structure) {
                switch (object.structure.structureType) {
                    case STRUCTURE_CONTAINER:
                    case STRUCTURE_PORTAL:
                    case STRUCTURE_RAMPART:
                    case STRUCTURE_ROAD:
                        return true;
                    default:
                        return false;
                }
            } 
        }
        return true;
    }
}

