const postcss = require('postcss');
const postcssrc = require('postcss-load-config')
const ctx = { map: false }

module.exports = (style) => {
  return postcssrc(ctx).then(({ plugins, options }) => {
    const css = postcss(plugins)
                .process(style, options)
                .then(result => result.css)
    return css;
  })
}