const Discord = require("discord.js");

//clientを作成・権限を設定
let client = new Discord.Client({
    intents: [
        Discord.GatewayIntentBits.DirectMessages,
        Discord.GatewayIntentBits.Guilds,
        Discord.GatewayIntentBits.GuildMessages,
    ],
    partials: [
        Discord.Partials.Message,
        Discord.Partials.Channel,
        Discord.Partials.Reaction,
    ],
})
let commands = {};
//実行可能時の処理
client.on("ready", async () => {
    let requires = [require("./newupdate")];
    let data = []
    requires.forEach(element => {
        commands[element.data.name] = element;
        data.push(element.data)
    })
    await client.application.commands.set(data);
    console.log("Ready!!!!!!!!!!!!!!!!!!!!");
})

client.on("interactionCreate", async (interaction) => {
    if (interaction.isChatInputCommand() && interaction.isCommand()) {
        try {
            const command = commands[interaction.commandName];
            await command.execute(interaction, client);
        } catch (ex) {
            console.error(ex);
            if (interaction.replied || interaction.deferred)
                await interaction.editReply(":x: エラーが発生しました！")
            else await interaction.reply(":x: エラーが発生しました！")
        }
    } else if (interaction.isModalSubmit()) {
        try {
            const command = commands[interaction.customId.substring(3)];
            await command.Modal(interaction, interaction.customId);
        } catch (ex) {
            console.error(ex);
            if (interaction.replied || interaction.deferred)
                await interaction.editReply(":x: エラーが発生しました！")
            else await interaction.reply(":x: エラーが発生しました！")
        }
    }
})

client.login(require("./danger").bottoken);