/**
 * Created by Bryan.Quinn on 7/28/2016.
 */

oddsOfWinningJackpot = 1/292201338; // (69 choose 5) * (26 choose 1)

function translate(numString){
    numString.replace("$", "");
    numString.trim();
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
    var ticketSales = 0;
    if (lastJackpot > thisJackpot){ //jackpot was won
        ticketSales = thisJackpot - 40000000; //jackpot resets to 40 Million
    } else{
        ticketSales = thisJackpot - lastJackpot;
    }
    return ticketSales / 2; //$2 per ticket
}

var jackPot = translate("23.3 Million");
console.log(jackPot);


