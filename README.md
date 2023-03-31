# FullStack-ChatGPT-WebApp

[![GitHub license](https://flashpixel-1253674045.cos.ap-shanghai.myqcloud.com/68747470733a2f2f696d672e736869656c64732e696f2f62616467652f6c6963656e73652d4d49542d626c7565.svg)](https://github.com/frontend-engineering/chatgpt-webapp-fullstack)
![GitHub package.json dependency version (prod)](https://img.shields.io/github/package-json/dependency-version/WeixinCloud/wxcloudrun-express/express)
![GitHub package.json dependency version (prod)](https://img.shields.io/github/package-json/dependency-version/WeixinCloud/wxcloudrun-express/sequelize)


这是一个 ChatGPT 聊天应用，包含网页端App和一个Node服务，可快速部署一套自用的完整智能聊天服务（[点击体验](https://chat.webinfra.cloud)）

经过线上检验完全可以成为学习、工作和生活中的小帮手，适合感兴趣的同学自用。

后台目前接入的服务默认是ChatGPT，也同时兼容BingAI或者其他国内模型，只需Node服务配置下环境变量即可。






注意：项目启动时**唯一**需要配置的是 OpenAI 账户的 ApiKey，可以通过命令行中直接配置环境变量 `OPENAI_API_KEY`，在生成环境，建议通过 `settings.js` 来配置。

另外，如需同时配置多个ApiKey，只需要将多个key中间用 `","` 隔开即可，注意中英文切换，例如
```
OPENAI_API_KEY=sk-Ek6f5n*q7X*8I2mgH****T***F**I97ON**y*BzUpc,sk-Ek6f5n*q7X*8I2mgH****T***F**I97ON**y*BzUpc,sk-Ek6f5n*q7X*8I2mgH****T***F**I97ON**y*BzUpc
```

![settings.js](https://flashpixel-1253674045.cos.ap-shanghai.myqcloud.com/WeChatWorkScreenshot_1f621a72-0215-4b7c-8788-691042134155.png)

我很感谢原作者的无私奉献，我基于原作者的代码对前端代码做了一些修改，使其支持缓存每轮会话，并且可以导出数据以及删除会话，同时加了pwa。

由于我的apikey是唯一的，我不太想把我的网址共享出来。不过可以选择自己部署，我的后端服务部署在阿里云函数计算上，前端代码部署在阿里云oss上，阿里云oss绑定自定义域名，就可以托管静态页面，每个域名都可以领取免费ssl证书，这样网站就能支持pwa。
## License

[GPL-3.0 license](./LICENSE)
