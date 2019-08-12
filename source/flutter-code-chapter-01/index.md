# Flutter Framework 源码解析（ 1 ）—— 开篇和绘图引擎的用法

Flutter 是 Google 主导的跨平台 UI 开发解决方案，也是 2019 年前端界最热的名词（再加个「没有之一」，应该也不算过分吧）。因为工作的原因，我曾「被迫」完整地阅读了 Flutter Framework 的几乎所有代码，并使用另一种语言 TypeScript 重新实现了 Flutter Framework 的核心功能。这是一段痛苦的经历——至少在彼时，Flutter 的实现还远远称不上优雅。但是如今回望，这段经历也使我有机会得以一窥「世界级」UI 渲染框架的内部运行原理，令我「大开眼界」。正所谓念念不忘，必有回响，我准备开一个系列博文，讲一讲那段时间我阅读和实践 Flutter 的所见所闻。

Flutter 与之前的跨平台 UI 开发解决方案（以 React 为代表）的最大区别，即 Flutter 是「自绘性」的。React 等框架最终需要借助具体平台的 UI 实现来落地：在 Web 上落实到 DOM API，在 iOS 和 Android 上各自落实到 iOS 和 Android 操作系统提供的 UI 组件，至于将组件**画出来**这个任务，则交由平台（WebView / iOS / Android）自己来实现了，画成什么样子，不得不受平台的钳制；而 Flutter 则更进一步，绕过平台的 UI 组件，直接落实到了绘图层，借助（Skia）这个强大的开源绘图引擎，自己把控了 UI 组件的绘制这一步骤。只要平台能够与 Skia 对接（通常是通过 OpenGL），Flutter 基本可以保证完全一致的渲染体验。Flutter 具有「自绘性」的特点，固然是因为它出现得比 React 晚，对 React 的痛点有深切的领悟，同时也与其团队的背景也密不可分——据说 Flutter 开发团队的许多成员都来自原 Chrome 浏览器 团队，而我们知道 Chrome 浏览器的绘图也是靠 Skia 完成的；所以 Flutter 其实与 Chrome 也有很深的渊源，某种意义上可视为完全没有 W3C 包袱的 Chrome 的继承者。

