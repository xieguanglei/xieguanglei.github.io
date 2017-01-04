# 写可读代码的实践

编写**可读**的代码，对于以代码谋生的程序员而言，是一件极为重要的事。从某种角度来说，代码最重要的功能是**能够被阅读**，其次才是**能够被正确执行**。一段无法正确执行的代码，也许会使项目延期几天，但它造成的危害只是暂时和轻微的，毕竟这种代码无法通过测试并影响最终的产品；但是，一段能够正确执行，但缺乏条理、难以阅读的代码，它造成的危害却是深远和广泛的：这种代码会提高产品后续迭代和维护的成本，影响产品的稳定，破坏团队的团结（雾），除非我们花费数倍于编写这段代码的时间和精力，来消除它对项目造成的负面影响。

在最近的工作和业余生活中，我对「如何写出可读的代码」这个问题颇有一些具体的体会，不妨记录下来吧。

> JavaScript 是动态和弱类型的语言，使用起来比较「轻松随意」，在 IE6 时代，轻松随意的习惯确实不是什么大问题，反而能节省时间，提高出活儿的速度。但是，随着当下前端技术的快速发展，前端项目规模的不断膨胀，以往那种轻松随意的编码习惯，已经成为项目推进的一大阻力。

> 这篇文章讨论的是 ES6/7 代码，不仅因为 ES6/7 已经在大部分场合替代了 JavaScript，还因为 ES6/7 中的很多特性也能帮助我们改善代码的可读性。

## 变量命名

变量命名是编写可读代码的基础。只有变量被赋予了一个合适的名字，才能表达出它在环境中的意义。

缺乏经验的程序员们常常会写出名为 `getData` 的方法，这个命名实在太令人哭笑不得了。面对这样一个名字，我完全无法猜测这个函数会做出些什么事情。如果这个函数的名字是 `fetchUserInfoAsync`，那就好多了。阅读代码的人就知道，这个函数大约会远程地获取用户信息，而且通过 Async 尾缀，甚至能猜出这个函数会接收一个 callback 参数或返回一个 Promise 对象。

### 命名的基础

通常，我们使用名词来命名对象，使用动词来命名函数。比如：

`monkey.eat(banana)  // the money eats a banana` 

或者：

`const apple = pick(tree)  // pick an apple from the tree`

这两段代码与自然语言（右侧的注释）很接近，即使完全不了解编程的人也能看懂大概。

有时候，我们需要表示某种集合概念，比如数组或哈希对象。这时可以通过名词的复数形式来表示，比如用 `bananas` 表示一个数组，这个数组的每一项都是一个 `banana`。如果需要特别强调这种集合的形式，也可以加上 `List` 或 `Map` 后缀来显式表示出来，比如用 `bananaList` 表示数组。

> 有些单词的复数形式和单数形式相同，有些不可数的单词没有复数形式（比如 data，information），这时我也会使用 `List` 等后缀来表示集合概念。

### 命名的上下文

变量都是处在**上下文**（作用域）之内，变量的命名应与上下文相契合，同一个变量，在不同的上下文中，命名可以不同。举个例子，假设我们的程序需要管理一个动物园，程序的代码里有一个名为 `feedAnimals` 的函数来喂食动物园中的所有动物：

```
function feedAnimals(food, animals){
  // ...
  // 喂猴子：香蕉是限量供应的，桃子则不限量供应
  const {bananas, peaches} = food;
  const {monkey} = animals;
  const banana = bananas.unshift();
  if(banana){
    monkey.eat(banana);
  } else {
    const peach = peaches.unshift();
    monkey.eat(peach);
  }
}
```

负责喂食动物的函数 `feedAnimals` 的主要逻辑就是：用各种食物把动物园里的各种动物喂饱。也许，每种动物能接受的食物种类不同，也许，我们需要根据各种食物的库存来决定每种动物最终分到的食物，总之在这个上下文中，我们需要关心食物的种类，所以传给 `money.eat` 方法的实参对象命名为 `banana` 或者 `peach`，代码很清楚地表达出了它的关键逻辑：「猴子要么吃香蕉，要么吃桃子（如果没有香蕉了）」。我们肯定不会这样写：

