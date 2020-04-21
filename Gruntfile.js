// @ts-nocheck
module.exports = function(grunt) {

    var config = require('./.screeps.json')
    var branch = grunt.option('branch') || config.branch;
    var email = grunt.option('email') || config.email;
    var password = grunt.option('password') || config.password;
    var ptr = grunt.option('ptr') ? true : config.ptr

    grunt.loadNpmTasks('grunt-screeps');
    grunt.loadNpmTasks('grunt-file-append')

    var currentdate = new Date();

    grunt.initConfig({
        screeps: {
            options: {
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
                  append: "\nglobal.SCRIPT_VERSION = "+ currentdate.toDateString() + "\n",
                  input: 'src/version_template.js',
                  output: 'src/version.js',
                }
              ]
            }
          },
  
    });

    grunt.registerTask('default',  ['file_append:versioning', 'screeps']);
}
