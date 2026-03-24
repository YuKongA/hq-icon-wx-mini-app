# HQ ICON Weixin MiniProgram

Get app icons from App Store / 从 App Store 上获取应用图标

### 开发须知

1. 请先为本地电脑配置 [Node.js](https://nodejs.org/) 和 NPM 环境。
2. 下载或克隆项目源代码，并解压到本地。
3. [前往微信公众平台注册微信小程序开发者账号](https://mp.weixin.qq.com/cgi-bin/wx)或取得测试号，并取得账号的 `AppID`。
4. 在 [微信公众平台](https://mp.weixin.qq.com/)-开发管理-服务器域名 中，登录微信小程序账号或测试号，将以下域名导入微信小程序 Request 合法域名：
    ```
    https://itunes.apple.com; https://rss.marketingtools.apple.com;
    ```
    将以下域名导入微信小程序 DownloadFile 合法域名：
    ```
    https://is1-ssl.mzstatic.com;
    ```
5. 下载[微信小程序开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)，登录后点击“小程序”-“导入”，填入上一步取得的 `AppID`，将项目目录选中后导入。
6. 在项目根目录下，打开终端并安装 npm 依赖包：
    ```Shell
    npm install
    ```
7. 点击开发者工具中的菜单栏：工具 --> 构建 npm：
    
    ![](https://res.wx.qq.com/wxdoc/dist/assets/img/construction.408e13ae.png)

完成上述步骤后，即可在微信开发者工具中构建和运行此微信小程序。

### 致谢

[TDesign MiniProgram](https://tdesign.tencent.com/miniprogram/)