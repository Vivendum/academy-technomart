"use strict";

var server = require("browser-sync").create();
var gulp = require("gulp");
var plumber = require("gulp-plumber");
var changed = require("gulp-changed");
var rigger = require("gulp-rigger");
var validator_html = require("gulp-w3c-html-validator");
var linter_html = require("gulp-htmlhint");
var optimization_image = require("gulp-imagemin");
var optimization_png = require("imagemin-pngquant");
var publish_project = require("gulp-gh-pages");

gulp.task("build-html", function() {
  return gulp.src("source/template/*.html")
    .pipe(plumber())
    .pipe(rigger())
    .pipe(gulp.dest("build/before"))
    .pipe(gulp.dest("build/after"))
    .pipe(server.stream());
});

gulp.task("build-copy", function() {
  return gulp.src([
    "source/image/favicon/favicon-16.ico",
    "source/instruction/technomart.webmanifest"
  ])
    .pipe(changed("build/after/"))
    .pipe(gulp.dest("build/after/"))
    .pipe(server.stream());
});

gulp.task("server", function() {
  server.init({
    server: "build/after",
    index: "index.html",
    notify: false,
    open: true,
    cors: true,
    ui: false,
    browser: "firefox"
  });

  gulp.watch(["source/image/**/*.{jpg,png,svg}", "!source/image/archive/**/*.*"], gulp.series("image-optimization"));
  gulp.watch("source/template/**/*.html", gulp.series("build-html"));
  gulp.watch("source/instruction/*.*", gulp.series("build-copy"));
  gulp.watch("build/after/*.html").on("change", server.reload);
});

gulp.task("validator-html", function() {
  return gulp.src("build/before/*.html")
    .pipe(validator_html())
    .pipe(validator_html.reporter());
});

gulp.task("linter-html", function() {
  return gulp.src("build/before/*.html")
    .pipe(linter_html(".htmlhintrc"))
    .pipe(linter_html.reporter());
});

gulp.task("validator-html-min", function() {
  return gulp.src("build/after/*.html")
    .pipe(validator_html())
    .pipe(validator_html.reporter());
});

gulp.task("image-optimization-to-before", function() {
  return gulp.src(["source/image/**/*.svg", "!source/image/archive/**/*.svg"])
    .pipe(changed("build/before/image/"))
    .pipe(optimization_image([
      optimization_image.svgo({
        js2svg: {
          pretty: true,
          indent: 2
        },
        plugins: [{
          removeViewBox: false
        }, {
          cleanupNumericValues: {
            floatPrecision: 2
          }
        }, {
          sortAttrs: true
        }]
      })
    ]))
    .pipe(gulp.dest("build/before/image/"));
});

gulp.task("image-optimization-to-after", function() {
  return gulp.src(["source/image/**/*.{jpg,png,svg}", "!source/image/archive/**/*.{jpg,png,svg}"])
    .pipe(changed("build/after/image/"))
    .pipe(optimization_image([
      optimization_image.svgo({
        js2svg: {
          pretty: false
        },
        plugins: [{
          removeViewBox: false
        }, {
          cleanupNumericValues: {
            floatPrecision: 2
          }
        }, {
          sortAttrs: true
        }]
      }),
      optimization_image.mozjpeg({
        quality: 75,
        progressive: true
      }),
      optimization_png()
    ]))
    .pipe(gulp.dest("build/after/image/"));
});

gulp.task("image-optimization", gulp.parallel("image-optimization-to-before", "image-optimization-to-after"));

gulp.task("public-copy", function() {
  return gulp.src("build/after/**/*.*")
    .pipe(changed("public/"))
    .pipe(gulp.dest("public/"));
});

gulp.task("publish", function() {
  return gulp.src("./public/**/*")
    .pipe(publish_project());
});

gulp.task("test", gulp.series("validator-html", "linter-html"));
gulp.task("test-min", gulp.series("validator-html-min"));
gulp.task("build", gulp.series("build-html", "build-copy", "image-optimization"));
gulp.task("start", gulp.series("build-html", "build-copy", "image-optimization", "server"));
gulp.task("public", gulp.series("build", "public-copy"));
gulp.task("deploy", gulp.series("public", "publish"));
