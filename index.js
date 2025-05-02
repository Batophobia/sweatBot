const { Client, GatewayIntentBits } = require("discord.js");
const fs = require('fs');

const secrets = JSON.parse(fs.readFileSync('./secrets.json'));

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

const BOT_TOKEN = secrets.BOT_TOKEN;

client.once("ready", () => {
    console.log(`Logged in as ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {
    if (!message.content.toLowerCase().startsWith("!gamertag") || message.author.bot) return;

    const args = message.content.split(" ");
    args.splice(0, 1);
    const username = args.join(" ");

    if (!username) {
        message.reply(
            "Please provide a username. Example: !gamertag cutiefulxoxo",
        );
        return;
    }

    // message.channel.send(`Fetching gamertag info for **${username}**...`);

    try {
        const response = await fetch(
            `https://wort.gg/api/stats/${username.replace(' ', "%20")}/multiplayer`,
        );
        const data = await response.json();

        if (data && data.stats?.Multiplayer?.Matchmaking?.All?.Stats) {
            const stats = data.stats.Multiplayer.Matchmaking.All.Stats;
            kd = stats.kills / stats.deaths;
            ad = stats.assists / stats.deaths;
            kad = (stats.kills + stats.assists) / stats.deaths;
            wl = stats.games_won / (stats.games_completed - stats.games_won);

            message.channel.send(
                `**${username}** stats:\n🎯 K / D: ${kd.toFixed(2)}\n🤝 A / D: ${ad.toFixed(2)}\n⚔️ K + A / D: ${kad.toFixed(2)}\n🏆 W / L: ${wl.toFixed(2)}`,
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
});

client.login(BOT_TOKEN);
