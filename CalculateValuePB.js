/**
 * Created by Bryan.Quinn on 7/28/2016.
 *
 * This file is used to calculate the expected value of a
 * Powerball ticket based on the current estimated jackpot.
 *
 * Note: Due cross domain request issues and lack of API,
 *     jackpot data must be entered manually.
 *
 * Note: this file does not yet fully support the rules of MegaMillions.
 */

const oddsOfWinningJackpot = 1/292201338; // (69 choose 5) * (26 choose 1)
var pricePerTicket;
var numberOfTickets;
var PowerBallOrMegaMillions;

function translate(numString){
    var pieces = numString.split(" ");
    var leadingNumber = 0;
    var trailingWord = "";

    if (pieces.length == 2){
        leadingNumber = pieces[0];
        trailingWord = pieces[1];
    }
    trailingWord = trailingWord.toLowerCase()
    if(trailingWord == "million"){
        leadingNumber *= 1000000;
    }
    else if (trailingWord == "billion"){
        leadingNumber *= 1000000000;
    }
    return leadingNumber;
}

function withoutJackpot(){
    //Expected value of winning a prize other than the jackpot
    //Since this is constant we can calculate it ahead of time
    if (PowerBallOrMegaMillions == "p"){ //Powerball
        //See PBWinningTable.PNG for ways to win
        //1 in 11,688,053.52 * $1,000,000 = .085567
        //1 in 913,129.18    * $50,000    = .054756
        //1 in 36,525.17     * $100       = .002737
        //1 in 14,494.11     * $100       = .006899
        //1 in 579.76        * $7         = .012074
        //1 in 701.33        * $7         = .009981
        //1 in 91.98         * $4         = .043488
        //1 in 38.32         * $4         = .104384
        //add them all together           = .319878
        return .319878;
    } else { //MegaMillions
        //See MMWinningTable.PNG for ways to win
        //1 in 18,492,204 * $1,000,000 = .054077
        //1 in 739,688    * $5,000     = .006760
        //1 in 52,835     * $500       = .009463
        //1 in 10,720     * $50        = .004664
        //1 in 766        * $5         = .006527
        //1 in 473        * $5         = .010571
        //1 in 56         * $2         = .035714
        //1 in 21         * $1         = .047619
        //add them all together        = .175396
        return .175396;
    }
}

function numberOfPlayers(thisJackpot, lastJackpot){
    //Calculate the number of tickets sold
    if (lastJackpot > thisJackpot){ //jackpot was won
        lastJackpot = thisJackpot - 40000000; //jackpot resets to 40 Million
    }
    var ticketSales = thisJackpot - lastJackpot;
    //TODO account for PowerPlay and Megaplier
    return ticketSales / pricePerTicket;
}

function getLastJackpot() {
    //TODO request jackpot from the last drawing
    if (PowerBallOrMegaMillions == "p") {
        return 67000000;
    } else {
        return 40000000;
    }
}

function oddsOfSplittingThePot(jackpot){
    //Returns a value that represents the probability of the size of your
    //jackpot after accounting for the probability of splitting the pot
    //between multiple winners
    //TODO
    var numOfPlayers = numberOfPlayers(jackpot, getLastJackpot());

    //the odds that someone else will win the jackpot given that you have won
    var odds = oddsOfWinningJackpot * numOfPlayers;

    var numberOfWinners = 1;
    while (odds > 0.00001){ //value is basically negligible past this point
        odds = odds * Math.pow(oddsOfWinningJackpot, numberOfWinners);
        numberOfWinners += 1;
    }

    return jackpot; //- (jackpot * odds);
}

function setValuesOnPage(expectedValue) {
    document.getElementById(PowerBallOrMegaMillions + "_worth").innerHTML += expectedValue.toFixed(2);
    document.getElementById(PowerBallOrMegaMillions + "_value").innerHTML +=
        (expectedValue - pricePerTicket).toFixed(2);
}

function calculateValue(PorM, estimatedJackpot, price, count){
    PowerBallOrMegaMillions = PorM;
    estimatedJackpot = estimatedJackpot.replace("$", "");
    estimatedJackpot = estimatedJackpot.trim();
    document.getElementById(PorM + "_jackpot").innerHTML += estimatedJackpot;
    document.getElementById(PorM + "_price").innerHTML += price.toFixed(2);
    pricePerTicket = price;
    numberOfTickets = count;

    var jackPot = translate(estimatedJackpot);
    var jackpotAfterSplit = oddsOfSplittingThePot(jackPot);
    var expectedValue = (jackpotAfterSplit * oddsOfWinningJackpot) + withoutJackpot();
    setValuesOnPage(expectedValue);
}



