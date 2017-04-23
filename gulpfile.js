'use strict'

var childProcess = require('child_process')
var electron = require('electron')
var gulp = require('gulp')
var sass = require('gulp-sass')
var watch = require('gulp-watch')
var batch = require('gulp-batch')
var plumber = require('gulp-plumber')

gulp.task('sass', () => {
  return gulp.src('./app/css/**/*.scss')
  .pipe(plumber())
  .pipe(sass().on('error', sass.logError))
  .pipe(gulp.dest('./app/css/'))
})

gulp.task('watch', () => {
  watch('./app/css/**/*.scss', batch((events, done) => {
    gulp.start('sass', done)
  }))
})

gulp.task('start', ['build', 'watch'], () => {
  childProcess.spawn(electron, ['.'], {
    stdio: 'inherit'
  })
  .on('close', function () {
    // User closed the app. Kill the host process.
    process.exit()
  })
})

gulp.task('build', ['sass'])
gulp.task('default', ['start'])
