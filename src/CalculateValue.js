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

const GAMES = {
    p: {
        // Powerball: 1 / ((69 choose 5) * (26 choose 1))
        jackpotOdds: 1 / 292201338,
        // See PBWinningTable.PNG for the per-prize breakdown that produces this constant.
        // Sum of P(prize) * (prize - ticketPrice) for every non-jackpot prize tier.
        otherPrizeEV: 0.23944579142,
        // 1 - P(winning any prize)
        loseProbability: 0.97368,
        // Jackpot resets to this value after a winner
        resetJackpot: 40_000_000,
    },
    m: {
        // MegaMillions: 1 / ((75 choose 5) * (15 choose 1))
        jackpotOdds: 1 / 258890850,
        // See MMWinningTable.PNG for the per-prize breakdown that produces this constant.
        otherPrizeEV: 0.10623350747,
        loseProbability: 0.930990,
        resetJackpot: 40_000_000,
    },
};

function formatJackpotForDisplay(jackpotValue) {
    if (jackpotValue >= 1_000_000_000) {
        return (jackpotValue / 1_000_000_000).toFixed(1).replace(/\.0$/, "") + " Billion";
    }
    return (jackpotValue / 1_000_000).toFixed(1).replace(/\.0$/, "") + " Million";
}

function noPrizeEV(game, pricePerTicket) {
    return game.loseProbability * (-1 * pricePerTicket);
}

// TODO: dead code path. Wire this back into calculateValue once the
//   split-the-pot model is finished. See numberOfPlayers / getLastJackpot below.
function oddsOfSplittingThePot(game, jackpot, pricePerTicket) {
    // Returns a value that represents the probability of the size of your
    // jackpot after accounting for the probability of splitting the pot
    // between multiple winners.
    const numOfPlayers = numberOfPlayers(game, jackpot, getLastJackpot(game), pricePerTicket);

    // The odds that someone else will win the jackpot given that you have won.
    let odds = game.jackpotOdds * numOfPlayers;

    let numberOfWinners = 1;
    while (odds > 0.00001) { // value is basically negligible past this point
        odds = odds * Math.pow(game.jackpotOdds, numberOfWinners);
        numberOfWinners += 1;
    }

    return jackpot; // - (jackpot * odds);
}

function numberOfPlayers(game, thisJackpot, lastJackpot, pricePerTicket) {
    // Calculate the number of tickets sold.
    if (lastJackpot > thisJackpot) { // jackpot was won
        lastJackpot = thisJackpot - game.resetJackpot;
    }
    const ticketSales = thisJackpot - lastJackpot;
    // TODO account for PowerPlay and Megaplier
    return ticketSales / pricePerTicket;
}

function getLastJackpot(game) {
    // TODO request jackpot from the last drawing
    return game.resetJackpot;
}

function setValuesOnPage(gameKey, expectedValue) {
    document.getElementById(gameKey + "_value").innerHTML += expectedValue.toFixed(2);
}

function calculateValue(gameKey, estimatedJackpot, pricePerTicket, numberOfTickets) {
    const game = GAMES[gameKey];

    let jackpotValue = Number(estimatedJackpot);
    if (!Number.isFinite(jackpotValue) || jackpotValue < 0) {
        jackpotValue = 0;
    }

    document.getElementById(gameKey + "_jackpot").innerHTML += formatJackpotForDisplay(jackpotValue);
    document.getElementById(gameKey + "_price").innerHTML += pricePerTicket.toFixed(2);

    // TODO: numberOfTickets is accepted for future use (multi-ticket EV scaling)
    //   but not yet incorporated into the calculation.

    // TODO: oddsOfSplittingThePot is unfinished — once ready, replace
    //   jackpotValue below with oddsOfSplittingThePot(game, jackpotValue, pricePerTicket).
    const expectedValue =
        (jackpotValue * game.jackpotOdds)  // expected profit of jackpot
        + game.otherPrizeEV                 // expected profit of other prize
        + noPrizeEV(game, pricePerTicket);  // expected profit of losing

    setValuesOnPage(gameKey, expectedValue);
}
