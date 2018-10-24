const parse5 = require('parse5');
const treeAdapeter = require('parse5/lib/tree-adapters/default');
const fs = require('fs');
const path = require('path');
const through = require('through2');
const plugError = require('plugin-error');

const { styleFormate, scriptFormat, htmlFormat, File } = require('./libs');

const PLUGIN_NAME = 'gulp-ejs-loader';
/**
 * 获取节点的指定属性值
 * @param {object} node 节点
 * @param {string} name 属性名
 */
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
function getOriginNode (node) {
  const docFragment = treeAdapeter.createDocumentFragment();
  treeAdapeter.appendChild(docFragment, node);
  return parse5.serialize(docFragment);
}
function getType(obj) {
  const type = Object.prototype.toString.call(obj)
  return type.match(/(?<=\[object\s)\w+(?=\])/g)[0];
}

function extend(obj, obj2) {
  // 拷贝对象，防止修改了原始obj
  const newObj = Object.assign({}, obj);
  for (const key in obj2) {
    if ('object' != typeof obj[key] || null === obj[key] || Array.isArray(obj[key])) {
      if (void 0 !== obj2[key]) {
        newObj[key] = obj2[key];
      }
    } else {
      newObj[key] = extend(obj[key], obj2[key]);
    }
  }
  return newObj
}

async function outputFile(filePath, outputContents, distDir, basePath, type) {
  
  if (outputContents.length) {
    let markTag = `/*${filePath}*/`;
    let outoutStr = `${markTag}${outputContents.join('')}${markTag}`;
    markTag = markTag.replace(/\*/g, '\\*').replace(/\\/g, '\\').replace(/\//g, '\/')
    markTag = `${markTag}[\\s\\S]+${markTag}`;
    let data = File.readFile(distDir);
    if (data) {
      // data = data.toString();
      // data = data.split('\n').join('');
      const pattern = new RegExp(markTag, 'g');
      if (pattern.test(data)) {
        outoutStr = data.replace(pattern, outoutStr);
      } else {
        outoutStr = data + outoutStr;
      }
    }
    await File.writeFile(distDir, outoutStr);
  }
  if (basePath !== '') {
    distDir = basePath + path.basename(distDir);
  }
  const result = {
    css: `<link rel="text/stylesheet" href="${distDir}">`,
    js: `<script src="${distDir}"></script>`,
  }
  return result[type] || '';
}
async function task(file, encoding, settings) {
  let content = file.contents.toString(encoding);
  content = content.replace(/@requireTpl\(.+\)/g, (filePath) => {
    filePath = filePath.match(/(?<=\(').+(?='\))/)[0];
    filePath = path.resolve(path.dirname(file.path), filePath);
    filePath = filePath.substr(process.cwd().length);
    let data = File.readFile(`.${filePath}`);
    return data;
  });

  const fragment = parse5.parseFragment(content);
  const outTags = ['style', 'script'];

  const format = {
    html: [],
    css: {
      inner: [],
      out: [],
    },
    js: {
      inner: [],
      out: [],
    }
  }
  let result = '';

  let fileName = {
    css: '',
    js: '',
  }

  fileName.css = getType(settings.cssConfig.name) === 'Function' ? settings.cssConfig.name(file.relative) : settings.cssConfig.name;

  fileName.js = getType(settings.jsConfig.name) === 'Function' ? settings.jsConfig.name(file.relative) : settings.jsConfig.name;

  let styleResult = '';
  let scriptResult = '';

  for (let i = 0, len = fragment.childNodes.length; i < len; i += 1) {
    const node = fragment.childNodes[i];
    const tag = node.tagName;
    const isInline = getAttribute(node, 'inline') === '';
    let lang = getAttribute(node, 'lang');
    const type = getAttribute(node, 'type');
    const key = isInline ? 'inner' : 'out';
    if (outTags.indexOf(tag) >= 0 && type !== 'text/x-template') {
      if (tag === 'style') {
        let style = parse5.serialize(node);
        if (!style.trim()) return;
        if (!lang) lang = 'css';
        style = await styleFormate(style, lang, settings.cssConfig.minify);
        format.css[key].push(style);
      } 
      if (tag === 'script') {
        const src = getAttribute(node, 'src');
        if (src) {
          scriptResult += getOriginNode(node);
        } else {
          let script = parse5.serialize(node);
          script = scriptFormat(script, settings.jsConfig.babelOption, settings.jsConfig.minify);
          format.js[key].push(script);
        }
      }
    } else {
      let str = getOriginNode(node);
      if (tag === 'link') {
        styleResult += str;
      } else {
        format.html.push(str);
      }
    }
  }

  let htmlStr = htmlFormat(format.html.join(''));
  const filePath = file.relative.replace(/\.\w+/, ''); // 按文件名去除后缀区分，同目录下可多个文件
  styleResult += await outputFile(filePath, format.css.out, `${settings.cssConfig.outputDir}${fileName.css}.css`, settings.cssConfig.basePath, 'css')
  scriptResult += await outputFile(filePath, format.js.out, `${settings.jsConfig.outputDir}${fileName.js}.js`, settings.jsConfig.basePath, 'js')

  if (settings.layoutConfig.isLayout && !new RegExp(settings.layoutConfig.componentPattern, 'gi').test(file.relative)) {
      let layoutTpl = fs.readFileSync(settings.layoutConfig.layoutFile, 'utf-8');
      if (format.css.inner.length) styleResult += `<style>${format.css.inner.join('')}</style>`;
      if (format.js.inner.length) scriptResult += `<style>${format.js.inner.join('')}</style>`;
      result = layoutTpl.replace(new RegExp(settings.layoutConfig.replaceTag.style, 'g'), styleResult);
      result = result.replace(new RegExp(settings.layoutConfig.replaceTag.script, 'g'), scriptResult);
      result = result.replace(new RegExp(settings.layoutConfig.replaceTag.body, 'g'), htmlStr);
  } else {
    styleResult += format.css.inner.length ? `<style>${format.css.inner.join('')}</style>` : '';
    result += styleResult;
    result += htmlStr;
    scriptResult += format.js.inner.length ? `<script>${format.js.inner.join('')}</script>` : '';
    result += scriptResult;
  }

  file.contents = new Buffer(result); 
  return file;
}

module.exports = (options) => {
  const defaults = {
    cssConfig: {
      name: 'common',
      outputDir: './',
      basePath: '',
      minify: true,
    },
    jsConfig: {
      name: 'common',
      outputDir: './',
      basePath: '',
      minify: true,
      babelOption: {
        presets: ['@babel/env']
      },
    },
    layoutConfig: {
      componentPattern: 'component',
      isLayout: false,
      layoutFile: './layout.ejs',
      replaceTag: {
        style: '<!-- __style__ -->',
        script: '<!-- __script__ -->',
        body: '<!-- __body__ -->',
      }
    }
  }

  const settings = extend(defaults, options);
  
  return through.obj((file, encoding, callback) => {
    if (file.isNull()) {
      return callback(null, file);
    }

    if (file.isStream()) {
      this.emit('error', new plugError(PLUGIN_NAME, 'Cannot use streamed files'));
      return callback();
    }

    if (file.isBuffer()) {
      task(file, encoding, settings).then(file => {
        callback(null, file)
      });
    }
  })

}