```
// 我们不会这样写
const food = bananas.unshift();
if(food){
  monkey.eat(food);
} else {
  const food = peaches.unshift();
  monkey.eat(food);
}
```

`Monkey#eat` 方法内部就不一样了，这个方法很可能是下面这样的（假设 `eat` 是 `Monkey` 的基类 `Animal` 的方法）：

```
class Animal{
  // ...
  eat(food){
    this.hunger -= food.energy;
  }
}
```

如代码所示，这个方法核心逻辑就是根据食物的能量来减少动物（猴子）自身的饥饿度，至于究竟是吃了桃子还是香蕉，我们不关心，所以在这个方法的上下文中，我们直接将表示食物的函数形参命名为 `food`。

### 严格遵循一种命名规范的收益

如果你能够时刻按照某种严格的规则来命名变量和函数，还能带来一个潜在的好处，那就是你再也不用**记住**哪些之前命名过（甚至其他人命名过）的变量或函数了。特定上下文中的特定含义只有一种命名方式，也就是说，只有一个名字。比如，「获取用户信息」这个概念，就叫作 `fetchUserInfomation`，不管是在早晨还是傍晚，不管你是在公司还是家中，你都会将它命名为 `fetchUserInfomation` 而不是 `getUserData`。那么当你需要使用这个变量时，就不用翻阅其他代码文件，或者依赖 IDE 的代码提示功能，你只需要再**命名**一下「获取用户信息」这个概念，就可以得到 `fetchUserInfomation` 了，是不是很酷？

## 分支结构

分支是代码里最常见的结构，一段结构清晰的代码单元应当是像二叉树一样，呈现下面的结构。

```
if (condition1) {
  if (condition2) {
    ...
  } else {
    ...
  }
} else {
  if (condition3) {
    ...
  } else {
    ...
  }
}
```

这种优美的结构能够帮助我们在大脑中迅速绘制一张图，便于我们在脑海中模拟代码的执行。但是，我们大多数人都不会遵循上面这样的结构来写分支代码。以下是一些常见的，在我看来可读性比较差的分支语句的写法：

### 不好的做法：在分支中 return

```
function foo(){
  if(condition){
    // 分支1的逻辑
    return;
  }
  // 分支2的逻辑
}
```

这种分支代码很常见，而且往往分支2的逻辑是先写的，也是函数的主要逻辑，分支1是后来对函数进行修补的过程中产生的。这种分支代码有一个很致命的问题，那就是，如果读者没有注意到分支1中的 `return`（我敢保证，在使用 IDE 把代码折叠起来后，没人能第一时间注意到这个 `return`），就不会意识到后面一段代码（分支 2）是有可能不会执行的。我的建议是，把分支2放到一个 `else` 语句块中，代码就会清晰可读很多：

```
function foo(){
  if(condition){
    // 分支 1 的逻辑
  } else {
    // 分支 2 的逻辑
  }
}
```

> 如果某个分支是空的，我也倾向于留下一个空行，这个空行明确地告诉代码的读者，如果走到这个 `else`，我什么都不会做。如果你不告诉读者，读者就会产生怀疑，并尝试自己去弄明白。

#### 不好的做法：多个条件复合

```
if (condition1 && condition2 && condition3) {
  // 分支1：做一些事情
} else {
  // 分支2：其他的事情
}
```

这种代码也很常见：在若干条件同时满足（或有任一满足）的时候做一些主要的事情（分支1，也就是函数的主逻辑），否则就做一些次要的事情（分支2，比如抛异常，输出日志等）。虽然写代码的人知道什么是主要的事情，什么是次要的事情，但是代码的读者并不知道。读者遇到这种代码，就会产生困惑：分支2到底对应了什么条件？

