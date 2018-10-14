const gulp = require('gulp');
const ejsLoader = require('../index');

gulp.task('default', () => {
  gulp.src('./views/pages/*ejs')
      .pipe(ejsLoader())
      .pipe(gulp.dest('./dist'));
})