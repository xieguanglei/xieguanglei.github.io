# C 语言快速复习笔记

大学里学过 C 语言，但是挺久没用过了。最近时不时要用到 C 或阅读 C 和 C++ 代码，但是写惯了 JavaScript，一下子不太习惯。于是我决定稍微复习一下 C 语言和 C++。

> 一开始，我是想重看一遍《C 程序语言设计》这本书的，看了几章觉得看书和做题的进度比较慢（而且这本书的习题很多其实是算法题，不是很适合快速复习语法的情形）。后来，我发现了一个复习知识的好方法：先找一张纸，把自己对这个领域理解的最小可用集合（MVP）逐条写出来，然后把自己不太清楚的问题着重标出来，有针对地去查找、实验这些点。这个方法挺奏效的，速度快多了。复习过程中记录了一些笔记，稍微整理一下备忘。
> 我使用 XCode 作为复习 C 语言的主要工具，所有代码和运行结果都是在 XCode 10.2.1 上运行得出的。

## Hello World

1. 打印 `Hello World` 就需要引入依赖，<stdio.h> 为标准 IO 库的头文件。
2. `printf` 方法在标准输出（命令行）打印消息。

```c
#include <stdio.h>

int main() {
    printf("Hello World!\n");
    return 0;
}
```

## 基础类型

C 语言中的基础类型包括：

* 数值类型：
  * 整型数：(unsigned) int (4 bytes)、(unsigned) short (2 bytes)、(unsigned) long (8 bytes)
  * 浮点数：float (4 bytes)、double (8 bytes)
* 字符类型：char (1 byte)

所有的类型均有默认初始值（0，0.0 和 '\0'），当你定义一个变量时，若不赋一个初始值，此变量为默认初始值。

C 语言中没有布尔类型的值，一般用整型数值类型表示，0 为 false，非 0 为 true。

> 类型变量所占的字节数是不同编译器的实现带来的事实标准，C 语言规范只规定了一些约束。

### 类型转换

1. 显式地进行类型转换。
    1. 数值转换会进行换算（整型数 2 转换为浮点数 2.0，位存储完全改变）。
    2. 数值与字符之间的转换是直接，因为字符实质上就是一个字节，所以直接处理最后一个字节。

```c
int a = 109;
float b = (float)a; // b is 109.00
char c = (char)a;   // c is 'm'
```

## 标准库（入门）

`printf` 方法来自标准库，此函数支持以模板字符串的方式打印消息，是 C 语言编写的程序向外输出消息的最直接通道。

```c
printf("%d\n", 127);        // 127
printf("%o\n", 177);        // 177  八进制
printf("%x\n", 177);        // b1   十六进制
printf("%f\n", 314.15);     // 314.159000
printf("%.2f\n", 314.15);   // 314.15 指定精度
printf("%e\n", 314.15);     // 3.141590e+02
printf("%c\n", 'c');        // c
printf("%s\n", "hello");    // hello
```

