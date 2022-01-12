const { Client, Intents, MessageEmbed } = require('discord.js');
require('fs');
const _ = require('lodash');

const { token } = require('./config.json');

const CONSTANTS = require('./resources/constants.json');

const Fantohm = require('./Fantohm');

const client = new Client({ intents: [Intents.FLAGS.GUILDS] });

let guildMember = null;

let clientReady = false;

const prieDisplayUpdateInterval = CONSTANTS.POLL_RATE_MINS * 60 * 1000;

let oldRebaseEta = null;
let oldPrice = null;
let updatingPriceBotDisplay = false;

let priceBotDisplayErrCount = 0;
let oldFtmMetrics;
let oldMoonMetrics;


const checkValues = (obj, oldMetrics) => {
    Object.keys(obj).forEach((k) => {
        obj[k] = obj[k] ? obj[k] : (oldMetrics[k] ? oldMetrics[k] : 'N/A');
    });
    return obj;
};

const updatePriceBotDisplay = async () => {
    try {
        console.debug("\n" + new Date() + " updatePriceBotDisplay **************")

        if (clientReady && !updatingPriceBotDisplay) {
            let metrics;
            try {
                metrics = await Fantohm.getProtocolMetricsFromWebUI();
            }
            catch (error) {
                console.error("Error fetching metrics from web UI ", error);
                await new Promise((resolve) => setTimeout(resolve, CONSTANTS.ERROR_WAIT_MINS * 60 * 1000));
                updatingPriceBotDisplay = false;
                await updatePriceBotDisplay();
                return;
            }

            const moonRiverMetrics = checkValues(metrics.moon, oldMoonMetrics);
            oldFtmMetrics = _.cloneDeep(metrics.ftm);

            updatingPriceBotDisplay = true;

            if (oldRebaseEta !== moonRiverMetrics.rebaseEta) {
                oldRebaseEta = moonRiverMetrics.rebaseEta;

                await client.user.setActivity('Rebase ' + moonRiverMetrics.rebaseEta, { type: 'WATCHING' });

                console.debug("\n" + new Date() + " rebase eta update sent!");
            }

            if (oldPrice !== moonRiverMetrics.price) {
                oldPrice = moonRiverMetrics.price;

                await guildMember.setNickname(moonRiverMetrics.price + ghostEmoji + " FHM.m");
            }

        }
        setTimeout(updatePriceBotDisplay, prieDisplayUpdateInterval);

    }
    catch (error) {
        console.error(new Date() + " " + error);
        priceBotDisplayErrCount++;
        if (priceBotDisplayErrCount < CONSTANTS.MAX_RETRY_COUNT + 1) {
            await new Promise((resolve) => setTimeout(resolve, CONSTANTS.ERROR_WAIT_MINS * 60 * 1000));
            console.debug("priceBotDisplayErrCount:" + priceBotDisplayErrCount + " max:" + CONSTANTS.MAX_RETRY_COUNT);
            await updatePriceBotDisplay();
        }
    }
    finally {
        updatingPriceBotDisplay = false;
    }
};

const ghostEmoji = String.fromCodePoint(0x1F47B);

client.login(token);

const init = async () => {

    client.once('ready', async () => {

        guildMember = await client.guilds.cache.first().me;

        clientReady = true;

        console.debug(new Date() + "Client Ready");
        await updatePriceBotDisplay();
    });
}

init();


