# Amberpine —— 静态博客网站生成器

前端，喜欢折腾博客。之前曾写过一篇《博客折腾的历程》，年代有点远了。实际上这三四年，我一直都是自己写了个 nodejs 小脚本，每次在本地构建，然后将构建产物 push 到 github 仓库来发布博客的。

这两天晚上闲着，想着干脆把构建搬到 travis-ci 上吧，然后做着做着呢，要不干脆把这个博客生成脚本整理整理，也单独分个包出来吧，兴许有人用得着呢。于是就有了 Amberpine —— 静态博客网站生成器。

具体的，这个工具生成的博客集成了 Google Analytics，集成了 [MathJax](https://www.mathjax.org/) 和 [Highlight.js](https://highlightjs.org/)；没有支持评论系统（因为我觉得博客主要还是个记录自己的地方）。HTML 结构没有开放出来，CSS 样式全开放出来了，可以自由发挥。

工具也提供了「写作模式」，就是本地文件保存后页面自动刷新显示最新的改动。不过我一般是在 Quiver 上写好再贴过来，这个写作模式也就是在最后微调排版的时候用得上。

![](http://xieguanglei.oss-cn-hangzhou.aliyuncs.com/blog-post/2019-5-28/dev.gif)

后面附上工具的 README 吧：

## 安装

全局安装：

```bash
> npm install amberpine -g
```

本地安装：

```bash
> mkdir myblog
> cd myblog
> npm install amberpine --save-dev
```

## 初始化

```bash
> abp i # 全局安装
> node_modules/.bin/abp i # 本地安装
```

在当前目录下生成结构：
1. `source` 目录存放博客文章列表。
2. `assets` 目录中存放静态资源，包含一个必须的 `index.css` 文件，可修改此文件来改变样式。

## 写作

```bash
> abp d
```

参考 `source/first-post` 目录中的 `yaml` 文件和 `md` 文件进行写作。文章编辑保存时，浏览器会自动刷新以体现最新的进展。

## 构建

```bash
> abp
```

执行此命令将在 dist 目录下生成完整的站点，包含一个首页 `index.html` 和每篇文章的一个 `html` 页。

## 发布

一般情况下，将 dist 目录作为根目录完整地发布到任何静态文件服务器即可。一个常用的选择是 [github-pages](https://pages.github.com/)。可以使用 [travis-ci](https://docs.travis-ci.com/user/deployment/pages/) 来完成构建。

```yml
language: node_js
node_js:
  - 9.11.2
script:
  - npm install amberpine
  - node_modules/.bin/abp
  - cp .nojekyll dist # 防止 githuh-pages 将仓库当做 jekyll 项目来构建，
                      # 如果你没有使用 gitub-pages，可删除此文件。
branches:
  only:
  - source # 文章的源文件（md 文件）放在这个分支上
deploy:
  provider: pages
  local_dir: dist
  skip_cleanup: true
  github_token: $GITHUB_TOKEN # 在 Travis-CI 上设置 GITHUB_TOKEN
  on:
    branch: source
  target_branch: gh-pages # 对项目主页来说通常是 gh-pages 分支
                          # 但对个人/组织主页来说，通常是 master 分支
```
