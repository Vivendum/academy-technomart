import browser_sync from "browser-sync";
import gulp from "gulp";
import rigger from "gulp-rigger";
import sass_gulp from "gulp-sass";
import sass_engine from "sass";
const sass = sass_gulp(sass_engine);
import css_engine from "gulp-postcss";
import css_normalize from "postcss-normalize";
import css_autoprefix from "autoprefixer";
import sourcemaps from "gulp-sourcemaps";
import imagemin, {mozjpeg, svgo} from "gulp-imagemin";
import pngquant from "imagemin-pngquant";
import changed from "gulp-changed";
import linthtml from "gulp-htmlhint";
import lintscss from "gulp-stylelint";
import {htmlValidator} from "gulp-w3c-html-validator";
import publish_engine from "gulp-gh-pages";


// Paths

const paths = {
  pages: {
    take: {
      initial: "source/template/*.html",
      sources: "source/template/**/*.html"
    },
    build: {
      gap: "build/gap",
      end: "build/end"
    },
    check: {
      gap: "build/gap/*.html",
      end: "build/end/*.html"
    }
  },
  styles: {
    take: {
      initial: "source/style/style.scss",
      sources: "source/style/**/*.scss"
    },
    build: {
      gap: "build/gap/style",
      end: "build/end/style"
    },
    check: {
      sources: "source/style/**/*.scss"
    }
  },
  images: {
    take: {
      sources: "source/image/**/*.{jpg,png,svg}",
      text: "source/image/**/*.svg",
      ignore: "!source/image/archive/**/*"
    },
    build: {
      gap: "build/gap/image",
      end: "build/end/image"
    }
  },
  fonts: {
    take: {
      sources: "source/font/*.{woff,woff2}"
    },
    build: {
      end: "build/end/font"
    }
  },
  general: {
    take: {
      ico: "source/image/favicon/favicon-16.ico",
      manifest: "source/instruction/technomart.webmanifest"
    },
    build: {
      end: "build/end"
    }
  },
  public: {
    take: {
      sources: "build/end/**/*"
    },
    build: {
      public: "public"
    },
    public: {
      sources: "public/**/*"
    }
  }
};

// Pages

export const build_html = () => {
  return gulp.src(paths.pages.take.initial)
    .pipe(rigger())
    .pipe(gulp.dest(paths.pages.build.gap))
    .pipe(gulp.dest(paths.pages.build.end))
    .pipe(browser_sync.stream());
};

// Styles

export const build_css = () => {
  return gulp.src(paths.styles.take.initial)
    .pipe(sourcemaps.init())
    .pipe(css_engine([
      css_normalize()
      ])
    )
    .pipe(sass
//    async не оптимизирован
      .sync({
        outputStyle: "expanded"
      })
      .on("error", sass.logError)
    )
    .pipe(css_engine([
      css_autoprefix()
      ])
    )
    .pipe(gulp.dest(paths.styles.build.gap))
    .pipe(sourcemaps.write("."))
    .pipe(gulp.dest(paths.styles.build.end))
    .pipe(browser_sync.stream());
};

// Images

export const build_images_to_gap = () => {
  return gulp.src([
    paths.images.take.text,
    paths.images.take.ignore
    ])
    .pipe(changed(paths.images.build.gap))
    .pipe(imagemin([
      svgo({
        js2svg: {
          pretty: true,
          indent: 2
        },
        plugins: [{
          name: "preset-default",
          params: {
            overrides: {
              removeViewBox: false,
              cleanupNumericValues: {
                floatPrecision: 2
              }
            }
          }
        }, {
          name: "sortAttrs",
          active: true
        }]
      })
    ], {
      verbose: true
    }))
    .pipe(gulp.dest(paths.images.build.gap));
};

export const build_images_to_end = () => {
  return gulp.src([
    paths.images.take.sources,
    paths.images.take.ignore
    ])
    .pipe(changed(paths.images.build.end))
    .pipe(imagemin([
      svgo({
        js2svg: {
          pretty: false
        },
        plugins: [{
          name: "preset-default",
          params: {
            overrides: {
              removeViewBox: false,
              cleanupNumericValues: {
                floatPrecision: 2
              }
            }
          }
        }, {
          name: "sortAttrs",
          active: true
        }]
      }),
      mozjpeg({
        quality: 75,
        progressive: true
      }),
      pngquant()
    ], {
      verbose: true
    }))
    .pipe(gulp.dest(paths.images.build.end));
};

// Copy

export const copy_fonts = () => {
  return gulp.src(paths.fonts.take.sources)
    .pipe(changed(paths.fonts.build.end))
    .pipe(gulp.dest(paths.fonts.build.end))
};

export const copy_general = () => {
  return gulp.src([
      paths.general.take.ico,
      paths.general.take.manifest
    ])
    .pipe(changed(paths.general.build.end))
    .pipe(gulp.dest(paths.general.build.end))
};
// копирует не нужные файлы, такие как sourcemaps
export const copy_public = () => {
  return gulp.src(paths.public.take.sources)
    .pipe(gulp.dest(paths.public.build.public))
};

// Watch

export const watch = () => {
  gulp.watch(
    paths.pages.take.sources,
    gulp.series(build_html)
  );
  gulp.watch(
    paths.styles.take.sources,
    gulp.series(build_css)
  );
  gulp.watch([
    paths.images.take.sources,
    paths.images.take.ignore
    ],
    gulp.series(build_images)
  );
};

// Server

export const server = () => {
  browser_sync.init({
    ui: false,
    server: {
      baseDir: paths.pages.build.end,
      index: "index.html"
    },
    browser: "firefox",
    notify: false
  });
};

// Check

export const lint_html = () => {
  return gulp.src(paths.pages.check.gap)
    .pipe(linthtml(".htmlhintrc"))
    .pipe(linthtml.reporter());
};

export const lint_scss = () => {
  return gulp.src(paths.styles.check.sources)
    .pipe(lintscss({
      reporters: [{
        formatter: "string",
        console: true
      }]
    }));
};

export const valid_html_from_gap = () => {
  return gulp.src(paths.pages.check.gap)
    .pipe(htmlValidator.analyzer())
    .pipe(htmlValidator.reporter());
};

export const valid_html_from_end = () => {
  return gulp.src(paths.pages.check.end)
    .pipe(htmlValidator.analyzer())
    .pipe(htmlValidator.reporter());
};

// Publish

export const publish_project = () => {
  return gulp.src(paths.public.public.sources)
   .pipe(publish_engine());
};

// Instructions

export const lint =
  gulp.parallel(
    lint_html,
    lint_scss
);

export const valid =
  gulp.series(
    valid_html_from_gap,
    valid_html_from_end
);

export const build_images =
  gulp.parallel(
    build_images_to_gap,
    build_images_to_end
);

export const build =
  gulp.parallel(
    copy_fonts,
    copy_general,
    build_images_to_gap,
    build_images_to_end,
    build_html,
    build_css
);

export const activity =
  gulp.parallel(
    watch,
    server
);

export const start =
  gulp.series(
    build,
    activity
);

export const deploy =
   gulp.series(
     build,
     copy_public,
     publish_project
);
