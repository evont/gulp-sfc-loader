const gulp = require('gulp');
const ejsLoader = require('../index');

gulp.task('default', () => {
  return gulp.src('./views/pages/**/*.ejs')
      .pipe(ejsLoader({
        cssConfig: {
          name: (path) => {
            return path.match(/\w+(?=\/)(?!\.ejs)/g)[0] ;
          },
          outputDir: './dist/css/',
          basePath: '/public/dist/css/'
        },
        jsConfig: {
          name: (path) => {
            return path.match(/\w+(?=\/)(?!\.ejs)/g)[0] ;
          },
          outputDir: './dist/js/',
          basePath: '/path/css/'
        },
        layoutConfig: {
          isLayout: true,
          layoutFile: './views/layout.ejs',
        }
      }))
      .pipe(gulp.dest('./dist/pages/'));
})