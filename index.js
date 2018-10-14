const parse5 = require('parse5');
const path = require('path');
const through = require('through2');

function getAttribute (node, name) {
  if (node.attrs) {
      var i = node.attrs.length, attr;

      while (i--) {
          attr = node.attrs[i];
          if (attr.name === name) {
              return attr.value;
          }
      }
  }
}

module.exports = (options) => {
  const defaults = {
    componentPattern: 'component',
    layout: false,
    styleReplaceTag: '<!-- __style__ -->',
    scriptReplaceTag: '<!-- __script__ -->',
  }

  const settings = Object.assign({}, defaults, options);

  return through.obj((file, encoding, callback) => {
    if (file.isNull()) {
      return callback(null, file);
    }

    if (file.isStream()) {
      this.emit('error', new gutil.PluginError(PLUGIN_NAME, 'Cannot use streamed files'));
      return callback();
    }

    if (file.isBuffer()) {
      const content = file.contents.toString(encoding);
      const fragment = parse5.parseFragment(content);

      const outTags = ['link', 'style', 'script'];

      fragment.childNodes.forEach((node) => {
        const type = node.tagName;
        const lang = getAttribute(node, 'lang');
        const isInline = getAttribute(node, 'inline') === '';
        
        if (outTags.indexOf(type) >= 0) {
          if (type === 'style') {
            
            const style = parse5.serialize(node);
            // style is empty
            if (!style.trim()) return;
            console.log(style);
            if (!lang || lang === 'css') {
              console.log('css');
            } else if (lang && (lang === 'sass' || lang === 'scss')) {
              console.log('scss');
            } else if (lang && (lang === 'postCss')) {
              console.log('postCss');
            }
          }

          if (type === 'script') {
            const script = parse5.serialize(node);
            console.log(script);
          }
        }
      })
    }

    callback(null, file);
  })

}