在上面这段代码中，三种条件只要任意一个不成立就会执行到分支2，但这其实**本质**上是多个分支：1)条件1不满足，2)条件1满足而条件2不满足，3)条件1和2都满足而条件3不满足。如果我们笼统地使用同一段代码来处理多个分支，那么就会增加阅读者阅读分支2时的负担（需要考虑多个情况）。更可怕的是，如果后面需要增加一些额外的逻辑（比如，在条件1成立且条件2不成立的时候多输出一条日志），整个 `if-else` 都可能需要重构。

对这种场景，我通常这样写：

```
if(condition1){
  if(condition2){
    // 分支1：做一些事情
  }else{
    // 分支2：其他的事情
  }
}else{
  // 分支3：其他的事情
}
```

即使分支2和分支3是完全一样的，我也认为有必要将其分开。虽然多了几行代码，收益却是很客观的。

> 万事非绝对。对于一种情况，我不反对将多个条件复合起来，那就是当被复合的多个条件联系十分紧密的时候，比如 `if(foo && foo.bar)`。

#### 不好的做法：使用分支改变环境

```
let foo = someValue;
if(condition){
  foo = doSomethingTofoo(foo);
}
// 继续使用 foo 做一些事情
```

这种风格的代码很容易出现在那些屡经修补的代码文件中，很可能一开始是没有这个 `if` 代码块的，后来发现了一个 bug，于是加上了这个 `if` 代码块，在某些条件下对 `foo` 做一些特殊的处理。如果你希望项目在迭代过程中，风险越积越高，那么这个习惯绝对算得上「最佳实践」了。

事实上，这样的「补丁」积累起来，很快就会摧毁代码的可读性和可维护性。怎么说呢？当我们在写下上面这段代码中的 `if` 分支以试图修复 bug 的时候，我们内心存在这样一个假设：我们是**知道**程序在执行到这一行时，`foo` 什么样子的；但事实是，我们根本**不知道**，因为在这一行之前，`foo` 很可能已经被另一个人所写的尝试修复另一个 bug 的另一个 if 分支所篡改了。所以，当代码出现问题的时候，我们应当完整地审视一段独立的功能代码（通常是一个函数），并且多花一点时间来修复他，比如：

```
const foo = condition ? doSomethingToFoo(someValue) : someValue;
```

我们看到，很多风险都是在项目快速迭代的过程中积累下来的。为了「快速」迭代，在添加功能代码的时候，我们有时候连函数这个最小单元的都不去了解，仅仅着眼于自己插入的那几行，希望在那几行中解决/hack掉所有问题，这是十分不可取的。

我认为，项目的迭代再快，其代码质量和可读性都应当有一个底线。这个底线是，当我们在修改代码的时候，应当**完整了解当前修改的这个函数的逻辑**，然后**修改这个函数**，以达到添加功能的目的。注意，这里的「修改一个函数」和「在函数某个位置添加几行代码」是不同的，在「修改一个函数」的时候，为了保证函数功能独立，逻辑清晰，不应该畏惧在这个函数的任意位置增删代码。

## 函数

### 函数只做一件事情

有时，我们会自作聪明地写出一些很「通用」的函数，通过约定一些看上去很「简单」的参数规则来决定函数内部的逻辑。比如，下面这样一个获取用户信息的函数 `fetchUserInfo`，当传一个字符串类型的用户ID时，函数返回获得的用户数据；而传入一个数组，其中每一项是一个用户ID时，函数也返回一个数组，每一项是对应的用户数据。

```
async function fetchUserInfo(id){
  const isSingle = typeof idList === 'string';
  const idList = isSingle ? [id] : id;
  const result = await request.post('/api/userInfo', {idList});
  return isSingle ? result[0] : result;
}

// 可以这样调用
const userList = await fetchUserInfo(['1011', '1013']);
// 也可以这样调用
const user = await fetchUserInfo('1017');
```

