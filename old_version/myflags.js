"use strict";



module.exports = {
    FLAG_DESTROY_PRIM: COLOR_RED,
    FLAG_DESTROY_SEC: COLOR_WHITE,

    FLAG_ATTACK_PRIM: COLOR_RED,
    FLAG_ATTACK_SEC: COLOR_PURPLE,
    FLAG_ATTACKWP_PRIM: COLOR_PURPLE,
    FLAG_ATTACKWP_SEC: COLOR_BLUE,

     getFlags (colorPrim, colorSec, startsWith ) {
        var flags=[];
        for(var flagname in Game.flags) {
            var flag = Game.flags[flagname];
            if (flag.color == colorPrim && flag.secondaryColor == colorSec  ) {
                if (startsWith) {
                    let flagStart = flagname.substring(0, startsWith.length);
                    if (flagStart == startsWith) flags.push(flag);
                } else flags.push(flag);
            }
        }
        return flags;
    },

    getDestroyFlags() {
        return this.getFlags(this.FLAG_DESTROY_PRIM, this.FLAG_DESTROY_SEC);
    },

    getAttackFlags() {
        let flags = this.getFlags(this.FLAG_ATTACK_PRIM, this.FLAG_ATTACK_SEC);
        flags.sort((flaga, flagb) => {return flaga.name > flagb.name})
        return flags;
    },

    getAttackWPFlags(wpCode) {
        let flags = this.getFlags(this.FLAG_ATTACKWP_PRIM, this.FLAG_ATTACKWP_SEC, wpCode);
        flags.sort((flaga, flagb) => {return flaga.name > flagb.name})
        return flags;
    }
}
