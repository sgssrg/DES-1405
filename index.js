const envFile =
  process.env.NODE_ENV === "production" ? ".env.prod" : ".env.dev";
require("dotenv").config({ path: envFile });
const {
  Client,
  Events,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} = require("discord.js");
let msgCatVoice = ["Meow", "Nya", "Nyan", "Purr", "Myaoon", "Nyaan"];
let playersRPS = [];
let rpsON = false;
const { setBotReady } = require("./web_server.js");
const axios = require("axios");
const axiosRetry = require("axios-retry");

const lt = axios.create({
  baseURL: "http://libretranslate:5000",
  headers: { "Content-Type": "application/json" },
});
// axiosRetry(client, {
//   retries: 3, // number of retries
//   retryDelay: (retryCount) => {
//     console.log(`Retry attempt #${retryCount}`);
//     return retryCount * 1000; // wait 1s, 2s, 3s...
//   },
//   retryCondition: (error) => {
//     // retry on network errors or 5xx responses
//     return error.response?.status >= 500 || error.code === "ECONNABORTED";
//   },
// });

// For Dice Game
let diceVal;
let playersJoinedDice = [];
let diceGameState = false;

const helpTransBtns = [
  { name: "Translation Commands", value: 1 },
  { name: "Languages Available", value: 2 },
];

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.login(process.env.DISCORD_TOKEN).catch((err) => {
  console.error("Login failed:", err);
});
client.once(Events.ClientReady, (readyClient) => {
  setBotReady(true); // Update the bot status to ready
  console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});