这个函数其实能够做两件事情：1)获取多个用户的数据列表；2)获取单个用户的数据。在项目的其他地方调用 `fetchUserInfo` 函数时，也许我们确实能感到「方便」了一些。但是，代码的读者并不了解背后的「潜规则」，当他发现调用 `fetchUserInfo` 函数时可以传单个用户ID，也可以传用户ID列表，那么他也许就会猜测或实验该函数也许还能接收什么其他形式的参数，或者需要去翻阅函数的定义来验证自己的猜想，这对读者而言是不小的负担。

遵循「一个函数只做一件事」的原则，我们可以将上述代码拆成两个函数`fetchMultipleUserInfo` 和 `fetchMultipleUserInfo`，在项目的其他地方需要获取用户数据时，选择调用其中的一个函数。

```
async function fetchMultipleUserInfo(idList){
  const params = {
    type: 'GET',
    url: 'api.userInfo',
    payload: {idList}
  }
  return await request(params);
}

async function fetchSingleUserInfo(id){
  return await fetchMultipleUserInfo([id])[0];
}
```

上述改良不仅改善了代码的可读性，也改善了可维护性。举个例子，假设随着项目的迭代，获取单一用户信息的需求也许不存在了。

* 如果是改良前，我们会删掉那些「传入单个用户ID来调用 `fetchUserInfo`」的代码，同时保留剩下的那些「传入多个用户ID调用 `fetchUserInfo`」的代码， 但是 `fetchUserInfo` 函数几乎一定不会被更改。这样，函数内部 `isSingle` 为 `true` 的分支，就留在了代码中，成了永远都不会执行的「脏代码」，无时无刻不在干扰着维护者的心思，耗费着维护者的精力。
* 对于改良后的代码，IDE 能够轻松检测到 `fetchSingleUserInfo` 已经不会被调用了，我们可以轻松地直接删掉这个函数。

现实的困难在于，如何界定某个函数做的是不是**一件事情**？我的经验是这样：如果一个函数的参数仅仅包含**输入数据（交给函数处理的数据）**，而没有混杂或暗含有**指令数据（以某种约定的方式告诉函数该怎么处理数据）**，那么函数所做的应当就是**一件事**。比如说，改良前的 `fetchUserInfo` 函数的参数是「多个用户的ID数组或单个用户的ID」，而改良后的 `fetchMultipleUserInfo` 函数的参数则是「多个用户的ID数组」：前者的「或」字就暗含了指令，而后者就是纯粹的数据。

### 函数应适当地处理异常

有时候，我们会陷入一种很不好的习惯中，那就是，总是去尝试写出永远不会报错的函数。我们会给参数配上默认值，在很多地方使用 `||` 或者 `&&` 来避免代码运行出错，仿佛如果你的函数会报错会成为一种耻辱似的。更可怕的是，当我们尝试去修复一个运行时报错的函数时，我们会倾向于在报错的那一行添加一些兼容逻辑来避免报错。比如：

```
async function getUserDetail(id){
  const user = await fetchSingleUserInfo(id);
  user.favoriteBooks = (await fetchUserFavorits(id)).books;
  // 上面这一行报错了：Can not read property 'books' of undefined.
  user.familyMembers = ...
  return user;
}
```

有时候，fetchUserFavorites(id) 不会返回任何东西，那么读取其返回值的 `books` 属性自然就会报错。为了修复该问题，我们可能会这样做。

```
const favorites = await fetchUserFavorits(id);
user.favoriteBooks = favorites && favorites.books;
// 这下不会报错了
```

这样做看似解决了问题：的确，`getUserDetail` 不会再报错了，但这么做实际上埋下了更深的隐患。

当 `fetchUserFavorites` 返回 `undefined` 时，程序已经处于一种异常状态了，我们不应该放任程序继续运行下去。试想，如果后面的某个时刻（比如用户点击了「我收藏的书」选项卡），程序试图遍历 `user.favoriteBooks` 属性（它被赋值成了`undefined`），那时也会报错，而且排查起来会更加困难。

