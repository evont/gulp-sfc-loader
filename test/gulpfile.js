const gulp = require('gulp');
const ejsLoader = require('../index');

gulp.task('page', () => {
  return gulp.src('./views/pages/**/*.ejs')
      .pipe(ejsLoader({
        templateTag: 'tpl',
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
          replaceTag: {
            style: '<!-- __style__ -->',
            script: '<!-- __script__ -->',
            body: '<!-- __body__ -->',
          }
        }
      }))
      .pipe(gulp.dest('./dist/pages/'));
})

gulp.task('cpn', () => {
  return gulp.src('./views/components/**/*.ejs')
      .pipe(ejsLoader({
        cssConfig: {
          name: 'components',
          outputDir: './dist/css/components/',
        },
        jsConfig: {
          name: 'components',
          outputDir: './dist/js/components/',
        },
      }))
      .pipe(gulp.dest('./dist/components/'));
})