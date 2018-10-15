const parse5 = require('parse5');
const treeAdapeter = require('parse5/lib/tree-adapters/default');
const fs = require('fs');
const path = require('path');
const through = require('through2');
const babel = require('@babel/core');
const uglify = require('uglify-js');

const processor = require('./libs');

const PLUGIN_NAME = 'gulp-ejs-loader';

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
    bodyReplaceTag: '<!-- __body__ -->',
    postCssOption: {},
    babelOption: {},
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

      const contents = {
        script: [],
        style: [],
        html: [],
      }
      const outTags = ['link', 'style', 'script', 'template'];
      let result = '';
      fragment.childNodes.forEach((node) => {
        const type = node.tagName;
        const lang = getAttribute(node, 'lang');
        const isInline = getAttribute(node, 'inline') === '';

        if (outTags.indexOf(type) >= 0) {
          if (type === 'style') {
            let style = parse5.serialize(node);
            // style is empty
            if (!style.trim()) return;
            if (!lang || lang === 'css') {
              style.split('\n').forEach((line) => {
                if (line) contents.style.push(line.trim());
              });
              style = contents.style.join('');
            } else if (lang && (lang === 'postCss')) {
              processor.postCssProcess(style).then(res => {
                console.log(res);
                contents.style.push(res);
              })
            }
          } 
          if (type === 'script') {
            let script = parse5.serialize(node);
            const res = babel.transformSync(script, settings.babelOption);
            if (res) {
              const mangled = uglify.minify(res.code);
              script = mangled.code;
              contents.script.push('\n' + script);
            }
          }
          if (type === 'template') {
            const docFragment = treeAdapeter.createDocumentFragment();
            treeAdapeter.appendChild(docFragment, node);
            let tpl = parse5.serialize(docFragment);
            tpl = tpl.replace(/<\/?template>/g, '');
            tpl = processor.ejsProcess(tpl);
            contents.html.push(tpl);
          }
        }
      })
      if (settings.layout) {
        if (!new RegExp(settings.componentPattern, 'gi').test(file.relative)) {
          let layoutTpl = fs.readFileSync(settings.layout, 'utf-8');
          result = layoutTpl
                      .replace(new RegExp(settings.styleReplaceTag, 'g'), `<style>${contents.style.join('')}</style>`)
                      .replace(new RegExp(settings.scriptReplaceTag, 'g'), `<script>${contents.script.join('')}</script>`)
                      .replace(new RegExp(settings.bodyReplaceTag, 'g'), contents.html.join(''));
        } else {
          if (contents.style.length) {
            result += `<style>${contents.style.join('')}</style>`;
          }
          if (contents.html.length) {
            result += contents.html.join('');
          }
          if (contents.script.length) {
            result += `<script>${contents.style.join('')}</script>`;
          }
        }
        
      }
      file.contents = new Buffer(result);
    }

    callback(null, file);
  })

}