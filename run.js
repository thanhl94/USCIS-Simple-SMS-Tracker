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
        console.log('[STATUS] Notification was sent to the provided number')
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
    
    let days = process.env.CHECKER_DURATION
    let now = new Date();
    let lastDay = now.setDate(now.getDate() + days)
    let previousStatus = ''

    // Validation. If days is set to negative value, then we treat as indefinitely
    if(days < 0)
    {
        days = 0
    }

    while(true)
    {
        if(days && now > lastDay)
        {
            return 0
        }

        const respondMessage = await getNoticeStatus(caseId)
        if(Array.isArray(respondMessage))
        {
            let logMessage = '[STATUS] Case status does not match! Trying again later'
            console.log(logMessage)
            writeLog(logMessage)
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
                writeLog('[STATUS] Case updated with the body message: ' + sendBodyMessage)
                console.log('[STATUS] Case has a new status!')
                if(smsNumber)
                {
                    await sendToSms(sendStatusMessage, smsNumber)
                    await sleep(500)
                    await sendToSms(sendBodyMessage, smsNumber)
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
            let logMessage = '[ERROR] Cannot get status from USCIS'
            console.log(logMessage)
            writeLog(logMessage)
            writeLog('[ERROR] Received: ' + respondMessage)

            return 1
        }
        
        console.log('[STATUS] Program is running, waiting to check again...')

        // Wait 12 hours and check again
        await sleep(msCheckFrequency)
    }
}

start(process.env.USCIS_CASE_ID)