如何处理上述的情况呢？

如果 `fetchUserFavorits` 与（我们正在讨论的）`getUserDetail` 属于同一个模块，那么 getUserDetail 对此报错真的没什么责任，因为 `fetchUserFavorits` 就不应该返回 `undefined`，我们应该去修复 `fetchUserFavorits`，当获取失败时显式地告知出来，比如返回一个 `{success:false, error: '获取失败'}` 对象，如下所示：

```
// 如果认为获取不到收藏数据不算致命的错误
const result = await fetchUserFavorits(id);
if(result.success){
  user.favoriteBooks = result.data.books;
} else {
  user.favoriteBooks = []
}
```

或者直接抛出异常：

```
user.favoriteBooks = (await fetchUserFavorits(id)).books;
// `getUserDetail` 不需要改动，`fetchUserFavorits` 抛出的异常会进一步向调用栈上层流动
```

如果 `fetchUserFavorits` 与（我们正在讨论的）`getUserDetail` 不属于同一个模块，比如前者是由另外一个人维护的。那么你就该为选择了这样一个不可靠的模块负责，在 `getUserDetail` 中增加一些「擦屁股」代码，来避免你的项目的**其他部分**受到侵害。

```
const favorites = await fetchUserFavorits(id);
if(favorites){
  user.favoriteBooks = favorites.books;
} else {
  throw new Error('获取用户收藏失败');
}
```

### 控制函数的副作用

我理解的无副作用的函数，是**不依赖上下文**，也**不改变上下文**的函数。在 JavaScript 中，我们已经习惯了去写「有副作用的函数」，毕竟我们需要通过副作用去操作环境的 API，来完成我们的任务。但是，很多场合我们是可以用纯粹的，无副作用的函数来完成任务，我们也会不自觉地采取有副作用的方式。比如，我们需要编写一个获取用户详情的函数，它要返回一个完整的用户信息对象：不仅包含ID，名字等基本信息，也包含注入「收藏的书籍」等通过额外接口返回的详细信息。虽然看上去可笑，但我们有时候就会写出下面这样的代码：

```
async function getUserDetail(id){
  const user = await fetchSingleUserInfo(id);
  await addFavoritesToUser(user);
  return user;
}
async function addFavoritesToUser(user){
  const result = await fetchUserFavorits(user.id);
  user.favoriteBooks = result.books;
  user.favoriteSongs = result.songs;
  if(result.songs.length > 100){
    user.isMusicFan = true;
  }
}
```

上面，`addFavoritesToUser` 函数就是一个「有副作用」的函数，它改变了 `users`，给它新增了几个个字段。然而，在 `getUserData` 函数中却丝毫看不出来，读者不知道，user 会发生怎样的改变。

一个无副作用的函数应该是这样的：

```
async function getUserDetail(id){
  const user = await fetchSingleUserInfo(id);
  const {books, songs, isMusicFan} = await getUserFavorites(id);
  return Object.assign(user, {books, songs, isMusicFan})
}
async function getUserFavorites(id){
  const {books, songs} = await fetchUserFavorits(user.id);
  return {
    books, songs, isMusicFan: result.songs.length > 100
  }
}
```

### 非侵入性地改造函数

函数是一段独立和内聚的逻辑。在产品迭代的过程中，我们有时候不得不去修改函数的逻辑，为其添加一些新特性。之前我们也说过，一个函数只应做一件事，如果我们需要添加的新特性，与原先函数中的逻辑没有什么联系，那么决定是否通过**改造这个函数**来添加新功能，应当格外谨慎。

举个例子，假设项目中有一个函数用来向服务器查询用户数据：

```
const fetchUserInfoAsync = (userId, callback) => {
  const param = {
    url: SERVER_URL,
    method: 'get',
    payload: {id: userId}
  };
  request(param, callback);
}
```

