const babel = require('@babel/core');
const uglify = require('uglify-js');

module.exports = (script, babelOption) => {
  const res = babel.transformSync(script, babelOption);
  if (res) {
    const mangled = uglify.minify(res.code);
    script = mangled.code;
  }
  return script;
}