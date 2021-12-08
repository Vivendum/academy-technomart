"use strict";

var server = require("browser-sync").create();
var gulp = require("gulp");
var plumber = require("gulp-plumber");
var rigger = require("gulp-rigger");
var validator_html = require("gulp-w3c-html-validator");
var linter_html = require("gulp-htmlhint");
var publish_project = require("gulp-gh-pages");

gulp.task("build-html", function() {
  return gulp.src("source/template/*.html")
    .pipe(plumber())
    .pipe(rigger())
    .pipe(gulp.dest("build/before"))
    .pipe(gulp.dest("build/after"))
    .pipe(server.stream());
});

gulp.task("copy", function(done) {
  gulp.src("build/after/*.html")
    .pipe(gulp.dest("public/"));
  done();
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

  gulp.watch("source/template/**/*.html", gulp.series("build-html"));
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

gulp.task("publish", function() {
  return gulp.src("./public/**/*")
    .pipe(publish_project());
});

gulp.task("test", gulp.series("validator-html", "linter-html"));
gulp.task("test-min", gulp.series("validator-html-min"));
gulp.task("build", gulp.series("build-html"));
gulp.task("public", gulp.series("build-html", "copy"));
gulp.task("start", gulp.series("build-html", "server"));
gulp.task("deploy", gulp.series("public", "publish"));
