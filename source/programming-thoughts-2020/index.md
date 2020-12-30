# 2020 年，一名强迫症患者的编程随想

2020 年，我写了很多 TypeScript 代码。大概八月的时候，我开始逐渐记录一些编写代码过程中产生的细小想法，可惜九、十月后就没再坚持下去了，转眼到了年底，更没有心气继续，干脆把之前的稿子稍作整理直接放出来吧，不成体系，聊胜于无。

## 有 if 必有 else

这一条也许争议很大，所以放在第一条。

我尝试遵循的实践是：**「有 if 必有 else」**：如果你告诉我在某个条件下应该做什么，就应该同时告诉我不在这个条件下应该做什么 —— 即使什么都不做，也应该告诉我：「什么都不做」。

这与一些编程实践是相违背的，比如 ES-Lint 中就有名为 no-else-return 的规则，它会把下面的 `foo1` 优化成 `foo2`。

```typescript
// ESLint 不喜欢 foo1
function foo1() {
  if (x) {
    return y;
  } else {
    return z;
  }
}

// ESLint 喜欢 foo2
function foo2(){
  if (x) {
    return y;
  }
  return z;
}
```

可是在我看来，`foo1` 更好。因为 `foo1` 在我的脑海里是二叉树结构，而 `foo2` 在我的脑海里是线性结构。当我在脑海中模拟代码运行时，二叉树结构更容易追溯，可以帮助我迅速定位到目标，而线性结构需要我跑完整个流程。

## 无歧义的函数

我会观察一个函数的参数和返回值，然后思考：这个函数的输入，是否可以从输出反推而来。比如说加法，我们可以通过 1+2 得到 3，却不能通过 3 反推出用户输入的是 1+2 还是 0+3；比如 toLowerCase，我们可以将 Hello 转化为 hello，却不能从 hello 推算出输入是 HeLLo 还是 hEllo。

如果一个函数的输出可以反推出输入，那么当反推出的结果和实际输入不符，算怎么一回事呢？日常开发中会有类似这样的函数：调用者传入用户的 ID，函数返回用户详情，其中包含了一个 id 字段，与用户传入的一定相同。

```typescript
const user = getUser(‘001’);
// user : { id: '001', name: 'foo', email: 'foo@bar.com' }
```

对于上面这个 getUser 函数，我们可以从返回值推算出其输入。试想 getUser 如果返回了一个 ID 为 002 的用户，调用者该如何自处呢？调用者会认为 user.id 和 传入的 id 一定是相同的，并不加区分地使用这两个变量，这不仅危险，还会使代码开始陷入混乱。

我比较喜欢的做法是：getUser 就不要返回 id 字段（就算是更上游的模块返回了，也去手动把这个字段删掉），这样就不存在歧义了嘛。

```typescript
const user = getUser(‘001’);
// user : { name: 'foo', email: 'foo@bar.com' }
```

总之，如果一个函数可以从输出推算出输入，那么往往存在着冗余，而冗余会带来歧义的可能。

## 不用 forEach

JavaScript 数组原型上有 map / reduce / filter / some / find / forEach 等方法，其中比较没用的是 forEach 方法了。不仅没用，它本身使用 callback 来遍历数组的形式，会带来一些讨厌的变化。比如：

```typescript
declare let foo : string | null ;

if (typeof foo === 'string') {
  ['hello', 'world'].forEach(v => {
    console.log(v + ' ' + foo!.toLowerCase());
  });
}
```

`console.log(v + ' ' + foo!.toLowerCase())` 语句中那个刺眼的感叹号是必须的：TypeScript 并不知道数组会在什么时候调用你的 callback（若不理解，可把 forEach 换成 setTimeout 试试）。

用原生的 for ... of 代替 forEach 几乎没有任何负面的影响。

```typescript
declare let foo : string | null ;

if (typeof foo === 'string') {
  for(const v of ['hello', 'world']){
    console.log(v + foo.toString());
  }
}
```

其实 map / reduce 等方法也有类似的问题，只是没办法，只能捏着鼻子写感叹号。

## 警惕层级过深的调用和引用

如果我们在项目中看到类似这样的代码：

