const Discord = require("discord.js");
const fs = require("fs");
const NodeCF = require("node-curseforge");
const https = require("https");
const unzipper = require('unzipper');
const { curseforgetoken } = require("./danger");

/**@type {Discord.Attachment} */
let DiscordFile = null;
module.exports = {
    data: new Discord.SlashCommandBuilder()
        .setName("modpack")
        .setDescription("管理者以外実行不可")
        .setDefaultMemberPermissions(8)
        .addSubcommand(subcomm => subcomm
            .setName("new")
            .setDescription("管理者以外実行不可")
            .addAttachmentOption(option => option
                .setName("file").setDescription("ZIPふぁいるごと送ってくれ").setRequired(true)))
        .addSubcommand(subcomm => subcomm
            .setName("update")
            .setDescription("管理者以外実行不可")
            .addAttachmentOption(option => option
                .setName("file").setDescription("ZIPふぁいるごと送ってくれ").setRequired(true))),

    /**
     * @param {Discord.ChatInputCommandInteraction} interaction
     * @param {Discord.Client<boolean>} client
     */
    execute: async (interaction, client) => {
        const modal = new Discord.ModalBuilder()
        if (fs.existsSync("./src/unzip/"))
            fs.rmSync("./src/unzip/", { recursive: true, force: true });

        if (interaction.options.getSubcommand() == "new")
            modal.setCustomId('ne_modpack').setTitle('modpackの新規登録');
        if (interaction.options.getSubcommand() == "update")
            modal.setCustomId('ad_modpack').setTitle('アップデートの追加');

        modal.addComponents(
            [
                new Discord.ActionRowBuilder().addComponents(new Discord.TextInputBuilder()
                    .setCustomId('name')
                    .setLabel("pack名(未記入の場合は内部ファイルから取得)")
                    .setStyle(Discord.TextInputStyle.Short)
                    .setRequired(false)),
                new Discord.ActionRowBuilder().addComponents(new Discord.TextInputBuilder()
                    .setCustomId('version')
                    .setLabel("バージョン(未記入の場合は内部ファイルから取得)")
                    .setStyle(Discord.TextInputStyle.Short)
                    .setRequired(false)),
                new Discord.ActionRowBuilder().addComponents(new Discord.TextInputBuilder()
                    .setCustomId('desp')
                    .setLabel("説明")
                    .setStyle(Discord.TextInputStyle.Paragraph)
                    .setRequired(false))
            ]);
        DiscordFile = interaction.options.getAttachment("file");
        await interaction.showModal(modal);
    },
    /**
     * @param {Discord.ModalSubmitInteraction} interaction
     * @param {string} customId
     */
    Modal: async (interaction, customId) => {
        try {
            interaction.user.avatarURL()
            await interaction.deferReply();
            download(DiscordFile.url, `./src/${DiscordFile.name}`).then(() => {
                unzip(`./src/${DiscordFile.name}`, "./src/unzip/").then(async () => {
                    const Manifest = requireJSON("./unzip/manifest.json");
                    const Before = requireJSON("./before.json");
                    const ifnew = customId == "ne_modpack";
                    const options = {
                        name: EmptyReplace(
                            interaction.fields.getTextInputValue("name"),
                            Manifest["name"]),
                        version: EmptyReplace(
                            interaction.fields.getTextInputValue("version"),
                            Manifest["version"]),
                        desp: EmptyReplace(
                            interaction.fields.getTextInputValue("desp"),
                            "")
                    };
                    if (!ifnew) {//差異取得
                        const CF = new NodeCF.Curseforge(curseforgetoken)
                        let TEXT = "";
                        GetDifference(Before["files"], Manifest["files"], (A, BArr) =>
                            BArr.findIndex(e => e.projectID == A.projectID) == -1
                        ).then(Difference => {
                            let NUMS = { AddMods: [], AddFiles: [], Delmods: [] }
                            Difference.ADD.forEach(element => { NUMS.AddMods.push(element.projectID); NUMS.AddFiles.push(element.fileID) });
                            Difference.DEL.forEach(element => { NUMS.Delmods.push(element.projectID); });
                            let AD_TEXT = { Add: [], Rem: [] };
                            const CanSendMessage = () => {
                                if (AD_TEXT.Add.length == NUMS.AddMods.length && AD_TEXT.Rem.length == NUMS.Delmods.length) {
                                    Debug(Manifest["version"]);
                                    TEXT = AD_TEXT.Add.join("") + AD_TEXT.Rem.join("");
                                    const beforemessage = JSON.parse(fs.readFileSync("./src/message.json").toString());
                                    let ch = interaction.client.channels.cache.get(beforemessage.channelID)
                                    if (!ch)
                                        Debug("ch取得失敗")
                                    else if (ch.isTextBased) ch.messages.fetch(beforemessage.messageID).then(mess => {
                                        mess.react("\u274c");
                                    }).catch(ex => { console.error(ex); error(interaction); })
                                    interaction.editReply({
                                        ...createembed(options,
                                            `Added / Deleted Mods:\n${TEXT}`,
                                            { text: interaction.user.username, iconURL: interaction.user.avatarURL() }, Manifest),
                                        files: [`./src/${DiscordFile.name}`]
                                    }).then(message => {
                                        fs.unlinkSync("./src/message.json");
                                        fs.writeFileSync("./src/message.json", JSON.stringify({
                                            channelID: message.channelId,
                                            messageID: message.id
                                        }))
                                    }).catch(ex => { console.error(ex); error(interaction); });
                                    fs.unlinkSync("./src/before.json");
                                    fs.createReadStream('./src/unzip/manifest.json', 'utf8').pipe(
                                        fs.createWriteStream('./src/before.json', 'utf8'));
                                    DiscordFile = null;
                                }
                            }

                            get_mods(NUMS.AddMods).then(mods => {
                                if (mods != null) {
                                    for (let i = 0; i < mods.length; i++) {
                                        AD_TEXT.Add.push(`+ [${mods[i].name}](<${mods[i].links.websiteUrl + `/files/${NUMS.AddFiles[i]}`}>)\n`);
                                        CanSendMessage();
                                    }
                                }
                            }).catch(ex => { console.error(ex); error(interaction); })
                            get_mods(NUMS.Delmods).then(mods => {
                                if (mods != null) {

                                    for (let i = 0; i < mods.length; i++) {

                                        AD_TEXT.Rem.push(`\\- ${mods[i].name}\n`);
                                        CanSendMessage();
                                    }
                                }
                            }).catch(ex => { console.error(ex); error(interaction); })
                            CanSendMessage();
                        }).catch(ex => { console.error(ex); error(interaction); });
                    } else {
                        interaction.editReply({
                            ...createembed(options, "",
                                { text: interaction.user.username, iconURL: interaction.user.avatarURL() }, Manifest),
                            files: [`./src/${DiscordFile.name}`]
                        }).then(message => {
                            fs.unlinkSync("./src/message.json");
                            fs.writeFileSync("./src/message.json", JSON.stringify({
                                channelID: message.channelId,
                                messageID: message.id
                            }))
                        });
                        fs.unlinkSync("./src/before.json");
                        fs.createReadStream('./src/unzip/manifest.json', 'utf8').pipe(
                            fs.createWriteStream('./src/before.json', 'utf8'));
                        DiscordFile = null;
                    }
                }).catch(ex => { console.error(ex); error(interaction); });
            }).catch(ex => { console.error(ex); error(interaction); });
        } catch (ex) { }
    }
}


