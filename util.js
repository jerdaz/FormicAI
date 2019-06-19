module.exports = class Util {
    /**@param {any} message Logs message to console*/
    static l(message){
        console.log(message);
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

}
