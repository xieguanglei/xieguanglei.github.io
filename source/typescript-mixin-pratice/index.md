# TypeScript Mixin 实践
类和类的继承（基类与派生类），是面向对象编程领域中的概念。有时，我们可能会希望一个类继承自多个基类，这种行为又称「多重继承」。但是由于多重继承使编程语言和语义表达变得更加复杂和易出错（如同名成员函数冲突和继承顺序的问题），并不是所有编程语言都支持多重继承机制。

> 多重继承必要性的例子（参考[这篇文章](https://medium.com/flutter-community/dart-what-are-mixins-3a72344011f3)）：
> 
> ![](https://img.alicdn.com/tfs/TB1JdcSbmWD3KVjSZSgXXcCxVXa-774-278.png)
> 
> 动物（Animal）是基类，哺乳动物类（Mamaml）、鸟类（Bird）和鱼类（Fish）是继承自动物的派生类，各自又派生出一些更具体的派生类。但是从另一个维度上，这些动物又具有会飞（CanFly），会跑（CanWalk）和会游水（CanSwim）的特征，而这些特征与之前的分类是完全正交（互相独立）的。此情况下，多重继承就会方便地帮助我们定义派生类——作为鸟类的鸭子，即会飞，也会跑，也有游水。

Mixin 模式，是那些仅支持单继承的面向对象语言（如 Java、Dart、TypeScript），对多重继承机制的一种补充。具体的，mixin 模式允许类从非父类的其他类（或对象）上继承方法和属性。

> 在这个例子中，我们可以把会飞、会跑和会游水三种行为定义为 mixin，并混入到具体的动物类中去。

之前一段时间，我从事了一些与 TypeScript 和 Dart 相关的编程工作，并需要在 TypeScript 中模拟 Dart 中的 mixin 机制。由于 TypeScript 几乎没有 mixin 机制（它的官方 mixin 解决方案极为孱弱），因此我不得不手写了大量语义差、维护难、易出错的「胶水代码」。最近，在对 TypeScript 的类型系统有了一些相对深入的了解后，我实践出了一套虽然远远谈不上优雅，但还算基本可用的 TypeScript Mixin 解决方案。

先看 Dart 的 Mixin 的写法：

```dart
abstract class Animal {
  bool isAlive = true;
  bool isHealthy(){
    return isAlive;
  }
}

abstract class Mammal extends Animal {
  num temperature;
  Mammal(this.temperature);
  bool isInFever();
  bool isHealth(){
    return super.isHealthy() && this.isInFever();
  }
}

mixin CanWalk on Animal {
  walk(){
    if(isAlive){
      if(isHealthy()){
        print('Walking as usual.');
      }else{
        print('Walking slowly.');
      }
    }
  }
}

class Cat extends Mammal with CanWalk {
  Cat(): super(ST_TEMPERATURE);
  isInFever(){
    return temperature - ST_TEMPERATURE > 1;
  }
  walk(){
    if(isAlive){
      super.walk();
      print('Walking quietly.');
    }
  }

  static const num ST_TEMPERATURE = 38;
}
```

Mixin 的能力，具体的：
1. Mixin 类（例子中的 `CanWalk`）可以被指定 **mix（混入）**到特定基类（`Animal`）上：Mixin 类可调用基类的成员变量和方法（例子中 `CanWalk` 类的 `walk` 方法访问到基类的 `isAlive` ），或重写基类的成员变量（此时可使用 `super` 关键字来调用基类中的同名方法）。
2. 被混入的派生类可以访问 Mixin 中的成员变量和方法，也可以重写方法（使用 `super` 调用基类中的同名方法）。

看一下 TypeScript 官方的 mixin 方案：

```typescript
function applyMixins(derivedCtor: any, baseCtors: any[]) {
    baseCtors.forEach(baseCtor => {
        Object.getOwnPropertyNames(baseCtor.prototype)
          .forEach(name => {
            Object.defineProperty(derivedCtor.prototype, name, 
              Object.getOwnPropertyDescriptor(baseCtor.prototype, name));
        });
    });
}
```

这个方案的原理是，在运行时，为派生类构造函数的 prototype 上手动注入基类中的对应。使用起来大概是这样的：

```typescript
// 官方用法
abstract class Animal {
  isAlive: boolean = true;
  isHealthy(): boolean {
    return this.isAlive;
  }
}

abstract class Mammal extends Animal {
  temperature: number;
  constructor(t: number) {
    super();
    this.temperature = t;
  };
  abstract isInFever(): boolean;
  isHealthy(): boolean {
    return super.isHealthy() && this.isInFever();
  }
}

class CanWalk extends Animal{
  walk(): void {
    super.isHealthy(); // 将调用 Animal 而非 Mammal 中的方法
  }
}

class Cat extends Mammal {
  constructor() {
    super(38.2)
  }
  isInFever(): boolean { }
}

applyMixin(Dov, [CanWalk]);
```

这个方案有很多问题：

1. 只能混入方法而不能混入成员变量：由于混入的源和目标都是 prototype，所以 Mixin 类中的成员变量无法被混入。
2. 编译器无法知道被 Mixin 后，派生类上多出了哪些方法，不管是在 Dove 内部还是在 Dov 的实例上，都无法访问到 Mixin 中的方法。
3. 其次，Mixin 类内部的 `super` 关键字无法正确地指向正确的基类，如这个例子中，`CanWalk#walk` 方法被混入 `Cat` 后，其中的 super 仍然指向的是 `Animal` 而不是 `Mammal`。

因此，官方给出的解决方案使用的场景是较为简单、有限的。如果要完成 Dart 中的 Mixin 所作的工作，需要进行重新设计。

我们知道，TypeScript 的「编译」过程其实只是做了类型检查，并没有做什么真正有意义的预处理（比如宏替换），所以将 Mixin 类中的成员混入到目标派生类的这项工作，仍然需要在运行时完成。下面直接给出我解决方案：

```typescript
type ClassType<T> = { new(...args: any): T };

interface CanWalkInterface {
  walk(): void;
}

function mixCanWalk<T extends Animal>(
  TargetClass: ClassType<Animal>
): ClassType<T & CanWalkInterface> {

  class CanWalkAnimal extends TargetClass implements CanWalkInterface {
    walk() {
      if (super.isHealthy()) {
        console.log('Walking as usual.');
      } else {
        console.log('Walking slowly.');
      }
    }
  }

  Object.defineProperty(CanWalkAnimal.prototype.constructor, 'name', {
    value: TargetClass.prototype.constructor.name
  });

  return CanWalkAnimal as any;
}
```

定义一个泛型函数 `mixCanWalk`，接收一个泛型参数和一个实际参数。虽然这样做显得冗余，但确实是必须的。泛型类型 `ClassType` 通过接收一个 `Class` 返回此 `Class` **自身**（而非实例）的类型。然后，我们声明一个借口 `CanWalkInterface`，以描述被混入的方法。

在 `mixCanWalk` 中，基于传入的 `TargetClass`（**类类型的实例**，而非类的实例）派生出一个新类，在其中实现 `walk` 方法，最后将新的派生类返回。

> 返回之前，更改派生类的 `prototype.constructor` 的 `name`，可以使此派生类保持原有的名字，改善调试时代码的可读性。

此方案的用法如下所示：

```
class Cat extends mixCanWalk<Mammal>(Mammal as ClassType<Mammal>) {
  constructor() {
    super(Cat.ST_TEMPERATURE)
  }
  isInFever(): boolean {
    return this.temperature - Cat.ST_TEMPERATURE > 1;
  }
  walk() {
    if (this.isAlive) {
      super.walk();
      console.log('Walking quietly.');
    }
  }
  static ST_TEMPERATURE: number = 38;
}
```

可见，在此方案下，通过泛型指定返回的类型，使编译器能够得知被混入成员的类型、签名；Mixin 类可通过 `super` 访问到基类的成员，被混入的派生类也可通过 `super` 访问 Mixin 类的成员。基本满足了 Dart 中 Mixin 的特性。

同时，这个方案还有两处瑕疵：

1. Mix 函数（例子中的`mixCanWalk`）返回时需要使用 `as any` 进行一次类型断言，这是因为 TargetClass 的具体类型无法在运行时使用。
2. 调用使用 Mix 函数时，如果传入的类是抽象类（比如例子中的 `Mammal` 即是抽象类），也需要用 `as any` 进行一次断言。因为抽象类是无法被实例化的，严格来说是不符合 `ClassType<T>` 的表述的。

以上即是类 Dart 风格的 TypeScript Mixin 方案。