//---------------functions-------------------
/**
 * @returns {Promise<{ADD:{projectID:number,fileID:number}[],DEL:{projectID:number,fileID:number}[]}>}
 * @param {any[]} FromArr 
 * @param {any[]} ToArr 
 * @param {(A:any,BArr:any[])=>boolean} lamuda
 * 配列を判定してlamudaがtrueの時にADDまたはDELに追加する。
 * 
 * lamudaの値がtrueの場合AはBArrに存在しないことになる。
 */
const GetDifference = async (FromArr, ToArr, lamuda) => {

    return new Promise((resolve, reject) => {

        //NowとMaxが同じなら検査終了
        let count = {
            Now: 0,
            All: ToArr.length + FromArr.length
        };
        let Return = {
            ADD: [], DEL: []
        };
        const check = () => { if (count.Now == count.All) resolve(Return); }
        FromArr.forEach(element => {
            if (lamuda(element, ToArr)) Return.DEL.push(element);
            count.Now++;
            check();
        })
        ToArr.forEach(element => {
            if (lamuda(element, FromArr)) Return.ADD.push(element);
            count.Now++;
            check();
        })
    })
}
/**
 * @param {string} uri
 * @param {string} filename
 * ファイルのダウンロード
 */
const download = (uri, filename) => {
    return new Promise((resolve, reject) =>
        https
            .request(uri, (res) => {
                res
                    .pipe(fs.createWriteStream(filename))
                    .on("close", resolve)
                    .on("error", reject);
            })
            .end()
    );
};
/**
 * @param {fs.PathLike} zip
 * @param {string} to
 * zip解凍
 */
