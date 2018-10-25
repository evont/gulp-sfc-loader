const postcss = require('postcss');
const postcssrc = require('postcss-load-config')
const ctx = { map: false }
const CleanCSS = require('clean-css');

const sass = require("node-sass");

const handler = {
  postCss: (style) => {
    const result = postcssrc(ctx).then(({ plugins, options }) => {
      const css = postcss(plugins)
                  .process(style, options)
                  .then(result => result.css)
      return css;
    });
    return result;
  },
  sass: (style) => {
    return new Promise((resolve, reject) => {
      sass.render({ data: style, }, (error, result) => {
        if (error) {
          console.error(error)
        } else {
          resolve(result.css.toString());
        }
      });
    })
  }
}
module.exports = async (style, type, isMinify = true) => {
  let result;
  if (handler[type]) {
    result = await handler[type](style, isMinify);
  } else {
    // fallback to css if type is not in handler list;
    result = style;
  }
  if (isMinify && result) {
    const minify = new CleanCSS({}).minify(result);
    result = minify.styles || '';
  }
  return result;
}