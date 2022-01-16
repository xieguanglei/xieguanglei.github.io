# 「译+注+修」Web 上的流媒体是如何工作的？

> 在研究 Web 流媒体视频技术时，我发现了[这篇文章](https://medium.com/canal-tech/how-video-streaming-works-on-the-web-an-introduction-7919739f7e1)。此文对前端工程师入门 Web 流媒体技术有很大帮助，阅读的同时翻译过来。文中的一些代码似乎运行不起来，或者缺失一些对前端开发者而言必要的上下文信息，所以我重写了所有示例代码，对文章本身也稍微修订了一下，一些地方增加了注解。

以下为经过修订、注解后的译文，一部分插图重画了，代码被全部重写。

***

> 本文主要介绍由 JavaScript 驱动的流媒体视频，主要面向 Web 开发者。大部分示例代码都是基于 HTML 和现代 JavaScript （ES6）编写的。如果你对 Web 前端技术不够熟悉，你可能会觉得本文难以阅读。

## 原生视频 API 的诞生

直到 2010 年 HTML5 出现之前，在 Web 上播放视频都依赖 Flash 插件。当时浏览器没有原生的解决方案，用户要么安装第三方插件如 Flash 或 Silverlight，要么就得忍受完全无法播放视频的处境。

为了填补此空缺，[WHATWG](https://whatwg.org/) 开始制定新的 HTML 标准，其中包括原生播放视频和声音的能力（不依赖插件）。此事的进程在 Apple 公开反对了 Flash 之后被加速了。

这个新的标准，就是后来为人熟知的 HTML5。

HTML5 带来了 `<video>` 标签。

这个新标签允许你在 HTML 中直接嵌入一段视频，就像使用 `<img>` 标签嵌入图像一样。

这很不错，但是对于专业的视频网站而言，`<video>` 标签有点过于简单了，与当时主流的 Flash 技术相比，`<video>` 标签缺少以下能力：

1. 实时切换视频的质量（清晰还是流畅），就像 youtube 一样；
2. 直播；
3. 根据用户喜好选择不同语言的音轨，就像 Netflix 一样。

幸运的是，类似的问题在今天的浏览器中都已经得到了完善的解决，而解决的方案正是本文讨论的重点：

## Video 标签

HTML5 中嵌入视频很简单，只需在页面中增加一个 `video` 标签和一些属性即可，比如：

```html
<html>
  <head>
    <meta charset="UTF-8">
    <title>My Video</title>
  </head>
  <body>
    <video src="red.mp4" width="320px" height="240px" />
  </body>
</html>
```

HTML 页面将直接把 some_video.mp4 加载到浏览器中，看上去是这样：

![](http://img.alicdn.com/tfs/TB177y5bvb2gK0jSZK9XXaEgFXa-400-330.jpg)

> 这里我使用了一个长达 30 秒，纯红色的视频，由 FFMPEG 生成。
> ```bash
> $ ffmpeg -f lavfi -i color=color=red -t 30 red.mp4
> ```

`video` 标签提供多个 API 以播放、暂停视频，调整视频播放的速度等：

```javascript
myVideo.pause();

myVideo.currentTime = 10;
```

然而，大部分视频网站的功能都要比上面这个 `video` 标签复杂得多。比如，「调整视频质量」和「直播」这两个功能，仅依靠上述 API 就没法完成。

![Youtube 调整视频质量](http://img.alicdn.com/tfs/TB10Ya4bq67gK0jSZFHXXa9jVXa-180-133.jpg)

## 媒体源扩展（MSE）

媒体源扩展（Media Source Extensions，又简称 MSE）是 W3C 标准的一部分，目前大部分浏览器均已实现。此功能允许 JavaScript 对媒体（视频）的源进行复杂的操作。

此「扩展」在 JavaScript 中增加了一个 `MediaSource` 对象。顾名思义，它表示视频的源——简单地说，就是视频背后的数据。

![源数据先 push 到 MediaSource 中，再显示到页面上](http://img.alicdn.com/tfs/TB1_VS2b8r0gK0jSZFnXXbRRXXa-511-130.png)

MSE 仍然需要通过 `video` 标签发挥作用。只不过，我们不再简单地把 `video` 的 `src` 属性设置为一个指向远程资源的链接，而是设置为指向 `MediaSource` 对象的链接。

W3C 定义了 `URL.createObjectURL` 方法，以创建一个链接指向客户端 JavaScript 上下文中的一个对象（而非通常情况下的远程资源）。我们就是通过这样的方法来把 `MediaSource` 对象赋给 `video` 标签的 `src` 属性上的。如下所示：

```javascript
const video = document.querySelector('video');
const ms = new MediaSource();

video.src = window.URL.createObjectURL(ms);
```

现在我们知道怎样吧 `MediaSource` 和 `video` 连接起来了，可是该怎么处理 `MediaSource` 呢？接下来我们引入一个概念：源缓冲区（source buffer）。

## 源缓冲区（Source Buffer）

视频流的数据，根本上是存储在 `SourceBuffer` 对象中。单个 `MediaSource` 对象包含了一个或多个 `SourceBuffer` 对象实例。每个 `SourceBuffer` 实例对应某种特定的流类型。简单地说，有三种流类型：

* 音频
* 视频
* 音频和视频

> 准确地说，流类型是通过 MIMEType 定义的，其中可能包含着关于编码格式的信息。

多个 `SourceBuffer` 连接到单个 `MediaSource` 对象，再连接到 `video` 标签，这一切都是直接在 JavaScript 中完成的。

有时候，我们会使用两个 `SourceBuffer`：一个视频流，一个音频流，这种用法很常见。

![源数据，SourceBuffer 和 MediaSource 间的关系](http://img.alicdn.com/tfs/TB1usy1b.T1gK0jSZFrXXcNCXXa-519-284.png)

将视频流和音频流分开，使得服务端也能够分开进行管理。这样做会带来一些好处（稍后讨论），以下是具体实现：

```javascript
const audioSourceBuffer = 
  mediaSource.addSourceBuffer('audio/mp4; codecs="mp4a.40.2"');
const videoSourceBuffer = 
  mediaSource.addSourceBuffer('video/mp4; codecs="avc1.64000C"');

fetch("./vf.mp4")
    .then(response => response.arrayBuffer())
    .then(videoData => videoSourceBuffer.appendBuffer(videoData));
fetch("./af.mp4")
    .then(response => response.arrayBuffer())
    .then(audioData => audioSourceBuffer.appendBuffer(audioData));

videoTag.addEventListener('click', () => videoTag.play());
```

这样，我们就可以手动地为 `video` 标签分别添加视频和音频源了。

> 接下来，应该讨论视频和音频源本身了。你可能注意到，视频和音频的格式都是 `mp4`。
>
> 其实，`mp4` 只是一种**容器格式**，包含了一些媒体数据本身也具有的信息，比如开始时间，持续时长等。
>
> MSE 规范并未规定哪些格式是被浏览器支持的。对视频而言，最常见的两种容器格式是 `mp4` 和 `webm`，其中 `webm` 是由 Google 在 Matroska 格式（`.mkv` 文件）的基础上发展出来的。

> ## 译者注：
>
> 当使用 `MediaSource` 管理视频播放源的时候，对视频源本身的格式，以及初始化的配置有着比较严格的要求。原文没有说明这一点，导致我无法将自己的本地视频按照此文的方式播放出来，而作者也没有提供示例视频。在一番实践之后，并且在 [这篇极好的文章](https://developer.mozilla.org/en-US/docs/Web/API/Media_Source_Extensions_API/Transcoding_assets_for_MSE) 的指导下，我终于把全流程走通了。这里比较详细地整理一下：
>
> ### MSE 媒体片段
>
> 首先，如果我们随便拿一个视频文件，按照上面的方法肯定是走不通的。使用 MSE 加载的源必须遵循了 [ISO BMFF Byte Stream Format](https://www.w3.org/TR/mse-byte-stream-format-isobmff/) 这个标准。此标准是专门为流媒体制定的，通常将这样的媒体文件称为「片段（fragments）」，因为 MSE 被设计出来的作用就是加载媒体片段而不是整个媒体，这样就可以一边加载，一边把加载得到的片段加入（append）到源缓冲区中，甚至根据用户交互去加载不同的视频片段，从而获得对视频播放的更细粒度的控制权。普通的媒体文件一般不会遵循这个标准。
> 
> 为了检查一个媒体文件是不是片段，我们可以用 [Bento4](https://github.com/axiomatic-systems/Bento4) 这个工具（此工具专门用来处理媒体文件的元信息）。这个工具需要自己编译安装。我自己试过在 Mac 上用 XCode 编译安装，还是挺容易的。总之安装完后，你就获得了一套命令行工具，其中一个名为 `mp4info` 的后面会频繁地用到。
>
> 用 `mp4info` 查看某个媒体文件，比如上面用到的 `vf.mp4`。
>
> ```bash
> $ mp4info ./vf.mp4
> File:
>   major brand:      iso5
>   minor version:    200
>   compatible brand: iso6
>   compatible brand: mp41
>   fast start:       yes
> 
> Movie:
>   duration:   0 ms
>   time scale: 1000
>   fragments:  yes
> 
> Found 1 Tracks
> Track 1:
>   flags:        3 ENABLED IN-MOVIE
>   id:           1
>   ......
>   Sample Description 0
>     ......
>     Codecs String: avc1.64000C
> ```
> 
> 输出的数据里会有 `fragments:yes` 的信息，即表明是片段。除了用 `mp4info`，还有一个 [在线工具](http://nickdesaulniers.github.io/mp4info/) 可以用来识别某个文件是不是「片段」。
>
> ### 生成片段
> 
> 怎么通过一个普通的媒体文件去生成片段呢，这时就需要借助大名鼎鼎的 [FFMPEG](https://ffmpeg.org/) 了。FFMPEG 的安装很简单，对 Mac 来说，直接用 Homebrew 安装就行了。下面这个命令，把 [示例视频 trailer_1080p.mov](http://wayback.archive.org/web/20161102172252id_/http://video.blendertestbuilds.de/download.php?file=download.blender.org/peach/trailer_1080p.mov)（你也可以换成任意其他视频，问题应该都不大）处理成片段（虽然只有一段）。
>
> ```bash
> $ ffmpeg -i trailer_1080p.mov -vf scale=320:-1 -an \ 
>          -movflags frag_keyframe+empty_moov+default_base_moof vf.mp4
> ```
>
> 解释一下参数：
>
> * `-i trailer_1080p.mov`：输入媒体源。
> * `-vf scale=320:-1`：源媒体视频尺寸（1920x1080）有点大，将输出的尺寸改为宽度 320 并保持宽高比。
> * `-an`：此参数指定输出的媒体中仅包含视频部分，也就是只取画面，丢弃音轨。如果你用 `mp4info` 查看 `trailer_1080p.mov`，会发现其包含两个轨（track），一个画面，一个音频；但是 `vf.mp4` 就只有一个轨（`Found 1 Tracks`）。
> * `-movflags frag_keyframe+empty_moov+default_base_moof`：这就是将普通视频文件输出为符合 ISO BMFF 标准的片段文件了。
> * `vf.mp4`：输出文件。
>
> 接下来生成音频源：
> 
> ```bash
> ffmpeg -i trailer_1080p.mov -c:a copy -vn \
>        -movflags frag_keyframe+empty_moov+default_base_moof af.mp4
> ```
> 
> 解释一下新出现的参数：
> 
> * `-vn`：和之前的 `-an` 对应，只提取音轨，丢弃视频。
> * `-c:a`：表示音轨部分是拷贝操作（之前视频部分，视频尺寸是需要压缩的，相当于已经设置了转换逻辑，不是单纯的拷贝）。
>
> 这样，才最终生成了可以经由 MSE 加载的媒体片段文件。

# 媒体片段（Media Segments）

仍然有一些问题没有解决：

* 需要等到整段内容加载完成并推送到 SourceBuffer 内，才能开始播放吗？
* 如何在观看过程中切换不同质量的视频，或切换不同语言的音频？
* 怎样播放直播视频（边拍摄边播放）？

前面的例子中，我们用一个文件表示整段视频和整段音频。如果你想要做一些复杂点的事情（切换语言，视频质量，直播，等等），就会遇到一些麻烦。

其实，在哪些视频网站的视频播放器内部，视频和音频数据都是被切成多个片段（segment），通常每个片段内只包含 2 到 10 秒的内容。

![](http://img.alicdn.com/tfs/TB12VS2b8r0gK0jSZFnXXbRRXXa-382-62.png)

因为操控的是这些音视频片段，想做什么事情就很灵活了：我们可以在播放过程中逐渐地加载片段，并不算将加载到的片段向媒体中推送。

看下面这个例子：

```javascript
const vSegs = Array.from(
  { length: 15 }, 
  (v, i) => `./v/video/avc1/${i === 0 ? 'init.mp4' : `seg-${i}.m4s`}`
);
function loadVSegs(videoSourceBuffer) {
    if (vSegs.length === 0) {
        console.log('vSegs loaded');
    } else {
        const seg = vSegs.shift();
        fetch(seg).then(function (response) {
            return response.arrayBuffer();
        }).then(function (buffer) {
            videoSourceBuffer.appendBuffer(buffer);
            loadVSegs(videoSourceBuffer);
        });
    }
}

const aSegs = Array.from(
  { length: 2 },
  (v, i) => `./a/audio/en/mp4a/${i === 0 ? 'init.mp4' : `seg-${i}.m4s`}`
);
function loadASegs(audioSourceBuffer) {
    if (aSegs.length === 0) {
        console.log('aSegs loaded');
    } else {
        const seg = aSegs.shift();
        fetch(seg).then(function (response) {
            return response.arrayBuffer();
        }).then(function (buffer) {
            audioSourceBuffer.appendBuffer(buffer);
            loadASegs(audioSourceBuffer);
        });
    }
}

const audioSourceBuffer = 
  mediaSource.addSourceBuffer('audio/mp4; codecs="mp4a.40.2"');
const videoSourceBuffer = 
  mediaSource.addSourceBuffer('video/mp4; codecs="avc1.64000C"');

loadVSegs(videoSourceBuffer);
loadASegs(audioSourceBuffer);
```

对应的，服务器端存储着多个媒体文件片段，目录基本结构如下所示：

```bash
├── a
│   ├── audio
│   │   └── en
│   │       └── mp4a
│   │           ├── init.mp4
│   │           └── seg-1.m4s
│   └── stream.mpd
├── v
│   ├── stream.mpd
│   └── video
│       └── avc1
│           ├── init.mp4
│           ├── seg-1.m4s
│           ├── seg-10.m4s
│           ├── seg-11.m4s
│           ├── seg-12.m4s
│           ├── seg-13.m4s
│           ├── seg-14.m4s
│           ├── seg-2.m4s
│           ├── seg-3.m4s
│           ├── seg-4.m4s
│           ├── seg-5.m4s
│           ├── seg-6.m4s
│           ├── seg-7.m4s
│           ├── seg-8.m4s
│           └── seg-9.m4s
```

> 真正的流媒体服务器上，文件通常不是物理分割的，浏览器可以使用 HTTP 的 Range 头来向服务器请求文件片段，而服务端可以做任意的操作，只需要保证有正确的返回即可。不过这些是实现细节，目前我们就假设服务器上都是物理分割好的静态文件，按照此目录结构排放。

在这个例子中，我们终于不用等音频或视频全部加载完成后才能开始播放了：只需要加载第一个视频和音频片段，即可开始播放。视频网站上的流媒体播放器各自有一些加载策略，但是基本逻辑是一致的：即尽量按照次序先加载一些片段，然后开始播放。你可以在 Firefox / Chrome / Edge 浏览器的开发者工具的 NetWork 标签页观察到这些播放器加载媒体的节奏。

顺便提一句，你可能注意到，我们在把片段数据推送源缓冲区的时候，没有指定该片段处于视频时间轴的哪个位置（几秒到几秒）上。实际上，推送片段的顺序和片段的时间前后没有关系，片段内已经包含了足够的信息来描述自己处于视频的那个位置。我们没有必要像例子中一样严格按照顺序加载片段。

> ## 译者注
>
> 原文也没有提供将单个片段切割为多个片段的方法。这里补充一下：
>
> 之前安装的 Bento4 提供了一些 python 文件，其中有一个 `mp4-dash.py` 文件可用于做文件切割。
>
> ```bash
> $ python mp4-dash.py --exec-dir=<path to Bento4 tools> ./vf.mp4
> ```
> 
> ```bash
> $ python mp4-dash.py --exec-dir=<path to Bento4 tools> ./af.mp4
> ```
>
> 其中 `<path to Bento4 tools>` 是你放置 Bento4 编译产物的目录。
>
> 一般来说这样的工作都是整合到工作流里的，因为本身是脚本语言通过调用 Bento4 工具来完成的，所以整合进工作流应当是很容易的。我这里是直接调用此脚本，然后手动微调目录结构，最后得到了上述的目录结构。

## 自适应的媒体流（Adaptive Streaming）

许多播放器有类似「画质-自动」的选项，即根据用户网络等情况来自动选择画质，此即自适应的媒体流。

## 切换语言

一个更复杂的场景时切换语言，如 Netflix，Amazon Prime Video 或者 MyCanal 上，不同语言的音频是不同的。

> ## 译者注
>
> 此两节我就没有翻译了，因为其实都是可以预见的业务逻辑。当用户进行操作的时候，从另一个地方去加载媒体片段，然后添加到当前正在播放的视频流中来。
>
> 有一个知识点值得注意的是，`SourceBuffer#remove` 方法可以移除已经添加的数据。比如当用户切换了语言，那么原有的已经被添加到流中，但是还未播放的音频数据就没有用了，这是可以调用此方法来进行清理。

## 直播

我们还没有讨论过直播。近年来，直播变得非常流行（twitch.tv，YouTube 直播，等等）。本文上面讨论的这些技术，也被深入地用在直播的场景中。

假设现在 YouTube 上正在进行一场直播，开始与 4 秒之前。

假设每个媒体片段的长度为 2 秒，那么现在 YouTube 的服务器上应该已经存在了 2 段视频片段和 2 段音频片段，一段（segment0s）表示 0~2 秒，一段（segment2s）表示 2~4 秒：

```
./audio/
  ├── segment0s.mp4
  └── segment2s.mp4
./video/
  ├── segment0s.mp4
  └── segment2s.mp4
```

第 5 秒的时候，下一个媒体片段还没有被生产出来，服务器上的文件状态没有变：

第 6 秒，下一个媒体片段被生产出来了，服务器上是这样的：

```
./audio/
  ├── segment0s.mp4
  ├── segment2s.mp4
  └── segment4s.mp4
./video/
  ├── segment0s.mp4
  ├── segment2s.mp4
  └── segment4s.mp4
```

从服务器的角度来说，这很合理。直播的内容不是连续的，而是离散地一段一段地生成出来。

这时的问题是，浏览器端的 JS 如何知道什么时候去获取最新的媒体片段？也许，我们可以在客户端起一个定时器，预测服务器上什么时候会有下一个片段，按照 `segmentX.mp4` 的格式，到时间了就试图去服务器上请求媒体片段。这种做法很容易引起问题：比如，也许媒体片段并不是每段的长度都相等；又比如，服务器也许无法精确地控制每一段视频生成的时间，也许服务器是不是要花时间清理前面生成的旧数据呢；（又比如，客户端和服务端的计时器本来就可能存在误差，译者注）。从浏览器端的角度，我们希望在最后一段视频被生产出来后，尽快地请求到并播放；同时，我们也不希望过早地进行请求（这样会得到 404 错误）。

这个问题，通常是用传输协议，有时也成为流媒体协议（Streaming Media Protocol）来解决的。

> ### 译者注
> 
> 其实不管如何，直播总是会有可感知的延迟的。至少一个片段所包含的时间是如何优化都优化不了的。片段又不可能太小，太小的话数量就太多了，又会有其他的问题。
>
> 对于实时要求更高的通讯场合，比如视频聊天，远程控制等等，通常需要借助更基础的协议比如 WebRTC 来完成。

## 流媒体协议

仔细地解释流媒体协议超出了本文的范畴，但是简单地说，所有流媒体都有个核心概念：Manifest。Manifest 是用来描述服务器上视频片段的元信息文件。

通过 Manifest 文件，你可以获知：

* 服务器上有哪些视频和音频片段资源（即，URL 是什么），音频支持哪几种语言。
* 视频有哪些分辨率可选择，音频有哪些码率可选择。
* 以及最重要的，目前直播的进展是怎样的，最新的视频和音频片段是哪个。

几种主要的流媒体协议包括：

### DASH

YouTube，Netflix 和 Amazon Prime Video 使用此协议。基本格式为 XML，具有很大的灵活性，支持大多数场景如音频描述，家长控制，等。编解码器无关。

### HLS

由 Apple 开发，DailyMotion，Twitch.tv 使用此协议。采用 m3u8 格式（m3u 播放列表文件，UTF-8编码）。

### Smooth Streaming

由 Microsoft 开发，多个 Microsoft 产品和 MyCanal 使用此协议。基于 XML。

## 真实世界

如你所见，网络视频背后的核心概念是在 JavaScript 中动态获取和播放视频、音频片段。播放器其实是一个非常复杂的模块，它需要包括：

* 下载和解析某种流媒体协议清单文件
* 猜测当前的网络状况
* 获取用户的偏好设置（例如，偏好语言）
* 基于前两点（网络和用户偏好），来决策去下载哪个媒体片段
* 管理一个队列，尽量在正确的时间下载正确的片段（一下子把所有片段都下载下来是低效和浪费的，但严格按照先后顺序下载片段又太死板和缓慢了，这里非常需要策略）
* 播放字幕，通常完全由 JS 管理
* 可能还要管理缩略图队列，有的播放器允许用户在把鼠标悬停在进度条上时看到缩略图
* DRM 管理（是什么？译者注）
* 以及很多其他功能……

所以尽管如此，目前复杂的 Web 视频播放器，基本都是基于 MediaSource 和 SourceBuffers 开发的。