client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;
  let catVoiceRegex = /(meow|nya|purr|myaoon|nyaan)/i;
  if (catVoiceRegex.test(message.content)) {
    message.reply(msgCatVoice[Math.floor(Math.random() * msgCatVoice.length)]);
  }
  if (message.reference) {
    // if (message?.reference?.guildId === "1454856216575480065") return;
    console.log(message?.reference?.messageId);
    // validating for command !trans for the translation function to be triggered
    console.log(message.content.split(" ")[0]);
    if (message.content.startsWith("!dt")) {
      try {
        let detectOriginalReply = await fetchReferencedMessage(message);
        if (detectOriginalReply) {
          const detectedLang = await lt.post("/detect", {
            q: detectOriginalReply.content,
          });
          console.log(detectedLang.data);
          const langJSON = await lt.get("/languages");
          const langList = langJSON.data;
          const matchedLang = langList.find(
            (lang) => lang.code === detectedLang.data[0].language,
          );

          detectOriginalReply.reply(
            `${matchedLang.name} (${detectedLang.data[0].language}) with confidence ${detectedLang.data[0].confidence}`,
          );
        }
      } catch (err) {
        console.error("Error in fetching referenced message content:", err);
        message.reply(
          "Sorry, I couldn't fetch the original message for language detection.",
          err,
        );
      }
    }
    if (
      message.content.split(" ")[0] === "!trans" ||
      message.content.split(" ")[0] === "!translate" ||
      message.content.split(" ")[0] === "!t"
    ) {
      // referencing to the original text
      try {
        let targetLang = "en"; // default target language is English
        if (
          message.content.split(" ")[0] === "!t" &&
          message.content.split(" ")[1]
        ) {
          targetLang = message.content.split(" ")[1]; // set target language based on user input
        }
        let transOriginalReply = await fetchReferencedMessage(message);
        if (transOriginalReply) {
          const translatedText = await lt.post("/translate", {
            q: transOriginalReply.content,
            source: "auto",
            target: targetLang,
            format: "text",
          });

          transOriginalReply.reply(
            `${transOriginalReply.author}: "${translatedText.data.translatedText}"`,
          );
        }
      } catch (err) {
        console.error("Error in fetching referenced message content:", err);
        message.reply(
          "Sorry, I couldn't fetch the original message for translation.",
          err,
        );
      }
    }
  }
});
client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      let RPS_C = interaction.channelId === process.env.RPS_CHANNEL;
      let BT_C = interaction.channelId === process.env.BT_CHANNEL;
      let D_C = interaction.channelId === process.env.DICE_CHANNEL;
      if (interaction.commandName === "purr") {
        await interaction.reply(
          msgCatVoice[Math.floor(Math.random() * msgCatVoice.length)] + "!!!!!",
        );
      }
      if (interaction.commandName === "rps") {
        console.log("RPS Command Triggered!");
        if (!rpsON && RPS_C) {
          rpsON = true;
          await interaction.reply(
            `Let's Play Rock, Paper, Scissors!! ${msgCatVoice[Math.floor(Math.random() * msgCatVoice.length)]}!!!!`,
          );
        } else if (!RPS_C) {
          await interaction.reply(
            "Please go to Rock, Paper, Scissors channel to start a game!",
          );
        } else {
          await interaction.reply(
            "A Rock, Paper, Scissors game is already ongoing! Please join the current game or wait for it to finish!",
          );
        }
      }
      if (interaction.commandName === "join-rps") {
        if (!RPS_C) {
          await interaction.reply("Command only works on RPS Channel! Sorry!");
        } else if (!rpsON && RPS_C) {
          await interaction.reply(
            "No Rock, Paper, Scissors game is currently active! Sorry!",
          );
        } else {
          let playerExists = playersRPS.includes(interaction.user.username);
          //    let playerExists = false;
          if (playerExists) {
            await interaction.reply(
              "You are already in the game! DON'T U DARE AGAIN ANNOY ME!",
            );
          } else {
            playersRPS.push(interaction.user.username);
            await interaction.reply(
              `@${interaction.user.username.toString()} has joined the Rock, Paper, Scissors game!`,
            );
            await interaction.channel.send(
              `Current Players: ${playersRPS.join(", ")}`,
            );
          }
        }
      }
      if (interaction.commandName === "begin-rps") {
        if (!RPS_C) {
          await interaction.reply("Command only works on RPS Channel! Sorry!");
        } else if (!rpsON && RPS_C) {
          await interaction.reply(
            "No Rock, Paper, Scissors game is currently active! Sorry!",
          );
        } else if (playersRPS.length < 2) {
          await interaction.reply(
            "Not enough players have joined the game! At least 2 players are required to start the game!",
          );
        } else {
          await interaction.channel.send("Lets Get Rolling!!! Shall We!?!");
          let RPSChoices = ["Rock 💎🪨", "Paper 🧻", "Scissors ✂️"];
          let playersWithChoices = [];
          for (const e of playersRPS) {
            playersWithChoices.push({
              player: e,
              choice: RPSChoices[Math.floor(Math.random() * RPSChoices.length)],
            });
            await interaction.channel.send(
              `@${playersWithChoices[playersWithChoices.length - 1]?.player.toString()} rolled ${playersWithChoices[playersWithChoices.length - 1]?.choice}`,
            );
          }
          // declaring the victory holder with a placeholder looping through playersWithChoices to determine winner
          let victoryHolder = "";
          let victoryDraw = "";
          let isDraw = false;
          for (let j = 1; j < playersWithChoices.length; j++) {
            const cP = playersWithChoices[j - 1];
            const nP = playersWithChoices[j];
            let paperRegex = /(Paper)/i;
            let rockRegex = /(Rock)/i;
            let scissorsRegex = /(Scissors)/i;
            if (
              (cP.choice.match(paperRegex) && nP.choice.match(rockRegex)) ||
              (cP.choice.match(scissorsRegex) && nP.choice.match(paperRegex)) ||
              (cP.choice.match(rockRegex) && nP.choice.match(scissorsRegex))
            ) {
              isDraw = false;
              victoryHolder = cP.player;
              victoryDraw = cP.choice;
            }
            if (
              (nP.choice.match(paperRegex) && cP.choice.match(rockRegex)) ||
              (nP.choice.match(scissorsRegex) && cP.choice.match(paperRegex)) ||
              (nP.choice.match(rockRegex) && cP.choice.match(scissorsRegex))
            ) {
              isDraw = false;
              victoryHolder = nP.player;
              victoryDraw = nP.choice;
            }
            if (nP.choice === cP.choice) {
              isDraw = true;
            }
          }
          if (isDraw) {
            await interaction.channel.send(
              "It's a draw! No one wins this round. 📏📐",
            );
          } else {
            await interaction.channel.send(
              `@${victoryHolder.toString()} wins this round with ${victoryDraw.toString()}! 🎀`,
            );
          }
          await interaction.channel.send(
            "Thanks for playing Rock, Paper, Scissors! use /del-rps to end the current game.",
          );
        }
      }
      if (interaction.commandName === "del-rps") {
        if (!RPS_C) {
          await interaction.reply("Command only works on RPS Channel! Sorry!");
        } else if (!rpsON && RPS_C) {
          await interaction.reply(
            "No Rock, Paper, Scissors game is currently active! Sorry!",
          );
        } else {
          rpsON = false;
          playersRPS = [];
          await interaction.reply(
            "The current Rock, Paper, Scissors game has been deleted! You can start a new game with /rps command!",
          );
        }
      }
      if (interaction.commandName === "set-bt") {
        console.log("BT Trap Command Triggered!");
        // For BT1
        let referenceUTCBT1 = new Date();
        referenceUTCBT1.setUTCHours(19, 25, 0, 0); // UTC 19:25
        // For BT2
        let referenceUTCBT2 = new Date();
        referenceUTCBT2.setUTCHours(14, 55, 0, 0); // UTC 14:55

        if (!BT_C)
          await interaction.reply(
            "Command only works on Bear Trap Channel! Sorry!",
          );
        if (BT_C) {
          interaction.reply(
            `Bear Trap ${interaction.options.get("trap").value} has been set!`,
          );
          if (interaction.options.get("trap").value === 1) {
            const firstDelayBT1 = referenceUTCBT1.getTime() - Date.now();
            setTimeout(() => {
              // Fire the first event at the reference time
              triggerTrap(1, interaction);
              // After that, keep repeating every 48 hours
              setInterval(
                () => triggerTrap(1, interaction),
                48 * 60 * 60 * 1000,
              ); // DEBUG: 48 * 60 * 60 * 1000
            }, firstDelayBT1);
          }
          if (interaction.options.get("trap").value === 2) {
            const firstDelayBT2 = referenceUTCBT2.getTime() - Date.now();
            setTimeout(() => {
              // Fire the first event at the reference time
              triggerTrap(2, interaction);

              // After that, keep repeating every 48 hours
              setInterval(
                () => triggerTrap(2, interaction),
                48 * 60 * 60 * 1000,
              ); // DEBUG: 48 * 60 * 60 * 1000
            }, firstDelayBT2);
          }
        }
      }
      if (interaction.commandName === "dice") {
        console.log("Dice game started");
        if (!D_C)
          interaction.reply("Command only works on Dice Channel! Sorry!");
        if (diceGameState)
          interaction.reply(
            "A Dice Game is already ongoing! Please join the current game or wait for it to finish!",
          );
        if (!diceGameState && D_C) {
          diceGameState = true;
          interaction.reply(
            "A new Dice Game has started! Use /join-dice command to join!",
          );
        }
      }
      if (interaction.commandName === "join-dice") {
        if (!D_C)
          interaction.reply("Command only works on Dice Channel! Sorry!");
        if (!diceGameState)
          interaction.reply(
            "No Dice Game is currently ongoing! Please start a new game with /dice command!",
          );
        if (diceGameState && playersJoinedDice.includes(interaction.user.id)) {
          interaction.reply(
            "You are already in the Dice Game! DON'T U DARE AGAIN ANNOY ME!",
          );
        } else {
          playersJoinedDice.push({
            userId: interaction.user.id,
            predictedNumber: interaction.options.get("number").value,
          });
          interaction.reply(
            `You have joined the Dice Game! There are now ${playersJoinedDice.length} players.`,
          );
        }
      }
      if (interaction.commandName === "roll-dice") {
        if (!D_C)
          interaction.reply("Command only works on Dice Channel! Sorry!");
        if (!diceGameState)
          interaction.reply(
            "No Dice Game is currently ongoing! Please start a new game with /dice command!",
          );
        else {
          diceVal = Math.floor(Math.random() * 6) + 1;
          interaction.reply(`The dice rolled: ${diceVal}`);
          interaction.channel?.send(
            "The results are in! Calculating winners...",
          );
          let winners = [];
          for (const prediction of playersJoinedDice) {
            if (prediction.predictedNumber === diceVal) {
              winners.push(prediction.userId);
            }
          }
          if (winners.length > 0) {
            interaction.channel?.send(
              `The winners are: ${winners.map((id) => `<@${id}>`).join(", ")}`,
            );
          } else {
            const closestUsers = playersJoinedDice.map((prediction) => ({
              uid: prediction.userId,
              diff: Math.abs(prediction.predictedNumber - diceVal),
            }));

            closestUsers.sort((a, b) => a.diff - b.diff);

            // Guard clause: no predictions
            if (closestUsers.length === 0) {
              return interaction.channel?.send("No predictions were made!");
            }

            // Guard clause: only one prediction
            if (closestUsers.length === 1) {
              return interaction.channel?.send(
                `Only one prediction was made. The closest guess was ${closestUsers[0].diff} away from the actual number! The closest user was <@${closestUsers[0].uid}>.`,
              );
            }

            // Now safe to access [0] and [1]
            if (closestUsers[0].diff === closestUsers[1].diff) {
              const minDiff = closestUsers[0].diff;
              const tiedUsers = closestUsers.filter(
                (user) => user.diff === minDiff,
              );

              interaction.channel?.send(
                `The closest guess was ${minDiff} away from the actual number!`,
              );

              const winner =
                tiedUsers[Math.floor(Math.random() * tiedUsers.length)];
              interaction.channel?.send(
                `Hence, by randomness <@${winner.uid}> is the winner!`,
              );
            } else {
              interaction.channel?.send(
                `The closest guess was ${closestUsers[0].diff} away from the actual number! The closest user was <@${closestUsers[0].uid}>.`,
              );
              interaction.channel?.send(
                `Hence, <@${closestUsers[0].uid}> is the winner!`,
              );
            }
          }
        }
      }
      if (interaction.commandName === "del-dice") {
        console.log("Dice game deleted!");
        if (!D_C) {
          return interaction.reply(
            "Command only works on Dice Channel! Sorry!",
          );
        }

        diceGameState = false;
        playersJoinedDice = [];
        diceVal = null;

        return interaction.reply(
          "Dice Game has been reset! You can start a new one with /dice.",
        );
      }

      if (interaction.commandName === "help") {
        let helpChoice = interaction.options.get("with").value;
        if (helpChoice === 5) {
          let embed = new EmbedBuilder()
            .setTitle(":pencil: Translation Commands")
            .setDescription(
              "Welcome to the help page for DES-1405 - Translation Service \n\n",
            )
            .setColor(0xc9ffc6);
          let btnRow = new ActionRowBuilder();
          helpTransBtns.map((btnData) => {
            btnRow.addComponents(
              new ButtonBuilder()
                .setCustomId(`help-translate-btn-${btnData.value}`)
                .setLabel(btnData.name)
                .setStyle(ButtonStyle.Success),
            );
          });
          await interaction.reply({
            embeds: [embed],
            components: [btnRow],
          });
        }
      }
    }
    if (interaction.isButton()) {
      if (interaction.customId.startsWith("help-translate-btn-")) {
        const btnValue = interaction.customId.split("help-translate-btn-")[1];

        if (btnValue === "1") {
          let embed = new EmbedBuilder()
            .setTitle(":pencil: Translation Commands - HELP")
            .setDescription("This is the page for translate command help")
            .setColor(0xc9ffc6)
            .addFields(
              {
                name: ":question: How to use the `!t` translate command?",
                value:
                  "To use the translate command, simply reply to the message you want to translate with one of the following commands:\n\n- `!trans`\n- `!translate`\n- `!t`\n\nThe bot will automatically detect the language of the original message and translate it to English. Make sure to reply directly to the message you want translated for it to work!",
                inline: true,
              },
              {
                name: ":information_source: !dt",
                value:
                  "The `!dt` is used to detect the language of the original message. Similar to the translate command, simply reply to the message you want to detect with `!dt` and the bot will reply with the detected language and its corresponding language code.",
                inline: true,
              },
              {
                name: ":information_source: How to translate to other languages apart from English?",
                value:
                  "To translate to a specific language, use the `!t` command followed by the language code you want to translate to. For example, `!t fr` will translate the message to French. You can find a list of supported languages & language code using the `/help` command.",
                inline: true,
              },
              {
                name: ":warning: Important Notes",
                value:
                  "- The bot can only translate text messages, so it won't work if you reply to an image, video, or other non-text content.\n- If the original message is too long or contains complex language, the translation might not be perfect. The bot uses machine translation, which has its limitations.\n- Please be patient when using the command, as it may take a few seconds for the bot to process and reply with the translation.",
              },
            );
          await interaction.deferReply({ flags: MessageFlags.Ephemeral });
          await interaction.editReply({
            embeds: [embed],
            components: [],
          });
        }

        if (btnValue === "2") {
          let embed = new EmbedBuilder()
            .setTitle(":pencil: Translation Commands - HELP")
            .setDescription("The supported languages are -----> \n\n")
            .setColor(0xc9ffc6);
          await interaction.deferReply({ flags: MessageFlags.Ephemeral });
          await interaction.editReply({
            embeds: [embed],
            components: [],
          });
          let languagesAvailable = (await lt.get("/languages")).data;
          const languageGroups = chunkArray(languagesAvailable, 5); // 5 per field
          const languageFields = languageGroups.map((group, idx) => ({
            name: `:microphone2: Supported ${idx + 1}`,
            value: group
              .map((lang) => `${lang.name} (${lang.code})`)
              .join("\n"),
            inline: true,
          }));
          embed.addFields(languageFields);
          await interaction.editReply({ embeds: [embed] });
        }
      }
    }
  } catch (error) {
    console.log(error);
  }
});

// All Helper functions are below this line
function triggerTrap(BTNumber, interaction) {
  console.log(`Triggering BT${BTNumber} code block triggerTrap!`);
  interaction.channel?.send(
    `<@&${BTNumber === 1 ? process.env.BT1_ROLL_ID : process.env.BT2_ROLL_ID}> is active! Bear Trap begins in 5 mins, Recall your troops 🪤`,
  );
  setTimeout(
    () => {
      interaction.channel?.send(
        `Bear Trap is active! Please Join Quickly! <@&${BTNumber === 1 ? process.env.BT1_ROLL_ID : process.env.BT2_ROLL_ID}> 🪤`,
      );
    },
    5 * 60 * 1000,
  ); // 5 minutes later
}

const fetchReferencedMessage = async (message) => {
  if (message?.reference?.messageId) {
    try {
      const referencedMessage = await message.channel.messages.fetch(
        message.reference.messageId,
      );
      console.log("Referenced message content:", referencedMessage.content);
      return referencedMessage;
    } catch (error) {
      console.error("Error fetching referenced message:", error);
    }
  }
};

function chunkArray(arr, size) {
  const result = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}
