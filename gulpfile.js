"use strict";

var server = require("browser-sync"); server.create();
var gulp = require("gulp");
var plumber = require("gulp-plumber");
var rigger = require("gulp-rigger");
var sourcemap = require("gulp-sourcemaps");
var postcss = require("gulp-postcss");
var postcss_normalize = require("postcss-normalize");
var postcss_autoprefixer = require("autoprefixer");
var sass = require("gulp-sass"); sass.compiler = require("node-sass");
var changed = require("gulp-changed");
var optimization_image = require("gulp-imagemin");
var optimization_png = require("imagemin-pngquant");
var linter_html = require("gulp-htmlhint");
var linter_css = require("gulp-stylelint");
var validator_html = require("gulp-w3c-html-validator");
var publish_project = require("gulp-gh-pages");

gulp.task("build-html", function() {
  return gulp.src("source/template/*.html")
    .pipe(plumber())
    .pipe(rigger())
    .pipe(gulp.dest("build/before"))
    .pipe(gulp.dest("build/after"))
    .pipe(server.stream());
});

gulp.task("build-css", function() {
  return gulp.src("source/style/style.scss")
    .pipe(plumber())
    .pipe(sourcemap.init())
    .pipe(postcss([
      postcss_normalize()
    ]))
    .pipe(sass({
      outputStyle: "expanded"
    }))
    .pipe(postcss([
      postcss_autoprefixer()
    ]))
    .pipe(gulp.dest("build/before/style"))
    .pipe(sourcemap.write("."))
    .pipe(gulp.dest("build/after/style"))
    .pipe(server.stream());
});

gulp.task("build-copy-general", function() {
  return gulp.src([
    "source/image/favicon/favicon-16.ico",
    "source/instruction/technomart.webmanifest"
  ])
    .pipe(changed("build/after"))
    .pipe(gulp.dest("build/after"))
    .pipe(server.stream());
});

gulp.task("build-copy-font", function() {
  return gulp.src("source/font/*.{woff,woff2}")
    .pipe(changed("build/after/font"))
    .pipe(gulp.dest("build/after/font"))
});

gulp.task("build-copy", gulp.parallel("build-copy-general", "build-copy-font"));

gulp.task("image-optimization-to-before", function() {
  return gulp.src([
    "source/image/**/*.svg",
    "!source/image/archive/**/*"
  ])
    .pipe(changed("build/before/image"))
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
    .pipe(gulp.dest("build/before/image"));
});

gulp.task("image-optimization-to-after", function() {
  return gulp.src([
    "source/image/**/*.{jpg,png,svg}",
    "!source/image/archive/**/*"
  ])
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
  gulp.watch("source/style/**/*.scss", gulp.series("build-css"));
  gulp.watch("source/instruction/technomart.webmanifest", gulp.series("build-copy-general"));
  gulp.watch(["source/image/**/*.{jpg,png,svg}", "!source/image/archive/**/*"], gulp.series("image-optimization"));
  gulp.watch("build/after/*.html").on("change", server.reload);
});

gulp.task("linter-html", function() {
  return gulp.src("build/before/*.html")
    .pipe(linter_html(".htmlhintrc"))
    .pipe(linter_html.reporter());
});

gulp.task("linter-scss", function () {
  return gulp.src("source/style/**/*.scss")
    .pipe(linter_css({
      reporters: [{
        failAfterError: true,
        formatter: "string",
        console: true
      }]
    }));
});

gulp.task("validator-html", function() {
  return gulp.src("build/before/*.html")
    .pipe(validator_html())
    .pipe(validator_html.reporter());
});

gulp.task("validator-html-min", function() {
  return gulp.src("build/after/*.html")
    .pipe(validator_html())
    .pipe(validator_html.reporter());
});

gulp.task("public-copy", function() {
  return gulp.src("build/after/**/*")
    .pipe(changed("public"))
    .pipe(gulp.dest("public"));
});

gulp.task("publish", function() {
  return gulp.src("public/**/*")
    .pipe(publish_project());
});

gulp.task("lint", gulp.series("linter-html", "linter-scss"));
// gulp.task("valid", gulp.series("validator-html"));         неисправен
// gulp.task("valid-min", gulp.series("validator-html-min")); неисправен
gulp.task("build", gulp.parallel("build-html", "build-css", "build-copy", "image-optimization"));
gulp.task("start", gulp.series("build", "server"));
gulp.task("public", gulp.series("build", "public-copy")); // копирует ненужные ресрусы, такие как sourcemaps
gulp.task("deploy", gulp.series("public", "publish"));