假设现在需要为 fetchUserInfoAsync 函数作一层缓存处理，如果第二次请求同一个 userId 的用户信息，就不再重新向服务器请求，直接以第一次请求得到的数据返回。快捷简单的解决方案如下所示，改造这个函数只需要五分钟时间：

```
const userInfoMap = {};
const fetchUserInfoAsync = (userId, callback) => {
  if(userInfoMap[userId]){
    callback(userInfoMap[userId]);
  }else{
    const param = {
      // ... 参数
    };
    request(param, (result)=>{
      userInfoMap[userId] = result;
      callback(result);
    });
  }
}
```

但是，经此改造，这个函数的可读性已经明显降低。实际上，「缓存」和「获取用户数据」完全是独立的两件事情。我提出的方式如下所示（虽然也许需要十五分钟）：

```
const memorizeThunk = (func, reducer) => {
  const cache = {};
  return (...args, callback) => {
    const key = reducer(...args);
    if(cache[key]){
      callback(...cache[key]);
    }else{
      func(...args, (...result)=>{
        cache[key] = result;
        callback(...result);
      })
    }
  }
}
const fetchUserInfoAsync = (userInfo, callback) => {
  // 原来的逻辑
}
const fetchUserInfoAsyncWithCache = memorize(fetchUserInfoAsync, (userId)=>userId);
```

试想一下，如果某个时候，我们又不需要缓存功能了，修改代码的负担是怎样的？显然第二种比第一种要方便很多。不是吗？

## 类的结构

### 避免滥用成员函数

在编写类的时候，我们经常会忍不住地编写很多没必要的成员函数。比如，当类的某个成员函数的逻辑有点复杂了，行数有点多了，就会将其中的一块「独立」的逻辑拆出来，成为类的另一个成员函数。比如：

```
class UserList extends React.Component{
  chunk = (users) => ...
  
  render(){
    // 因为需要把用户两两并列，显示为一排
    // 所以要将 ['张三', '李四', '王二', '麻子'] 转化为 [['张三', '李四'], ['王二', '麻子']]
    const chunks = this.chunk(this.props.users);
    return (
      <div>
        {chunks.map(users=>
          <row>
            {users.map(user => 
              <col><UserItem user={user}></col>
            )}
          </row>
        )}
      </div>
    )
  }
}
```

如上述代码所示，`UserList` 组件按照「两个一行」的方式来显示用户列表，所以需要先将用户列表进行组合。进行组合的工作这件事情看上去是比较独立的，所以我们往往会将 `chunk` 实现成 `UserList` 的一个成员函数，在 render 中调用它。

我认为这样做并不可取，因为 chunk 只会被 render 所调用，仅仅服务于 render。阅读这个类源码的时候，读者其实只需要在 render 中去了解 chunk 函数就够了。然而 chunk 以成员函数的形式出现，扩大了它的可用范围，提前把自己曝光给了读者，反而会造成干扰。

我的建议是将 chunk 定义在 render 中，如下所示。

```
render(){
  const chunk = (users) => ...
  const chunks = this.chunk(this.props.users);
  return (
    <div>
  ...
}
```

这样虽然函数的行数可能会比较多，但将代码折叠起来后，函数的逻辑则会非常清楚。实际上，在「计算函数的代码行数」这个问题上，我会把内部定义的函数视为一行，因为函数对读者可以是黑盒，它的负担只有一行。

## 总结

伟大的文学作品都是建立在废纸堆上的，不断删改作品的过程有助于写作者培养良好的「语感」。当然，代码毕竟不是艺术品，程序员没有精力也不一定有必要像作家一样反复**打磨**自己的代码/作品。但是，如果我们能够在编写代码时稍稍多考虑一下实现的合理性，或者在添加新功能的时候稍稍回顾一下之前的实现，我们就能够培养出一些「代码语感」。这种「代码语感」会非常有助于我们写出高质量的可读的代码。
