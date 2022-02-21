const puppeteer = require('puppeteer');
const CONSTANTS = require('./resources/constants.json');

let launchMethod = 1;

const processDashboardMetrics = (dashboardMetrics) => {
    const metrics = {
        price: '',
        apy: '',
        marketCap: '',
        totalCircSupply: '',
        tvl: '',
        fiveDayRate: '',
        stakedFHM: '',
        globalMarketcap: ''
    };

    dashboardMetrics.forEach(x => {
        if (!metrics.price && !x.startsWith("MwsFHM Price") && !x.startsWith("FwsFHM Price") && !x.includes("WebsiteGovernanceDocs") && x.startsWith("FHM Price")) {
            metrics.price = x.substring(x.indexOf("FHM Price") + 9, x.indexOf("Market Cap"));
            //metrics.marketCap = x.substring(x.indexOf("Market Cap") + 10, x.indexOf("Circulating Supply"));
            metrics.totalCircSupply = x.substring(x.indexOf("Circulating Supply") + 18, x.indexOf("Global APY"));
            //metrics.apy = x.substring(x.indexOf("Global APY") + 10, x.indexOf("Treasury Balance"));
            metrics.marketCap = x.substring(x.indexOf("Treasury Balance") + 16, x.indexOf("Book value"));
        }
        if (!metrics.fiveDayRate && x.startsWith("5-Day Rate")) {
            metrics.fiveDayRate = x.substring(x.indexOf("5-Day Rate") + 10);
        }
        if (!metrics.fiveDayRate && x.startsWith("5-Day Rate")) {
            metrics.fiveDayRate = x.substring(x.indexOf("5-Day Rate") + 10);
        }
        if (!metrics.stakedFHM && x.startsWith("Staked FHM") && x.length > 10) {
            metrics.stakedFHM = x.substring(x.indexOf("Staked FHM") + 10);
        }
        if (!metrics.globalMarketcap && x.startsWith("Total Value Deposited") && x.length > 21) {
            metrics.globalMarketcap = x.substring(x.indexOf("Total Value Deposited") + 21);
        }
    });

    return metrics;
}


const getProtocolMetricsFromWebUI = async () => {
    let browser;

    if (launchMethod === 1) {
        try {
            browser = await puppeteer.launch();
        }
        catch (error) {
            console.error(new Date() + " " + error);
            launchMethod = 2;
        }
    }

    if (launchMethod === 2) {
        browser = await puppeteer.launch({ executablePath: 'chromium-browser' });
    }

    const page = await browser.newPage();
    await page.goto(CONSTANTS.FHM_STATS_DASHBOARD_URL,
        {
            waitUntil: 'networkidle2',
            timeout: CONSTANTS.SCRAPER_PAGE_LOAD_TIMEOUT_MINS * 60 * 1000
        });

    let dashboardMetrics = await page.evaluate(() => {
        return Array.from(document.querySelectorAll("div.MuiBox-root")).map(x => x.textContent)
    });

    const metrics = {};

    metrics.ftm = processDashboardMetrics(dashboardMetrics);

    await page.goto(CONSTANTS.FHM_STAKING_URL,
        {
            waitUntil: 'networkidle2',
            timeout: CONSTANTS.SCRAPER_PAGE_LOAD_TIMEOUT_MINS * 60 * 1000
        });

    let stakingMetrics = await page.evaluate(() => {
        return Array.from(document.querySelectorAll("div.rebase-timer")).map(x => x.textContent)
    });

    metrics.ftm.rebaseEta = stakingMetrics[0].replace(" to next rebase", "");

    let valueDeposited = await page.evaluate(() => {
        return Array.from(document.querySelectorAll("h4.MuiTypography-root")).map(x => x.textContent)
    });

    metrics.ftm.apy = valueDeposited[0];
    metrics.ftm.tvl = valueDeposited[1];

    //Moonriver stats
    await page.goto(CONSTANTS.FHM_STATS_DASHBOARD_URL,
        {
            waitUntil: 'networkidle2',
            timeout: CONSTANTS.SCRAPER_PAGE_LOAD_TIMEOUT_MINS * 60 * 1000
        });

    await page.evaluate(() => {
        localStorage.setItem('defaultNetworkId', '1285');
    });

    await page.goto(CONSTANTS.FHM_STATS_DASHBOARD_URL,
        {
            waitUntil: 'networkidle2',
            timeout: CONSTANTS.SCRAPER_PAGE_LOAD_TIMEOUT_MINS * 60 * 1000
        });

    dashboardMetrics = await page.evaluate(() => {
        return Array.from(document.querySelectorAll("div.MuiBox-root")).map(x => x.textContent)
    });

    metrics.moon = processDashboardMetrics(dashboardMetrics);


    await page.goto(CONSTANTS.FHM_STAKING_URL,
        {
            waitUntil: 'networkidle2',
            timeout: CONSTANTS.SCRAPER_PAGE_LOAD_TIMEOUT_MINS * 60 * 1000

        });

    stakingMetrics = await page.evaluate(() => {
        return Array.from(document.querySelectorAll("div.rebase-timer")).map(x => x.textContent)
    });

    metrics.moon.rebaseEta = stakingMetrics[0].replace(" to next rebase", "");

    stakingMetrics = await page.evaluate(() => {
        return Array.from(document.querySelectorAll("div.rebase-timer")).map(x => x.textContent)
    });

    metrics.moon.rebaseEta = stakingMetrics[0].replace(" to next rebase", "");

    valueDeposited = await page.evaluate(() => {
        return Array.from(document.querySelectorAll("h4.MuiTypography-root")).map(x => x.textContent)
    });

    metrics.moon.apy = valueDeposited[0];
    metrics.moon.tvl = valueDeposited[1];

    await browser.close();
    return metrics;
};



module.exports = { getProtocolMetricsFromWebUI };