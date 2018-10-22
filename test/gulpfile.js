const gulp = require('gulp');
const ejsLoader = require('../index');

gulp.task('default', () => {
  gulp.src('./views/pages/**/*.ejs')
      .pipe(ejsLoader({
        layout: './views/layout.ejs',
        cssConfig: {
          name: (path) => {
            return path.match(/\w+(?=\/)(?!\.ejs)/g)[0] ;
          },
          outputDir: './dist/css/',
        },
        jsConfig: {
          name: (path) => {
            return path.match(/\w+(?=\/)(?!\.ejs)/g)[0] ;
          },
          outputDir: './dist/css/',
        },
      }))
      .pipe(gulp.dest('./dist/pages/'));
})