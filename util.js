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

    /**@param {any} err */
    static log_error(err) {
        this.l(err);
        // @ts-ignore
        Game.debug.dumpMain();
        Game.notify(JSON.stringify(err), 60 * 4);
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
                }
                // Store value in our collection
                cache.push(value);
            }
            return value;
        });

    }
}
