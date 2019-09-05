# Flutter Framework 源码解析（ 2 ）—— 图层详解

书接上回，我们讲到了 Flutter Engine 绘图引擎（简称 Engine）的基本用法。这一篇，我们就来讲讲 Flutter 中的一个直接建立在 Engine 上的，非常基础的概念，也就是图层（Layer）。

图层是绘图操作的载体，也可以缓存绘图操作的结果。图层允许我们分别在不同的图层上绘图，然后将这些缓存了绘图结果的图层按照规则进行叠加，得到最终的渲染结果（图像）。每个图层都有相对独立的绘图上下文以及不同的绘图频率，一些本不必频繁绘制的图层就可以不用频繁绘制（还是那个常见的例子：拖动中的软件窗体），一些全局的效果也可以直接作用于绘图的结果而不必单独作用于绘图中的每一步（最常见的是位移、半透明、裁剪）。

## 最简单的例子

Flutter Framework 中定义了若干个图层类，结合上一节介绍的 Engine，即可以进行一些简单的绘图。先看一个最简单的例子。

```dart
import 'dart:ui';
import 'package:flutter/rendering.dart';

void main(){

  OffsetLayer rootLayer = new OffsetLayer();
  PictureLayer pictureLayer = new PictureLayer(Rect.zero);
  rootLayer.append(pictureLayer);

  pictureLayer.picture = createSolidRectanglePicture(
    Color(0xFFFF0000), 300, 300
  );

  rootLayer.updateSubtreeNeedsAddToScene();
  
  SceneBuilder sceneBuilder = SceneBuilder();
  rootLayer.addToScene(sceneBuilder);

  Scene scene = sceneBuilder.build();
  window.onDrawFrame = (){
    window.render(scene);
  };
  window.scheduleFrame();
}


Picture createSolidRectanglePicture(
  Color color, double width, double height)
{

  PictureRecorder recorder = PictureRecorder();
  Canvas canvas = Canvas(recorder);

  Paint paint = Paint();
  paint.color = color;

  canvas.drawRect(Rect.fromLTWH(0, 0, width, height), paint);
  return recorder.endRecording();
}
```

渲染结果如下图所示：

