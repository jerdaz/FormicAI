// @ts-nocheck
module.exports = function(grunt) {

    var config = require('./.screeps.json')
    var branch = grunt.option('branch') || config.branch;
    var email = grunt.option('email') || config.email;
    var password = grunt.option('password') || config.password;
    var ptr = grunt.option('ptr') ? true : config.ptr

    var cogdpass = grunt.option('cogd_password') 

    grunt.loadNpmTasks('grunt-screeps');

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
        cogd: {
            options: {
                server: {
                    host: 'screeps.cogd.io',
                    port: 21025,
                    http: true
                },
                email: email,
                password: cogdpass,
                branch: branch,
                ptr: false
            },
            dist: {
                src: ['src/*.js']
            }
        }

    });
}
