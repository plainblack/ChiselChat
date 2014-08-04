module.exports = function(grunt) {

  "use strict";

  // Initializes the Grunt tasks with the following settings
  grunt.initConfig({

    // A list of files which will be syntax-checked by JSHint.
    jshint: {
      files: ['src/js/shims.js', 'src/js/chiselchat.js', 'src/js/chiselchat-ui.js'],
      options: {
        regexdash: false
      }
    },

    // Precompile templates and strip whitespace with 'processContent'.
    jst: {
      compile: {
        options: {
          path: 'templates',
          namespace: 'ChiselchatDefaultTemplates',
          prettify: true,
          processContent: function(src) {
            return src.replace(/(^\s+|\s+$)/gm, '');
          }
        },
        files: {
          'compiled/templates.js': ['templates/*.html']
        }
      }
    },

    // Compile and minify LESS CSS for production.
    less: {
      development: {
        files: {
          "build/chiselchat/chiselchat.css": "src/less/styles.less"
        }
      },
      production: {
        options: {
          yuicompress: true
        },
        files: {
          "build/chiselchat/chiselchat.min.css": "src/less/styles.less"
        }
      }
    },

    // Concatenate files in a specific order.
    concat: {
      js: {
        src: [
          'src/js/libs/underscore-1.4.4.min.js',
          'compiled/templates.js',
          'src/js/shims.js',
          'src/js/chiselchat.js',
          'src/js/chiselchat-ui.js'
        ],
        dest: 'build/chiselchat/chiselchat.js'
      }
    },

    // Minify concatenated files.
    uglify: {
      dist: {
        src: ['<%= concat.js.dest %>'],
        dest: 'build/chiselchat/chiselchat.min.js'
      }
    },

    // Clean up temporary files.
    clean: ['compiled/'],

    // Tasks to execute upon file change when using `grunt watch`.
    watch: {
      src: {
        files: ['src/**/*.*', 'templates/**/*.*'],
        tasks: ['default']
      }
    }
  });

  // Load specific plugins, which have been installed and specified in package.json.
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-jst');
  grunt.loadNpmTasks('grunt-contrib-less');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-docco');

  // Default task operations if simply calling `grunt` without options.
  grunt.registerTask('default', ['jshint', 'jst', 'less', 'concat', 'uglify', 'clean']);

};
