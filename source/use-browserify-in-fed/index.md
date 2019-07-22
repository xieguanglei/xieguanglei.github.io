# 使用 Browserify 组织前端代码

在最近的一些项目中，我使用了 [Browserify](http://browserify.org/) 来组织和构建前端代码。这个工具彻底改变了前端代码的模块化组织（以及构建）形式。

## Browserify 的原理

Browserify 的工作是，将 node 风格组织的代码（CMD 规范）打包为可在浏览器上运行文件。

例如，模块 `index.js` 依赖了另两个模块 `a.js`，`b.js`。

```js
// b.js
module.exports = 'hello'

// a.js
module.exports = require('./b.js')

// index.js
module.exports = function(argument) {
  return {
    x: require('./a.js')
  }
}
```

Browserify 将其打包生成了这样一个文件。外面这层代码进行过压缩，我稍作反向（加了一些注释）。

```js
(function main(originMap, map, arr) {
  function getModule(index, u) {
    // 如果 map 中找不到
    //   如果 originMap 中也找不到，就报错
    //   如果 originMap 中找到了，就先去把 originMap 里面的模块执行一遍，
    //      其结果放在 map 中，并返回
    // 如果 map 中找到了，直接返回
    if (!map[index]) {
      if (!originMap[index]) {
        var a = typeof require == "function" && require;
        if (!u && a) return a(index, !0);
        if (i) return i(index, !0);
        var f = new Error("Cannot find module '" + index + "'");
        throw f.code = "MODULE_NOT_FOUND", f
      }
      // 这就是模块了
      var theModule = map[index] = {
        exports: {}
      };
      // 执行包含模块的函数 originMap[index][0]，当依赖其他模块时，
      // 利用依赖模块的索引 originMap[index][1] 递归调用 getModule
      originMap[index][0].call(theModule.exports, function(url) {
          var i = originMap[index][1][url];
          return getModule(i ? i : url)
        }, theModule, theModule.exports,
        main, originMap, map, arr /*这几处是用来调试的?*/ )
    }
    return map[index].exports
  }
  // Browserify 有多重模式，可以包装成供各种模式加载的模块文件。
  // 在其他模式下，Browserify 还会在再外面包一层 shim
  var i = typeof require == "function" && require;
  // 预先取一下入口模块
  for (var j = 0; j < arr.length; j++) {
    getModule(arr[j])
  };
  return getModule
})(

  // 第 1 个参数
  // originMap
  {
    // 每项是一个模块
    1: [
      // 模块的代码，包在一个函数中
      function(require, module, exports) {
        module.exports = function(argument) {
          return {
            x: require('./a.js')
          }
        }
      },
      // 这个模块所有依赖模块在 originMap 中的索引
      {
        "./a.js": 2
      }
    ],
    2: [

      function(require, module, exports) {
        module.exports = require('./b.js')
      }, {
        "./b.js": 3
      }
    ],
    3: [
      function(require, module, exports) {
        module.exports = 'hello'
      }, {}
    ]
  },

  // 第 2 个参数
  // map
  // 存储已经执行过的模块
  {},

  // 第 3 个参数
  // 入口模块的索引
  [1]

);
```

如源码所示，Browserify 将 `index.js` 文件、以及依赖的模块文件 `a.js` 和 `b.js` 中的文本分别包在函数中，在外部提供 `require`，`module`，`exports`，然后模拟 nodejs 模块化机制：仅在首次 `require` 模块时执行包含了模块的函数，并将返回值（即模块本身）暂存起来，以后 `require`模块时直接返回之前暂存的模块。

传统的前端模块化方案，如 RequireJS 等需要通过浏览器发起请求，获得并执行模块，得到模块的结果。每多一个模块文件，就会多一个请求。实际编写代码的时候，往往把模块的粒度分得很细，一两百行一个文件，但是这样请求就会非常多。虽然也有一些解决方案（把若干 AMD 模块打包为一个文件以减少请求），但是并没有形成事实的标准。Browserify 直接借鉴 Node 的模块组织方式，有天然的优势。

当然，Browserify 也有一些可以「缺陷」，比如文件体积比较大，使用 AMD 时在某些分支内部的文件也都全部打包了进来。但我认为这完全是可以容忍的。

## 使用 Browserify 配合 gulp

需要配合以 gulp-buffer 和 vinyl-source-stream。

```js
Browserify('src/index.js')
  .bundle()
  // vinyl-source-stream
  .pipe(source('index.js'))
  // gulp-buffer
  .pipe(buffer())
  .pipe(gulp.dest('build/'));
```