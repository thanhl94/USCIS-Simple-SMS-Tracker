#!/bin/bash

# Read the README.md before running this script!
export CHECKER_DURATION=30
export CHECKER_FREQUENCY=12
export USCIS_CASE_ID=NBCXXXXXXXXXX
export SMS_TO=+1234567890
export TWILIO_FROM_NUMBER=+4567890123
export TWILIO_ACCOUNT_SID=XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
export TWILIO_AUTH_TOKEN=XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

node run.js