const unzip = (zip, to) => {
    return new Promise((resolve, reject) => {
        let src = fs.createReadStream(zip)
        src.pipe(unzipper.Extract({ path: to }))
        src.on("error", () => { reject() })
        setTimeout(resolve, 1000)
    })
}
/**
 * @param {string} text 
 * @param {string} to 
 * @returns {string}
 * textが空ならtoを返す。空じゃないならtextを返す。
 */
const EmptyReplace = (text, to) => {
    if (!text)
        return to;
    else return text;
}
/**
* 最初はCF由来のを使いたかったが
* どうにも例外が起きる
* そのため作ったメソット。 @returns {Promise<NodeCF.Mod[] | null>}
*/
const get_mods = (modids = []) => {
    const CF = new NodeCF.Curseforge(curseforgetoken)
    return new Promise((resolve, reject) => {
        let mods = [];
        if (modids.length == 0)
            resolve(null);
        else
            try {
                for (let i = 0; i < modids.length; i++) {
                    CF.get_mod(modids[i]).then(mod => {
                        mods.push(mod);
                        if (mods.length == modids.length) {
                            resolve(mods);
                        }
                    }).catch(ex => { reject(ex) })
                }
            } catch (ex) {
                reject(ex);
            }
    })
}
const Debug = (str) => {
    if (true) console.log(`${new Date().getHours()}:${new Date().getMinutes()}:${new Date().getSeconds()} -> ${str}`)
}
const requireJSON = (path) => JSON.parse(fs.readFileSync("./src/" + path.substring(2)).toString())
/**
 * 
 * @param {string} title 
 * @param {string} description 
 * @param {{name:string,value:string}[]} fields 
 * @param {{text:string,iconURL:string}} footer 
 * @returns 
 */
const createembed = (options, description, footer, Manifest) => {
    return {
        embeds: [new Discord.EmbedBuilder()
            .setColor(0x00ff00).setTitle(options.name)
            .setAuthor({ name: 'UPDATEBOT', iconURL: 'https://cdn.discordapp.com/attachments/1163388379359092736/1200387637303840799/SPOILER_57eeac0c-1b5f-4361-a159-d70845859e2f.gif?' })
            .setDescription(`__PackVersion: ${options.version}__\n` +
                `__MCVersion: ${Manifest["minecraft"].version}-${Manifest["minecraft"].modLoaders[0].id}__\n` +
                `Description:${"```"}\n${options.desp}\n${"```"}\n` + description).setFooter(footer)]
    }
}
const error = (interaction) => {
    if (interaction.replied || interaction.deferred)
        interaction.editReply(":x: エラーが発生しました！")
    else interaction.reply(":x: エラーが発生しました！")
}
//-------------------------------------------------
