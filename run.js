// License under Apache 2.0
// Author: Thanh Le
// Email: thanhvle2013@gmail.com

const puppeteer = require('puppeteer')
const fs = require('fs/promises')
const sms = require('./sms.js');

async function getNoticeStatus(uscisNoticeId)
{
    // Init URL
    const uscisRequestUrl = 'https://egov.uscis.gov/casestatus/mycasestatus.do?appReceiptNum='
    const url = uscisRequestUrl + uscisNoticeId
    // Init puppeteer
    const browser = await puppeteer.launch()
    const page = await browser.newPage()
    await page.goto(url)

    const caseStatusRow = await page.evaluate( () => {
        return Array.from(document.querySelectorAll('.rows h1')).map(x => x.textContent)
    })

    const caseStatusCenter = await page.evaluate( () => {
        return Array.from(document.querySelectorAll('.text-center h1')).map(x => x.textContent)
    })

    const caseBodyMessage = await page.evaluate( () => {
        return Array.from(document.querySelectorAll('.text-center p')).map(x => x.textContent)
    })
    
    browser.close()

    if(caseStatusRow[0] === caseStatusCenter[0])
    {
        let caseMessages = {status : caseStatusRow[0], body: caseBodyMessage[0]}
        return caseMessages
    }
    else
    {
        let arrayStatus = Array()
        arrayStatus.push(caseStatusRow[0])
        arrayStatus.push(caseStatusCenter[0])

        return arrayStatus
    }
}

function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

async function writeLog(msg)
{
    let now = new Date();
    let writeMsg = now.toString() + ': ' + msg + '\n'
    await fs.appendFile('log.txt', writeMsg)
}

// Send a single message to number
async function sendToSms(message, number)
{
    let smsSendStatus = await sms.sendMessage(message, number)
    if(smsSendStatus === 'queued')
    {
        writeLog('[STATUS] SMS with the message [' + message + '] sent succesfully')
    }
    else
    {
        writeLog('[WARNING] SMS with the message [' + message + '] sent failed')
    }
}
async function start(caseId)
{
    const smsNumber = process.env.SMS_TO
    const msCheckFrequency = process.env.CHECKER_FREQUENCY * 3600000
    let counts = process.env.CHECKER_DURATION * 2
    let runIndef = false
    let previousStatus = ''

    if(counts == 0)
    {
        runIndef = true
    }

    while(counts >= 0)
    {
        const respondMessage = await getNoticeStatus(caseId)
        if(Array.isArray(respondMessage))
        {
            writeLog('[WARNING] Case status does not match! Trying again later.')
            writeLog('[WARNING] Case status 1: ' + respondMessage[0])
            writeLog('[WARNING] Case status 2: ' + respondMessage[1])
        }
        else if(respondMessage)
        {
            let caseStatusMessage = respondMessage.status
            let caseBodyMessage = respondMessage.body
            if(previousStatus != caseStatusMessage)
            {
                let sendStatusMessage = 'Case ID: ' + caseId + ' was updated to [' + caseStatusMessage + ']'
                let sendBodyMessage = 'With a message [' + caseBodyMessage + ']'
                writeLog('[STATUS] Case updated from ' + previousStatus + ' to ' + caseStatusMessage)
                if(smsNumber)
                {
                    sendToSms(sendStatusMessage, smsNumber)
                    sendToSms(sendBodyMessage, smsNumber)
                }
                previousStatus = caseStatusMessage
            }
            else
            {
                writeLog('[STATUS] Received status: ' + caseStatusMessage)
            }
        }
        else
        {
            let message = 'Server failed to get a respond.'
            if(smsNumber)
            {
                sendToSms(message, smsNumber)
            }

            writeLog('[ERROR] Cannot get status from USCIS')
            writeLog('[ERROR] Received: ' + caseStatus)
            console.log('[' + counts + '] Program stopped due to an error. Check log.txt')

            return 1
        }
        console.log('[' + counts + '] Program is running, waiting to check again...')

        // Check if run indefinitely
        if(!runIndef)
        {
            counts -= 1
        }

        // Wait 12 hours and check again
        await sleep(msCheckFrequency)
    }
}

start(process.env.USCIS_CASE_ID)