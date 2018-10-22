# Intro
Gulp-SFC-loader 是一个使用单文件组件思想，用于方便传统HTML 项目进行模块化，同时完成內联js 及css编译及抽离的gulp 插件；

## Install
```
npm install gulp-sfc-loader
```

## Config
```json
{
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
  babelOption: {
    presets: ['@babel/env']
  }, 
}
```
- componentPattern 当文件夹目录包含此字符串时，视为模块处理
- layout 基本布局文件目录，如果此字段为false 则不替换模版，将默认将css 和js 内联
- styleReplaceTag 模版文件中用于替换css 的标签
- scriptReplaceTag 模版文件中用于替换js 的标签
- bodyReplaceTag 模版文件中用于替换内容html 的标签
- cssConfig 
  - name 导出css 的文件名，如果是字符串，则所有css 将合并在此文件中，也可以是一个带有文件目录参数的函数，可以解析使用当前目录名左作为css 文件名
  - outputDir 导出css 到指定的目录
- jsConfig 
  - name 导出js 的文件名，如果是字符串，则所有js 将合并在此文件中，也可以是一个带有文件目录参数的函数，可以解析使用当前目录名左作为js 文件名
  - outputDir 导出js 到指定的目录
- babelOption babel编译选项

## Usage
在layout中使用如下方式写入占位符，方便后续位置填充
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
<!-- 此处支持内联css，只需使用inline属性即可，同时支持使用预处理器，目前支持post css，需在项目目录下配置.postcssrc 文件 -->
<style inline lang="postCss">
  p {
    color: #333;
    font-size: 28px;
  }
</style>
<!-- 页面html 需包裹在template 标签中，以增强可读性， -->
<template>
  <div class="mod">
    <div class="view">
      <!-- 支持使用@requireTpl方法引入组件到页面中 -->
      @requireTpl('./component/index.ejs')
    </div>
  </div>
</template>

<!-- js 支持使用es6 及以上语法，将编译压缩，同样支持内联，使用inline属性-->
<script inline>
  const a = 2;
  [1, 2, 3].map((n) => n + 1);
  new Promise((res, rej) => {
    setTimeout(res(10))
  })
</script>
```
<!-- 对于带有type 为 x-templat 属性的script，将视为模版，将以压缩html 方式压缩标签中的代码。并附带在模版中  -->
<script type="text/x-template" id="tpl_xtemplate">
  x-template support
</script>