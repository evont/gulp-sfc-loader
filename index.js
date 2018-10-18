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

function getOriginText(node, content) {
  const tag = node.tagName;
  let result = `<${tag}`;
  if (node.attrs) {
    var i = node.attrs.length, attr;

    while (i--) {
      attr = node.attrs[i];
      result += ` ${attr.name}${attr.value ? '="' + attr.value + '"' : ''}`;
    }
  }
  result += `>${content}</${tag}>`
  return result;
}
function getType(obj) {
  const type = Object.prototype.toString.call(obj)
  return type.match(/(?<=\[object\s)\w+(?=\])/g)[0];
}

async function task(file, encoding, settings) {
  const now =  new Date().getTime();
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

  let styleResult = '';
  let scriptResult = '';

  for (let i = 0, len = fragment.childNodes.length; i < len; i += 1) {
    const node = fragment.childNodes[i];
    const tag = node.tagName;
    const isInline = getAttribute(node, 'inline') === '';
    let lang = getAttribute(node, 'lang');

    if (outTags.indexOf(tag) >= 0) {
      if (tag === 'style') {
        let style = parse5.serialize(node);
        if (!style.trim()) return;
        if (!lang) lang = 'css';
        style = await styleProcess(style, lang);
        isInline ? inlineStyle += style : outputStyle += style;
      } 
      if (tag === 'script') {
        const src = getAttribute(node, 'src');
        const type = getAttribute(node, 'type');
        if (src) {
          scriptResult += `<script src="${src}"></script>`
        } else {
          let script = parse5.serialize(node);
          if (type === 'text/x-template') {
            script = ejsProcess(script);
            scriptResult += getOriginText(node, script);
          } else {
            script = scriptProcess(script, settings.babelOption);
            isInline ? inlineScript += script : outputScript += script;
          }
        }
      }
      if (tag === 'template') {
        const docFragment = treeAdapeter.createDocumentFragment();
        treeAdapeter.appendChild(docFragment, node);
        let tpl = parse5.serialize(docFragment).replace(/<\/?template>/g, '');
        tpl = tpl.replace(/@requireTpl\(.+\)/g, (filePath) => {
          filePath = filePath.match(/(?<=\(').+(?='\))/)[0];
          filePath = path.resolve(path.dirname(file.path), filePath);
          filePath = filePath.substr(process.cwd().length);
          let data = File.readFile(`.${filePath}`);
          return data;
        });
        tpl = ejsProcess(tpl);
        htmlStr += tpl;
      }
      if (tag === 'link') {
        const href = getAttribute(node, 'href');
        styleResult += `<link rel="text/stylesheet" href="${href}">`
      }
    }
  }
  const filePath = file.relative.replace(/\.\w+/, '');
  if (outputStyle) {
    let markTag = `/*${filePath}*/`;
    outputStyle = `${markTag}${outputStyle}${markTag}`.split('\n').join('');
    markTag = markTag.replace(/\*/g, '\\*')
    markTag = `${markTag}.+${markTag}`;
    let distDir = `${path.dirname(settings.cssConfig.outputDir)}/css/${outputDir.css}.css`;
    let data = File.readFile(distDir);
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
    await File.writeFile(distDir, outputStyle);
    styleResult += `<link rel="text/stylesheet" href="${distDir}">`
  }

  if (outputScript) {
    let markTag = `/*${filePath}*/`;
    outputScript = `${markTag}${outputScript}${markTag}`.split('\n').join('');
    markTag = markTag.replace(/\*/g, '\\*')
    markTag = `${markTag}.+${markTag}`;
    let distDir = `${path.dirname(settings.jsConfig.outputDir)}/js/${outputDir.js}.js`;
    let data = File.readFile(distDir);
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
   
    await File.writeFile(distDir, outputScript);
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
      styleResult += inlineStyle ? `<style>${inlineStyle}</style>` : '';
      result += styleResult;
      result += htmlStr;
      scriptResult += inlineScript ? `<script>${inlineScript}</script>` : '';
      result += scriptResult;
    }
  }

  file.contents = new Buffer(result); 
  return file;
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
      task(file, encoding, settings).then(file => {
        callback(null, file)
      });
    }
  })

}