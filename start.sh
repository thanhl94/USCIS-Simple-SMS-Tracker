#!/bin/bash

# Read the README.md before running this script!
export CHECKER_DURATION=30
export CHECKER_FREQUENCY=12
export USCIS_CASE_ID=NBCXXXXXXXXXX
export SMS_TO=+1234567890
export TWILIO_FROM_NUMBER=+4567890123
export TWILIO_ACCOUNT_SID=XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
export TWILIO_AUTH_TOKEN=XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

canRun=true

function startServer()
{
    node run.js
}

function checkDependencies()
{
    echo "----------------------------"
    libPackages=("libatk1.0-0" "libatk-bridge2.0-0" "libcups2" "libxkbcommon-x11-0" "libxcomposite1" "libxdamage1" "libxfixes3" "libxrandr2" "libgbm1" "libpango-1.0-0" "libcairo2")
    for i in ${!libPackages[@]};
    do
        lib=${libPackages[$i]}
        libDpkg=$(dpkg -s libatk1.0-0 | grep '^Version:')
        if [ ! -z "$libDpkg" ]
        then
            version=${libDpkg#*: }
            echo "$lib found"
            echo "version: $version"
        else
            echo "$lib not found"
            canRun=false
        fi
        echo "----------------------------"
    done
    ######

    if command -v node >/dev/null 2>&1
    then
        echo "node found"
        echo "version: $(node -v)"
    else
        echo "node not found"
        canRun=false
    fi

    echo "----------------------------"

    nodePackages=("puppeteer" "twilio")
    for i in ${!nodePackages[@]};
    do
        package=${nodePackages[$i]}
        packageResult=$(npm list | grep $package)
        if [ ! -z "$packageResult" ]
        then
            version=${packageResult#*@}
            echo "$package found"
            echo "version: $version"
        else
            echo "$package not found"
            canRun=false
        fi
        echo "----------------------------"
    done
}

function install()
{
    libPackages=("libatk1.0-0" "libatk-bridge2.0-0" "libcups2" "libxkbcommon-x11-0" "libxcomposite1" "libxdamage1" "libxfixes3" "libxrandr2" "libgbm1" "libpango-1.0-0" "libcairo2")
    for i in ${!libPackages[@]};
    do
        lib=${libPackages[$i]}
        libDpkg=$(dpkg -s libatk1.0-0 | grep '^Version:')
        if [ -z "$libDpkg" ]
        then
            sudo apt install $lib
            echo "----------------------------"
        fi
    done
    ######

    if ! command -v node >/dev/null 2>&1
    then
        npm install node
        echo "----------------------------"
    fi

    nodePackages=("puppeteer" "twilio")
    for i in ${!nodePackages[@]};
    do
        package=${nodePackages[$i]}
        packageResult=$(npm list | grep $package)
        if [ -z "$packageResult" ]
        then
            npm install $package
            echo "----------------------------"
        fi
    done
}

function main()
{
    checkDependencies
    if [ $canRun = true ]
    then
        echo "All dependencies are good to go!"
        echo "Starting up the server..."
        startServer
    else
        echo "One or more dependency is missing."
        echo "NOTE: Type \"override\" without quotes, to force server to start."
        echo "Attempt to install the missing dependencies? [Y/n] "
        read userRespond
        lowerRespond=${userRespond,,}
        
        if [[ $lowerRespond = "n" || $lowerRespond = "no" ]]
        then
            echo "Exiting..."
            exit
        elif [[ $lowerRespond = "override" ]]
        then
            startServer
        else
            install
            sleep 5
            main
        fi
    fi
}

main