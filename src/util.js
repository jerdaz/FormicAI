module.exports = class Util {
    /**@param {any} message Logs message to console*/
    static l(message){
        console.log(this.stringify(message));
    }

    /**@param {number} x */
    /**@returns {boolean} returns true with a chance one in X */
    static chance(x) {
        return Math.floor(Math.random() * x) == 0;
    }

    /**@param {string} id */
    static getObj(id) {
        return Game.getObjectById(id);
    }

    /**@param {string} creepName */
    /**@returns {Creep} returns creep with creepName */
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

    /**@param {String} shardName */
    /**@returns {Number} */
    static getShardID(shardName) {
        return (parseInt(shardName.slice(-1)));
    }

    /**@param {BodyPartConstant[]} body */
    static getCreepCost (body) {
        var cost = 0;
        for (var i=0; i<body.length;i++) cost += BODYPART_COST[body[i]];
        return cost;
    }    
}