> 转字符：`\n` 表示换行，类似常用的还有 `\t`（制表），`\\`（反斜杠），`\'` 和 `\"`（引号），[完整的转义字符表](https://en.wikipedia.org/wiki/Escape_sequences_in_C)。

## 编译和运行（入门）

编译：将源码编译为可执行文件（在 linux 下默认以 out 为后缀名）；
运行：执行

### GCC

最原始的编译方法是直接调用 gcc（Mac 或 Linux 下应该自带了）；

```bash
> gcc helloworld.c -o a.out
```

此时会在当前目录下生成新的可执行文件 `a.out`（后缀名是可选的），然后执行 `a.out`：

```bash
> ./a.out
Hello World!
```

### XCode

新建项目：

1. 打开 XCode -> New -> Project
2. 选择项目类型： CommandLine Tool（命令行工具）
3. 选择语言类型：C
4. 填写项目名称，点击「下一步」，即创建了 C 命令行工具

编译：

菜单项 Product -> Build，编译构建。构建产物可执行文件放在 XCode 资源目录中，可以在左侧 TOC 部分的 Products Group 下看到，可以 cd 到彼目录下，或将可执行文件拷贝出来运行。

编译和运行：

直接点击三角形的「播放」按钮，可编译并直接运行，还可以方便地打断点调试。

### 其他选择

桌面平台的应用各集成环境， Visual Studio 或 XCode；跨平台或打包为三方包通常选择 CMake。

## 数组

1. 使用方括号定义数组类型
2. 数组必须有长度
    1. 人为指定长度，如 `int i[3]`
    2. 根据初始化的值推测长度，如 `int i[] = {1,2,3}`，数组字面量有大括号括起来（写惯了 JavaScript 很容易犯错）。
3. 即使不显式初始化，也会进行默认的隐式初始化操作，所以 `int i[3]` 相当于 `int i[] = {0,0,0}`。
4. 用方括号加下标的方式访问数组元素。

```c
int i[3] = {1, 2, 3};
i[2] = 4;
printf("%d\n", i[2]);
```

> 习惯了 JavaScript 中的数组，可能一开始比较难使用 C 中更接近底层的数组。其实 JavaScript 更接近 C++ 中的 Vector 的指针。C 的数组是不能被「赋值的」，你不能 `int a[3]; int b[] = a;`（其实应该这样：`int a[3]; int *b = a;`），这些疑惑等复习到指针相关的章节就解了。

## 字符串

1. 字符串就是字符数组；
2. 字符串的字符数组的长度通常比较大，能够容纳足够多的字符；
3. 字符串本身的逻辑意义上的长度，取决于字符数组中第一个值为 `\0` 的元素的位置。
4. 字符数组初始化时，可以使用双引号括起来的字符串字面量。

```c
char p[] = "hello";
printf("%s\n", p); // hello
```

> 上面这种初始化字符串的方法，我理解成一种语法糖，其背后相当于 `char p[] = {'h','e','l','l','o','\0'};`。

## 分支和循环

分支体与循环体的写法和 JavaScript 几乎完全一样。

### 分支

`if else` 分支：

```c
int i = 1;
if(i){
  printf("i is not 0;\n");
}else{
  printf("i is 0;\n");
}
```

`switch case` 分支：

```c
int i = 1;
switch(i){
    case 0:
        printf("i is 0;\n");
        break;
    case 1:
        printf("i is 1;\n");
        break;
    default:
        break;
}
```

### 循环

`for` 循环：

```c
// for
for(int i = 0; i < 10; i++){
  printf("i is %d\n", i);
}
```

`while` 循环：

```c
// while
int j = 0;
while(j < 10){
  j++;
}
```

`do while` 循环：

```c
int k = 0;
do{
  if(k++ > 10){
    break;
  }
}while(1);
```

## 枚举

1. 使用 `enum` 关键字声明枚举类型。
2. 直接使用 `enum` 中声明的字面量赋值给枚举类型的变量。
2. 枚举变量的本质是 `unsigned int`（占 4 个字节），按照枚举声明的顺序依次为 0，1，2 等等；比如，将不同枚举类型中，声明次序一致的值拿出来比较，是相等的（编译时会产生警告）。

```c
enum A {aa, bb};
enum B {cc, dd};

void main(){
    enum A c = aa;
    enum B d = cc;
    c == d; // true
}
```

## 结构体

1. 结构体的字面量也是用大括号括起来，值的顺序按照结构体声明中字段的顺序。如果类型不同会自动转换。
2. 用点（`.`）符号访问结构体的属性值。
3. 结构体的内存分配和数组是类似的：连续，没有间隙地为每个属性值分配一个内存。甚至可以使用指针的自增运算来从一个属性跳到另一个属性（虽然这比较危险）。

```c
struct Pair{
    int a;
    float b;
};

void main(){
    struct Pair p = {1, 2.0};
    printf("%d,%f\n", p.a, p.b);
}
```

## 函数

1. 函数需要声明返回值和参数。
2. 函数的声明和定义可以分开，声明必须在调用之前。

```c
int add(int i, int j){
    return i + j;
};

void main(){
    int sum = add(5,3);
    printf("%i\n", sum); // 8
}
```

## 指针

指针是存储变量地址的变量，可理解为一个特殊的 usigned long 类型变量。在 64 位机器上，指针占 8 个字节，在 32 位机器上，占 4 个字节。

### 基础用法

1. 指针的声明，使用星号（`*`）。
2. 从普通变量上取地址，然后赋值给指针。
3. 使用星号（`*`）引用指针指向的值，并进行读写。

```c
int v = 1;
int *vp = &v;
*vp += 1; // v 变成了 2
```

当我们不知道指针类型的时候（貌似是件常事儿？），可以用 `void *` 来指代，等到知道指针类型的时候再转回去，反正指针本身的大小是固定的嘛。

### 数组和指针

1. 指针的加减运算，含义是指针指向内存的位置发生了变化。（如 int 类型的指针的一次自增操作，表示指向内存的字节位置增加了 4。）
2. 数组分配的内存是连续的，可以将数组转换为指针（此时指针指向数组的首个元素），然后通过指针的加减运算，来使其指向不同的元素。

```c
int i[3] = {1, 2, 3};
int *p = i; // 或 int *p = &i[0];
*(p+2) = 4; // 相当于 i[2] = 4;
printf("%d\n", *(p+2)); // 相当于打印 i[2]
```

### 二维数组

二维数组，即「数组的数组」，其内存也是连续分配的，可以通过移动指针来访问二维数组中的元素。

```c
int arr[2][3] = {{1,2,3}, {4,5,6}};
int *p = arr[0];
*(p + (3 * 1) + 2) = 7;  // 相当于 arr[1][2] = 7;
printf("%d\n", arr[1][2]);
```

### 指向指针的指针

指针也是一种变量类型，自然可以被「指向指针的指针」所指。

```c
int v = 1;
int *pv = &v;
int **pp = &pv;
(**pp)++;
```

### 指向函数的指针

1. 虽然函数不是一种普通变量，但是依然可以创建指向函数的指针。在创建函数指针时需要声明函数的签名（参数和返回值），然后在函数名称上使用取地址符号（`&`）。
2. 指针可以重新指向另一个具有相同签名的函数，这正是指向函数的指针的价值。
3. 猜测，每一个函数在编译器看来都是不同的类型，分配的空间也不尽相同。无法生成「函数数组」，所以函数指针的加减运算基本没有意义。

```c
int add(int a, int b){
    return a + b;
}
int sub(int a, int b){
    return a - b;
}

int main(int argc, const char * argv[]) {
    int (*op)(int, int) = &add;
    printf("%i\n", (*op)(3, 1));
    op = &sub;
    printf("%i\n", (*op)(3, 1));
    return 0;
}
```

## 堆内存

变量，数组，函数（我猜哦），结构体，其内存都是分配在栈上的；随着程序的运行，栈上的内存可能会被频繁地调整（也是我猜的哦）。所以，我们还可以手动从堆上去获取内存，并在合适的时候手动释放之。当内存比较大的时候，性能会比在栈上要好。

1. 使用 malloc 函数（定义在 stdlib 中）获取内存，返回 `void *` 类型的指针。
2. 使用 realloc 函数重新指定内存的大小（若需扩大则从堆中重新分配一段，若需减小则回收一部分内存）；
2. 使用 free 函数释放内存（全部回收）。

```c
int *p = (int *) malloc(8);
p[0]=0; // 这样写也可以哦，和 *(p+0) 的是一样的
p[1]=1;
printf("%d\n", p[1]); // 1

p = realloc(p, 12);
p[2] = 2;
printf("%d\n", p[2]); // 2

free(p);
```

## 宏

1. 宏的预处理过程发生在编译之前，如 `#define` 宏是直接对文本进行操作，使用不当容易引起编译错误。
2. 头文件里通常使用 `#ifdef` 宏来避免重复声明。

```c
#define PI 3.14159

float c(float r){
  return 2.0 * PI * r;
}
```

## 别名

使用 `typedef` 关键字为类型（基础类型，枚举或结构体）创建别名。

```c
typedef int interger;
typedef enum {Apple, Banana} Fruit;
typedef struct { int a; float b; } Pair;

void main(){
    interger i = 1;
    Fruit fruit = Apple;
    Pair p = {1, 2.0};
}
```

## 编译（多文件）

1. C 语言不存在「入口文件」的概念，编译器也不会根据「入口文件」去解析其他的源码文件。当项目被拆分为多个文件时，需要手动将所有源文件传给编译器。
2. 当编译器接受多个文件时，似乎可以简单理解为，将这些文件 concat 起来再进行编译。对命令行工具程序，编译器会在源码中寻找 `main` 函数作为入口。
3. 对单个源码文件，如果其依赖了其他文件中的内容，需要引入头文件，在头文件中定义好全局变量、函数签名等等（就好像在使用函数前，必须事先声明函数——即使可以稍后再实现）。

比如由 `main.c`，`add.c` 和 `add.h` 组成的程序：

`main.c` 如下：

```c
// main.c
#include <stdio.h>
#include "add.h"

void main() {
    printf("%d\n", add(1,2));
}
```

`add.c` 如下：

```c
// add.c
#include "add.h"
int add(int a, int b){
    return a+b;
}
```

`add.h` 如下：

```c
#ifndef add_h
#define add_h

int add(int a, int b);

#endif
```

### GCC

GCC 编译时直接传入多个源码文件：

```bash
> gcc main.c add.c -o a.out
```

### XCode

直接将源码放在同一个 group 下，编译器会自动识别源码文件并传给编译器。

## 标准库（初级用法）

简单复习一下几个最常用的标准库操作吧：

### 读写文本文件

1. 使用 `fopen` 函数打开文件，获得文件句柄。`r` 模式为读，`a` 模式为追加写，`w` 为覆盖写。
2. 使用 `fgets` 函数从文件中读取一行，读到文件末尾时会返回 `'\0'`。
3. 使用 `fputs` 函数向文件中写一行。
4. 使用 `fclose` 函数关闭文件。

```c
#include <stdio.h>

#define MAX 10000

void main() {
    FILE *s = fopen("a.txt", "r");
    FILE *t = fopen("b.txt", "a");
    char c[MAX] = "";
    
    char *e;
    while((e = fgets(c, MAX, s)) != 0){
        fputs(c, t);
        printf("%s", c);
    }
    fclose(s);
    fclose(t);
}
```

### 字符串操作

1. 使用 `strlen` 取字符串的长度；
2. 使用 `strchr` 取某个字符第一次出现的位置（指针）；
3. 使用 `strcpy` 将一个字符串复制到另一个字符串中；
4. 使用 `strcat` 将一个字符串追加到另一个字符串中。

```c
#include <stdio.h>
#include <string.h>
#define MAX 1000

void main() {
    char s[MAX] = "hello world";
    char t[MAX] = "";
    
    int len = strlen(s); // len is 11
    char *pl = strchr(s, 'l'); // (pl-s) is 2
    strcpy(t, s); // t is "hello world"
    strcat(t, s); // t is "hello worldhello world"
}
```

## 小结

好了，我觉得我可以用 C 语言来干一些简单的小活儿了。真希望可以回到大学时光，图书馆一坐一下午，美滋滋地慢慢学 ( ∙̆ .̯ ∙̆ )。
