/**
 * Created by Bryan.Quinn on 7/28/2016.
 */

function translate(numString){
    var pieces = numString.split(" ")
    var leadingNumber = 0;
    var trailingWord = "";

    if (pieces.length == 2){
        leadingNumber = pieces[0]
        trailingWord = pieces[1]
    }
    else if(pieces.length == 3){
        leadingNumber = pieces[1]
        trailingWord = pieces[2]
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
    return 0;
}

var jackPot = translate("23.3 Million");
console.log(jackPot);


