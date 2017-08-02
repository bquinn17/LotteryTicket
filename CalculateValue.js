/**
 * Created by Bryan Quinn on 7/28/2016.
 *
 * This file is used to calculate the expected value of a
 *  Powerball ticket based on the current estimated jackpot.
 *
 * Expected Value is defined as a predicted value of a variable,
 *  calculated as the sum of all possible values each multiplied by
 *  the probability of its occurrence.
 *
 * Here is a general breakdown and walk through of a similar problem:
 *  www.khanacademy.org/math/probability/random-variables-topic/expected-value/v/expected-value-profit-lottery-ticket
 */

var pricePerTicket;
var numberOfTickets;
var PowerBallOrMegaMillions;

function translateToNumber(numString){
    var pieces = numString.split(" ");
    var leadingNumber = 0;
    var trailingWord = "";

    if (pieces.length == 2){
        leadingNumber = pieces[0];
        trailingWord = pieces[1];
    }
    trailingWord = trailingWord.toLowerCase();
    if(trailingWord == "million"){
        leadingNumber *= 1000000;
    }
    else if (trailingWord == "billion"){
        leadingNumber *= 1000000000;
    }
    return leadingNumber;
}

function oddsOfWinningJackpot(){
    if (PowerBallOrMegaMillions == "p"){
        return 1/292201338.00; // 1 / ((69 choose 5) * (26 choose 1))
    } else {
        return 1/258890850.00; // 1 / ((75 choose 5) * (15 choose 1))
    }
}

function otherPrizeWon(){
    //Expected value of winning a prize other than the jackpot
    //Since this is constant we can calculate it ahead of time
    //Please note that these odds are exclusive, and do not
    //  trickled down. Meaning that the odds represent the chance
    //  of that single event happening, and nothing else. For example
    //  the odds of matching one red ball, do not include the odds of
    //  winning another prize that includes matching one red ball.

    if (PowerBallOrMegaMillions == "p"){ //Powerball
        //See PBWinningTable.PNG for ways to win
        //1 in 11,688,053.52 * ($1,000,000 - $2) = 0.08555727421
        //1 in 913,129.18    * ($50,000 - $2)    = 0.05475457481
        //1 in 36,525.17     * ($100 - $2)       = 0.00268308128
        //1 in 14,494.11     * ($100 - $2)       = 0.0067613672
        //1 in 579.76        * ($7 - $2)         = 0.00862425831
        //1 in 701.33        * ($7 - $2)         = 0.00712931145
        //1 in 91.98         * ($4 - $2)         = 0.02174385736
        //1 in 38.32         * ($4 - $2)         = 0.0521920668
        //add them all together                  = 0.23944579142
        return 0.23944579142;

    } else { //MegaMillions
        //See MMWinningTable.PNG for ways to win
        //1 in 18,492,203.57 * ($1,000,000 - $1) = 0.0540767895
        //1 in 739,688.14    * ($5,000 - $1)     = 0.00675825355
        //1 in 52,834.87     * ($500 - $1)       = 0.00944452025
        //1 in 10,720.12     * ($50 - $1)        = 0.00457084435
        //1 in 766.72        * ($5 - $1)         = 0.00521702838
        //1 in 472.95        * ($5 - $1)         = 0.00845755365
        //1 in 56.47         * ($2 - $1)         = 0.01770851779
        //1 in 21.39         * ($1 - $1)         = 0.0
        //add them all together                  = 0.10623350747
        return 0.10623350747;
    }
}

function noPrizeWon(){
    // 1 - the odds of winning any other prize
    var chanceOfLosing;
    if (PowerBallOrMegaMillions == "p"){
        chanceOfLosing = 0.97368;
    }else {
        chanceOfLosing = 0.930990;
    }
    return chanceOfLosing * (-1 * pricePerTicket);
}

function oddsOfSplittingThePot(jackpot){
    //Returns a value that represents the probability of the size of your
    //jackpot after accounting for the probability of splitting the pot
    //between multiple winners
    //TODO this feature is not yet ready to be implemented
    var numOfPlayers = numberOfPlayers(jackpot, getLastJackpot());

    //the odds that someone else will win the jackpot given that you have won
    var odds = oddsOfWinningJackpot() * numOfPlayers;

    var numberOfWinners = 1;
    while (odds > 0.00001){ //value is basically negligible past this point
        odds = odds * Math.pow(oddsOfWinningJackpot(), numberOfWinners);
        numberOfWinners += 1;
    }

    return jackpot; //- (jackpot * odds);
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

function setValuesOnPage(expectedValue) {
    document.getElementById(PowerBallOrMegaMillions + "_value").innerHTML += expectedValue.toFixed(2);
}

function calculateValue(P_or_M, estimatedJackpot, price, count){
    PowerBallOrMegaMillions = P_or_M;
    estimatedJackpot = estimatedJackpot.replace("$", "");
    estimatedJackpot = estimatedJackpot.trim();
    document.getElementById(P_or_M + "_jackpot").innerHTML += estimatedJackpot;
    document.getElementById(P_or_M + "_price").innerHTML += price.toFixed(2);
    pricePerTicket = price;
    numberOfTickets = count;

    var jackPot = translateToNumber(estimatedJackpot);
    var jackpotAfterSplit = oddsOfSplittingThePot(jackPot);

    var expectedValue =
        (jackpotAfterSplit * oddsOfWinningJackpot()) //expected profit of jackpot
        + otherPrizeWon() //expected profit of other prize
        + noPrizeWon(); //expected profit of losing

    setValuesOnPage(expectedValue);
}
