import dotenv from "dotenv";
const envFile =
  process.env.NODE_ENV === "production" ? ".env.prod" : ".env.dev";
dotenv.config({ path: envFile });

import { ApplicationCommandOptionType, REST, Routes } from "discord.js";

const commands = [
  {
    name: "purr",
    description: "Replies with Purr!",
  },
  {
    name: "rps",
    description: "Starts Game of Rock Paper Scissors!",
  },
  {
    name: "join-rps",
    description: "Joins the Rock Paper Scissors game!",
  },
  {
    name: "begin-rps",
    description: "Begins the Rock Paper Scissors game!",
  },
  {
    name: "del-rps",
    description: "Deletes the current Rock Paper Scissors game!",
  },
  {
    name: "set-bt",
    description: "Sets Bear Trap",
    required: true,
    options: [
      {
        name: "trap",
        description: "Choose which bear trap to set",
        type: ApplicationCommandOptionType.Integer,
        required: true,
        choices: [
          { name: "BT1", value: 1 },
          { name: "BT2", value: 2 },
        ],
      },
    ],
  },
  {
    name: "dice",
    description: "Predict the dice number nearest to the actual roll!",
  },
  {
    name: "join-dice",
    description: "Joins the Dice Prediction game!",
    options: [
      {
        name: "number",
        description: "Choose a number from 1 to 6",
        type: ApplicationCommandOptionType.Integer,
        required: true,
        choices: [
          { name: "1", value: 1 },
          { name: "2", value: 2 },
          { name: "3", value: 3 },
          { name: "4", value: 4 },
          { name: "5", value: 5 },
          { name: "6", value: 6 },
        ],
      },
    ],
  },
  {
    name: "roll-dice",
    description: "Rolls a dice from 1 to 6",
  },
  {
    name: "del-dice",
    description: "Deletes the current Dice Prediction game!",
  },
  {
    name: "help",
    description: "Shows help information!",
    options: [
      {
        name: "with",
        description: "Choose a category to get help on",
        type: ApplicationCommandOptionType.Integer,
        required: true,
        choices: [
          { name: "General Commands", value: 1 },
          { name: "Rock Paper Scissors Commands", value: 2 },
          { name: "Dice Prediction Commands", value: 3 },
          { name: "Bear Trap Commands", value: 4 },
          { name: "Translation Commands", value: 5 },
        ],
      },
    ],
  },
];

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

try {
  console.log("Started refreshing application (/) commands.");

  await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), {
    body: commands,
  });

  console.log("Successfully reloaded application (/) commands.");
} catch (error) {
  console.error(error);
}