![Flutter vs React](http://img.alicdn.com/tfs/TB1sWT_c7Y2gK0jSZFgXXc5OFXa-477-300.png)

Flutter 的上层框架使用了 Dart 语言，这是一门优缺点都比较明显的语言（正如 Flutter 是一款优缺点都比较明显的框架）。Dart 在 Flutter 中扮演了极为重要的作用，从界面的描述，到布局、合成、绘制，整个渲染的逻辑（在 Chrome 中由 C++ 完成）有九成是由 Dart 完成的。本系列博文的讨论都将基于这门语言进行，但对 Dart 语言本身则不太会展开讲，我相信，对于前端工程师而言，Dart 语言本身造成的障碍是较为有限的，尤其是如果你已经使用过诸如 typescript 这样的具有类型系统的前端编程语言。如果你完全不了解 Dart，直接跟着本文熟悉 Dart，遇到问题去查阅一下文档，相信本系列文章完结时，你就能写出相当工整的 Dart 代码了。

## Flutter 架构

宽泛地说，从 UI 的描述到屏幕上的像素颜色，Flutter 处理的数据经过了以下几个阶段：

1. Widget 树：抽象概念，表示用户对界面描述的方式。更准确地说，用户通过派生 `StatefulWidget` 或 `StatelessWidget` 类来实现顶层 `Widget` 类以描述整个应用，我们也通俗地将此行为称作「用户通过 **Widget 树**描述应用的 UI」。
2. Element 树：树形数据结构，持久地存在于应用运行期间的 Dart 上下文中，根据 `Widget` 的变化更新自身管理的数据，并在必要的时候对 RenderObject 树进行调整（增删改）。Element 树与 Widget 树的节点几乎一一对应。
3. RenderObject 树：树形数据结构，持久地存在于运行期间的 Dart 上下文中，接收来自 Element 树的同步。布局和绘制操作是针对 RenderObject 树进行的。RenderObject 树节点的数量通常略少于 Element 树的节点。
4. Layer 链表：链表形数据结构，节点本身持久地存在于运行期间的 Dart 上下文中，并依附与某些特定的 RenderObject，但链表节点间的关系则依赖程序对 RenderObject 树的遍历；每次绘图，需将 Layer 链表同步给 Engine 层。Layer 链表中节点的数量是较少的，通常许多个 RenderObject 才对应一个 Layer 节点。
5. Engine 层：由 C++ 实现的绘图层，依赖 Skia，为 Dart 提供少量但性能极高的绘图、合成 API。

其中，1~4 通常又称为 Flutter Framework；而第 5 步则属于 Flutter Engine 的范畴。通常，不熟悉 Flutter 的读者可能对以上描述难以理解，请勿介怀（其实这几句是写给我自己整理思路的），大概能记住下面这张图就可以了。

![](http://img.alicdn.com/tfs/TB1nx69c7P2gK0jSZPxXXacQpXa-202-314.png)

## 绘图引擎的基本用法

Flutter 是「自绘性」的渲染引擎，最终离不开绘图操作。我想先抛开 Widget，Element，RenderObject 这些概念，从 Flutter 所使用的绘图引擎开始讲起，这对后续的学习是很关键的。我们先按照 Flutter 官方提供的 [Flutter Framework 开发环境配置指南](https://github.com/flutter/flutter/wiki/Setting-up-the-Framework-development-environment) 配置好环境，然后在 `examples` 目录中新建一个项目，即可以开始写一些 Dart 代码了。

第一个段代码是这样的，我们用 Flutter Engine（`dart:ui`） 画了一条斜线，从 (300,300) 画到 (800,800)：

```dart
import 'dart:ui';

void main(){

  PictureRecorder recorder = PictureRecorder();
  Canvas canvas = Canvas(recorder);

  Paint p = Paint();
  p.strokeWidth = 30.0;
  p.color = Color(0xFFFF00FF);

  canvas.drawLine(Offset(300, 300), Offset(800, 800), p);

  Picture picture = recorder.endRecording();

  SceneBuilder sceneBuilder = SceneBuilder();
  sceneBuilder.pushOffset(0, 0);
  sceneBuilder.addPicture(new Offset(0, 0), picture);
  sceneBuilder.pop();
  Scene scene = sceneBuilder.build();

  window.onDrawFrame = (){
    window.render(scene);
  };
  window.scheduleFrame();
}
```

![一条斜线](http://img.alicdn.com/tfs/TB1SnH6cV67gK0jSZPfXXahhFXa-400-400.png)

真正做「画斜线」这件事的代码，只有调用 `canvas.drawLine` 的一行。用过 Canvas 的前端同学应该已经闻到一些熟悉的味道了吧。虽然 Canvas 2D 中虽然没有 `drawLine`，但是用 `moveTo` 和 `lineTo` 也能达到完全一致的效果，它们的核心绘图功能——画点，画线（直线，曲线），画多边形，甚至画图片，逻辑上是很容易对齐的。

当然，更敏感的同学一定也发现了一些风格上的差异。比如说，传入坐标点的时候，Canvas 一般直接通过两个参数传入数值，而 Flutter Engine （后面简称为 Engine）则需要传入包装过的 `Offset` 对象，笔触的信息如颜色、线宽等也是类似。这能够方便 Framework 管理绘图所需的信息。

> 实际和 C++ 通信的时候，还是直接传的参数，`Offset` 和 `Paint` 这类包装对象是由 Engine 提供的一层很比较薄的由 Dart 实现的桥接层来定义的。所以，在 Canvas 2D 之上，我们也是可以定义诸如类似的结构。

除了调用 `canvas.drawLine`，Engine 的使用就比 Web 上的 Canvas 要复杂多了。Web Canvas 很直接，首先 `getContext()` 拿到上下文，然后就可以画点、画线、画图片了，所有的绘图会立刻反映到屏幕上；但是 Engine 中，绘图操作只是输出到了一个 `PictureRecorder` 的对象上；在此对象上调用 `endRecording()` 得到一个 `Picture` 对象，然后需要在合适的时候把 `Picture` 对象添加（`add`）到 `SceneBuilder` 对象上；调用 `SceneBuilder` 对象的 `build()` 方法获得一个 `Scene` 对象；最后，在合适的时机把 `Scene` 对象传递给 `window.render()` 方法，最终把场景渲染出来。

![从 PictureRecorder 到 Scene](http://img.alicdn.com/tfs/TB1uMT8c7L0gK0jSZFtXXXQCXXa-769-379.png)

有几点值得注意的：

1. `PictureRecorder` 对象是一次性的，当调用 `endRecording()` 之后，`PictureRecorder` 对象就被释放了。一个 `PictureRecorder` 只能关联一个 `Canvas` 对象。
2. 同理，`SceneBuider` 也是一次性的，调用 `build()` 后，`SceneBuilder` 对象即会失效。
3. `window.render(scene)` 只能在一次「绘图窗口期」内调用，也就是 `window.onDrawFrame` 或 `window.onBeginFrame`。Dart 没有提供原生的 `setTimeout` 或 `requestAnimationFrame`，但是 `window` 对象提供了类似的功能：在调用 `window.scheduleFrame()` 后，下一次屏幕刷新时，系统将依次调用 `window.onBeginFrame(Duration d)` 或 `window.onDrawFrame()`。而只有在这两个方法内调用 `window.render()` 方法，才能成功地进行绘图。

## 图层

上面说到，用 Flutter Engine（或者说背后的 skia）绘图，与在 Web 上用 Canvas 2D 绘图相比，多了许多前置和后置步骤。这些繁琐的步骤对复杂系统 UI 的渲染是至关重要的。系统 UI 的一个重要特点（与游戏等 UI 场景相比）就是： 整个屏幕通常是由多个组（有时候又叫窗口、容器、**图层**等）来组成的，每个组内的逻辑是内聚，而整个组有时候会整体发生变化，如移动位置，变换，更改透明度。想象一下在 PC 桌面上拖动应用比如 Word，这时 Word 应用内部的复杂界面绝没有必要因为拖动而反复重绘，可以猜想 Windows 一定是将 Word 应用的绘图结果缓存在了某处，拖动 Word 之时只是拖动了这张「图片」（`Picture`）而已。

看下面这个简单的例子：

```dart
import 'dart:ui';

void main(){

  PictureRecorder recorder = PictureRecorder();
  Canvas canvas = Canvas(recorder);

  Paint p = Paint();
  p.strokeWidth = 30.0;
  p.color = Color(0xFFFF00FF);

  canvas.drawLine(Offset(300, 300), Offset(800, 800), p);
  canvas.drawLine(Offset(800, 300), Offset(300, 800), p);

  Picture picCross = recorder.endRecording();

  window.onDrawFrame = (){

    int i = DateTime.now().millisecond;

    PictureRecorder recorder = PictureRecorder();
    Canvas canvas = Canvas(recorder);
    canvas.drawLine(Offset(i*0.2, 550), Offset(1080-i*0.2, 550), p);

    Picture picLine = recorder.endRecording();

    SceneBuilder sceneBuilder = SceneBuilder();
    sceneBuilder.pushOffset(0, 0);
    sceneBuilder.pushOpacity(128);
    sceneBuilder.addPicture(new Offset(0, 0), picCross);
    sceneBuilder.pop();
    sceneBuilder.pushOffset(0, 0.5*(i-500));
    sceneBuilder.addPicture(new Offset(0, 0), picLine);
    sceneBuilder.pop();
    sceneBuilder.pop();

    Scene scene = sceneBuilder.build();

    window.render(scene);
    scene.dispose();

    window.scheduleFrame();
  };
  window.scheduleFrame();
}
```

上面这个例子，我们用到了两个 `PictureRecorder`，分别对应创建了一个 `Canvas`。这两个 `Canvas` 构成了独立的「空间」，当在其上调用绘图方法如 `drawLine`，然后结束记录（`endRecording`）后，所绘制的图形就记录在了 `picture` 中。这里，我们先在 `picCross` 上画了一个叉叉（这个操作只做一次），然后在每一帧，生成一个新的 `picLine`，上面画一条长度随时间变化的横杠。然后，把两个 `Picture` 叠加合成起来，形成最终的场景。

![](http://img.alicdn.com/tfs/TB1zzwXcW61gK0jSZFlXXXDKFXa-400-331.gif)

注意，在这个例子中，画叉叉的操作只进行了一次，但是它每一帧都参与了动画的合成操作。如果这个叉叉特别复杂，只要它本身没有变化，也只需要去画一次，这就是分层（layer）和合成（composite）带来的优势。因为对 OpenGL 有一些了解，所以我猜测 `Picture` 的背后应该是 OpenGL 中的 `RenderBuffer` 或（Vulkan / Metal 中）类似的结构，已经缓存了绘制结果即像素值。在 Web 上的 Canvas 2D 上下文中，并没有特别高效的方法（`putImageData` 并不是一个好的方案）。

合成的过程是通过对 `SceneBuilder` 进行 `push` 和 `pop` 操作完成的。`SceneBuilder` 维护着一个状态栈，你可以向其中压入或弹出一些状态，包括位移、透明度、裁剪等等。当栈里有一些状态时，向场景中加入（`add`）的内容，在合成时就会被栈中所有的状态依次影响。比如在上面这个例子中，`picCross` 会受到 `pushOffset(0,0)`、`pushOpacity(128)` 两个状态影响，即以半透明度渲染；而 `picLine` 会被 `pushOffset(0,0)`，`pushOffset(0, 0.5*(i-500))` 两个状态影响，即在 Y 方向（垂直方向）上发生 `0.5*(i-500)` 的位移。

在 Flutter 中，层是隐藏在 RenderObject 背后的极为重要的概念。通常，一个半透明（或者位移的，或裁剪的）的容器节点（`RenderOpacity`）会单独创建一个图层，并使此节点下的所有子节点的绘制都发生在这个单独的层上。

## 绘图元素：点、线、面、文本、图片

前面我们仅仅用了绘制了一条直线段，这一节我们简单梳理一遍绘制其他主要元素。看下面这个例子：

![点、线、面、文本、图片](http://img.alicdn.com/tfs/TB1dGH8c1T2gK0jSZFvXXXnFXXa-400-461.jpg)

```dart
import 'dart:ui';
import 'dart:async';
import 'dart:io';
import 'dart:typed_data';
import 'package:flutter/foundation.dart';

void main(){

  PictureRecorder recorder = PictureRecorder();
  Canvas canvas = Canvas(recorder);

  Paint painterStroke = Paint();
  painterStroke.strokeWidth = 20.0;
  painterStroke.color = Color(0xFFFF00FF);
  painterStroke.style = PaintingStyle.stroke;

  Paint painterFill = Paint();
  painterFill.color = Color(0xFF00FFFF);
  painterFill.style = PaintingStyle.fill;

  List<Offset> points = new List<Offset>(3);
  points[0] = new Offset(100.0, 200.0);
  points[1] = new Offset(300.0, 200.0);
  points[2] = new Offset(400.0, 200.0);
  canvas.drawPoints(PointMode.points, points, painterStroke);
  canvas.drawArc(
      Rect.fromLTWH(100, 420, 200, 200), 
      0.0, 3.14*1.5, true, painterStroke
  );
  canvas.drawCircle(Offset(350, 350), 80, painterStroke);
  canvas.drawRect(Rect.fromLTWH(100, 700, 300, 100), painterFill);

  ParagraphBuilder paraBuilder = new ParagraphBuilder(new ParagraphStyle(
    fontSize: 60,
  ));
  paraBuilder.addText(
      "Flutter is Google’s UI toolkit for building beautiful, " +
      "natively compiled applications for mobile, web, " + 
      "and desktop from a single codebase.\n");
  Paragraph prg = paraBuilder.build();
  print(prg.height.toString());
  prg.layout(new ParagraphConstraints(width: 900.0));
  print(prg.height.toString());

  canvas.drawParagraph(prg, new Offset(100, 900));

  Future<Codec> loadImage() async {

    HttpClient clt = HttpClient();
    Uri resolved = Uri.base.resolve(
        "http://img.alicdn.com/tfs/" +
        "TB1_x5StSzqK1RjSZFpXXakSXXa-1024-1024.png"
    );
    HttpClientRequest request = await clt.getUrl(resolved);
    HttpClientResponse response = await request.close();
    Uint8List bytes = await consolidateHttpClientResponseBytes(response);
    Codec cc = await instantiateImageCodec(bytes);
    FrameInfo fif = await cc.getNextFrame();

    canvas.drawImageRect(fif.image,
        Rect.fromLTRB(
            0, 0, fif.image.width.toDouble(), fif.image.height.toDouble()),
        Rect.fromLTWH(500, 250, 500, 500), painterStroke);

    Picture picture = recorder.endRecording();

    SceneBuilder sceneBuilder = SceneBuilder();
    sceneBuilder.pushOffset(0, 0);
    sceneBuilder.addPicture(new Offset(0, 0), picture);
    sceneBuilder.pop();
    Scene scene = sceneBuilder.build();

    window.onDrawFrame = (){
      window.render(scene);
    };
    window.scheduleFrame();

  }

  loadImage();
}
```

画点和画面都比较简单，按照规范在 canvas 上调用 API 就可以了。值得注意的是，是填充模式还是边框模式，需要在 `Paint` 类的实例中设置 `style` 属性。

绘制文本稍微复杂一些，需要创建同样是一次性的 `ParagraphBuilder` 对象，添加文本（`addText`）后 `build` 出 `Paragraph` 对象。然后还没有完哦，我们需要按照特定的宽度对其进行排布（`layout`），以决定文本从哪里换行：当没有排布时，`Paragraph` 对象的 `height` 是 0，而排布之后，则具有了特定的高度。最后，用 `Canvas` 的 `drawParagraph` 方法把文本绘制出来。

绘制图片也比较复杂，首先我们需要创建 `HttpClient` 对象去加载图片的数据，得到数据将其实例化为某种编码的图片 `Codec` 对象，然后从其中取一帧（有些图片格式包含多个帧，Flutter Engine 普遍地考虑了这种情况，即使是只有一帧的图片也包含「帧」的概念），并使用 `Canvas` 对象的 `drawImageRect`（或 `drawImage`）画出来。

## 小结

这一篇，主要讲了 Flutter Engine 的一些用法。虽说系列文章的标题是「源码解析」，但是本篇中并没有太涉及源码本身。这是因为：

1. 本篇使用到的对象如 `SceneBuilder`，`PictureRecorder` 等其实是一层非常薄的包装层，稍微深入一下就会发现 `native` 关键字，内部逻辑已经进入了 C++ 实现的部分（即真正的 Flutter Engine），这一块我并没有仔细看过，也不在系列文章的范畴内；
2. 以我有限的经验来看，想深入了解一个库/框架/模块，与其直接看模块本身的代码，不如看模块的单元测试代码。先弄清楚模块的意图，弄清楚模块的依赖的用法，就更容易猜测出模块是如何实现的，这时再到模块代码中去寻求映证，反而比直接阅读模块本身代码的效率高，也有趣一些。

通过本篇，我（或者读者）应能感受到 Flutter Engine 提供的 API 的原始（接近底层）风格；正是这种极为原始的操作能力，给了上层框架 Flutter Framework 以极高的灵活性，奠定了高性能 UI 渲染的基础。希望本篇能成为一个良好的开端，能够成为后面讲到 `Layer`，`RenderObject` 等概念的基石。