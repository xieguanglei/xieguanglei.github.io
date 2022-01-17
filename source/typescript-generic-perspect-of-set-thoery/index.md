# 集合视角下的 TypeScript 泛型开发实践

前段时间我钻研了 [《How to master advanced TypeScript patterns》](https://www.freecodecamp.org/news/typescript-curry-ramda-types-f747e99744ab/) 这篇文章，这是 [ts-toolbelt](https://github.com/millsp/ts-toolbelt) 的作者 [Pierre-Antoine Mills](https://github.com/millsp) 的一篇早期博客文章。文章提出了一个很有挑战的题目：**TS 如何为柯里化函数编写类型支持？**

我参考原文进行了一些实践，然后似乎领悟到一些关于 TS 泛型的**更接近实质**的知识 —— 从集合的视角。基于这些知识，我发现原文中的大部分泛型都有更严密的写法。我认为这次实践和思考的过程值得记录下来，因此有了本文。

和原文一样，本文不展开讨论柯里化或函数式编程的问题，柯里化只是用以讨论 TS 泛型开发的**素材**。本文的线索是我的这份完整实现中，每一个泛型的作用，但这不是重点，重点是背后的领悟 —— 在文章前半部分，我常常会围绕一条简单的泛型讨论较长篇幅，请不要直接跳过。

### 命题

柯里化是函数式编程领域的一个重要概念，它表示这样的过程：把一个多参数的函数转化成「一次接收一个参数」的函数，比如把 `f(a,b,c)` 转化为 `f(a)(b)(c)`。举个更详细的例子：

```typescript
// toCurry 函数为待柯里化的普通函数
declare const toCurry: (a1: 1, a2: 2, a3: 3, a4: 4) => 0;

// curry 是柯里化转换函数，接收普通函数 toCurry，返回转换后的函数（先用 unknown 类型表示）
declare const curry: (toCurry: Function) => unknown;

// curried 是柯里化转换后的函数，调用者按次序每次传入一个参数，所有参数传入后，得到最终的返回值
const curried = curry(toCurry);
curried(1)(2)(3)(4);            // => 0
```

最简单的柯里化，一次仅能接收一个参数。

高级的柯里化，一次可以接收不定项个参数：

```typescript
// 调用 curried 一次传入多个参数
curried(1)(2,3)(4);             // => 0
```

甚至还可以支持剩余参数和占位符：

```typescript
// toCurry 中包含剩余参数
declare const toCurry: (a1: 1, a2: 2, a3: 3, a4: 4, ...args: 5[]) => 0;
const curried = curry(toCurry);

// 调用 curried 时也可以传入剩余参数
curried(1)(2, 3)(4, 5, 5, 5, 5);    // => 0

// 调用 curried 时通过传入占位符把参数 2 移到了 3 之后
curried(1)(__, 3)(2, 4, 5);     // => 0
```

柯里化转换函数 `curry` 是柯里化的核心。转换函数接收一个普通函数 `toCurry` —— 暂时用 `Function` 类型来表示；并返回柯里化转换后的函数 `curried`（后面也称**柯里化的函数**或**柯里化函数**）—— 暂时用 `unknown` 类型来表示。如何写出它的合法的类型表达，就是这篇文章的主线。

### CurriedV1：最简单的柯里化

最简单的，一次只接收一个参数的柯里化，我的实现如下：

```typescript
type Length<T extends unknown[]> = T['length'];

type Head<T extends unknown[]> = T extends [] ? never : T[0];

type Tail<T extends unknown[]> = T extends [] ? never : T extends [unknown, ...infer R] ? R : T;

type CurriedV1<P extends unknown[], R> = P extends [] ? R : (arg: Head<P>) => CurriedV1<Tail<P>, R>;

type Curry = <P extends unknown[], R>(fn: (...args: P) => R) => CurriedV1<P, R>;

declare const curry: Curry;
declare const toCurry: (a1: 1, a2: 2, a3: 3, a4: 4) => 0;

const curried = curry(toCurry);
curried(1)(2)(3)(4); // => 0
```

### 泛型 `Length`

第一条泛型 `Length` 返回元组的长度。

```typescript
type Length<T extends unknown[]> = T['length'];
```

首先需要领悟的是，**类型是对象的集合**。比如，类型 `number` 是所有数字的集合，类型 `1` 表示由数值 `1` 组成的单一元素集合，类型 `string[]` 是所有「每一项都是字符串的数组」的集合。

**泛型**，从形式上看，是类型的函数（把一种类型转化为另一种类型）；从集合的角度看，是**集合的映射**（把一个集合变为另一个集合）。

集合的映射，必须基于作用于**集合内元素**的**规则**。假设有集合 A 和 B，只有当 A 中的任意元素，按照**某种规则**，可以转化为 B 中的一个元素，我们才能说 A 和 B 之间存在映射关系。

> 既然映射只能从**一个**集合映射到另一个集合，如何理解多个泛型参数的情况？回答：把多个泛型参数看作一个元组类型。

以 `Length` 为例：

```typescript
type Length_Test1 = Length<[unknown]>;          // => 1
type Length_Test2 = Length<unknown[]>;          // => number
```

将类型 `[unknown]` 传递给 `Length` 得到类型 `1`，描述了这样的事实：属于类型 `[unknown]` 的无数个元素中任意一个，不管是 `[1]` 还是 `['foo']` 还是 `[{foo: true}]`，**对它求取长度**，得到的结果都是 `1`。这些元素经过 `Length` 这条规则，都被转化成了数值 `1` 这个元素；换言之，类型 `[unknown]` 所代表的集合通过 `Length` 这条规则映射为只包含一个元素（也就是 `1` 这个数值）的单元素集合，这个集合对应的类型就是类型 `1`。

将类型 `unknown[]` 传递给 `Length` 得到类型 `number`，这是因为：属于类型 `unknown[]` 的无数个元素中的任意一个，不管是 `[]` 还是 `[1]` 还是 `['foo', true]`，**对它求取长度**，得到的结果 `0`，`1` 或 `2` 等等，都是 `number` 类型。注意，`Length` 不能保证经过规则转换后的值**占满**映射得到的集合：因为没有什么数组的长度是 `0.5` 或 `-1`。所以，泛型运算 `Length<unknown[]>` 的结果 `number` 其实是真实世界中映射得到的结果集的**超集**。

泛型返回「真实结果集」的超集，时常比我们预期的集合要宽泛，这是不可避免的。从集合的角度看，编写泛型的目的，就是提供「真实结果集」的**可以用类型规则描述**的，同时**尽可能小**的超集。理解这一点很重要。

> 如果 JS 支持无符号整数类型，`Length<unknown[]>`，似乎就可以得到完美的结果集，但这其实只是巧合。更多场合是无法得到完美结果集的：比如 `Length<[unknown, ...unknown[]]>` 需要返回「由大于 1 的整数」构成的集合。

### JavaScript：先验性的知识

TS 是如何知道 `Length<unknown[]>` 的结果是 `number` 的呢？在 `Length<unknown[]>` 和 `number` 之间，是否还存在某种**原理**可以被理解呢？我认为：已经**没有**什么原理性的内容了，TS **仅仅**是根据**先验性**（公理性）的知识来直接**给出答案**。

TS 的类型系统是为 JS 量身定制的：任意 JS 字面量都是 TS 的单元素类型；JS 的基础类型如 `number` 或 `string` 也构成了 TS 的基础类型；通过类似定义数组、JSON 对象、函数的语法，我们可以创建数组类型和元组类型、对象类型、函数类型，来表示包含符合条件的数组元素、对象元素或函数元素的集合。TS 当然熟悉 JS 里所有对象类型的**习性** —— 它们有什么成员属性，它们之间如何转化等等 —— 这些知识对 TS 来说是先验性的，所以 TS 才能轻易且正确地进行基础类型的运算。

```typescript
// 基础类型间的运算
type T1 = number['toFix'];                      // => () => string
type T2 = [number, string][1];                  // => string
type T3 = keyof { foo: number, bar: string };   // => 'foo' | 'bar'
```

### 泛型 `Head`

第二条泛型 `Head` 取出元组 `T` 中的第一个元素的类型。

```typescript
type Head<T extends unknown[]> = T extends [] ? never : T[0];
```

`Head` 首先判断是否满足 `T extends []`，如果满足，说明 `T` 是只包含空数组的单元素集，返回 `never`；否则，说明 `T` 不是空数组单元素集，可能有第一个元素，返回 `T[0]`。

为什么条件泛型里只有 `extends` 关键字，而没有 `equals` 关键字或 `==` 运算符？我的领悟是：在集合运算中，只有**包含运算**才能产生「是」或「否」的结果，而集合的其他运算：交集、并集、补集、映射，他们的运算结果都是另一个集合。在集合的语境下，A 包含于 B，意味着 A 是 B 的子集；切换到类型语境下，即 A 是 B 的子类，也就是 A 继承自 B。

> 如何判断两个类型完全相同？只需判断它们互相包含（互相继承）。

对 `Head` 进行一些测试：

```typescript
type Head_Test1 = Head<[1, number]>;    // => 1
type Head_Test2 = Head<string[]>;       // => string
type Head_Test3 = Head<unknown>;        // ts error
type Head_Test4 = Head<[]>;             // => never
```

前三条测试的结果是符合直觉的。第四条，当我们把**包含空数组的单元素集**传递给 `Head`，得到的结果是 `never` 类型，表示空集，也没有什么问题。

让我们再看一眼第二条测试：请问空数组是不是 `string[]` 集合的元素？当然是了。那么，在真实世界的 `Head` 映射中，空数组被映射为了什么元素？

集合论中，映射的前提是，映射规则对源集合内的所有元素都生效。我们应该如何理解 `Head`？

我的理解是：TS 中存在一个**写不出来**（JS 中没有）的 **`never` 对象**，而**能写出来**的 **`never` 类型**表示包含 `never` 对象的单元素集。同时，TS 中任何能写出来的类型都隐式包含了 `never` 对象，这使得任何类型与 `never` 类型求并集得到的都是自身，从而使本来是单元素集的 `never` 类型在**概念**上变成了空集。

从这个角度理解 `Head<string[]>` 就说得通了：`string[]` 集合中的空数组元素被映射为了 `never`，而其他元素被映射为了 `string`；因为 `string | never` 依然是 `string`，所以最终返回 `string`。

### 泛型 `Tail`

第三条泛型 `Tail` 提取元组 `T` 的**尾项**（即除去第一项后剩余的那些项）的类型。

```typescript
type Tail<T extends unknown[]> = T extends [] ? never : T extends [unknown, ...infer R] ? R : T;
```

有点复杂。

让我们先来看一个简易版本：

```typescript
type SimpleTail<T extends unknown[]> = T extends [unknown, ...infer R] ? R : never;
```

`SimpleTail` 在形式上和 JS 代码很像：使用剩余参数运算符，把元组中除去第一项的剩余部分提取出来。简单的测试也没有问题：

```typescript
type SimpleTail_Test1 = SimpleTail<[]>;                    // => never
type SimpleTail_Test2 = SimpleTail<[1, 2, string]>;        // => [2, string]
type SimpleTail_Test3 = SimpleTail<[1, 2, ...string[]]>;   // => [2, ...string[]]
```

但是，如果用 `string[]` 测试一下，得到了 `never`。这就不太对劲了：

```typescript
type SimpleTail_Test3 = SimpleTail<string[]>;              // => never
```

在真实世界中，`string[]` 集合中的几乎所有元素（除空数组对象外），取尾项操作都是有意义的。事实上，如果我们举一些例子进行归纳的话，一定可以得出结论：对 `string[]` 取尾项的结果**就**是 `string[]`。但是，根据 `SimpleTail` 的实现：`string[]` 又确实不是 `[unknown, ...unknown[]]` 的子集，我们只能返回 `never`。

再来看正式版本的 `Tail`：

```typescript
type Tail<T extends unknown[]> = T extends [] ? never : T extends [unknown, ...infer R] ? R : T;
```

1. 分支 1：如果 `T` 是空数组单元素集的子集，我们可以断定：`T` 只能是空数组单元素集或 `never`，此时返回 `never`；
2. 分支 2：如果 `T` 是「由所有「拥有第一项的数组」组成的集合」的子集，我们可以断定：`T` 不可能包含空数组元素，此时用类似 `SimpleTail` 中的形式提取出尾项类型。
3. 分支 3：如果上述两者都不满足，我们直接返回 `T`。

传入 `string[]` 测试一下，通过分支 3，得到了预期的类型：`string[]`。

```typescript
type Tail_Test4 = Tail<string[]>;                           // => string[]
```

你真的笃定吗？如果 `T` 即不满足分支 1 也不满足分支 2，就一定是类似于 `string[]` 或 `number[]` 这种纯粹的数组类型，而不可能是**其他**类型吗？

让我们归纳一下数组（包括元组）类型的**写法**：（我们不关心数组项的具体类型，全部用 `unknown` 代替）

1. 空数组：`[]`；
2. 纯粹的数组：`unknown[]`；
3. 元组：`[unknownA, unknownB, unknownC]`；
4. 带剩余项的元组：`[unknownA, unknownB, ...unknownC[]]`。

经过归纳，我们发现定义数组类型的写法**只有**上面这 4 种，**没有**其他的了！能够**写出来**的数组类型，能够**算出来**（其他泛型返回）的数组类型，最后都能归纳到其中。这 4 种写法就是 TS 处理数组类型的**边界**，换言之 TS 无法产生「无法用这 4 种写法组合出来」的数组类型。

正是基于对以上知识的理解，我们确信只有第 2 种写法（纯粹的数组类型）才能走到分支 3。才能够放心地在分支 3 里返回直接 `T`。

注意，这里还有一个陷阱。考虑传入并集的情况：

```typescript
type Tail_Test5 = Tail<[] | string[] | [1, 2, 3]>;          // string[] | [2, 3]
```

根据集合论，并集的映射，应由组成并集的**每个**单个集合，分别映射之后，再对**多个结果集**取并集，作为最终的结果。

`Tail` 没有令我们失望，它正确地返回了预期的类型。但这是有条件的，泛型中的分支条件必须满足**分发条件类型**的约束：即条件必须是泛型参数**直接** `extends` 某个类型（形如 `T extends SOMETYPE`），如果我们把 `Tail` 实现中的第一个条件 `T extends []` 换成 `Length<T> extends 0`，分发条件类型的约束失效，命题「`T` 只可能是这 4 种写法之一」不复存在，—— 大厦由此坍塌。

```typescript
type BrokenTail<T extends unknown[]> = Length<T> extends 0 ? never : T extends [unknown, ...infer R] ? R : T;

type BrokenTail_Test6 = BrokenTail<[] | [1, 3] | string[]>;  // => [] | [3] | string[]
```

你是否已经体会到泛型编程的某种**笨拙**之处？集合映射的规则（即泛型的语义）是基于**集合内元素**的，但泛型的实现者必须基于**集合本身**的运算来回答「映射之后是什么集合」的问题。这需要从真实世界的角度切实地归纳总结，才能保障映射的**正确性**和**最小性**。

### 转换函数的类型

目前，柯里化转换函数 `curry` 的类型定义如下：接收一个任意函数，返回 `unknown`。

```typescript
type Curry = (toCurry: Function) => unknown;

declare const curry: Curry;
```

我们要把 `unknown` 换成一个**更精巧的类型**，这样用户在使用 `curry` 返回的结果（即柯里化函数）时，就能够获得正确的类型提示了。

显然，这个「更精巧的类型」具体是什么，取决于调用 `curry` 时传入的那个函数。我们使用**泛型约束**把传入函数的参数 `P` 和返回类型 `R` 提取出来：

```typescript
type Curry = <P extends unknown[], R>(toCurry: (...args: P) => R) => Curried<P, R>;
```

然后，将 `P` 和 `R` 传递 `Curried` 泛型，作为柯里化函数的类型（即前述的「更精巧的类型」）。

> 注意，`Curry` 不是泛型映射，只是一个具有泛型约束的函数类型。

### 泛型 `CurriedV1`

`CurriedV1` 是 `Curried` 泛型的第一版实现，它支持最简单的柯里化（每次只消费一个参数）。

```typescript
type CurriedV1<P extends unknown[], R> = P extends [] ? R : (arg: Head<P>) => CurriedV1<Tail<P>, R>;
```

泛型是可以递归调用的，`CurriedV1` 就是这样，当它每次递归地调用自己，元组 `P` 的规模就减一，直到其变为空数组，结束递归。

测试一下，很完美：

```typescript
type CurriedV1_Test1 = CurriedV1<[1, 2, 3], 0>; // => (arg: 1) => (arg: 2) => (arg: 3) => 0
```

你可能会问：如果传入一个无限（未知）长度的数组类型，比如 `number[]`，TS 会不会陷入死循环？让我们试一试：

```typescript
type CurriedV1_Test2 = CurriedV1<number[], 0>; // => (arg: number) => ...
```

TS 没有报错或陷入死循环，而是仍然映射出了一种可以无穷调用下去的函数类型。所以，我们可以得出结论：递归时逐渐缩减规模并不是泛型递归的必要条件。

事实上，泛型的某种**惰性**机制允许我们去为诸如 JS 中的**循环引用对象**或**返回自身的函数**定义类型：

```typescript
type Foo<T> = { foo: Foo<T> };
declare const foo: Foo<number>;
foo.foo.foo.foo.foo.foo;            // => 属性 foo 可以无限取下去

type Bar<T extends () => number> = () => Bar<T>;
declare const bar: Bar<() => 1>;
bar()()()()();                      // => 函数 bar 可以无限调用下去
```

> 讲到这里，其实大部分「从集合视角看泛型」的领悟已经陈述完毕了。接下来，我会加快一些速度，把更高级的柯里化的类型实现讲完。

### CurriedV2：允许不定项参数

如果柯里化函数可以接收不定项参数（形如 `curried(1)(2,3)(4)`），就会更易用一些。我的实现是：

```typescript
type Prepend<E, T extends unknown[]> = [E, ...T];

type Drop<N extends number, P extends unknown[], T extends unknown[] = []> =
    Length<T> extends N ? P : Drop<N, Tail<P>, Prepend<unknown, T>>;

type PartialTuple<T extends unknown[]> = Partial<T> & unknown[];

type CurriedV2<P extends unknown[], R> =
    Length<P> extends 0
    ? R
    : <T extends PartialTuple<P>>(...args: T) => CurriedV2<Drop<Length<T>, P>, R>;

type Curry = <P extends unknown[], R>(fn: (...args: P) => R) => CurriedV2<P, R>;

declare const curry: Curry;
declare const toCurry: (a1: 1, a2: 2, a3: 3, a4: 4) => 0;

const curried = curry(toCurry);
curried(1, 2)(3, 4); // => 0
```
### 泛型 `Prepend`

泛型 `Prepend` 在元组类型前加上一项。

```typescript
type Prepend<E, T extends unknown[]> = [E, ...T];

type Prepend_Test1 = Prepend<1, [2]>;                   // ==> [1, 2]
type Prepend_Test2 = Prepend<1, [2, ...3[]]>;           // ==> [1, 2, ...3[]]
type Prepend_Test3 = Prepend<1 | 2, 3[]>;               // ==> [1 | 2, ...3[]]
```

注意，`Prepend` 不是条件类型，自然不满足分发条件类型，所以 `Prepend_Test3` 是 `[1 | 2, ...3[]]` 而不是 `[1, ...3[]] | [2, ...3[]]`。如果你想要得到后者，可以将 `Prepend` 的实现放在条件类型内，如下所示：

```typescript
type DistributedPrepend<E extends unknown, T extends> = E extends unknown ? [E, ...T] : never;

type DistributedPrepend_Test1 = DistributedPrepend<1 | 2, 3[]>;    // ==> [1, ...3[]] | [2, ...3[]]
```

> 本文后续讨论假设所有传入的类型都是不分散的（即非并集的形式），也不再讨论分发条件类型的问题。

### 泛型 `Drop`

泛型 `Drop` 负责从元组中删掉头部的 `N` 个元素。`Drop` 也是递归的，每次递归删掉一个元素，同时放置一个 `unknown` 到元组 `T` 中。当元组 `T` 的长度与 `N` 相等时，说明已经删掉了足够多的元素，把剩下的元素返回即可。

```typescript
type Drop<N extends number, P extends unknown[], T extends unknown[] = []> =
    Length<T> extends N ? P : Drop<N, Tail<P>, Prepend<unknown, T>>;
```

简单地测试，没有问题。

```typescript
type Drop_Test1 = Drop<2, [1, 2, 3, 4]>;    // => [3, 4]
type Drop_Test2 = Drop<5, [1, 2, 3, 4]>;    // => never
type Drop_Test3 = Drop<5, [1, 2, ...3[]]>;  // => 3[]
```

`Drop` 的关键在于，使用了一个空数组，也就是第三个泛型参数 `T` 来进行计数。

> 有趣的是，类似的机制可以用来实现整数的加减法：
> 
> ```typescript
> type FromLength<N extends number, P extends unknown[] = []> = 
>     Length<P> extends N ? P : FromLength<N, Prepend<unknown, P>>;
> 
> type Add<A extends number, B extends number, Res extends unknown[] = FromLength<A>, Count extends unknown[] = []> = 
>     Length<Count> extends B ? Length<Res> : Add<A, B, Prepend<unknown, Res>, Prepend<unknown, Count>>;
> 
> type Sub<A extends number, B extends number, Res extends unknown[] = [], Count extends unknown[] = FromLength<B>> = 
>     Length<Count> extends A ? Length<Res> : Sub<A, B, Prepend<unknown, Res>, Prepend<unknown, Count>>;
> 
> type Eight = Add<3, 5>;     // => 8
> type Four = Sub<9, 5>;      // => 4
> ```

### 泛型 `PartialTuple`

泛型 `PartialTuple` 的故事要从 TS 的官方泛型 `Partial` 开始讲。我们知道 `Partial` 泛型可以将一个对象类型的所有属性都变得可选。当它作用于数组时，会使数组的每一项变成可选，比如 `Partial<[number, string]>` 可以得到**类似**于 `[number?, string?]` 的类型。

我们期望 `CurriedV2` 支持不定项参数，因此需要从定项参数元组中抽取出「元组的前任意项」类型：比如定项参数是类型 `[1, 2, 3]`，那么不定项参数可以是 `[1]`，`[1, 2]` 或者 `[1, 2, 3]`。然而，TS 目前的类型运算没办法实现「元组的前任意项」这样的映射规则，而 `Partial` 是最接近的实现（最小超集）。

为什么又需要 `PartialTuple` 呢？因为被 `Partial` 转换后的类型已经不再是元组了：诸如 `length`，`map` 等属性也成了可选属性，这使得形如 `{0: 'Hello'}` 这样的对象也在 `Partial<[string]>` 的集合内。`PartialTuple` 将这部分不属于元组的元素剔除在外。

```typescript
type PartialTuple<T extends unknown[]> = Partial<T> & unknown[];
```

原文直接使用 `Partial` 而不报错，这是 TS 的一个 bug：对于 `Partial` 传入元组类型后，究竟还是不是元组，在不同的条件下判断不一致。我提交了 [issue](https://github.com/microsoft/TypeScript/issues/47128) 和[最简复现](https://www.typescriptlang.org/play?ts=4.1.5#code/C4TwDgpgBAIgjAHgAoD4oF4pKhAHsCAOwBMBnKAV0IGtCB7Ad0IG0BdKAfigAoA6fgIYAuLAIBOwAJYCANshQBKDGgBudScSgjCEFRDEBuKAHpjOMWLpiAsACg7oSLABMyHPiJlKNekzZpMPkERJHEpWXkldFV1YiNTKFIKAGNkiFJSOzsEgBUAC2hgBjp3AQBbMBloUjy6ChlNACM6YDzElLSMiE0rKAAzAUkq4izbIA)。

### 泛型 `CurriedV2`

`CurriedV2` 与 `CurriedV1` 在框架上有点类似：

```typescript
type CurriedV1<P extends unknown[], R> = 
    P extends [] ? R : (arg: Head<P>) => CurriedV1<Tail<P>, R>;

type CurriedV2<P extends unknown[], R> =
    P extends [] ? R : <T extends PartialTuple<P>>(...args: T) => CurriedV2<Drop<Length<T>, P>, R>;
```

最重要的一点区别是，`CurriedV2` 为柯里化函数引入了泛型约束，这样每次调用时，就能动态提取出传入参数的数量，并据此计算此次调用应该返回的类型。

```typescript
type CurriedV1_Test1 = CurriedV1<[1, 2, 3], 0>; // => (arg: 1) => (arg: 2) => (arg: 3) => 0

type CurriedV2_Test1 = CurriedV2<[1, 2, 3], 0>;
// => <T extends PartialTuple<[1, 2, 3]>>(...args: T) => CurriedV2<Drop<Length<T>, [1, 2, 3], []>, 0>
```

简单测试，我们发现 `CurriedV2_Test1` 无法直白给出柯里化函数的类型，因为每一步调用后得到类型，只有调用的时候才能（根据参数）确定。

### CurriedV3：支持剩余参数

有些函数的参数分为两个部分：固定参数和剩余参数。比如这样的 `toCurry`：在前四个固定参数之后，你可以传入任意个类型为 `5` 的剩余参数：

```typescript
declare const toCurry: (a1: 1, a2: 2, a3: 3, a4: 4, ...args: 5[]) => 0;

// 必须在最后一次调用时一次性传入所有剩余参数
curry(toCurry)(1, 2, 3)(4, 5, 5);
```

如果柯里化可以支持这种函数，无疑会更好：这就是 `CurriedV3` 的目标。我的实现是：

```typescript
type CurriedV3<P extends unknown[], R> =
    P extends [unknown, ...unknown[]]
    ? <T extends PartialTuple<P>>(...args: T) => CurryV3<Drop<Length<T>, P>, R>
    : R;

type Curry = <P extends unknown[], R>(fn: (...args: P) => R) => CurriedV3<P, R>;

declare const curry: Curry;
declare const toCurry: (a1: 1, a2: 2, a3: 3, a4: 4, ...args: 5[]) => 0;

const curried = curry(toCurry);
const result = curried(1, 2, 3)(4，5，5);
```

`CurriedV3` 与 `CurriedV2` 的区别**仅仅**在于递归结束条件不同：`CurriedV3` 通过判断满足 `P extends [unknown, ...unknown[]]` 推断出 `P` 仍然包含固定项，此时继续递归；不满足此条件说明 `P` 中只有剩余参数了，结束递归。

得益于严密的 `Drop` 以及背后的 `Tail` —— 它们妥善处理了纯粹数组和包含剩余项元组的情况 —— `CurriedV3` 的递归部分和 `CurriedV2` 是完全一致的。

```typescript
type Drop_Test3 = Drop<5, [1, 2, ...3[]]>;  // => 3[]
type Tail_Test5 = Tail<1[]>;                // => 1[]
```

如果 `Drop` 和 `Tail` 对上述较为边缘的处理不够完善（比如直接返回 `never` 或 `[]`），`CurriedV1` 和 `CurriedV2` 并不会受什么影响，但是 `CurriedV3` 的实现就没那么容易了。

### CurriedV4: 支持占位符

柯里化中的占位符，能够帮助我们延迟传入参数的时机。比如：

```typescript
// 普通的调用
curried(1, 2, 3)(4, 5);
// 占位符调用
curried(1, __, 3)(2, 4, 5);
// 甚至
curried(1, __, 3)(__, 4)(2, 5);
```

这就是 `CurriedV4` 的目标。我的实现是：

```typescript
type Equal<X, Y> = X extends Y ? Y extends X ? true : false : false;

type Item<T extends unknown[]> = T extends (infer R)[] ? R : never;

type PlaceholderTuple<T extends unknown[], M extends unknown> = { [P in keyof T]?: T[P] | M } & unknown[];

type Reverse<T extends unknown[], R extends unknown[] = []> =
    Equal<Length<T>, number> extends true
    ? Item<T>[]
    : T extends [unknown, ...unknown[]]
    ? Reverse<Tail<T>, Prepend<Head<T>, R>>
    : R;

type Join<P extends unknown[], T extends unknown[]> = 
    P extends [unknown, ...unknown[]] ? Join<Tail<P>, Prepend<Head<P>, T>> : T;

type Concat<P extends unknown[], T extends unknown[]> = Join<Reverse<P>, T>;

type PlaceholderMatched<T extends unknown[], S extends unknown[], M extends unknown, R extends unknown[] = []> =
    T extends [unknown, ...unknown[]]
    ? PlaceholderMatched<Tail<T>, Tail<S>, M, Head<T> extends M ? Prepend<Head<S>, R> : R>
    : Reverse<R>;

type __ = '__';
type CurriedV4<P extends unknown[], R> =
    P extends [unknown, ...unknown[]]
    ? <T extends PlaceholderTuple<P, __>>(...args: T) =>
        CurriedV4<Concat<PlaceholderMatched<T, P, __>, Drop<Length<T>, P>>, R>
    : R;

type Curry = <P extends unknown[], R>(fn: (...args: P) => R) => CurriedV4<P, R>;

declare const curry: Curry;
declare const toCurry: (a1: 1, a2: 2, a3: 3, a4: 4, ...args: 5[]) => 0;
declare const __: __;

const curried = curry(toCurry);
curried(1, __, 3)(2, 4, 5, 5);          // => 0
curried(1, __, 3)(__, 4)(2);            // => 0
```

### 泛型 `Equal`

泛型 `Equal` 判断两个类型是不是完全相等（注意，仍然是集合运算，`true` 和 `false` 表示包含布尔值的单元素集合）。

```typescript
type Equal<X, Y> = X extends Y ? Y extends X ? true : false : false;

type Equal_Test1 = Equal<number, 1>;            // => false
type Equal_Test2 = Equal<number, number>;       // => true
```

### 泛型 `Item`

泛型 `Item` 从数组类型中提取出数组项的可能类型。

```typescript
type Item<T extends unknown[]> = T extends (infer R)[] ? R : never;

type Item_Test1 = Item<string[]>; // => string
type Item_Test2 = Item<[string, ...1[]]>; // => string | 1
```

### 泛型 `PlaceholderTuple`

泛型 `PlaceholderTuple` 与 `PartialTuple` 很类似，它不仅使元组的每一项变成可选，而且使每一项都可能是传入的类型 `M`。

```typescript
type PlaceholderTuple<T extends unknown[], M extends unknown> = { [P in keyof T]?: T[P] | M } & unknown[];
```

### 泛型 `Reverse`

泛型 `Reverse` 将元组头尾翻转。

```typescript
type Reverse<T extends unknown[], R extends unknown[] = []> =
    Equal<Length<T>, number> extends true
    ? Item<T>[]
    : T extends [unknown, ...unknown[]]
    ? Reverse<Tail<T>, Prepend<Head<T>, R>>
    : R;
```

泛型 `Reverse` 值得稍作展开。先看核心部分（从 `T extends` 开始）：接收数组类型 `T`，递归地调用自己，每次递归将 `T` 的头元素取下来，从头部推入 `R` 中。当 `T` 消耗殆尽，`R` 自然就是翻转后的数组。

对于固定长度的元组类型，这样做没问题。但是，如果想要翻转不固定长度的数组类型呢？

通过真实世界中的简单的归纳，我们知道 `Reverse<string[]>` 应该是 `string[]`，映射仍然是完美的；对于 `Reverse<[string, ...number[]]>`，我们只能将其映射为 `Array<string | number>` —— 我们之前说过，泛型的返回时常比我们预期的类型要宽泛，这不可避免。

`Reverse` 实现的前两行（非核心部分），就是用来处理上述两种不固定长度数组类型的。

测试一下：

```typescript
type Reverse_Test1 = Reverse<[1, 2, 3]>;                // => [3, 2, 1]
type Reverse_Test2 = Reverse<unknown[]>;                // => unknown[]
type Reverse_Test3 = Reverse<[string, ...number[]]>;    // => Array<string | number>
```

### 泛型 `Join`

泛型 `Join` 将两个元组类型「头对头连接起来」。注意，第一个参数必须是固定项的元组类型。

```typescript
type Join<P extends unknown[], T extends unknown[]> = P extends [unknown, ...unknown[]] ? Join<Tail<P>, Prepend<Head<P>, T>> : T;

type Join_Test1 = Join<[1, 2], [3, 4]>;         // => [2, 1, 3, 4]
type Join_Test2 = Join<[1, 2], [3, ...4[]]>;    // => [2, 1, 3, ...4[]]
type Join_Test3 = Join<[1, ...2[]], [3, 4]>;    // => ts error
```

### 泛型 `Concat`

泛型 `Concat` 将两个元组类型顺序连接起来。同理，第一个参数也必须是固定项的元组类型。

```typescript
type Concat<P extends unknown[], T extends unknown[]> = Join<Reverse<P>, T>;

type Concat_Test1 = Concat<[1, 2], [3, 4]>;         // => [1, 2, 3, 4]
type Concat_Test2 = Concat<[1, 2], [3, ...4[]]>;    // => [1, 2, 3, ...4[]]
type Concat_Test3 = Concat<[1, ...2[]], [3, 4]>;    // => ts error
```

### 泛型 `PlaceholderMatched`

泛型 `PlaceholderMatched` 将元组 `T` 中的类型为 `M` 的项找出来，然后从元组 `S` 中提取出对应位置的项，顺序存放在一个新的元组里 `R`，并最终返回。

```typescript
type PlaceholderMatched<T extends unknown[], S extends unknown[], M extends unknown, R extends unknown[] = []> =
    T extends [unknown, ...unknown[]]
    ? PlaceholderMatched<Tail<T>, Tail<S>, M, Head<T> extends M ? Prepend<Head<S>, R> : R>
    : Reverse<R>;
```

有一点拗口。简单看一下测试就知道 `PlaceholderMatched` 的具体作用了：

```typescript
type __ = '__';
type PlaceholderMatched_Test1 = PlaceholderMatched<[1, __, __, 4], [1, 2, 3, 4, 5], __>; // => [2, 3]
```

### 泛型 `CurriedV4`

最后来看柯里化后函数类型的完全体 `CurriedV4`：

```typescript
type __ = '__';

type CurriedV4<P extends unknown[], R> =
    P extends [unknown, ...unknown[]]
    ? <T extends PlaceholderTuple<P, __>>(...args: T) =>
        CurriedV4<Concat<PlaceholderMatched<T, P, __>, Drop<Length<T>, P>>, R>
    : R;
```

`CurriedV4` 与 `CurriedV3` 的区别在递归部分。我们用 `PlaceholderTuple<P, __>` 约束柯里化函数的入参，这样调用者就可以传入占位符常量 `__` 了。

单次递归中，我们将「被占位的元素」构成的元组类型提取出来（即 `PlaceholderMatched<T, P, __>`），然后与此次调用消耗参数后剩余的参数（即 `Drop<Length<T>, P>>`）连接起来，作为新的参数 `P`，传入下一次递归。

测试一下，完美。

```typescript
type Curry = <P extends unknown[], R>(fn: (...args: P) => R) => CurriedV4<P, R>;

declare const curry: Curry;
declare const toCurry: (a1: 1, a2: 2, a3: 3, a4: 4, ...args: 5[]) => 0;
declare const __: __;

const curried = curry(toCurry);

curried(1, __, 3)(2, 4, 5, 5);          // => 0
// => CurriedV4<[1, 2, 3, 4, ...5[]], 0> => CurriedV4<[2, 4, ...5[]], 0>

curried(1, __, 3)(__, 4)(2);            // => 0
// => CurriedV4<[1, 2, 3, 4, ...5[]], 0> => CurriedV4<[2, 4, ...5[]], 0> => CurriedV4<[2, ...5[]], 0>
```

### 小结

虽然本文中，对集合的讨论主要集中在前半部分，但是促使我去思考的，其实是对后面几个更高级的场景的实践。我发现，把这些实践的领悟套用在最开始的几个简单泛型上进行陈述，似乎更加清晰。

原文中，一开始的基础泛型就不是很严密，比如 `Head` 泛型是这样的：

```typescript
type Head<T extends any[]> = T extends [any, ...any[]] ? T[0] : never;
```

这导致 `Head<string[]>` 返回的是 `never`，明显与从集合视角看上去的情形不符。

原文的很多基础类型，都存在没有处理妥善的边缘用例，所以当问题越来越复杂之时，泛型实现就会越来越不可控。后来原作者开始引入 `Cast` 泛型，把推导到边缘的不准确的类型强行转换回来。

```typescript
type Cast<X, Y> = X extends Y ? X : Y;
```

这引发了我的思考，这些基础泛型究竟**应该**实现成什么样？在反复的实践中，我发现凭借直觉写出来的代码往往不够准确，有那么一刻，我领悟到我缺少的其实是一种集合的视角；而一旦从集合的视角理解了泛型运算的实质，似有一种豁然开朗之感：什么能做，什么不能做，哪里可以妥协，哪里只能放弃，就都可以确定地分析出来了。

（完）