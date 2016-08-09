/**
 * Created by Bryan.Quinn on 7/28/2016.
 *
 * This file is used to calculate the expected value of a
 * Powerball ticket based on the current estimated jackpot
 *
 * Note: this file does not yet support the rules of MegaMillions
 */

oddsOfWinningJackpot = 1/292201338; // (69 choose 5) * (26 choose 1)

function translate(numString){
    numString = numString.replace("$", "");
    numString = numString.trim();
    var pieces = numString.split(" ");
    var leadingNumber = 0;
    var trailingWord = "";

    if (pieces.length == 2){
        leadingNumber = pieces[0];
        trailingWord = pieces[1]
    }

    if(trailingWord == "Million"){
        leadingNumber *= 1000000
    }
    else if (trailingWord == "Billion"){
        leadingNumber *= 1000000000
    }

    return leadingNumber;
}

function withoutJackpot(){
    //Expected value of winning a prize other than the jackpot
    //Since this is constant we can calculate it ahead of time
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
}

function numberOfPlayers(thisJackpot, lastJackpot){
    //Calculate the number of tickets sold
    var ticketSales = 0;
    if (lastJackpot > thisJackpot){ //jackpot was won
        ticketSales = thisJackpot - 40000000; //jackpot resets to 40 Million
    } else{
        ticketSales = thisJackpot - lastJackpot;
    }
    //TODO account for that fact that Powerplay tickets which cost $3
    return ticketSales / 2; //$2 per ticket
}

function oddsOfSplittingThePot(jackpot){
    //Returns a value that represents the probability of the size of your
    //jackpot after accounting for the probability of splitting the pot
    //between multiple winners
    //TODO
    return jackpot;
}

function setValuesOnPage(expectedValue) {
    document.getElementById("worth").innerHTML += expectedValue.toFixed(2);

    document.getElementById("value").innerHTML += (expectedValue - 2).toFixed(2);
}

function calculateValue(estimatedJackpot){
    //TODO get estimated jackpot from html on Powerball website

    document.getElementById("jackpot").innerHTML += estimatedJackpot;

    var jackPot = translate(estimatedJackpot);

    var expectedValue = (jackPot * oddsOfWinningJackpot) + withoutJackpot();
    setValuesOnPage(expectedValue);
}



