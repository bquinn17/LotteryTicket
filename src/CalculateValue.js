/**
 * Created by Bryan Quinn on 7/28/2016.
 *
 * This file is used to calculate the expected value of a
 *  Powerball or MegaMillions ticket based on the current estimated jackpot.
 *
 * Expected Value is defined as a predicted value of a variable,
 *  calculated as the sum of all possible values each multiplied by
 *  the probability of its occurrence.
 *
 * The EV of a ticket simplifies to:
 *   EV = jackpot * P(jackpot)
 *      + sum over non-jackpot tiers of [ P(tier) * prize(tier) ]
 *      - ticketPrice
 * because the probabilities of all outcomes (jackpot, each prize tier,
 * losing) sum to 1, so the -ticketPrice term collapses to a single
 * subtraction.
 *
 * Here is a general breakdown and walk through of a similar problem:
 *  www.khanacademy.org/math/probability/random-variables-topic/expected-value/v/expected-value-profit-lottery-ticket
 */

// As of April 8, 2025, every MegaMillions ticket includes a random multiplier
// that scales every non-jackpot prize. The jackpot itself is NOT multiplied.
//   Multiplier  Probability   Contribution to E[multiplier]
//   2X          1 / 2.13      2 / 2.13  = 0.93897
//   3X          1 / 3.20      3 / 3.20  = 0.93750
//   4X          1 / 8.00      4 / 8.00  = 0.50000
//   5X          1 / 16.00     5 / 16.00 = 0.31250
//   10X         1 / 32.00     10 / 32.00 = 0.31250
//   Probabilities sum to 1.00073 (~1, table odds are rounded to 2 decimals).
//   E[multiplier] = 3.00147
const MM_EXPECTED_MULTIPLIER = 2 / 2.13 + 3 / 3.2 + 4 / 8 + 5 / 16 + 10 / 32;

const GAMES = {
    p: {
        ticketPrice: 2,
        // Powerball jackpot odds: 1 / ((69 choose 5) * (26 choose 1))
        //                       = 1 / (11,238,513 * 26)
        //                       = 1 / 292,201,338
        jackpotOdds: 1 / 292201338,
        // Each non-jackpot tier contributes prize * P(tier) to expected return.
        // Source: see images/PBWinningTable.png.
        //   Match              Prize         Odds (1 in)     EV contribution
        //   5 white           $1,000,000     11,688,053.52   = $0.085557
        //   4 white + PB         $50,000        913,129.18   = $0.054757
        //   4 white                 $100         36,525.17   = $0.002738
        //   3 white + PB            $100         14,494.11   = $0.006899
        //   3 white                   $7            579.76   = $0.012074
        //   2 white + PB              $7            701.33   = $0.009981
        //   1 white + PB              $4             91.98   = $0.043488
        //   PB only                   $4             38.32   = $0.104384
        //                                              Sum   = $0.319878
        prizeTiers: [
            { odds: 1 / 11688053.52, prize: 1_000_000 },
            { odds: 1 / 913129.18,   prize: 50_000 },
            { odds: 1 / 36525.17,    prize: 100 },
            { odds: 1 / 14494.11,    prize: 100 },
            { odds: 1 / 579.76,      prize: 7 },
            { odds: 1 / 701.33,      prize: 7 },
            { odds: 1 / 91.98,       prize: 4 },
            { odds: 1 / 38.32,       prize: 4 },
        ],
        // Jackpot resets to this value after a winner.
        resetJackpot: 20_000_000,
    },
    m: {
        ticketPrice: 5,
        // MegaMillions jackpot odds (April 2025 matrix):
        //   1 / ((70 choose 5) * (24 choose 1))
        // = 1 / (12,103,014 * 24)
        // = 1 / 290,472,336
        jackpotOdds: 1 / 290472336,
        // Each non-jackpot tier's expected prize is the base prize times
        // E[multiplier] (~3.0015), since every ticket gets a random multiplier.
        // Source: see images/MMWinningTable.png.
        //   Match           Base prize   E[prize w/ mult]   Odds (1 in)    EV contribution
        //   5 white         $1,000,000   $3,001,467         12,629,232     = $0.237657
        //   4 white + MB       $10,000     $30,014.67          893,761     = $0.033582
        //   4 white               $500      $1,500.73           38,859     = $0.038620
        //   3 white + MB         $200        $600.29           13,965      = $0.042985
        //   3 white               $10         $30.0146            607      = $0.049448
        //   2 white + MB          $10         $30.0146            665      = $0.045134
        //   1 white + MB           $7         $21.0103             86      = $0.244306
        //   MB only                $5         $15.0073             35      = $0.428781
        //                                                            Sum   = $1.120513
        prizeTiers: [
            { odds: 1 / 12629232, prize: 1_000_000 * MM_EXPECTED_MULTIPLIER },
            { odds: 1 / 893761,   prize:    10_000 * MM_EXPECTED_MULTIPLIER },
            { odds: 1 / 38859,    prize:       500 * MM_EXPECTED_MULTIPLIER },
            { odds: 1 / 13965,    prize:       200 * MM_EXPECTED_MULTIPLIER },
            { odds: 1 / 607,      prize:        10 * MM_EXPECTED_MULTIPLIER },
            { odds: 1 / 665,      prize:        10 * MM_EXPECTED_MULTIPLIER },
            { odds: 1 / 86,       prize:         7 * MM_EXPECTED_MULTIPLIER },
            { odds: 1 / 35,       prize:         5 * MM_EXPECTED_MULTIPLIER },
        ],
        // Starting jackpot under the April 2025 matrix.
        resetJackpot: 50_000_000,
    },
};

