// License under Apache 2.0
// Author: Thanh Le
// Email: thanhvle2013@gmail.com

const puppeteer = require('puppeteer');
const fs = require('fs/promises');
const sms = require('./sms.js');
const { exit } = require('process');
const { stringify } = require('querystring');



async function getNoticeStatus(uscisNoticeId)
{
    // Init URL
    const uscisRequestUrl = 'https://egov.uscis.gov/casestatus/landing.do';
    // const uscisRequestUrl = 'https://egov.uscis.gov/casestatus/mycasestatus.do?appReceiptNum=';
    // const url = uscisRequestUrl + uscisNoticeId;
    const url = uscisRequestUrl;
    // Init puppeteer
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(url);

    await page.waitForSelector('input[name="appReceiptNum"]');
    await page.$eval('input[name="appReceiptNum"]', (el, uscisNoticeId) => {el.value = uscisNoticeId}, uscisNoticeId);
    await page.click('input[type="submit"]');
    await page.waitForSelector('div[class="close-icon"]');

    const caseStatusHeader = await page.evaluate( () => {
        return Array.from(document.querySelectorAll('.rows.text-center h1')).map(x => x.textContent);
    })

    const caseBodyMessage = await page.evaluate( () => {
        return Array.from(document.querySelectorAll('.rows.text-center p')).map(x => x.textContent);
    })

    browser.close()

    // If it has something, either or then update
    if(caseStatusHeader || caseBodyMessage)
    {
        let caseMessages = {status : caseStatusHeader[0], body: caseBodyMessage[0]};
        return caseMessages;
    }
    
    return undefined;
}

function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

async function writeLog(msg)
{   
    const now = new Date();
    let g_creationDate = (now.toISOString().split('T')[0]).replace(/-/g, '');
    let writeMsg = now.toString() + ': ' + msg + '\n'
    await fs.appendFile(`log_${g_creationDate}.txt`, writeMsg);
}

// Send a single message to the  provided number
async function sendToSms(message, number)
{
    let smsSendStatus = await sms.sendMessage(message, number);
    if(smsSendStatus === 'queued')
    {
        writeLog('[STATUS] SMS with the message [' + message + '] sent succesfully');
        console.log('[STATUS] Notification was sent to the provided number');
    }
    else
    {
        writeLog('[WARNING] SMS with the message [' + message + '] sent failed');
    }
}

async function start(caseId)
{
    const smsNumber = process.env.SMS_TO;
    const msCheckFrequency = process.env.CHECKER_FREQUENCY * 3600000;
    
    let days = process.env.CHECKER_DURATION;
    let now = new Date();
    let lastDay = now.setDate(now.getDate() + days);
    let previousStatus = '';

    // Validation. If days is set to negative value, then we treat as indefinitely
    if(days < 0)
    {
        days = 0;
    }

    while(true)
    {
        if(days && now > lastDay)
        {
            return 0;
        }

        const respondMessage = await getNoticeStatus(caseId)
        if(respondMessage)
        {
            let caseStatusMessage = respondMessage.status;
            let caseBodyMessage = respondMessage.body;
            if(previousStatus != caseStatusMessage)
            {
                let sendStatusMessage = 'Case ID: ' + caseId + ' was updated to [' + caseStatusMessage + ']';
                let sendBodyMessage = 'With a message [' + caseBodyMessage + ']';
                
                if(process.env.TESTING_CHECKER)
                {
                    console.log(caseStatusMessage);
                    console.log(caseBodyMessage);
                }
                else if(smsNumber)
                {
                    await sendToSms(sendStatusMessage, smsNumber);
                    await sleep(500);
                    await sendToSms(sendBodyMessage, smsNumber);
                }

                console.log('[STATUS] Case updated!')
                writeLog('[STATUS] Case updated from ' + previousStatus + ' to ' + caseStatusMessage);
                writeLog('[STATUS] Case updated with the body message: ' + sendBodyMessage);

                previousStatus = caseStatusMessage;
            }
            else
            {
                writeLog('[STATUS] Received status: ' + caseStatusMessage);
            }
        }
        else
        {
            let message = 'Server failed to get a respond.';

            if(smsNumber)
            {
                sendToSms(message, smsNumber);
            }

            let logMessage = '[ERROR] Cannot get status from USCIS';
            console.log(logMessage);
            writeLog(logMessage);
            writeLog('[ERROR] Received: ' + respondMessage);
            
            return 1;
        }

        if(process.env.TESTING_CHECKER)
        {
            console.log('In testing mode, now exiting.');
            break;
        }
        else
        {
            console.log('[STATUS] Program is running, waiting to check again...');
            await sleep(msCheckFrequency);
        }
    }
}



start(process.env.USCIS_CASE_ID);