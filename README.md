# ChatGPT 全栈项目

这是一个基于 ChatGPT 的全栈项目，具有以下主要功能：

- 支持历史会话记录
- 支持联网查询（内置 Bing 搜索引擎）
- 支持访问特定网页

## 如何运行

### 环境要求

- Node.js
- npm 或 yarn

### 步骤

1. 克隆项目：

   ```
   git clone https://github.com/likaiqiang/chatgpt-webapp-fullstack.git
   ```

2. 启动项目：

   ```
   前端:
   client/src/config.js 配置后端 server url
   npm install
   npm start
   
   后端
   node-api .env
   npm install
   npm start
   ```
## 功能说明

### 历史会话记录

ChatGPT 会话将会被记录并存储在服务器端，以便保持连续对话。

### 联网查询

ChatGPT 具有内置的 Bing 搜索引擎，可以通过输入特定的命令触发搜索并获取相关信息。

### 访问特定网页

ChatGPT 允许用户指定特定的网页，并在客户端内直接访问该网页。

## 技术栈

- **前端**：
    - React
- **后端**：
    - Node.js


## 作者

[你的名字](https://github.com/likaiqiang)

## 许可证

[License](https://github.com/likaiqiang/chatgpt-webapp-fullstack/blob/main/LICENSE)
