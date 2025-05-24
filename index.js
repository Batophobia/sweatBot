const { Client, GatewayIntentBits, EmbedBuilder } = require("discord.js");
const fs = require('node:fs');
const AWS = require('aws-sdk');
require('dotenv').config();
AWS.config.update({ region: "us-east-2" });

console.log(`Starting bot`);

process.on('unhandledRejection', error => {
    console.error('Unhandled promise rejection:', error);
});
process.on('uncaughtException', error => {
    console.error('Uncaught exception:', error);
});

let roastList = [];
fs.readFile('./roasts.txt', 'utf8', (err, data) => {
    if (err) {
        console.error(err);
        return;
    }
    roastList = data.split("\n");
});

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

client.once("ready", () => {
    console.log(`Logged in as ${client.user.tag}`);
});

client.on('error', (error) => {
    console.error('Client Error:', error);
});

var docClient = new AWS.DynamoDB.DocumentClient({ apiVersion: "2012-08-10" });

client.on("messageCreate", async (message) => {
    if (message.author.bot) return;
    logFile(`userID: ${message.author.id}, userName: ${message.author.username}, command: ${message.content}\n`);
    if (message.content.toLowerCase().startsWith("!ping")) return await ping(message);
    if (message.content.toLowerCase().startsWith("!help")) return await help(message);
    if (message.content.toLowerCase().startsWith("!gamertag")) return await gamertag(message);
    if (message.content.toLowerCase().startsWith("!ranked")) return await ranked(message);
    if (message.content.toLowerCase().startsWith("!betrayal")) return await betrayals(message);
    if (message.content.toLowerCase().startsWith("!askcutie")) return await ask(message);
    if (message.content.toLowerCase().startsWith("!roast")) return await roast(message);
    if (message.content.toLowerCase().startsWith("!betray")) return await betray(message);
});

async function ping(message) {
    message.reply("pong");
}

async function help(message) {
    message.reply(`Available commands:
**!help**: Show this list of commands
**!gamertag GAMERTAG**: Display matchmaking stats for the provided gamertag
**!rankedTS GAMERTAG**: Gets the \`H3 Team Slayer\` rank for the provided gamertag
**!rankedDbl GAMERTAG**: Gets the \`H3 Team Doubles\` rank for the provided gamertag
**!rankedDblHC GAMERTAG**: Gets the \`H3 Hardcore Doubles\` rank for the provided gamertag
**!ranked GAMERTAG**: Lists top 10 ranks for the provided gamertag
**!betrayals GAMERTAG**: Display \`betrayal\` stats for the provided gamertag
**!roast GAMERTAG**: Roast the provided gamertag
**!askCutie YES OR NO QUESTION**: Ask a yes/no question and see what Cutieful has to say`);
}

async function ask(message) {
    if (Math.random() > .5)
        message.reply(`Yuppers`);
    else
        message.reply(`Nopers`);
}

async function betray(message) {
    const username = getUsername(message);
    if (!username)
        return;

    let params = {
        TableName: "betrays",
        Key: { username },
    };

    const resp = await docClient.get(params, function (err, data) {
        if (err) {
            console.log("Error", err);
        } else {
            console.log("Success", data.Item);
        }
    });
    console.log(resp)
    return resp
}

async function roast(message) {
    const username = getUsername(message);
    if (!username)
        return;

    let idx = batman(roastList.length)
    if (idx >= roastList.length)
        idx = 0;

    message.channel.send(roastList[idx].replace("<gamertag>", username));
}