![最简单的例子渲染结果](http://img.alicdn.com/tfs/TB1iR.Te8v0gK0jSZKbXXbK2FXa-400-444.png)

这个例子首先创建了一个 `PictureLayer` 类的实例和一个 `OffsetLayer` 类的实例（这两个类定义在 `package:flutter/rendering.dart` 中，其含义稍后解释），并将 `pictureLayer` 作为子节点（如上一篇所述，Layer 通过树状结构来组织）添加到名为 `rootLayer` 的 `OffsetLayer` 对象中。

接下来，使用 `PictureRecorder` 和 `Canvas` 绘制一个红色的、尺寸为 300 x 300 的矩形，并取得 `Picture` 类的实例 `picture`。`PictureRecorder` 和 `Canvas` 都是 Engine 层暴露给 Dart 层的接口，如果你看过本系列文章的前一篇，对它们的用法应该不陌生。本篇文章中，我把创建 `Picture` 的过程封装在 `createSolidRectanglePicture()` 方法中以便重用。

第三步，将 `picture` 赋值给 `pictureLayer` 的同名属性。这很重要，这也是前一篇文章中关于创建 `Picture` 实例的代码，和本篇文章中创建 `Layer` 的代码连接起来的地方。

然后，在 `rootLayer` 上调用 `updateSubtreeNeedsAddToScene()` 方法。这将对以 `rootLayer` 为根节点的 `Layer` 树进行一些状态更新（详情在本篇文章后半部分介绍）。

然后，创建 `SceneBuilder` 实例（与前一篇中所做的一样），并在 `rootLayer` 上调用 `addToScene()` 方法，传入 `SceneBuilder` 实例。`addToScene()` 方法做的事情，就在 `sceneBuilder` 上进行 push（Offser、Opacity 等）、pop 和 add（Picture 等）操作。在这个例子中，相当于：

```dart
// rootLayer.addToScene(sceneBuilder) 相当于：

// 接下来这几行代码，读过前一篇文章后，应当很熟悉了
sceneBuilder.pushOffset(Offset(0, 0));
sceneBuilder.addPicture(picture);
sceneBuilder.pop();
```

最后，在 `SceneBuilder` 对象上调用 `build()` 方法，构建出 `Scene` 对象，最终渲染出来。这些步骤与前一篇中直接使用 Engine 绘图是完全一致的。 

所以，这个例子中最重要的两步是：

1. 以 `rootLayer` 为根的 Layer 树的创建。
2. 调用 `addToScene()` 方法，遍历 Layer 树，操作 `sceneBuilder` 以反映 Layer 节点之间的关系。

这个例子中，Layer 树的节点只有两个，类型为 `OffserLayer` 的根节点 `rootLayer` （对应 `sceneBuilder` 上的操作是 `pushOffset` 和 `pop`），和类型为 `PictureLayer` 的叶子节点 `pictureLayer`（对应 `sceneBuilder` 上的操作是 `addPicture`）：如下图所示：

![最简单的例子](http://gw.alicdn.com/tfs/TB1tbzwe2b2gK0jSZK9XXaEgFXa-278-354.png)

## 常用的 Layer 类

所有的 Layer 类（刚刚我们已经见识过了 `OffsetLayer` 和 `PictureLayer`）全部派生自 `Layer` 基类（这些类全部实现在 `rendering/layer.dart` 文件中）。具体的 Layer 类又分为两种：一种是具有一个或多个子节点的 Layer，它们继承自 `ContainerLayer`，另一种是不具有子节点的 Layer（叶子节点），它们直接继承自 `Layer`；如下图所示：

![Layer 继承关系（常用 Layer）](http://gw.alicdn.com/tfs/TB1x.DxeYr1gK0jSZFDXXb9yVXa-664-358.png)

常用的具有子节点的 Layer 有三类：半透明（`OpacityLayer`）、位移（`OffsetLayer`、`TransformLayer`）和裁剪（`ClipRectLayer`、`ClipRRectLayer` 和 `ClipPathLayer`）。半透明、位移和裁剪这三个操作的目标，是所有子节点渲染结果叠加得到的**像素数据**，只有这种级别的操作，才值得添加一种 `ContainerLayer` 来对应。

常用的不具有子节点的 Layer（叶子节点）包括：`PictureLayer` 和 `TextureLayer`。基于 `PictureRecorder` 的绘图操作全部由 `PictureLayer` 承载，它也是最最常用的叶子节点；而 `TextureLayer` 对应视频流、摄像头、OpenGL API 绘图等场景。本篇仅以 `PictureLayer` 为例来展开讲解叶子节点 Layer 的概念。

下面先简单地过一遍几种不同的 `ContainerLayer`。

### Offset Layer 与 Transform Layer

通常，根节点是位移值为 (0,0) 的 `OffsetLayer`。我们可以在 OffsetLayer 下再增加一层位移不为 (0,0) 的 `OffsetLayer`，使子树的位置发生变化。

`TransformLayer` 是一种更「自由」的位移操作层，不仅可以使其平移，也可使其旋转和缩放。看下面这个例子：

```dart
void main(){

  OffsetLayer root = createLayerTree();

  root.updateSubtreeNeedsAddToScene();

  SceneBuilder sceneBuilder = SceneBuilder();
  root.addToScene(sceneBuilder);
  Scene scene = sceneBuilder.build();

  window.onDrawFrame = (){
    window.render(scene);
  };
  window.scheduleFrame();
}

OffsetLayer createLayerTree(){

  OffsetLayer root = new OffsetLayer();

  OffsetLayer offsetParent = new OffsetLayer(offset: Offset(300, 300));
  PictureLayer offsetLeaf = new PictureLayer(Rect.zero);
  OffsetLayer transformParent = new TransformLayer(
    transform: Matrix4.rotationZ(3.14*0.25), offset: Offset(400, 400)
  );
  PictureLayer transformLeafGreen = new PictureLayer(Rect.zero);
  PictureLayer transformLeafBlue = new PictureLayer(Rect.zero);

  root.append(offsetParent);
  root.append(transformParent);
  offsetParent.append(offsetLeaf);
  transformParent.append(transformLeafGreen);
  transformParent.append(transformLeafBlue);

  offsetLeaf.picture = 
    createSolidRectanglePicture(Color(0xFFFF0000), 300, 300);
  transformLeafGreen.picture = 
    createSolidRectanglePicture(Color(0xFF00FF00), 500, 500);
  transformLeafBlue.picture = 
    createSolidRectanglePicture(Color(0xFF0000FF), 300, 300);

  return root;
}
```

从这个例子开始，我把创建的 Layer 树过程封装在了 `createLayerTree()` 方法中。`main()` 函数主动调用此方法获取 Layer 树的根节点并渲染（与前一个例子一致）。`createLayerTree()` 方法创建的 Layer 树如下所示：

![图 OffsetLayer 与 TransformLayer](http://img.alicdn.com/tfs/TB1tunKe.H1gK0jSZSyXXXtlpXa-537-361.png)

渲染结果如下所示：

![位移图层渲染结果](http://img.alicdn.com/tfs/TB1pJMTe.H1gK0jSZSyXXXtlpXa-400-444.png)

创建 `OffsetLayer` 对象时可传入 `Offset` 对象以指定位移的偏移量。创建 `TransformLayer` 对象时需传入矩阵 `transform` 来描述具体的变换，这里用了沿 Z 轴（与屏幕垂直的轴）旋转 45°，因此渲染结果上，以 `transformParent` 为根的子树沿着左上角顺时针旋转了 45°，如果选择沿 X 或 Y 轴旋转，子树会变被水平压扁或垂直压扁，这是正射投影的结果（因为 X 轴和 Y 轴在屏幕内，而我们是平行于 Z 轴看屏幕的）。

在渲染这一棵 Layer 树的时候，会按照深度优先的顺序进行遍历，对 `sceneBuilder` 进行与 Layer 节点类型对应的操作（比如，如果是 `OffsetLayer`，就 `pushOffset`，如果是 `PictureLayer`，就 `addPicture`）。对上图中的 Layer 树，对 `sceneBuilder` 的操作如下：

1. `pushOffset`：对应进入 `root`。
2. `pushOffset`：对应进入 `offsetParent`。
3. `addPicture`：对应 `offsetLeaf`。
4. `pop`：对应离开 `offsetParent`。
5. `pushTransform`：对应进入 `transformParent`。
6. `addPicture`：对应 `transformLeafGreen`。
7. `addPicture`：对应 `transformLeafBlue`。
8. `pop`：对应离开 `transformParent`。
9. `pop`：对应离开 `root`。

（我猜想）对 Engine 来说，这些操作会形成一个操作队列，最后绘图引擎根据这个队列来绘图。在没有进一步优化的情况（本篇后半部分详细讲解）下，每一次屏幕刷新，都会重新根据 Layer 树来生成新的队列和绘制。

接下来看看半透明图层。

### Opacity Layer

`OffsetLayer` 对子树的全局操作是**位移**，而 `OpacityLayer`，顾名思义，对子树的全局操作是**半透明**。简单地看一下用法。

```dart
OffsetLayer createLayerTree(){
  
  OffsetLayer root = new OffsetLayer();

  OffsetLayer backgroundParent = new OffsetLayer(offset: Offset(200, 200));
  PictureLayer backgroundLeaf = new PictureLayer(Rect.zero);
  OffsetLayer foregroundParent = new OffsetLayer(offset: Offset(300, 300));
  OpacityLayer opacityParent = new OpacityLayer(alpha: 128);
  PictureLayer foregroundLeaf = new PictureLayer(Rect.zero);

  root.append(backgroundParent);
  backgroundParent.append(backgroundLeaf);
  root.append(foregroundParent);
  foregroundParent.append(opacityParent);
  opacityParent.append(foregroundLeaf);

  backgroundLeaf.picture = 
    createSolidRectanglePicture(Color(0xFFFF0000), 300, 300);
  foregroundLeaf.picture = 
    createSolidRectanglePicture(Color(0xFF00FF00), 500, 500);

  return root;
}
```

在这个例子中，`createLayerTree()` 方法创建的子树如下图所示。创建 `OpacityLayer` 对象时，传入整型的 `alpha` 参数，128 表示半透明。

![OpacityLayer](http://gw.alicdn.com/tfs/TB1.ovTeYY1gK0jSZTEXXXDQVXa-364-511.png)

渲染结果如下所示。由于 `foregroundParent` 是 `root` 的第二个子节点（根据 `append` 顺序），在 `backgroundParent` 子树之后进行渲染，所以可以透过绿色的前景矩形看到红色的背景矩形。

![半透明图层渲染结果](http://img.alicdn.com/tfs/TB1wesVe7L0gK0jSZFxXXXWHVXa-400-444.png)

接下来看裁剪图层。

### ClipRect Layer、ClipRRect Layer 和 ClipPath Layer

裁剪图层有三种，它们的工作原理是类似的，都是对子树的渲染结果进行**裁剪**。

* `ClipRectLayer`：裁剪出一个矩形。
* `ClipRRectLayer`：裁剪出一个圆角矩形。
* `ClipPathLayer`：裁剪出任意路径描述的多边形。

看下面这个示例程序：

```dart
OffsetLayer createLayerTree(){
  
  OffsetLayer root = new OffsetLayer();
  OffsetLayer noClipParent = new OffsetLayer(offset: Offset(200, 200));
  PictureLayer noClipLeaf = new PictureLayer(Rect.zero);
  OffsetLayer clipRectParent = new OffsetLayer(offset: Offset(500, 200));
  ClipRectLayer clipRect = 
    new ClipRectLayer(clipRect: Rect.fromLTWH(20, 20, 160, 160));
  PictureLayer clipRectLeaf = new PictureLayer(Rect.zero);
  OffsetLayer clipRRectParent = new OffsetLayer(offset: Offset(200, 600));
  ClipRRectLayer clipRRect = new ClipRRectLayer(
    clipRRect: RRect.fromLTRBR(20, 20, 160, 160, Radius.circular(20))
  );
  PictureLayer clipRRectLeaf = new PictureLayer(Rect.zero);
  OffsetLayer clipPathParent = new OffsetLayer(offset: Offset(500, 600));
  ClipPathLayer clipPath = new ClipPathLayer(clipPath: createPath());
  PictureLayer clipPathLeaf = new PictureLayer(Rect.zero);

  root.append(noClipParent);
  noClipParent.append(noClipLeaf);
  root.append(clipRectParent);
  clipRectParent.append(clipRect);
  clipRect.append(clipRectLeaf);
  root.append(clipRRectParent);
  clipRRectParent.append(clipRRect);
  clipRRect.append(clipRRectLeaf);
  root.append(clipPathParent);
  clipPathParent.append(clipPath);
  clipPath.append(clipPathLeaf);

  noClipLeaf.picture = 
    createSolidRectanglePicture(Color(0xFFFF0000), 200, 200);
  clipRectLeaf.picture = noClipLeaf.picture;
  clipRRectLeaf.picture = noClipLeaf.picture;
  clipPathLeaf.picture = noClipLeaf.picture;
  
  return root;
}

Path createPath(){
  Path p = new Path();
  p.moveTo(0, 0);
  p.lineTo(200, 0);
  p.lineTo(0, 200);
  p.close();
  p.moveTo(100, 100);
  p.lineTo(200, 100);
  p.lineTo(100, 200);
  p.close();
  return p;
}
```

子树的结构就不再画出来，感兴趣的读者可以自己画画看。`root` 的第一个子树 `noClipParent` 是没有切割的一块矩形，第二个子树 `clipRectParent` 被切割成了较小的矩形，第三个子树 `clipRRectParent` 被切割成了较小的圆角矩形，最后一个子树 `clipPathParent` 被切割成了两个三角形：这个三角形由 `createPath()` 方法定义（Path 上的方法很多，你可以任意创建各种圆弧、曲线等等）。

渲染结果如下所示：

![裁剪图层渲染结果](http://img.alicdn.com/tfs/TB172AUe4n1gK0jSZKPXXXvUXXa-400-444.png)

## Layer 树

接下来从整个 Layer 树的层面来梳理以下渲染、更新的逻辑。

### 渲染、更新和缓存

之前，我们说过 Layer 的最大好处就是，当一个 Layer 子树没有发生变化时，可以直接用缓存和其他图层进行合并，不用每次都重新进行绘制。这是怎么做到的呢？这就是本节（也就是本篇文章的下半部分重点阐述的问题）。我们可以参考下 Layer 的源码（位于 `src/rendering/layer.dart` 文件中），首先关注基类 `Layer`（摘录的源码作了一些简化，剔除了一些无关紧要的部分）：

```dart
abstract class Layer extends AbstractNode {
    // ...
    
    bool get alwaysNeedsAddToScene => false;
    bool _needsAddToScene = true;
    void markNeedsAddToScene() {
      _needsAddToScene = true;
    }
    bool _subtreeNeedsAddToScene;
    void updateSubtreeNeedsAddToScene() {
      _subtreeNeedsAddToScene = _needsAddToScene || alwaysNeedsAddToScene;
    }
}
```

解释一下：

首先，`Layer` 的基类上有两个属性 `_needsAddToScene` 和 `_subtreeNeedsAddToScene`，顾名思义，前者表示需要加入场景，后者表示子树需要加入场景。通常，只有状态发生了更新（后面简称「脏了」），才需要加入到场景，所以这两个属性又可以直观理解为「自己脏了」和「子树脏了」。`Layer` 提供了 `markNeedsAddToScene()` 来把自己标记为「脏了」。派生类在自己状态发生变化时调用此方法把自己「弄脏」，比如 `ContainerLayer` 的子节点增删、`OpacityLayer` 的透明度发生变化、`PictureLayer` 的 `picture` 发生变化，如下所示：

```dart
abstract class Layer extends AbstractNode {
  // ...
  void adoptChild(AbstractNode child) {
    markNeedsAddToScene();    // 标记自己脏了
    super.adoptChild(child);
  }
  // drop 同理
}

class ContainerLayer extends Layer {
  // ...
  void append(Layer child) {
    // 吐槽，居然调到基类里去了，在基类里调 markNeedsAddToScene
    // 要我说没必要
    adoptChild(child);
    // ...
  }
  // remove 同理
}

class OpacityLayer extends ContainerLayer {
  // ...
  set alpha(int value) {
    if (value != _alpha) {
      _alpha = value;
      markNeedsAddToScene();  // 透明度变化时标记自己脏了
    }
  }
}

class PictureLayer extends Layer {
  // ...
  set picture(ui.Picture picture) {
    // 吐槽，这里又没有调 markNeedsAddToScene，直接设属性
    // 而且这里又不比较 picture 是不是一致了，估计不是一个人写的
    _needsAddToScene = true;
    _picture = picture;
  }
}
```

当子节点把自己标脏时，父节点和所有祖先节点其实都脏了，之前渲染的结果缓存已经没用了。但是父节点不知道，这时通过 `updateSubtreeNeedsAddToScene()` 方法来进行更新。由于此方法涉及到子树，所以主要关注 `ContainerLayer` 上实现的该方法：遍历所有子树，递归调用 `updateSubtreeNeedsAddToScene()`，如果有任意一个子节点树脏了，那么也把自己标记为子树脏了。

```dart
class ContainerLayer extends Layer {
  // ...
  void updateSubtreeNeedsAddToScene() {
    super.updateSubtreeNeedsAddToScene(); // 参考基类 Layer 的同名方法
    Layer child = firstChild;
    while (child != null) {
      child.updateSubtreeNeedsAddToScene();
      // 如果有任意一个子节点树脏了，那么自己为根的树也就脏了
      _subtreeNeedsAddToScene = 
        _subtreeNeedsAddToScene || child._subtreeNeedsAddToScene;
      child = child.nextSibling;
    }
  }
}
```

绘制开始之前，从根节点上开始，递归检查自己的子树是不是「脏了」，这样每个节点上的 `_subtreeNeedsAddToScene` 属性就被修正为能够反映实际状态的情况。这就是为什么上面几个示例程序，在 `root` 被创建出来后，要先调用一下 `updateSubtreeNeedsAddToScene()` 方法。

然后进行绘制，在根节点上调用 `addToScene` 以操作 `sceneBuilder`。`Layer` 的 `addToScene()` 是虚函数，`ContainerLayer` 的 `addToScene()` 会递归地调用子节点的 `addToScene()`，`OffsetLayer` 会调用 `sceneBuilder` 的 `pushOffset`（其他类推），而 `PictureLayer` 会调用 `sceneBuilder` 的 `addPicture`。如下所示：

```dart
abstract class Layer extends AbstractNode {
  // ...
  // 我觉得 _needsAddToScene = true 放在这里更统一
  ui.EngineLayer addToScene(
    ui.SceneBuilder builder, [ Offset layerOffset = Offset.zero ]);
  
  void _addToSceneWithRetainedRendering(ui.SceneBuilder builder) {
    if (!_subtreeNeedsAddToScene && _engineLayer != null) {
      // 这里是缓存重点！
      // 如果子树没脏，而且有缓存 _engineLayer，就直接使用缓存数据
      builder.addRetained(_engineLayer);
      return;
    }
    // 否则，走正常逻辑
    _engineLayer = addToScene(builder);
    // 标注自己为干净的
    _needsAddToScene = false;
  }
}

class ContainerLayer extends Layer {
  // ...
  ui.EngineLayer addToScene(
    ui.SceneBuilder builder, [ Offset layerOffset = Offset.zero ]) {
    // 吐槽：为啥不直接把 addChildrenToScene 逻辑写在这，让子类调 super
    addChildrenToScene(builder, layerOffset);
    return null;
  }
  void addChildrenToScene(
    ui.SceneBuilder builder, [ Offset childOffset = Offset.zero ]) {
    Layer child = firstChild;
    while (child != null) {
      if (childOffset == Offset.zero) {
        // 只看第一个分支好了，似乎很少会走第二个分支
        // childOffset 几乎总是 Offset.zero
        child._addToSceneWithRetainedRendering(builder);  // 转到基类里
      } else {
        child.addToScene(builder, childOffset);
      }
      child = child.nextSibling;
    }
  }
}

class OffsetLayer extends ContainerLayer {
  ui.EngineLayer addToScene(
    ui.SceneBuilder builder, [ Offset layerOffset = Offset.zero ]) {
    final ui.EngineLayer engineLayer = builder.pushOffset(
      layerOffset.dx + offset.dx, layerOffset.dy + offset.dy
    );
    // 吐槽：要调一个莫名其妙的方法，直接调 super 多简单
    addChildrenToScene(builder);
    builder.pop();
    return engineLayer;
  }
}

class PictureLayer extends Layer {
  // ...
  ui.EngineLayer addToScene(
    ui.SceneBuilder builder, [ Offset layerOffset = Offset.zero ]) {
    // PictureLayer 操作 SceneBuilder
    builder.addPicture(
      layerOffset, picture, 
      isComplexHint: isComplexHint, willChangeHint: willChangeHint
    );
    return null;
  }
}
```

在根节点上调用 `addToScene`，节点首先根据自己的类型操作（`push`） `SceneBuilder` 对象，如果有子节点，会递归对子节点调用之，然后再 `pop`。**但是**，如果当前节点的子树是干净的，那么就会直接用之前的缓存来进行填充（`SceneBuilder#addRetained`），而缓存具体是指之前进行绘制时，`SceneBuilder#pushOffset` 方法返回的 `EngineLayer` 对象。

用一张图来举例说明整个流程吧，假设我们的 Layer 树和上面 Opacity Layer 小节中的示例一直，只不过第一次渲染后，为背景矩形重新绘制了一个 `Picture`。图中为了直观，我把 `_needsAddToScene` 称为 selfDirty，把 `_subtreeNeedsAddToScene` 称为 treeDirty。

![Layer 树的更新绘制逻辑](http://img.alicdn.com/tfs/TB1ae8weubviK0jSZFNXXaApXXa-750-1250.png)

再次总结一下整个 Layer 树的核心逻辑：

* 每个节点，都有「自己是否脏」和「子树是否脏」两个状态。初始状态下，自己是脏的，子树未知。
* 每次渲染前，都会遍历整个 Layer 树，为每个节点确定「子树是否脏」状态。对某个父节点，如果后代任意一个子节点是脏的，那么这个父节点子树就脏了。
* 渲染完成后，每个节点都会把自己设置为「干净」，这样下次确定「子树是否脏」时，就可能发生「整个子树都干净」的情形。
* 节点自己发生变化，包括父节点的直接子节点增删、父节点属性变化、子节点属性变化，都会把自己弄脏。
* 渲染时，如果发现某个节点子树是干净的（且有缓存存在），那么就会直接使用缓存来参与整棵树的合成。

### 验证 Layer 树渲染流程

一个简单的小例子可以帮助验证上述的流程。

```dart
void main(){

  OffsetLayer root = new OffsetLayer();
  OffsetLayer animatedOffset = new OffsetLayer(offset: Offset(200, 200));
  PictureLayer animatedLeaf = new PictureLayer(Rect.zero);
  OffsetLayer target = new OffsetLayer(offset: Offset(200, 700));
  ClipRRectLayer clip = new ClipRRectLayer(
    clipRRect: RRect.fromLTRBXY(0, 0, 500, 500, 220, 220)
  );
  PictureLayer leaf1 = new PictureLayer(Rect.zero);
  PictureLayer leaf2 = new PictureLayer(Rect.zero);

  root.append(animatedOffset);
  animatedOffset.append(animatedLeaf);
  root.append(target);
  target.append(clip);
  clip.append(leaf1);
  clip.append(leaf2);

  leaf1.picture = createSolidRectanglePicture(
    Color(0xFF00FF00), 500, 500
  );
  leaf2.picture = createSolidRectanglePicture(
    Color(0xFF0000FF), 300, 300
  );

  int count = 0;

  int countLoop = 0;
  void animate(){
    countLoop = (countLoop + 1) % 100;
    animatedLeaf.picture = createSolidRectanglePicture(
      Color(0xFFFF0000), 300.0+countLoop, 300
    );
    animatedOffset.offset = Offset(200, 200.0+countLoop);
  }

  window.onDrawFrame = (){
    animate();
    count++;
    
    SceneBuilder sceneBuilder = SceneBuilder();
    root.updateSubtreeNeedsAddToScene();
    if(count == 100){
      clip.remove();
    }
    root.addToScene(sceneBuilder);
    Scene scene = sceneBuilder.build();

    window.render(scene);
    window.scheduleFrame();
  };
  window.scheduleFrame();
}
```

这个例子绘制的结果如下所示。上边的红色矩形在变化位置和尺寸，表示对 Layer 树的渲染在持续地进行中。我们重点考察的目标是下面的由蓝色和绿色组成的圆角矩形，即以 `target` 节点为根的子树。我们在渲染到 100 次的时候，把 `target` 子树的唯一子节点 `clip` 删掉，所以渲染开始过了一会儿之后，下方的圆角矩形就消失了。

![](http://img.alicdn.com/tfs/TB1NI.Ye4v1gK0jSZFFXXb0sXXa-400-432.gif)

要知道，在渲染过程中，我们没有修改过 `target` 子树下的任何一个图层，所以 `target` 子树应该是一直以缓存的形式参与渲染的。你可以在 Flutter Framework 代码里悄悄打印一些日志来验证你的想法。

```dart
// Layer#_addToSceneWithRetainedRendering
if (!_subtreeNeedsAddToScene && _engineLayer != null) {
  print('builder.addRetained')
  builder.addRetained(_engineLayer);
  return;
}
```

我们尝试把 `root.updateSubtreeNeedsAddToScene();` 这一行注释掉，再次运行会报错，因为找不到节点上的 `_subtreeNeedsAddToScene`，毕竟连一次更新还没有做呢，「子树脏」状态还是未知的。

尝试仅在第一次渲染时进行更新：

```dart
if(count <= 1){
  root.updateSubtreeNeedsAddToScene();
}
```

渲染结果看上去没有任何变化，但是你会发现之前加的 `builder.addRetained` 日志再也不会打印出来了。这是因为，根据之前的流程，第一次渲染时所有的节点自身都是脏的，第一次更新的结果自然是：所有节点的子树都是脏的。从第二次开始，不再对「子树脏」状态进行更新，也就使得所有节点丧失了将「子树脏」更新为「子树干净」的可能。在渲染时，就不可能进入到使用缓存优化性能的逻辑了。

尝试在前两次渲染前进行更新：

```dart
if(count <= 2){
  root.updateSubtreeNeedsAddToScene();
}
```

我们会发现，下面的圆角矩形再也不会消失了。因为所有节点的「子树脏」状态都固定在了第二次渲染前更新后的，此时 `target` 的子树是干净的，一直在使用起缓存来参与上层节点的渲染。到了第 100 次渲染的时候，虽然 `target` 的子节点 `clip` 被删除了，`target` 也把自己弄脏了，但是「子树干净」这个状态再也无法逆转，使得圆角矩形再也不会消失。

设置前两次和 1000 次之后才更新：

```dart
if(count <= 2 || count > 1000){
  root.updateSubtreeNeedsAddToScene();
}
```

这时，需要过挺久（初始 Demo 的 10 倍），圆角矩形才消失。圆角矩形消失的时机是渲染到达了 1000 次，而真正的 Layer 树中，`clip` 子树早在 100 次的时候就被删掉了。从 100 到 1000 次的渲染都是依赖 `target` 的缓存来进行的。

如果你能弄清楚以上这些情况，那么对 Layer 树的渲染逻辑就算是真正了解了。

### SceneBuilder addRetained

使用缓存进行绘制的时候，用到了 `SceneBuilder#addRetained()` 方法。`SceneBuilder` 本来是上一篇的内容，这里补充一下吧。

```dart
void main(){
  
  EngineLayer layer;
  int i = 0;
  
  window.onDrawFrame = (){

    i= (i + 1) % 100;

    Picture redPic = 
      createSolidRectanglePicture(Colors.red, 200.0+i, 200.0+i);
    Picture bluePic = 
      createSolidRectanglePicture(Colors.blue, 200.0+i, 200.0+i);
    
    SceneBuilder sceneBuilder = SceneBuilder();
    sceneBuilder.pushOffset(0, 0);
    sceneBuilder.pushOffset(200, 200);
    sceneBuilder.addPicture(new Offset(0, 0), redPic);
    sceneBuilder.pop();

    if(layer == null){
      print('create layer');
      layer = sceneBuilder.pushOffset(300, 300);
      sceneBuilder.pushOpacity(128);
      sceneBuilder.addPicture(Offset.zero, bluePic);
      sceneBuilder.pop();
      sceneBuilder.pop();
    }else{
      print('add retained');
      sceneBuilder.addRetained(layer);
    }

    sceneBuilder.pop();
    Scene scene = sceneBuilder.build();
    window.render(scene);
    window.scheduleFrame();
  };
  window.scheduleFrame();
}
```

这段代码和上一篇中直接使用 `SceneBuilder` 的代码类似，绘制了两个逐渐增大的矩形。但是半透明的蓝色矩形只会在第一次渲染时使用，使用蓝色矩形绘制出的结果会被缓存在 `layer` 对象（`EngineLayer` 类的实例）中，从第二次开始调用 `addRetained()` 方法，传入 `layer` 对象。所以，我们可以看到蓝色矩形的尺寸是不会变化的。

![](http://img.alicdn.com/tfs/TB1LU3YeYj1gK0jSZFuXXcrHpXa-400-216.gif)

> 相信读者应该能够体会得出 `push` 开头的方法和 `add` 开头的方法间的差异。前者反应状态的改变，此状态可以被 `pop()` 出来，用于父节点；而 `add` 开头的方法则是传入一些数据，用于叶子节点。当节点使用缓存来参与上层渲染时，其子树不会被访问到，那么该节点就相当于叶子节点了。

### 自定义 Layer

最后，我们通过继承 `ContainerLayer` 做一个自定义的 `Layer` 来体会一下 Layer 树的工作原理。自定义的 `ShakingLayer` 会使子树水平晃动，透明度也会随着晃动而改变，边缘位置的透明度较低。看一下这段代码：

```dart
class ShakingLayer extends ContainerLayer{

  int offset = 0;
  int step;

  ShakingLayer(this.step);

  void shake(){
    offset += step;
    if(offset >= 100 || offset <= -100){
      step = -step;
    }
    markNeedsAddToScene();
  }

  @override
  EngineLayer addToScene(
    SceneBuilder builder, [Offset layerOffset = Offset.zero]
  ) {
    final EngineLayer engineLayer = builder.pushOffset(
      layerOffset.dx + offset.toDouble(), layerOffset.dy
    );
    builder.pushOpacity((offset.abs().toDouble()*256.0/100).toInt());
    super.addToScene(builder);
    builder.pop();
    builder.pop();
    return engineLayer;
  }
}
```

重要的两点：

1. 重写 `addToScene()` 方法，通过向 `SceneBuilder` 对象中压入一些状态来实现晃动和透明度变化的功能。注意应该调用基类的同名方法把子节点加入场景。
2. 实现 `shake()` 方法给外部调用，每一帧改变一些属性值，使得下次渲染的结果发生变化。最重要的是，需要调用 `markNeedsAddToScene()` 告诉 Layer 树自身发生了改变，需要重绘。

最后，把 ShakingLayer 插入到 Layer 树中，并在每一帧调用 `shake()` 方法：

```dart
void main(){

  OffsetLayer root = new OffsetLayer();

  OffsetLayer offsetParent = new OffsetLayer(offset: Offset(300, 300));
  ShakingLayer shakingLayer = new ShakingLayer(10);
  PictureLayer offsetLeaf = new PictureLayer(Rect.zero);
  root.append(offsetParent);
  offsetParent.append(shakingLayer);
  shakingLayer.append(offsetLeaf);
  offsetLeaf.picture = createSolidRectanglePicture(
    Color(0xFFFF0000), 300, 300
  );

  int i = 0;
  window.onDrawFrame = (){

    i = (i + 1) % 200;
    offsetParent.offset = Offset(300, 300.0 + i*3);
    shakingLayer.shake();

    root.updateSubtreeNeedsAddToScene();

    SceneBuilder sceneBuilder = SceneBuilder();
    root.addToScene(sceneBuilder);
    Scene scene = sceneBuilder.build();
    window.render(scene);
    window.scheduleFrame();
  };
  window.scheduleFrame();
}
```

这是渲染效果：

![ShakingLayer 渲染结果](http://img.alicdn.com/tfs/TB1LQEUe.Y1gK0jSZFMXXaWcVXa-400-432.gif)

## 小结

这一篇主要讲了 Flutter Framework 的 Layer 层。Layer 层与 Engine 层是离得最近的，不少概念也在 Layer 和 Engine 间也互相映射。半透明效果、整体位移效果、裁剪效果都会生成一个新的 Layer。Layer 最重要的功能是把树状的结构输出到 Engine 的绘图队列中，组织起渲染的流程。同时，Layer 树的节点可以通过两种标记来判断自身是不是「脏了」，子树是不是「脏了」。如果有可能的话，Layer 节点会优先使用上一帧绘图得到的数据来参与上层的渲染，以节省开销。

Layer 以上是 RenderObject 树，这是组织 UI 渲染的核心类。下一篇，我们将开始讲解 Flutter 的 RenderObject 相关的设计。
