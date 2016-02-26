

'use strict';

var childProcess = require('child_process');
var electron = require('electron-prebuilt');
var gulp = require('gulp');
var jetpack = require('fs-jetpack');
var usemin = require('gulp-usemin');
var uglify = require('gulp-uglify');
var minifyCss = require('gulp-minify-css');
var sass = require('gulp-sass');
var gulpLoadPlugins = require('gulp-load-plugins');
var os = require('os');
var gulp_electron = require('gulp-electron');
var packageJson = require('./build/package.json');


var projectDir = jetpack;
var plugins = gulpLoadPlugins();
var srcDir = projectDir.cwd('./app');
var destDir = projectDir.cwd('./build');

// -------------------------------------
// Tasks
// -------------------------------------

gulp.task('clean', function (callback) {
    return destDir.dirAsync('.', { empty: true });
});

gulp.task('copy', ['clean'], function () {
    return projectDir.copyAsync('app', destDir.path(), {
        overwrite: true,
        matching: [
            './node_modules/**/*',
            '*.html',
            '*.css',
            'main.js',
            'package.json'
        ]
    });
});


gulp.task('sass', () => {
  return gulp.src('./app/sass/*.scss')
    .pipe(plugins.plumber())
    .pipe(plugins.sourcemaps.init())
    .pipe(plugins.autoprefixer('last 10 versions'))
    .pipe(plugins.sass({
      style: 'compressed'
    }))
    .pipe(plugins.sourcemaps.write())
    .pipe(gulp.dest('./app/assets/css'));
});
 
gulp.task('sass:watch', function () {
  gulp.watch('./app/sass/*.scss', ['sass']);
});

gulp.task('build', ['sass', 'copy'], function () {
    return gulp.src('./app/index.html')
        .pipe(usemin({
            css: [ minifyCss(), 'concat' ],
            js: [ uglify() ]
        }))
        .pipe(gulp.dest('build/'));
});


gulp.task('dev', ['sass'], function () {
    childProcess.spawn(electron, ['./app'], { stdio: 'inherit' });
});

gulp.task('run', ['build'], function () {
    childProcess.spawn(electron, ['./build'], { stdio: 'inherit' });
});

gulp.task('clean-cache', function (callback) {
    return projectDir.cwd('./cache').dirAsync('.', { empty: true });
});

gulp.task('clean-dist', function (callback) {
    return projectDir.cwd('./dist').dirAsync('.', { empty: true });
});

gulp.task('dist', ['build', 'clean-cache', 'clean-dist'], function () {
    //platforms Support 
    //['darwin','win32','linux','darwin-x64','linux-ia32','linux-x64','win32-ia32','win64-64']
    var platforms = ['win32-ia32', 'darwin-x64', 'linux-ia32'];
    gulp.src("")
    .pipe(gulp_electron({
        src: './build',
        packageJson: packageJson,
        release: './dist',
        cache: './cache',
        version: 'v0.36.7',
        packaging: true,
        platforms: platforms,
        platformResources: {
            darwin: {
                CFBundleDisplayName: packageJson.name,
                CFBundleIdentifier: packageJson.name,
                CFBundleName: packageJson.name,
                CFBundleVersion: packageJson.version,
                icon: 'icon.icns'
            },
            win: {
                "version-string": packageJson.version,
                "file-version": packageJson.version,
                "product-version": packageJson.version,
                'icon': 'icon.ico'
            }
        }
    }))
    .pipe(gulp.dest(""));
});
