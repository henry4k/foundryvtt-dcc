const { src, dest, watch, parallel, series } = require('gulp')
const gulpif       = require('gulp-if')
const rollup       = require('gulp-better-rollup')
const terser       = require('gulp-terser')
const sourcemaps   = require('gulp-sourcemaps')
const sass         = require('gulp-sass')
const cleanCss     = require('gulp-clean-css')
const rename       = require('gulp-rename')
const zip          = require('gulp-zip')

let generateSourceMaps = true
let compress = false

const script = () =>
    src('scripts/main.js')
    .pipe(gulpif(generateSourceMaps, sourcemaps.init()))
    .pipe(rollup({format: 'iife'}))
    .pipe(gulpif(compress, terser({
        warnings: true,
        mangle: true,
        compress: true,
        toplevel: true // also optimize top level variables
    })))
    .pipe(rename('script.js'))
    .pipe(gulpif(generateSourceMaps, sourcemaps.write()))
    .pipe(dest('./'))

const style = () =>
    src('styles/main.scss')
    .pipe(gulpif(generateSourceMaps, sourcemaps.init()))
    .pipe(sass().on('error', sass.logError))
    .pipe(gulpif(compress, cleanCss()))
    .pipe(rename('style.css'))
    .pipe(gulpif(generateSourceMaps, sourcemaps.write()))
    .pipe(dest('./'))

const pack = () =>
    src(['system.json',
         'template.json',
         'script.js',
         'style.css',
         'templates/*.handlebars',
         'lang/*.json'], {base: './'})
    .pipe(zip('dcc.zip'))
    .pipe(dest('./'))

exports.default = function(cb) {
    parallel(script, style)(cb)
    watch('scripts/*.js', script)
    watch('styles/*.scss', style)
}

exports.release = function(cb) {
    generateSourceMaps = false
    compress = true
    series(
        parallel(script, style),
        pack)(cb)
}
