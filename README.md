# Intro
Gulp-SFC-loader 是一个使用单文件组件思想，用于方便传统HTML 项目进行模块化，同时完成內联js 及css编译及抽离的gulp 插件；基于加载速度优化的策略，默认会开启对文件的压缩；

## Install
```
npm install gulp-sfc-loader
```

## Config
默认设置
```javascript
{
  htmlMinify: true,
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
```
- `htmlMinify` 是否压缩html，默认开启
- `cssConfig` 
  - `name` 导出css 的文件名，如果是字符串，则所有css 将合并在此文件中，也可以是一个带有文件目录参数的函数，可以解析使用当前目录名左作为css 文件名
  - `outputDir` 导出css 到指定的目录
  - `minify` 是否压缩，默认开启
  - `basePath` 输出到页面中时文件的路径，默认情况下将使用`outputDir` 字段
- `jsConfig` 
  - `name` 导出js 的文件名，如果是字符串，则所有js 将合并在此文件中，也可以是一个带有文件目录参数的函数，可以解析使用当前目录名左作为js 文件名
  - `outputDir` 导出js 到指定的目录
  - `basePath` 输出到页面中时文件的路径，默认情况下将使用`outputDir` 字段
  - `minify` 是否压缩，默认开启
  - `babelOption` babel编译选项
- `layoutConfig`
  - `componentPattern` 当文件夹目录包含此字符串时，视为模块处理
  - `isLayout` 是否读取layout 文件替换模版，默认为false
  - `replaceTag`
    - `style` 模版文件中用于替换css 的标签，默认为`<!-- __style__ -->`
    - `script` 模版文件中用于替换js 的标签，默认为`<!-- __script__ -->`
    - `body` 模版文件中用于替换内容html 的标签，默认为`<!-- __body__ -->`


## Usage
```javascript
gulp.task('default', () => {
  return gulp.src('./views/pages/**/*.ejs')
      .pipe(ejsLoader({
        cssConfig: {
          // name字段如果为函数，可以使用文件的相对路径作为参数，规则可参考https://www.npmjs.com/package/vinyl#filerelative
          name: (path) => {
            return path.match(/\w+(?=\/)(?!\.html)/g)[0] ;
          },
          // name: 'common',
          outputDir: './dist/css/',
          basePath: '/public/dist/css/'
        },
        jsConfig: {
          name: (path) => {
            return path.match(/\w+(?=\/)(?!\.html)/g)[0] ;
          },
          outputDir: './dist/js/',
          basePath: '/path/css/'
        },
        layoutConfig: {
          isLayout: true,
          layoutFile: './views/layout.ejs',
        }
      }))
      .pipe(gulp.dest('./dist/pages/'));
})
```

在layout中使用如下方式写入占位符，方便后续位置填充

`./views/layout.ejs`
```html
<head>
  <!-- __style__ -->
</head>
<body>
  <!-- __body__ -->
  <script src="vue.js"></script>
  <!-- __script__ -->
</body>
```
在单独文件中以下列形式写模版
```html
<style>
  div {
    width: 40px;
    height: 30px;
  }
</style>
<!-- 此处支持内联css，只需使用inline属性即可，同时支持使用预处理器，目前支持post css和sass /scss，postcss 需在项目目录下配置.postcssrc 文件 -->
<style inline lang="postCss">
  p {
    color: #333;
    font-size: 28px;
  }
</style>
<!-- 页面html  -->
<div class="mod">
  <div class="view">
    <!-- 支持使用@requireTpl方法引入组件到页面中 -->
    <!-- 支持使用参数，目前支持使用 escapeEjs 参数将引入的ejs 文件中的<% 及 %> 替换为<%% 和 %%> -->
    @requireTpl('./component/index.ejs', { escapeEjs: true })
  </div>
</div>
<!-- js 支持使用es6 及以上语法，将编译压缩，同样支持内联，使用inline属性，babel 配置项可在babelrc中配置-->
<script inline>
  const a = 2;
  [1, 2, 3].map((n) => n + 1);
  new Promise((res, rej) => {
    setTimeout(res(10))
  })
</script>

<!-- 对于带有type 为 x-templat 属性的script，将视为模版，将以压缩html 方式压缩标签中的代码。并附带在模版中  -->
<script type="text/x-template" id="tpl_xtemplate">
  x-template support
</script>
```