function formatJackpotForDisplay(jackpotValue) {
    if (jackpotValue >= 1_000_000_000) {
        return (jackpotValue / 1_000_000_000).toFixed(1).replace(/\.0$/, "") + " Billion";
    }
    return (jackpotValue / 1_000_000).toFixed(1).replace(/\.0$/, "") + " Million";
}

function expectedNonJackpotReturn(game) {
    // sum over non-jackpot tiers of P(tier) * prize(tier)
    return game.prizeTiers.reduce((sum, tier) => sum + tier.odds * tier.prize, 0);
}

// TODO: dead code path. Wire this back into calculateValue once the
//   split-the-pot model is finished. See numberOfPlayers / getLastJackpot below.
function oddsOfSplittingThePot(game, jackpot) {
    // Returns a value that represents the probability of the size of your
    // jackpot after accounting for the probability of splitting the pot
    // between multiple winners.
    const numOfPlayers = numberOfPlayers(game, jackpot, getLastJackpot(game));

    // The odds that someone else will win the jackpot given that you have won.
    let odds = game.jackpotOdds * numOfPlayers;

    let numberOfWinners = 1;
    while (odds > 0.00001) { // value is basically negligible past this point
        odds = odds * Math.pow(game.jackpotOdds, numberOfWinners);
        numberOfWinners += 1;
    }

    return jackpot; // - (jackpot * odds);
}

function numberOfPlayers(game, thisJackpot, lastJackpot) {
    // Calculate the number of tickets sold.
    if (lastJackpot > thisJackpot) { // jackpot was won
        lastJackpot = thisJackpot - game.resetJackpot;
    }
    const ticketSales = thisJackpot - lastJackpot;
    // TODO account for PowerPlay and Megaplier
    return ticketSales / game.ticketPrice;
}

function getLastJackpot(game) {
    // TODO request jackpot from the last drawing
    return game.resetJackpot;
}

function setValuesOnPage(gameKey, expectedValue) {
    document.getElementById(gameKey + "_value").innerHTML += expectedValue.toFixed(2);
}

function calculateValue(gameKey, estimatedJackpot, numberOfTickets) {
    const game = GAMES[gameKey];

    let jackpotValue = Number(estimatedJackpot);
    if (!Number.isFinite(jackpotValue) || jackpotValue < 0) {
        jackpotValue = 0;
    }

    document.getElementById(gameKey + "_jackpot").innerHTML += formatJackpotForDisplay(jackpotValue);
    document.getElementById(gameKey + "_price").innerHTML += game.ticketPrice.toFixed(2);

    // TODO: numberOfTickets is accepted for future use (multi-ticket EV scaling)
    //   but not yet incorporated into the calculation.

    // TODO: oddsOfSplittingThePot is unfinished — once ready, replace
    //   jackpotValue below with oddsOfSplittingThePot(game, jackpotValue).
    const expectedValue =
        (jackpotValue * game.jackpotOdds)   // expected jackpot return
        + expectedNonJackpotReturn(game)    // expected non-jackpot return
        - game.ticketPrice;                 // ticket cost (always paid)

    setValuesOnPage(gameKey, expectedValue);
}
