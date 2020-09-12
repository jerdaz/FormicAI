// @ts-nocheck
module.exports = function(grunt) {

  var config = require('./.screeps.json')
  var branch = grunt.option('branch') || config.branch;
  var email = grunt.option('email') || config.email;
  var password = grunt.option('password') || config.password;
  var ptr = grunt.option('ptr') ? true : config.ptr
  var server = undefined;

  switch (grunt.option('server')) {
    case 'sp1':
      server = {
        host: 'server1.screepspl.us',
        port: 21025,
        http: true
      };
      password = config.sp2_password;
      break;
      case 'sp2':
        server = {
          host: 'server2.screepspl.us',
          port: 21025,
          http: true
        };
        password = config.sp2_password;
        break;
      case 'cogd':
          server = {
            host: 'screeps.cogd.io',
            port: 21025,
            http: true
          };
          password = config.cogd_password;
          break;
       case 'atanner': 
          server = {
            host: 'atannergaming.com',
            port: 21025,
            http: true
          };
          password = config.atanner_password;
          break;
       case 'screeps':
          break;
       default:
         throw Error('No server defined')
      }

  grunt.loadNpmTasks('grunt-screeps');
  grunt.loadNpmTasks('grunt-file-append')

  var currentdate = new Date();

  grunt.initConfig({
      screeps: {
          options: {
              server: server,
              email: email,
              password: password,
              branch: branch,
              ptr: ptr
          },
          dist: {
              src: ['src/*.js']
          }
      },

      // Add version variable using current timestamp.
      file_append: {
          versioning: {
            files: [
              {
                append: "\nversionString = '"+ currentdate.toISOString().split('T')[0] + "'\n",
                input: 'src/version_template.js',
                output: 'src/version.js',
              }
            ]
          }
        },

  });

  grunt.registerTask('default',  ['screeps']);
}
