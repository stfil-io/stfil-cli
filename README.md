# Welcome to stfil-cli 👋
![Version](https://img.shields.io/badge/version-1.2.2-blue.svg?cacheSeconds=2592000)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
![Node Version](https://img.shields.io/badge/node->=16.0.0-brightgreen)

> STFIL Contract Execution Tool

使用其他语言阅读：[English](./README_EN.md) | 简体中文

### 🏠 [主页](https://stfil.io)

## 本地安装

```sh
git clone https://github.com/stfil-io/stfil-cli.git
cd stfil-cli
npm install
npm link
stfil-cli -h
```

## 或直接使用

```sh
npm i @stfil/stfil-cli -g
```
## 检查是否安装成功
```sh
stfil-cli -h
```

![img.png](img.png)

### 初始化配置项目
```sh
stfil-cli init
```

### 有两种方式保存你的钱包私钥
1. 裸奔在 config.json 文件中，即使私钥经过简单加密，也不安全，但是可以快速操作。
2. 使用用户输入的私钥加密口令来加密和保存私人密钥，本机不保存加密口令，较为安全。但每次执行交易请求都需要输入额外的密码。


### 添加钱包
```sh
stfil-cli wallet add
```
### 查看钱包列表
```sh
stfil-cli wallet list
```
### 钱包详情
```sh
stfil-cli wallet info
```

### 添加借贷池
```sh
stfil-cli splp add 0xc5A520f9Ea2DB52805f570741B1E869E07f308d4
```

### 借贷池列表
```sh
stfil-cli splp list
```

### 设置默认借贷池

当存在多个借贷池时设置默认，之后节点的操作默认都使用该借贷池，也可以通过 `-p <poolAddress>` 来手动指定。

```sh
stfil-cli splp set-default
```

### 借贷池信息
```sh
stfil-cli splp info
```

### 借贷池节点信息
```sh
stfil-cli splp node info f041395
```

### 借款封装操作
浮动利率借款封装 10FIL -- 通过 `-r v` , 或者默认浮动利率，不指定借贷池则使用默认借贷池。
```sh
stfil-cli splp node sealLoan -r v -a 10 f041395 
```
稳定利率借款封装 10FIL -- 通过 `-r r`
```sh
stfil-cli splp node sealLoan -r r -a 10 f041395 
```

### 定时自动借款封装操作

简单的每分钟检查节点的可用余额是否小于你设置的值，通过`-alt 100` 表示如果节点可用余额小于100FIL，则会执行"借款封装"操作，通过 `-a 100` 表示即将借款100FIL.其余选项通过 `-h` 查看。
**借款成功后会继续检查可用余额**

例子:
当节点可用余额小于100时，借100

```sh
stfil-cli splp node autoSealLoad -alt 100 -a 100 f041395
```

### 定时自动进行可用余额还款

简单的每分钟检查节点的可用余额是否大于你设置的值，通过`-agt 100` 表示如果节点可用余额大于100FIL，则会执行"还款"操作，通过 `-a 100` 表示即将还款100FIL.其余选项通过 `-h` 查看。
**还款成功后会继续检查可用余额**


例子:
当节点可用余额大于100时，还100

```sh
stfil-cli splp node autoRepay -agt 100 -a 100 f041395
```


## Docker 安装
使用docker的方式，主要用于定时自动操作，详情查看 `Dockerfile` 文件。执行 `stfil-cli splp node autoAction --init` 命令。该命令使用交互式引导用户执行“自动借款封装”或“自动还款”功能。

```sh
git clone https://github.com/stfil-io/stfil-cli.git
cd stfil-cli
docker build -t stfil-cli .
docker run -it stfil-cli
```

当使用docker运行时，需要在启动容器的时候完成初始化操作，导入钱包，地址，选项等

当容器准备就绪并开始监听时，使用如下退出容器命令行

按 `Ctrl + P` 紧接着按 `Ctrl + Q` 即可退出容器。


容器重启操作需要重新参数化，使用以下命令

```sh
docker start -i <容器ID>
```

同样使用此命令退出容器

按 `Ctrl + P` 紧接着按 `Ctrl + Q` 即可退出容器。


查看容器运行状况
```sh
docker logs -f <容器ID>
```

## 作者

👤 **STFIL <info@stfil.io>**

* Twitter: [@stfil\_io](https://twitter.com/stfil\_io)
