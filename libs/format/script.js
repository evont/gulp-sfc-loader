const babel = require('@babel/core');
const uglify = require('uglify-js');

module.exports = (script, babelOption, isMinify = true) => {
  const res = babel.transformSync(script, babelOption);
  if (res) {
    if (isMinify) {
      const mangled = uglify.minify(res.code);
      if (mangled.error) {
        throw new Error(mangled.error);
      }
      script = mangled.code;
    } else {
     
      script = res.code;
    }
  }
  return script;
}