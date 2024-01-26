# FullStack-ChatGPT-WebApp

![GitHub package.json dependency version (prod)](https://img.shields.io/github/package-json/dependency-version/WeixinCloud/wxcloudrun-express/express)
![GitHub package.json dependency version (prod)](https://img.shields.io/github/package-json/dependency-version/WeixinCloud/wxcloudrun-express/sequelize)


这是一个 ChatGPT 聊天应用，包含网页端App和一个Node服务，可快速部署一套自用的完整智能聊天服务。

经过线上检验完全可以成为学习、工作和生活中的小帮手，适合感兴趣的同学自用。

后台目前接入的服务默认是ChatGPT，也同时兼容BingAI或者其他国内模型。


项目启动时需要配置 OpenAI 账户的 ApiKey，可以通过命令行中直接配置环境变量 `OPENAI_API_KEY`。

如需同时配置多个ApiKey，只需要将多个key中间用 `","` 隔开即可，注意中英文切换，例如
```
OPENAI_API_KEY=sk-Ek6f5n*q7X*8I2mgH****T***F**I97ON**y*BzUpc,sk-Ek6f5n*q7X*8I2mgH****T***F**I97ON**y*BzUpc,sk-Ek6f5n*q7X*8I2mgH****T***F**I97ON**y*BzUpc
```

![settings.js](https://flashpixel-1253674045.cos.ap-shanghai.myqcloud.com/WeChatWorkScreenshot_1f621a72-0215-4b7c-8788-691042134155.png)

项目接入了mongodb，用于缓存对话历史，所以还需要配置数据库相关:

settings.js里面的mongodb，例如: 

```javascript
mongodb:{
    user: process.env.MongoDB_username,
    password: process.env.MongoDB_pw,
    url: process.env.MongoDB_url
}
```
部署前端项目，需要配置api HOST_URL，在client/src/config.js里面配置。

另外，为了方便本地调试，我加了代理配置，在ChatGPTClient里面搜fetchWithProxy，如果你的服务器不需要代理，注释掉fetch: fetchWithProxy即可。

<b>支持联网查询，有需要的可以在bin/server.js中自取</b>
## License

