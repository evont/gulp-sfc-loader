const parse5 = require('parse5');
const treeAdapeter = require('parse5/lib/tree-adapters/default');
const fs = require('fs');
const path = require('path');
const through = require('through2');

const { styleProcess, scriptProcess, ejsProcess, File } = require('./libs');

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

function getType(obj) {
  const type = Object.prototype.toString.call(obj)
  return type.match(/(?<=\[object\s)\w+(?=\])/g)[0];
}

async function task(file, encoding, settings, cb) {
  const content = file.contents.toString(encoding);
  const fragment = parse5.parseFragment(content);

  const outTags = ['link', 'style', 'script', 'template'];
  let result = '';
  let inlineStyle = '', inlineScript = '';
  let outputStyle = '', outputScript = '';
  let htmlStr = '';

  let outputDir = {
    css: '',
    js: '',
  }

  outputDir.css = getType(settings.cssConfig.name) === 'Function' ? settings.cssConfig.name(file.relative) : settings.cssConfig.name;

  outputDir.js = getType(settings.jsConfig.name) === 'Function' ? settings.jsConfig.name(file.relative) : settings.jsConfig.name;

  for (let i = 0, len = fragment.childNodes.length; i < len; i += 1) {
    const node = fragment.childNodes[i];
    const type = node.tagName;
    const isInline = getAttribute(node, 'inline') === '';
    let lang = getAttribute(node, 'lang');

    if (outTags.indexOf(type) >= 0) {
      if (type === 'style') {
        let style = parse5.serialize(node);
        if (!style.trim()) return;
        if (!lang) lang = 'css';
        style = await styleProcess(style, lang);
        isInline ? inlineStyle += style : outputStyle += style;
      } 
      if (type === 'script') {
        let script = parse5.serialize(node);
        script = scriptProcess(script, settings.babelOption);
        isInline ? inlineScript += script : outputScript += script;
      }
      if (type === 'template') {
        const docFragment = treeAdapeter.createDocumentFragment();
        treeAdapeter.appendChild(docFragment, node);
        let tpl = parse5.serialize(docFragment).replace(/<\/?template>/g, '');
        tpl = ejsProcess(tpl);
        htmlStr += tpl;
      }
    }
  }
  
  let styleResult = '';
  let scriptResult = '';

  const filePath = file.relative.replace(/\.\w+/, '');
  if (outputStyle) {
    let markTag = `/*${filePath}*/`;
    outputStyle = `${markTag}${outputStyle}${markTag}`.split('\n').join('');
    markTag = markTag.replace(/\*/g, '\\*')
    markTag = `${markTag}.+${markTag}`;
    let distDir = `${path.dirname(settings.cssConfig.outputDir)}/css/${outputDir.css}.css`;
    File.readFile(distDir, (data) => {
      if (data) {
        data = data.toString();
        data = data.split('\n').join('');
        const pattern = new RegExp(markTag, 'g');
        if (pattern.test(data)) {
          outputStyle = data.replace(pattern, outputStyle);
        } else {
          outputStyle = data + outputStyle;
        }
      }
     
      File.writeFile(distDir, outputStyle);
    });
    styleResult += `<link rel="text/stylesheel" src="${distDir}">`
  }

  if (outputScript) {
    let markTag = `/*${filePath}*/`;
    outputScript = `${markTag}${outputScript}${markTag}`.split('\n').join('');
    markTag = markTag.replace(/\*/g, '\\*')
    markTag = `${markTag}.+${markTag}`;
    let distDir = `${path.dirname(settings.jsConfig.outputDir)}/js/${outputDir.js}.js`;
    File.readFile(distDir, (data) => {
      if (data) {
        data = data.toString();
        data = data.split('\n').join('');
        const pattern = new RegExp(markTag, 'g');
        if (pattern.test(data)) {
          outputScript = data.replace(pattern, outputScript);
        } else {
          outputScript = data + outputScript;
        }
      }
     
      File.writeFile(distDir, outputScript);
    })
    scriptResult += `<script src="${distDir}"></script>`
  }

  if (settings.layout) {
    if (!new RegExp(settings.componentPattern, 'gi').test(file.relative)) {
      let layoutTpl = fs.readFileSync(settings.layout, 'utf-8');
      if (inlineStyle) styleResult += `<style>${inlineStyle}</style>`;
      if (inlineScript) scriptResult += `<style>${inlineScript}</style>`;
      result = layoutTpl
                  .replace(new RegExp(settings.styleReplaceTag, 'g'), styleResult)
                  .replace(new RegExp(settings.scriptReplaceTag, 'g'), scriptResult)
                  .replace(new RegExp(settings.bodyReplaceTag, 'g'), htmlStr);
    } else {
      if (inlineStyle) result += `<style>${inlineStyle}</style>`;
      result += htmlStr;
      if (inlineScript) result += `<script>${inlineScript}</script>`;
    }
  }

  file.contents = new Buffer(result);
  cb(null, file);
}
module.exports = (options) => {
  const defaults = {
    componentPattern: 'component',
    layout: false,
    styleReplaceTag: '<!-- __style__ -->',
    scriptReplaceTag: '<!-- __script__ -->',
    bodyReplaceTag: '<!-- __body__ -->',
    cssConfig: {
      name: 'common',
      outputDir: './',
    },
    jsConfig: {
      name: 'common',
      outputDir: './',
    },
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
      task(file, encoding, settings, callback);
    }
  })

}