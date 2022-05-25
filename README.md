# REQUIRED enviornment variable
These are the required enviornment varibles that MUST be set in "start.sh" before running!

export CHECKER_DURATION=30 \
export CHECKER_FREQUENCY=12 \
export USCIS_CASE_ID=NBCXXXXXXXXXX \
export SMS_TO=+1234567890 \
export TWILIO_FROM_NUMBER=+4567890123 \
export TWILIO_ACCOUNT_SID=XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX \
export TWILIO_AUTH_TOKEN=XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

# Run
Simple, just do this.
> ./start.sh

The program will send the request as soon as your start.

# Configurations
Change CHECKER_DURATION to set your own custom run time by numbers of day.  \
e.g. 30 for 30 days, or 0 for indefinitely.

!!! WARNING !!!! \
Too many requests MAY get you banned from the server you're requesting to. By default this program will take in hours. To make more frequent request, feel free to change run.js => start() => const msCheckFrequency

Change the code at your own risk. \
!!! WARNING !!!!

Change CHECKER_FREQUENCY to set how frequent to check for updates by the hours. \
e.g. 12 to check for every 12 hours.


Leave TWILIO_XXX variables empty to disable SMS sending. \
Otherwise, just sign up on Twilio for free to get all the required variables.

# Next
- Check and install dependencies to run in start.sh (https://gist.github.com/winuxue/cfef08e2f5fe9dfc16a1d67a4ad38a01)
- Handle multiple USCIS cases
- Email services
- Better error handling
- Database access for log and services
- Handle multiple users
- Mobile app utilizing DB
- Comments