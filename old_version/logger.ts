"use strict";

var log_enabled = [ '',
//  'spawn.recyclecreeps',
//    'spawn.expandcreep'
//  'creep.runscout',
//    'creep.rundefender'
//    'creep.runstransporter',
//      'creep.runkeeperkiller',
//    'spawn.spawncreepbyrole',
//    'creep.runworker',
//      'creep.runattacker',
      //'creep.runcolonist',
//      'creep.dofindenergy'
  'creep.dowork',
//      'creep.fleefrom',
//    'spawn.run',
//    'room.findharvestrooms',
//    'roomobject.buildpath',
//    'room.run'
//      'room.autobuild',
      //'room.validbuildingspot',
//      'room.findenergydroppoints'
//  'structure.needsrepair'
//  'matrix_avoidkeeper'
//  'structureterminal.run'
//  'colonize'
  //'cleanmemory'
//  'unclaimbases'
  //'creep.dofindenergy'
//  'traveler'
  //'base.run'


]

var log_names = [ //'harvesterW7N43_W7N43_8661'//'Worker7828959'
  'Worker10700218'
]

  function log(caller: string, message: Object, name: string = '' ) {
    if (log_names.length > 0 && name.length > 0) {
      let notFound = true;
      for (let log_name of log_names) if (log_name == name) notFound = false;
      if (notFound) return;
    }
    for (var i=0;i<log_enabled.length;i++) if (caller == log_enabled[i]) console.log(caller + ':' + name +  ': ' + JSON.stringify(message));
  }

  export { log };
