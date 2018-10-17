const postcss = require('postcss');
const postcssrc = require('postcss-load-config')
const ctx = { map: false }

const handler = {
  css: (style) => {
    return new Promise((resolve, reject) => {
      const styles = [];
      style.split('\n').forEach((line) => {
        if (line) styles.push(line.trim());
      });
      style = styles.join('');
      resolve(style);
    })
  },
  postCss: (style) => {
    const result = postcssrc(ctx).then(({ plugins, options }) => {
      const css = postcss(plugins)
                  .process(style, options)
                  .then(result => result.css)
      return css;
    });
    return result;
  }
}
module.exports = (style, type) => {
  return handler[type] && handler[type](style);
}