module.exports = function(grunt) {

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    concat: {
      options: {
        separator: ';',
      },
      dist: {
        src: [
          'src/intro.js', 
          'lib/jquery-1.10.2.min.js',
          'lib/angular-1.2.13.min.js',
          'lib/middlin.js',
          'src/chat.js', 
          'src/outro.js'
        ],
        dest: 'dist/chat.js',
      },
    },
  });

  grunt.loadNpmTasks('grunt-contrib-concat');

  grunt.registerTask('default', ['concat']);

};
