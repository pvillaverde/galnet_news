import { Webhook } from "npm:simple-discord-webhooks";
import { Logger } from "npm:tslog";
interface GalnetNew {
   id: string;
   message: string;
   published_at: number;
}
// Setup Variables
const WEBHOOK_URL = new URL(Deno.env.get("WEBHOOK_URL") as string,)
const LANGUAGE = Deno.env.get("LANGUAGE") || "en-GB";
const saveFile = Deno.env.get("SAVE_PATH") || "/data/last_record.txt";
const API_URL = `https://cms.zaonce.net/${LANGUAGE}/jsonapi/node/galnet_article?&sort=-published_at&page[offset]=0&page[limit]=1`

const logger = new Logger({
   minLevel: 2, // DEBUG
   type: "pretty",
   prettyLogTimeZone: 'local',
});

async function readfromFile(filePath: string): Promise<string | null> {
   try {
      const data = await Deno.readTextFile(filePath);
      return data.trim();
   } catch (error) {
      return error instanceof Deno.errors.NotFound ? null : error;
   }
}

async function fetchFromApi(): Promise<GalnetNew | null> {
   const response = await fetch(API_URL);
   const article = await response.json();
   // Did we get any data
   if (article.data && article.data[0]) {
      let title = "__**" + article.data[0].attributes.title + "**__\n";
      let date = "_" + article.data[0].attributes.field_galnet_date + "_\n";
      let link = `https://community.elitedangerous.com/${article.data[0].attributes.langcode}/galnet/uid/` + article.data[0].attributes.field_galnet_guid + "\n";
      let body = ">>> " + article.data[0].attributes.body.value;
      body = body.replace(/(\*|_|`|~|\\)/g, '\\$1');
      const id = article.data[0].id;
      const message = title.concat(date, link, body);
      const published_at = Date.parse(article.data[0].attributes.published_at);
      return { id, published_at, message };
   } else {
      // we received no data, skip this time
      logger.info("Received no data, skipping this run.");
      return null;
   }
}

// Function extracted from discord.js
function splitMessage(text: any, { maxLength = 2000, char = '\n', prepend = '', append = '' } = {}) {
   if (text.length <= maxLength) return [text];
   let splitText = [text];
   if (Array.isArray(char)) {
      while (char.length > 0 && splitText.some(elem => elem.length > maxLength)) {
         const currentChar = char.shift();
         if (currentChar instanceof RegExp) {
            splitText = splitText.flatMap(chunk => chunk.match(currentChar));
         } else {
            splitText = splitText.flatMap(chunk => chunk.split(currentChar));
         }
      }
   } else {
      splitText = text.split(char);
   }
   if (splitText.some(elem => elem.length > maxLength)) throw new RangeError('SPLIT_MAX_LEN');
   const messages = [];
   let msg = '';
   for (const chunk of splitText) {
      if (msg && (msg + char + chunk + append).length > maxLength) {
         messages.push(msg + append);
         msg = prepend;
      }
      msg += (msg && msg !== prepend ? char : '') + chunk;
   }
   return messages.concat(msg).filter(m => m);
}

async function main() {
   try {
      const storedId = await readfromFile(saveFile);
      const latestNew = await fetchFromApi();

      if (latestNew && storedId !== latestNew.id) {
         logger.info(`ID has changed from ${storedId} to ${latestNew.id}. Updating...`);
         const webhook = new Webhook(WEBHOOK_URL);
         logger.info(latestNew.message);
         const messageChunks = splitMessage(latestNew.message, {
            maxLength: 2000,
            prepend: '>>> ',
            char: '\n'
         });
         messageChunks.forEach(async chunk => {
            await webhook.send(chunk);
         });
         //await Deno.writeTextFile(saveFile, latestNew.id);
      } else {
         logger.info(`ID has not changed. Current ID is ${storedId}.`);
      }
   } catch (error) {
      logger.error(error)
   }
}

main().catch(logger.error);