```typescript
const { foo } = bar.a.b.c.d.e();
```

或者类似这样的：

```typescript
import { foo } from ‘./bar/a/b/c/d/e’;
```

这绝对是不正常的。这就好像一支军队中，坐镇在司令部的将军直接对阵地上的机枪手下达命令——当发生这样的事情之时，指挥系统一定出了什么问题。

> 当然也存在 bar 模块通过无限 public 或者 export * 将模块内部的结构全部暴露了出来，可以理解为军队中的团长直接把某个机枪手的命令权交给了上级（司令）。

## 不要滥用可选参数

有些函数的每个参数都是可选的：

```typescript
function parse (source?: Source, options?: Options): Product | null {
  if (isNil(value)) {
    return null;
  }
  // 很多逻辑
}
```

在 JS 时代，我们习惯于为每个函数增加容错逻辑，保证它们不出错。这些容错逻辑，最后都变成了永远不会被执行到的死代码。

现在是 TS 的时代了，函数不应该再做这些事了，把它们都抛给调用者吧（而且调用者也希望你这样做）！

```typescript
// parse 的第一个参数是必选的
function parse (source: Source, options?: Options): Product {
  // 很多逻辑
}

// 调用者 A
const p1 = isNil(s1) ? parse(s1, opt) : null;

// 调用者 B
const p2 = isNil(s2) ? parse(s2, opt) : defaultProduct;

// 调用者 C
assert(!isNil(s3));  // 断言 s3 肯定存在
const p3 = parse(s3, opt);
```

## 让类型流动起来

很多 TypeScript 教程都提到过一句话：让类型在你的代码中「流动」。我是这样理解的：尽量不主动 import 类型，而是尽可能从上下文中推测出类型；借助模块间的依赖关系，让类型「自然地」流动，不要重新开辟管道。举个例子：

```typescript
// parse.ts
export interface IParsed {...};
export const parse = (source: string): IParsed => {...}
```

调用的时候：

```typescript
import type { IParsed } from './parse';
import { parse } from './parse';

function parseFoo(): IParsed {
  return parse('foo');
}
```

其实，`IParsed` 完全可以不 export 出来：

```typescript
import { parse } from ‘./utils’;

function parseFoo(): ReturnType<typeof parseDate> {...}
```

虽然单个文件内写法变复杂了，但是模块与模块的依赖降低了。如果某一天，`parse` 模块中的 `IParsed` 改了名字，或者 `parse` 的返回值变成了 `IParsed | null`，第二种方法都能得到更加符合预期的结果。

## 不要提前赋值

ES6 引入的 spread 赋值很方便，但不要因此提前赋值，甚至养成「任何函数以 spread 赋值起手」的习惯。需要意识到，向上下文中添加一个变量，依然是有成本的。

比如这段代码，提前赋值了 foo 和 bar，导致其起作用的上下文扩大了：

```typescript
const { foo, bar } = value;
if (condition) {
  // 消费 foo，这里不需要 bar
} else {
  // 消费 bar，这里不需要 foo
}
```

提前赋值有时候还会阻碍类型收窄：

```typescript
type U = { t: 'num', v: number } | { t: 'str', v: string };

declare u: U;
const { t, v } = u;
if (t === 'num') {
  // 在这里，v 还是 number | string，而不是预期的 number
  // 使用 u.t === 'num'，u.v 就是 number 了
}
```

## 一些其他的碎碎念

还有几条的简单想法，不展开了。

* 如果你从一个对象上取出了一个属性，并存在了一个临时常量中，请至少引用这个常量 2 次。
* 用 `const`，不要用 `let`；有很多手段（三元运算符，甚至 IIFE）来让你避免使用 `let`，不到万不得已，不要用 `let`。
* 用 `protected`，不用 `private`，除非你企图阻止其他人继承你的类。我喜欢省略 `public` 关键字，因为折叠起来真的分不清 `public` 或 `protected`。
* 对外输出的函数，如 export 的函数，或者类上的 public 方法，请显式声明返回值类型，不要依赖类型推断。
* 在单独处理边界 case 之前，先想一想能不能通过更普适的逻辑把边界条件「消化」掉。
