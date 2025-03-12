# Dalaran —— 开箱即用的 Webpack

不知不觉已经到了 2018 年，Webpack / Babel 早已是前端标配。但是每次新开一个项目，都要重新配置一遍环境，实在是痛苦不堪。然而每个项目的情况，并不存在一个包治百病的 Webpack 配置，而且有时开发环境里还需用到 Webpack 之外的其他工具。所以，我花了一些时间开发了一个开箱即用的 Webpack 任务工厂，既能够减少配置 Webpack 及周边工具的痛苦，又保持了相当的灵活性。我把这个工具命名为 dalaran （达拉然）。

工具地址：[github](https://github.com/xieguanglei/dalaran) [dalaran](https://www.npmjs.com/package/dalaran)

**以下是 Dalaran 中文文档：**

Dalaran 是一个帮助你简化 Webpack 配置的轻量级工具。与其他重量级开发环境框架相比，dalaran 把「定义自己开发流程」的权力交还给了你自己，你需要使用 [Gulp](https://gulpjs.com/) 来管理任务。

> Dalaran（达拉然）的名字来源于网络游戏「魔兽世界」中的魔法城市，达拉然。

下面是使用文档：

Dalaran 可以帮助你做：

* 对 webpack 配置默认的 loader 和 plugin，对 babel 配置默认的 preset。
* 根据默认或者自定义的规则找到入口文件和打包目录。
* 无需配置（或少量配置）即可在 karma 和 chrome 里运行测试用例。
* 无需配置（或自定义配置）即可使用 eslint 检查代码拼写。
* 使用 webpack-dev-middleware 和 express 提供开发环境。
* 在发布模块或部署脚本之前，对代码进行编译或打包。

## 使用方法

基本上，你可以使用 dalaran 来：

* 开发一个前端应用（Application）。
* 开发一个前端库（Library）。

你需要进行的任务包括开发（dev），构建（build）/编译（compile），测试（test）。推荐使用 gulp 来管理这些任务。

你的 gulpfile 大概是这样的：

```javascript
const gulp = requir('gulp');
const dalaran = requre('dalaran');

const libTasks = dalaran.libraryTasks({...options});

gulp.task('dev', libTasks.dev);
gulp.task('test', libTasks.test);

gulp.task('prepare', function(){
    // 自定义的任务
})
```

## 开发一个前端库（Library）

Dalaran 为开发前端库提供了 4 个任务：dev，build，compile 和 test。

调用 `tasks.libraryTasks(options)` 来创建这些任务。

### options

| 名称             | 描述                                      | 类型    | 默认值             |
| ---------------- | ----------------------------------------- | ------- | ------------------ |
| port             | 开发服务器端口                            | Number  | 3000               |
| base             | 项目的根目录                              | Sting   | process.cwd()      |
| entry            | 前端库的入口文件                          | String  | './src/index.js'   |
| src              | 源码目录                                  | String  | './src'            |
| lib              | 编译（为 es5 以发布到 npm）后代码存放目录 | String  | './lib'            |
| demo             | demo 页目录（用于开发或功能演示）         | String  | './demo'           |
| dist             | 构建产物存放目录（UMD 类文件）            | String  | './dist'           |
| umdName          | UMD 库名                                  | String  | 'foo'              |
| devSuffix        | 开发环境打包后文件的后缀名（除外`.js`）   | String  | 'bundle'           |
| buildSuffix      | 构建时打包后文件的后缀名（除外`.js`）     | String  | 'min'              |
| react            | 是否转译 JSX                              | Boolean | false              |
| loaders          | 额外的自定义 webpack loaders              | Array   | []                 |
| plugins          | 额外的自定义 webpack plugins              | Array   | []                 |
| babelPolyfill    | 是否需要引入 babelPolyfill                | Boolean | false              |
| devCors          | 开发服务器是否开启资源跨域                | Boolean | true               |
| watchTest        | 测试任务是否为 watch 模式                 | Boolean | false              |
| testEntryPattern | 测试文件的路径模式                        | String  | 'src/**/*.spec.js' |
| eslint           | 是否开启 eslint                           | Boolean | true               |

### 目录结构

默认情况下，项目的目录结构大致如下所示：

```
project
│   README.md
│   package.json
│   gulpfile.js
└───demo
│       foo.html
│       foo.js
│       bar.html
│       bar.js
└───dist
│       foo.min.js
└───lib
│   │   index.js
│   └───foo
│           foo.js
└───src
    │   index.js
    └───foo
            foo.js
            foo.spec.js
```


### dev 任务

```
gulp.task('dev', libTasks.dev);
```

将需要调试的 demo 页面放置在默认为 './demo' 的目录下。具有相同名称的 html 和 js 文件即可以构成一个 demo 页面，比如 `foo.html` 和 `foo.js` 就组成了名为 `foo` 的 demo 页面。HTML 文件大致如下所示：

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="ie=edge">
    <title>Document</title>
</head>
<body>
    <script src="./foo.bundle.js"></script>
</body>
</html>
```

你可以任意更改该 html 文件，唯一需要记住的是，页面需要包含如下 script 标签 `<script src="/foo.bundle.js"></script>`，也就是以 `foo.js` 为入口打包出的文件。后缀名 `bundle` 可以在 `devSuffix` 中修改。

`foo.js` 大致如下所示：

```
import MyLib from '../src/index';
// demo code
```

运行 `gulp dev`，dalaran 会自动打开你的浏览器并打开 `http://127.0.0.1:3000` （如果你不指定其他端口的话），此时你会看到你的 demo 页面列表。

点击 demo 页面的 `link` 链接，就可以进入开发调试环境了。

注意，eslint 是默认开启的，dalaran 提供了一份默认的 eslint 配置。如果你在根目录下放置了一个自定义的 .eslintrc，则会覆盖默认的配置。

### test 任务

通过配置 `testEntryPattern` 参数，dalaran 可以在 Karma 和 Chrome 里运行测试用例。测试文件的示例（比如 `foo.spec.js`）如下所示：

```javascript
import expect from 'expect';
import MyLib from '../src/index';

describe('mylib', function () {

    it('mylib should be ok', function(){
        expect(!!MyLib).toBeTruthy();
    });

});
```

运行 `gulp test` 测试结果会输出到命令行。

### build 任务

```javascript
gulp.task('build', libTasks.build);
```

运行 `gulp build` 将会以模块的入口文件（默认为'./src/index.js'）打包出一个 UMD 风格的 js 文件并放置在 `dist` 目录下。你需要提供一个 `umdName` 选项，该文件将被命名为 `${umdName.toLowercase()}.${buildSuffix}.js`。如果你通过 script 标签加载并运行该 js 文件，就可以使用 `window.${umdName}` 变量获取到该模块。

### compile 任务

```javascript
gulp.task('build', libTasks.build);
```

如果你的源码仅包含 js 文件（也就是说，你不会通过一些额外的 loader 来加载 `.less`, `.txt`, `.jpg` 等文件），你就可以将 es6 / jsx 代码编译为 es5，然后发布到 npm 上供他人进一步使用。这样做的好处是，如果你的库依赖了其他 npm 库，就不会将其打包进去（UMD 则会）。编译后的文件，被放置在 `lib` 目录下（你可以通过 `lib` 选项来修改）。

运行 `gulp compile`, 编译任务会很快完成。


## 开发一个前端应用（Application）

Dalaran 为开发前端应用提供了 3 个任务：dev，build 和 test。

你需要调用 `tasks.applicationTasks(options)` 来创建这些任务。

### options

| name             | description                             | type    | default            |
| ---------------- | --------------------------------------- | ------- | ------------------ |
| port             | 开发服务器端口                          | Number  | 3000               |
| base             | 项目的根目录                            | Sting   | process.cwd()      |
| src              | 源码目录                                | String  | './src'            |
| demo             | 应用的页面目录                          | String  | './demo'           |
| dist             | 构建产物存放目录                        | String  | './dist'           |
| devSuffix        | 开发环境打包后文件的后缀名（除外`.js`） | String  | 'bundle'           |
| buildSuffix      | 构建时打包后文件的后缀名（除外`.js`）   | String  | 'bundle'           |
| react            | 是否转译 JSX                            | Boolean | false              |
| loaders          | 额外的自定义 webpack loaders            | Array   | []                 |
| plugins          | 额外的自定义 webpack plugins            | Array   | []                 |
| babelPolyfill    | 是否需要引入 babelPolyfill              | Boolean | false              |
| devCors          | 开发服务器是否开启资源跨域              | Boolean | true               |
| watchTest        | 测试任务是否为 watch 模式               | Boolean | false              |
| testEntryPattern | 测试文件的路径模式                      | String  | 'src/**/*.spec.js' |
| commonsChunk     | 是否开启 commonsChunk Plugin            | Boolean | true               |
| publicPath       | 应用部署路径的 path                     | String  | './'               |
| eslint           | 是否开启 eslint                         | Boolean | true               |

与开发前端库时的选项相比，有几点区别：

1. 不需要指定 entry 选项，入口会从 demo 目录内分析出来。
2. 不需要提供 umdName 选项。
3. 不需要提供 lib 目录。
4. `buildSuffix` 的默认值是 `bundle` 而不是 `min`。
5. 可以使用 `commonsChunk` 选项开启该插件。

### 目录结构

项目的根目录的结构大致如下所示：

```bash
project
│   README.md
│   package.json
│   gulpfile.js
└───demo
│       foo.html
│       foo.js
│       bar.html
│       bar.js
└───dist
│       foo.html
│       foo.bundle.js
│       bar.html
│       bar.bundle.js
└───src
    │   index.js
    └───foo
            foo.js
            foo.spec.js
```

Compared with library tasks, there are 2 main differences. 

与开发前端库相比，主要有两点区别：

1. 不再需要 lib 目录。
2. dist 目录中的内容，像是 demo 目录的映射一样。（开发前端库时，此目录下只有一个 UMD 文件）。
3. 如果你开启了 commonsChunk 插件，则 html 中也需要包含该插件提取出的公共内容。就像这样：

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="ie=edge">
    <title>Document</title>
</head>
<body>
    <script src="./commons.bundle.js"></script>
    <script src="./foo.bundle.js"></script>
</body>
</html>
```

### dev 任务

Dev 任务与开发前端库时完全一致。

### test 任务

Test 任务与开发前端库时完全一致。

### build 任务

与开发前端库时相比，build 任务有些不同。此时，build 任务将会对 demo 目录下的每一个页面的入口 js 文件进行打包，同时也会将 html 文件复制到 dist 目录下。你可以将 dist 目录中打包后的 js 部署到静态资源服务器（比如使用内容分发网络）上，然后在自己的页面里加载这个 js 文件。当然，你也可以将整个 dist 目录部署在静态文件服务器上（比如使用 gh-pages），这也行得通。

> 注意，开发前端应用时，是没有 compile 任务的。

## 如果你仍然有疑问

你可以查看本仓库 `packages` 目录中的内容，该目录下有 4 个子目录，每一个都表示一个项目。你可以试着把它们运行起来，以了解 dalaran 是如何工作的。