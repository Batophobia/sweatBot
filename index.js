const { Client, GatewayIntentBits, EmbedBuilder } = require("discord.js");
require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const crypto = require("crypto");
const { exec } = require('child_process');

console.log(`Starting bot`);

process.on('unhandledRejection', error => {
    console.error('Unhandled promise rejection:', error);
});
process.on('uncaughtException', error => {
    console.error('Uncaught exception:', error);
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

client.on("messageCreate", async (message) => {
    if (message.author.bot) return;
    if (message.content.toLowerCase().startsWith("!ping")) return await ping(message);
    if (message.content.toLowerCase().startsWith("!help")) return await help(message);
    if (message.content.toLowerCase().startsWith("!gamertag")) return await gamertag(message);
    if (message.content.toLowerCase().startsWith("!ranked")) return await ranked(message);
});

async function ping(message) {
    message.reply("pong");
}

async function help(message) {
    message.reply("Available commands:\n**!help**: Show this list of commands\n**!gamertag GAMERTAG**: Display matchmaking stats for the provided gamertag\n**!rankedTS GAMERTAG**: Gets the H3 Team Slayer rank for the provided gamertag\n**!rankedDbl GAMERTAG**: Gets the H3 Team Doubles rank for the provided gamertag\n**!ranked GAMERTAG**: Lists top 10 ranks for the provided gamertag");
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

    message.channel.send(
        `**${username}** stats:\n🎯 K / D: ${kd.toFixed(2)}\n🤝 A / D: ${ad.toFixed(2)}\n⚔️ K + A / D: ${kad.toFixed(2)}\n🏆 W / L: ${wl.toFixed(2)}`,
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

client.on("debug", console.log);
client.on("warn", console.warn);

console.log("Attempting bot login")
client.login(process.env.BOT_TOKEN).catch((err) => console.error(err));


// GitHub webhook stuff
const app = express();
app.use(bodyParser.json({
    verify: (req, res, buf) => {
        req.rawBody = buf;
    }
}));

function verifySignature(req) {
    const signature = req.headers['x-hub-signature-256'];
    const hmac = crypto.createHmac('sha256', process.env.GITHUB_WEBHOOK);
    const digest = 'sha256=' + hmac.update(req.rawBody).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
}

app.post('/github-webhook', (req, res) => {
    if (!verifySignature(req)) {
        console.log('Invalid signature');
        return res.status(403).send('Forbidden');
    }

    console.log('Webhook received. Pulling changes...');
    exec('git pull && pm2 restart sweatBot', (error, stdout, stderr) => {
        if (error) {
            console.error(`Pull error: ${error}`);
            return res.status(500).send('Pull failed');
        }
        console.log(`Pull success:\n${stdout}`);
        res.status(200).send('Updated');
    });
});
app.listen(3000, () => {
    console.log(`Webhook is listening`);
});
// End of express code