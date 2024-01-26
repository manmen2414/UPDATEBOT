# UPDATEBOT
This is a bot of Discord.
![akki](https://cdn.discordapp.com/attachments/1180475268859695104/1200409208156336188/akki.png?ex=65c61331&is=65b39e31&hm=9d4a2fa38a97af8238c9be60ef39dcf2a59910e1a72f99d33277a3dc7269a6c9&)

## About - 説明
このbotはminecraftのmodpackを管理するため制作されました。
[node-curseforge](https://github.com/Mondanzo/node-curseforge)や[unzipper](https://github.com/ZJONSSON/node-unzipper)、[discord.js](https://github.com/discordjs/discord.js)の助けを借りてプログラムされています。
## File Tree - ファイル構成
```
.
├── README.md
├── package.json
├── package-lock.json
├── LICENSE
├── .gitignore
├── src
│   ├── main.js
│   ├── newupdate.js
│   ├── before.json
│   ├── message.json
│   └── danger.js
```
danger.js -> 
```js
module.exports = {
    bottoken: "Discord token here",
    curseforgetoken: "Curseforge API token here"
};
```
You can get CFtoken => https://console.curseforge.com/#/login
## ~~md書くの飽きた~~
## ~~何書けばいいかわからん~~