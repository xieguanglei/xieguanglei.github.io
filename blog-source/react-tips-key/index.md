# React 实践心得：key 属性的原理和用法

我们知道，React 元素可以具有一个特殊的属性 key，这个属性不是给用户自己用的，而是给 React 自己用的。如果我们动态地创建 React 元素，而且 React 元素内包含数量或顺序不确定的子元素时，我们就需要提供 key 这个特殊的属性。

如果你有下面这样的代码：

```jsx
const UserList = props => (
  <div>
    <h3>用户列表</h3>
    {props.users.map(u => <div>{u.id}:{u.name}</div>)}  // 没有提供 key
  </div>
);
```

React 会在控制台打印出报警信息：

> Warning: Each child in an array or iterator should have a unique "key" prop. Check the render method of `App`. See https://fb.me/react-warning-keys for more information.

你必须为数组中的元素提供唯一的 `key` 属性，就像下面这样：

```jsx
const UserList = props => (
  <div>
    <h3>用户列表</h3>
    {props.users.map(u => <div key={u.id}>{u.id}:{u.name}</div>)}  // 提供了 key
  </div>
);
```

为什么呢？我们知道当组件的属性发生了变化，其 render 方法会被重新调用，组件会被重新渲染。比如 UserList 组件的 users 属性改变了，就得重新渲染 UserList 组件，包括外部的 `<div>`（容器），内部的一个 `<h3>` 和若干个 `<div>`（每一个描述一个用户）。

对后一种 `<div>`（表示用户的），由于其处在一个长度不确定的数组中，React 需要判断，对数组中的每一项，到底是新建一个元素加入到页面中，还是更新原来的元素。比如以下几种情况：

* `[{name: '张三', age: 20}]` => `[{name: '张三', age: 21}]`：这种情况明显只需要更新元素，没有必要重新创建元素。因为人还是那个人，除了 age，其他信息没有变，显示用户姓名的那个（更小的）元素，是不需要更新（被 ReactDOM 操作到）的。
* `[{name: '张三'}]` => `[{name: '张三'}, {name: '李四'}]` 这种情况，显然需要添加一个新元素来表示李四，这个新元素对应的 DOM 元素会被插入到页面中。
* `[{name: '张三'}]` => `[{name: '李四'}]`：这种情况就有点复杂了，似乎两种方案都可以。可以把表示张三的元素删掉，为李四新建一个，当然是非常合理的选择。但是直接把张三的元素换成李四，似乎也无不可。

实际上，如果真的认为上述第3种的后一种方案也无不可，那可是大错特错了。为什么呢：

* 如果元素是有状态的，比如在 `componentDidMount` 后要去发个请求，获取一些关于张三的更详细的信息，那么当我们更新元素，把 user 从张三换成李四的时候，是不会触发 `componentDidMount` 的，你也许就需要在 `componentWillReceiveProps` 之类的方法里去做更晦涩的操作。
* 考虑这种情况：`[{name: '张三'}, {name: '李四'}]` => `[{name: '李四'}, {name: '张三'}]`，难道也需要把张三的元素更新成李四的，李四的元素更新成张三的吗？

那么，为数组中的元素传一个唯一的 key（比如用户的 ID），就很好地解决了这个问题。React 比较更新前后的元素 key 值，如果相同则更新，如果不同则销毁之前的，重新创建一个元素。

那么，为什么只有数组中的元素需要有唯一的 key，而其他的元素（比如上面的`<h3>用户列表</h3>`）则不需要呢？答案是：React 有能力辨别出，更新前后元素的对应关系。这一点，也许直接看 JSX 不够明显，看 Babel 转换后的 React.createElement 则清晰很多：

```jsx
// 转换前
const element = (
  <div>
    <h3>example</h3>
    {[<p key={1}>hello</p>, <p key={2}>world</p>]}
  </div>
);

// 转换后
"use strict";

var element = React.createElement(
  "div",
  null,
  React.createElement("h3",null,"example"),
  [
    React.createElement("p",{ key: 1 },"hello"), 
    React.createElement("p",{ key: 2 },"world")
  ]
);
```

不管 props 如何变化，数组外的每个元素始终出现在 React.createElement() 参数列表中的固定位置，这个位置就是天然的 key。

> 题外话

> 初学 React 时还容易产生另一个困惑，那就是为什么 JSX 不支持 if 表达式来有选择地输出（不能这样：`{if(yes){ <div {...props}/> }}`），而必须采用三元运算符来完成这项工作（必须这样：`{yes ? <div {...props}/>} : null`）。那是因为，React 需要一个 null 去占住那个元素本来的位置。

曾经，我天真的以为 key 这个元素只应在数组中使用。直到我在一个复杂的项目中写出了及其恶心的 `componentWillReceiveProps`方法（那个组件不在数组中）。我尝试寻找销毁和重建组件，触发 componentDidMount 方法，重置 state，然后才突然发现 key 这个属性已经在那里了。

我想说：**为了组件内部逻辑的清晰，你几乎应该在任何复杂的有状态组件（尤其是有具体对应对象的）上使用`key`属性，**这样做，才能在合适的时候触发组件的销毁与重建，还给组件一个健康的生命周期。

（完）