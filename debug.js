// @ts-nocheck
module.exports = class Debug {
    dumpMain() {
        // Note: cache should not be re-used by repeated calls to JSON.stringify.
        var cache = [];
        JSON.stringify(Game.main, function(key, value) {
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
        cache = null; // Enable garbage collection        
    }
}
