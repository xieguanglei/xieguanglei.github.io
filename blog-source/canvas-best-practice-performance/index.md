# Canvas 最佳实践（性能篇）

Canvas 想必前端同学们都不陌生，它是 HTML5 新增的「画布」元素，允许我们使用 JavaScript 来绘制图形。目前，所有的主流浏览器都支持 Canvas。

![Canvas兼容性](http://img.alicdn.com/tps/TB1YgYILpXXXXcXXFXXXXXXXXXX-764-261.jpg)

Canvas 最常见的用途是渲染动画。渲染动画的基本原理，无非是反复地擦除和重绘。为了动画的流畅，留给我渲染一帧的时间，只有短短的 16ms。在这 16ms 中，我不仅需要处理一些游戏逻辑，计算每个对象的位置、状态，还需要把它们都画出来。如果消耗的时间稍稍多了一些，用户就会感受到「卡顿」。所以，在编写动画（和游戏）的时候，我无时无刻不担忧着动画的性能，唯恐对某个 API 的调用过于频繁，导致渲染的耗时延长。

为此，我做了一些实验，查阅了一些资料，整理了平时使用 Canvas 的若干心得体会，总结出这一片所谓的「最佳实践」。如果你和我有类似的困扰，希望本文对你有一些价值。

> 本文仅讨论 Canvas 2D 相关问题。

# 计算与渲染

把动画的一帧渲染出来，需要经过以下步骤：

1. 计算：处理游戏逻辑，计算每个对象的状态，不涉及 DOM 操作（当然也包含对 Canvas 上下文的操作）。
2. 渲染：真正把对象绘制出来。
  2.1. JavaScript 调用 DOM API（包括 Canvas API）以进行渲染。
  2.2. 浏览器（通常是另一个渲染线程）把渲染后的结果呈现在屏幕上的过程。

![](http://img.alicdn.com/tps/TB1i6rMLpXXXXaZXFXXXXXXXXXX-593-323.png)

> 之前曾说过，留给我们渲染每一帧的时间只有 16ms。然而，其实我们所做的只是上述的步骤中的 1 和 2.1，而步骤 2.2 则是浏览器在另一个线程（至少几乎所有现代浏览器是这样的）里完成的。动画流畅的真实前提是，以上所有工作都在 16ms 中完成，所以 JavaScript 层面消耗的时间最好控制在 10ms 以内。

虽然我们知道，通常情况下，渲染比计算的开销大很多（3~4个量级）。除非我们用到了一些时间复杂度很高的算法（这一点在本文最后一节讨论），计算环节的优化没有必要深究。

我们需要深入研究的，是如何优化渲染的性能。而优化渲染性能的总体思路很简单，归纳为以下几点：

1. 在每一帧中，尽可能减少调用渲染相关 API 的次数（通常是以计算的复杂化为代价的）。
2. 在每一帧中，尽可能调用那些渲染开销较低的 API。
3. 在每一帧中，尽可能以「导致渲染开销较低」的方式调用渲染相关 API。

# Canvas 上下文是状态机

Canvas API 都在其上下文对象 `context` 上调用。

```javascript
var context = canvasElement.getContext('2d');
```

我们需要知道的第一件事就是，`context` 是一个状态机。你可以改变 `context` 的若干状态，而几乎所有的渲染操作，最终的效果与 `context` 本身的状态有关系。比如，调用 `strokeRect` 绘制的矩形边框，边框宽度取决于 `context` 的状态 `lineWidth`，而后者是之前设置的。

```javascript
context.lineWidth = 5;
context.strokeColor = 'rgba(1, 0.5, 0.5, 1)';

context.strokeRect(100, 100, 80, 80);
```

![](http://img.alicdn.com/tps/TB1M4vNLpXXXXarXFXXXXXXXXXX-407-348.png)

说到这里，和性能貌似还扯不上什么关系。那我现在就要告诉你，对 `context.lineWidth` 赋值的开销远远大于对一个普通对象赋值的开销，你会作如何感想。

当然，这很容易理解。Canvas 上下文不是一个普通的对象，当你调用了 `context.lineWidth = 5` 时，浏览器会需要立刻地做一些事情，这样你下次调用诸如 `stroke` 或 `strokeRect` 等 API 时，画出来的线就正好是 5 个像素宽了（不难想象，这也是一种优化，否则，这些事情就要等到下次 `stroke` 之前做，更加会影响性能）。

我尝试执行以下赋值操作 10<sup>6</sup> 次，得到的结果是：对一个普通对象的属性赋值只消耗了 3ms，而对 `context` 的属性赋值则消耗了 40ms。值得注意的是，如果你赋的值是非法的，浏览器还需要一些额外时间来处理非法输入，正如第三/四种情形所示，消耗了 140ms 甚至更多。

```
somePlainObject.lineWidth = 5;  // 3ms (10^6 times)
context.lineWidth = 5;  // 40ms
context.lineWidth = 'Hello World!'; // 140ms
context.lineWidth = {}; // 600ms
```

对 `context` 而言，对不同属性的赋值开销也是不同的。`lineWidth` 只是开销较小的一类。下面整理了为 `context` 的一些其他的属性赋值的开销，如下所示。
 
 属性 | 开销 | 开销（非法赋值）
 --- | --- | ---
 `line[Width/Join/Cap]` | 40+ | 100+
 `[fill/stroke]Style` | 100+ | 200+
 `font` | 1000+ | 1000+
 `text[Align/Baseline]` | 60+ | 100+
 `shadow[Blur/OffsetX]` | 40+ | 100+
 `shadowColor` | 280+ | 400+
 
与真正的绘制操作相比，改变 `context` 状态的开销已经算比较小了，毕竟我们还没有真正开始绘制操作。我们需要了解，改变 `context` 的属性并非是完全无代价的。我们可以通过适当地安排调用绘图 API 的顺序，降低 `context` 状态改变的频率。

# 分层 Canvas

分层 Canvas 在几乎任何动画区域较大，动画较复杂的情形下都是非常有必要的。分层 Canvas 能够大大降低完全不必要的渲染性能开销。分层渲染的思想被广泛用于图形相关的领域：从古老的皮影戏、套色印刷术，到现代电影/游戏工业，虚拟现实领域，等等。而分层 Canvas 只是分层渲染思想在 Canvas 动画上最最基本的应用而已。

![分层Canvas](http://img.alicdn.com/tps/TB1RgLULpXXXXatXVXXXXXXXXXX-667-309.png)

分层 Canvas 的出发点是，动画中的每种元素（层），对渲染和动画的要求是不一样的。对很多游戏而言，主要角色变化的频率和幅度是很大的（他们通常都是走来走去，打打杀杀的），而背景变化的频率或幅度则相对较小（基本不变，或者缓慢变化，或者仅在某些时机变化）。很明显，我们需要很频繁地更新和重绘人物，但是对于背景，我们也许只需要绘制一次，也许只需要每隔 200ms 才重绘一次，绝对没有必要每 16ms 就重绘一次。

> 对于 Canvas 而言，能够在每层 Canvas 上保持不同的重绘频率已经是最大的好处了。然而，分层思想所解决的问题远不止如此。

使用上，分层 Canvas 也很简单。我们需要做的，仅仅是生成多个 Canvas 实例，把它们重叠放置，每个 Canvas 使用不同的 z-index 来定义堆叠的次序。然后仅在需要绘制该层的时候（也许是「永不」）进行重绘。

```javascript
var contextBackground = canvasBackground.getContext('2d');
var contextForeground = canvasForeground.getContext('2d');

function render(){
  drawForeground(contextForeground);
  if(needUpdateBackground){
    drawBackground(contextBackground);
  }
  requestAnimationFrame(render);
}
```

记住，堆叠在上方的 Canvas 中的内容会覆盖住下方 Canvas 中的内容。

# 绘制图像

目前，Canvas 中使用到最多的 API，非 `drawImage` 莫属了。（当然也有例外，你如果要用 Canvas 写图表，自然是半句也不会用到了）。

`drawImage` 方法的格式如下所示：

```
context.drawImage(image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight);
```

![](http://gw.alicdn.com/tps/TB11l3dLpXXXXXRXpXXXXXXXXXX-593-395.png)

## 数据源与绘制的性能

由于我们具备「把图片中的某一部分绘制到 Canvas 上」的能力，所以很多时候，我们会把多个游戏对象放在一张图片里面，以减少请求数量。这通常被称为「精灵图」。然而，这实际上存在着一些潜在的性能问题。我发现，使用 `drawImage` 绘制同样大小的区域，数据源是一张和绘制区域尺寸相仿的图片的情形，比起数据源是一张较大图片（我们只是把数据扣下来了而已）的情形，前者的开销要小一些。可以认为，两者相差的开销正是「裁剪」这一个操作的开销。

> 我尝试绘制 10<sup>4</sup> 次一块 320x180 的矩形区域，如果数据源是一张 320x180 的图片，花费了 40ms，而如果数据源是一张 800x800 图片中裁剪出来的 320x180 的区域，需要花费 70ms。

虽然看上去开销相差并不多，但是 `drawImage` 是最常用的 API 之一，我认为还是有必要进行优化的。优化的思路是，将「裁剪」这一步骤事先做好，保存起来，每一帧中仅绘制不裁剪。具体的，在「离屏绘制」一节中再详述。

## 视野之外的绘制

有时候，Canvas 只是游戏世界的一个「窗口」，如果我们在每一帧中，都把整个世界全部画出来，势必就会有很多东西画到 Canvas 外面去了，同样调用了绘制 API，但是并没有任何效果。我们知道，判断对象是否在 Canvas 中会有额外的计算开销（比如需要对游戏角色的全局模型矩阵求逆，以分解出对象的世界坐标，这并不是一笔特别廉价的开销），而且也会增加代码的复杂程度，所以关键是，是否值得。

我做了一个实验，绘制一张 320x180 的图片 10<sup>4</sup> 次，当我每次都绘制在 Canvas 内部时，消耗了 40ms，而每次都绘制在 Canvas 外时，仅消耗了 8ms。大家可以掂量一下，考虑到计算的开销与绘制的开销相差 2~3 个数量级，我认为通过计算来过滤掉哪些画布外的对象，仍然是很有必要的。

# 离屏绘制

上一节提到，绘制同样的一块区域，如果数据源是尺寸相仿的一张图片，那么性能会比较好，而如果数据源是一张大图上的一部分，性能就会比较差，因为每一次绘制还包含了裁剪工作。也许，我们可以先把待绘制的区域裁剪好，保存起来，这样每次绘制时就能轻松很多。

`drawImage` 方法的第一个参数不仅可以接收 `Image` 对象，也可以接收另一个 `Canvas` 对象。而且，使用 `Canvas` 对象绘制的开销与使用 `Image` 对象的开销几乎完全一致。我们只需要实现将对象绘制在一个未插入页面的 `Canvas` 中，然后每一帧使用这个 `Canvas` 来绘制。

```js
// 在离屏 canvas 上绘制
var canvasOffscreen = document.createElement('canvas');
canvasOffscreen.width = dw;
canvasOffscreen.height = dh;
canvasOffscreen.getContext('2d').drawImage(image, sx, sy, sw, sh, dx, dy, dw, dh);

// 在绘制每一帧的时候，绘制这个图形
context.drawImage(canvasOffscreen, x, y);
```

离屏绘制的好处远不止上述。有时候，游戏对象是多次调用 `drawImage` 绘制而成，或者根本不是图片，而是使用路径绘制出的矢量形状，那么离屏绘制还能帮你把这些操作简化为一次 `drawImage` 调用。

> 第一次看到 `getImageData` 和 `putImageData` 这一对 API，我有一种错觉，它们简直就是为了上面这个场景而设计的。前者可以将某个 Canvas 上的某一块区域保存为 `ImageData` 对象，后者可以将 `ImageData` 对象重新绘制到 Canvas 上面去。但实际上，`putImageData` 是一项开销极为巨大的操作，它根本就不适合在每一帧里面去调用。

# 避免「阻塞」

所谓「阻塞」，可以理解为不间断运行时间超过 16ms 的 JavaScript 代码，以及「导致浏览器花费超过 16ms 时间进行处理」的 JavaScript 代码。即使在没有什么动画的页面里，阻塞也会被用户立刻察觉到：阻塞会使页面上的对象失去响应——按钮按不下去，链接点不开，甚至标签页都无法关闭了。而在包含较多 JavaScript 动画的页面里，阻塞会使动画停止一段时间，直到阻塞恢复后才继续执行。如果经常出现「小型」的阻塞（比如上述提及的这些优化没有做好，渲染一帧的时间超过 16ms），那么就会出现「丢帧」的情况，

> CSS3 动画（`transition` 与 `animate`）不会受 JavaScript 阻塞的影响，但不是本文讨论的重点。

![](http://img.alicdn.com/tps/TB18QnWLpXXXXapXVXXXXXXXXXX-674-461.png)

偶尔的且较小的阻塞是可以接收的，频繁或较大的阻塞是不可以接受的。也就是说，我们需要解决两种阻塞：

* 频繁（通常较小）的阻塞。其原因主要是过高的渲染性能开销，在每一帧中做的事情太多。
* 较大（虽然偶尔发生）的阻塞。其原因主要是运行复杂算法、大规模的 DOM 操作等等。

对前者，我们应当仔细地优化代码，有时不得不降低动画的复杂（炫酷）程度，本文前几节中的优化方案，解决的就是这个问题。

而对于后者，主要有以下两种优化的策略。

* 使用 Web Worker，在另一个线程里进行计算。
* 将任务拆分为多个较小的任务，插在多帧中进行。

Web Worker 是好东西，性能很好，兼容性也不错。浏览器用另一个线程来运行 Worker 中的 JavaScript 代码，完全不会阻碍主线程的运行。动画（尤其是游戏）中难免会有一些时间复杂度比较高的算法，用 Web Worker 来运行再合适不过了。

![Web Worker 兼容性](http://img.alicdn.com/tps/TB1qt_yLpXXXXcrXVXXXXXXXXXX-764-277.jpg)

然而，Web Worker 无法对 DOM 进行操作。所以，有些时候，我们也使用另一种策略来优化性能，那就是将任务拆分成多个较小的任务，依次插入每一帧中去完成。虽然这样做几乎肯定会使执行任务的总时间变长，但至少动画不会卡住了。

![](http://gw.alicdn.com/tps/TB1UG.qLpXXXXbdXpXXXXXXXXXX-674-461.png)

看下面这个 [Demo](http://jsbin.com/puruba/edit?html,output)，我们的动画是使一个红色的 `div` 向右移动。Demo 中是通过每一帧改变其 `transform` 属性完成的（Canvas 绘制操作也一样）。

然后，我创建了一个会阻塞浏览器的任务：获取 4x10<sup>6</sup> 次 `Math.random()` 的平均值。点击按钮，这个任务就会被执行，其结果也会打印在屏幕上。

![](http://gw.alicdn.com/tps/TB13HZILpXXXXacXXXXXXXXXXXX-296-369.png)

如你所见，如果直接执行这个任务，动画会明显地「卡」一下。而使用 Web Worker 或将任务拆分，则不会卡。

> 以上两种优化策略，有一个相同的前提，即任务是异步的。也就是说，当你决定开始执行一项任务的时候，你并不需要立刻（在下一帧）知道结果。比如，即使战略游戏中用户的某个操作触发了寻路算法，你完全可以等待几帧（用户完全感知不到）再开始移动游戏角色。
> 另外，将任务拆分以优化性能，会带来显著的代码复杂度的增加，以及额外的开销。有时候，我觉得也许可以考虑优先砍一砍需求。

# 小结

正文就到这里，最后我们来稍微总结一下，在大部分情况下，需要遵循的「最佳实践」。

1. 将渲染阶段的开销转嫁到计算阶段之上。
2. 使用多个分层的 Canvas 绘制复杂场景。
3. 不要频繁设置绘图上下文的 font 属性。
4. 不在动画中使用 putImageData 方法。
5. 通过计算和判断，避免无谓的绘制操作。
6. 将固定的内容预先绘制在离屏 Canvas 上以提高性能。
7. 使用 Worker 和拆分任务的方法避免复杂算法阻塞动画运行。