async function ranked(message) {
    const username = getUsername(message);
    if (!username)
        return;

    try {
        let stats = await getStats(username, message);
        if (stats != null) {
            stats = stats.ranks;

            const embeds = [];
            let embed = new EmbedBuilder().setTitle(username)

            if (message.content.toLowerCase().startsWith("!rankedts")) { // H3 Team Slayer
                embed.setDescription('H3 Team Slayer')
                    .setThumbnail(`https://wort.gg/images/ranks/SMALLRANKICON_${stats.filter(v => v.playlist_name == "H3 Team Slayer")[0].rank.toString().padStart(3, "0")}.png`)
                await message.reply({ embeds: [embed] });
                return;
            }
            if (message.content.toLowerCase().startsWith("!rankeddblhc")) { // H3 Hardcore Doubles
                embed.setDescription('H3 Hardcore Doubles')
                    .setThumbnail(`https://wort.gg/images/ranks/SMALLRANKICON_${stats.filter(v => v.playlist_name == "H3 Hardcore Doubles")[0].rank.toString().padStart(3, "0")}.png`)
                await message.reply({ embeds: [embed] });
                return;
            }
            if (message.content.toLowerCase().startsWith("!rankeddbl")) { // H3 Team Doubles
                embed.setDescription('H3 Team Doubles')
                    .setThumbnail(`https://wort.gg/images/ranks/SMALLRANKICON_${stats.filter(v => v.playlist_name == "H3 Team Doubles")[0].rank.toString().padStart(3, "0")}.png`)
                await message.reply({ embeds: [embed] });
                return;
            }
            else {
                // Discord can only handle 10 embeds, so removing H4
                stats = stats.sort((a, b) => a.rank < b.rank)
                for (var i = 0; i < stats.length && i < 10; i++) {
                    embeds.push(new EmbedBuilder()
                        .setTitle(username)
                        .setDescription(stats[i].playlist_name)
                        .setThumbnail(`https://wort.gg/images/ranks/SMALLRANKICON_${stats[i].rank.toString().padStart(3, "0")}.png`)
                    );
                }
            }

            await message.reply({ embeds });
        } else {
            message.channel.send(
                `No gamertag info found for ${username}. Please verify the username is correct. You might also need to activate the GT on wort.gg first by searching for the tag there.`,
            );
        }
    } catch (error) {
        console.error("API error:", error);
        message.channel.send(
            `Could not fetch data for ${username}. The profile may not exist or the service might be unavailable.`,
        );
    }
}

async function betrayals(message) {
    const username = getUsername(message);
    if (!username)
        return;

    try {
        let stats = await getStats(username, message);
        if (stats != null) {
            stats = stats.stats.Multiplayer.Matchmaking.All.Stats;

            message.channel.send(
                `**${username}** has betrayed ${stats.betrayals} times 🗡️`,
            );
        } else {
            message.channel.send(
                `No gamertag info found for ${username}. Please verify the username is correct. You might also need to activate the GT on wort.gg first by searching for the tag there.`,
            );
        }
    } catch (error) {
        console.error("API error:", error);
        message.channel.send(
            `Could not fetch data for ${username}. The profile may not exist or the service might be unavailable.`,
        );
    }
}

async function gamertag(message) {
    const username = getUsername(message);
    if (!username)
        return;

    try {
        let stats = await getStats(username, message);
        if (stats != null) {
            stats = stats.stats.Multiplayer.Matchmaking.All.Stats;

            sendStats(message, username, stats);
        } else {
            message.channel.send(
                `No gamertag info found for ${username}. Please verify the username is correct. You might also need to activate the GT on wort.gg first by searching for the tag there.`,
            );
        }
    } catch (error) {
        console.error("API error:", error);
        message.channel.send(
            `Could not fetch data for ${username}. The profile may not exist or the service might be unavailable.`,
        );
    }
}

function getUsername(message) {
    const args = message.content.split(" ");
    args.splice(0, 1);
    const username = args.join(" ");

    if (!username) {
        message.reply(
            "Please provide a username. Example: !gamertag cutiefulxoxo",
        );
        return null;
    }

    return username;
}

function sendStats(message, username, stats) {
    kd = stats.kills / stats.deaths;
    ad = stats.assists / stats.deaths;
    kad = (stats.kills + stats.assists) / stats.deaths;
    wl = stats.games_won / (stats.games_completed - stats.games_won);
    kpg = stats.kills / stats.games_completed;

    message.channel.send(
        `**${username}** stats:\n🎯 K / D: ${kd.toFixed(2)}\n🤝 A / D: ${ad.toFixed(2)}\n⚔️ K + A / D: ${kad.toFixed(2)}\n💀 K / G: ${kpg.toFixed(2)}\n🏆 W / L: ${wl.toFixed(2)}`,
    );
}

async function getStats(username, message) {
    if (!username) {
        message.reply(
            "Please provide a username. Example: !gamertag cutiefulxoxo",
        );
        return;
    }

    const response = await fetch(
        `https://wort.gg/api/stats/${username.replace(' ', "%20")}/multiplayer`,
    );
    // console.log(`https://wort.gg/api/stats/${username.replace(' ', "%20")}/multiplayer`)
    const data = await response.json();

    if (data && data.stats) {
        return data;
    }
    return null;
}

function logFile(msg) {
    fs.appendFileSync('./log.log', msg, function (err) {
        if (err) throw err;
        console.log('Saved!');
    });
}

function batman(max, min = 0) {
    return Math.floor(Math.random() * max) + min;
}

client.on("debug", console.log);
client.on("warn", console.warn);

console.log("Attempting bot login")
client.login(process.env.BOT_TOKEN).catch((err) => console.error(err));