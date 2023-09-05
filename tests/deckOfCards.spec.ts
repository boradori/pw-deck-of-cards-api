import { test, expect } from "@playwright/test"

test.describe.serial("Deck of Cards", () => {
  const baseUrl = "https://deckofcardsapi.com/api/deck"
  let deckId: string

  test("verify that the site is up", async ({ page }) => {
    await page.goto("https://deckofcardsapi.com/")
  
    // Expect a title "to contain" a substring.
    await expect(page).toHaveTitle("Deck of Cards API")
    await expect(page.locator("h1[class='title']")).toBeVisible()
    await expect(page.locator("img[class='card-image']")).toBeVisible()

    await page.close()
  })

  test("get a new deck", async () => {
    const response = await fetch(`${baseUrl}/new`)
    expect(response.status).toBe(200)

    const deck = await response.json()

    console.log(deck)
 
    // Assert that the response contains a deck object
    expect(deck).toHaveProperty("success", true)
    expect(deck.success).toBeTruthy()
    expect(deck).toHaveProperty("deck_id")
    expect(deck).toHaveProperty("remaining")
    expect(deck.remaining).toBe(52)
    expect(deck).toHaveProperty("shuffled")
    expect(deck.shuffled).not.toBeTruthy()

    deckId = deck.deck_id
  })

  test("shuffle the deck", async () => {
    const response = await fetch(`${baseUrl}/${deckId}/shuffle`)
    expect(response.status).toBe(200)

    const deck = await response.json()

    console.log(deck)

    // Assert that the response contains a deck object
    expect(deck).toHaveProperty("success", true)
    expect(deck.success).toBeTruthy()
    expect(deck).toHaveProperty("deck_id")
    expect(deck).toHaveProperty("remaining")
    expect(deck.remaining).toBe(52)
    expect(deck).toHaveProperty("shuffled")
    expect(deck.shuffled).toBeTruthy()
  })

  test("deal three cards to each of two players", async () => {  
    // Draw six cards from the deck
    let response = await fetch(`${baseUrl}/${deckId}/draw/?count=6`)
    const cardsDrawn = await response.json()
    const drawnCards = cardsDrawn.cards.map((card: { code: string }) => card.code)
  
    // Create two piles, one for each player, and add three cards to each pile
    const player1Cards = drawnCards.slice(0, 3).join(",")
    const player2Cards = drawnCards.slice(3, 6).join(",")
  
    await fetch(`${baseUrl}/${deckId}/pile/player1/add/?cards=${player1Cards}`)
    await fetch(`${baseUrl}/${deckId}/pile/player2/add/?cards=${player2Cards}`)
  
    // Assert that the piles are created successfully
    response = await fetch(`${baseUrl}/${deckId}/pile/player1/list/`)
    const player1Pile = await response.json()
    expect(player1Pile.piles.player1.remaining).toBe(3)
    // console.log("Player 1 pile:", player1Pile.piles.player1.cards)
  
    response = await fetch(`${baseUrl}/${deckId}/pile/player2/list/`)
    const player2Pile = await response.json()
    expect(player2Pile.piles.player2.remaining).toBe(3)
    // console.log("Player 2 pile:", player2Pile.piles.player2.cards)

    // Check if either player has blackjack
    const player1HasBlackjack = checkForBlackjack(player1Cards.split(","))
    const player2HasBlackjack = checkForBlackjack(player2Cards.split(","))

    console.log("Player 1 cards:", player1Cards)
    console.log("Player 1 has blackjack:", player1HasBlackjack)
    console.log("Player 2 cards:", player2Cards)
    console.log("Player 2 has blackjack:", player2HasBlackjack)

    if (player1HasBlackjack && player2HasBlackjack) {
      console.log("Both players have blackjack!")
    } else if (player1HasBlackjack) {
      console.log("Player 1 has blackjack!")
    } else if (player2HasBlackjack) {
      console.log("Player 2 has blackjack!")
    } else {
      console.log("No one has blackjack.")
    }
  })
})

function checkForBlackjack(cards: string[]): boolean {
  // get all values
  const values = cards.map(card => getCardValue(card))
  const totalValue = values.reduce((a, b) => a + b, 0)

  // Check total value of all three cards
  if (totalValue === 21) {
    return true
  }

  // Check all combinations of two cards
  for (let i = 0; i < values.length; i++) {
    for (let j = i + 1; j < values.length; j++) {
      if (values[i] + values[j] === 21) {
        return true
      }
    }
  }

  return false
}

function getCardValue(card: string): number {
  // 0, -1 because some cards have 2 digits of value such as 10H
  const value = card.slice(0, -1)
  
  // if the value is one of the face cards
  if (["K", "Q", "J"].includes(value)) {
    return 10
  } else if (value === "A") {
    return 11
  } else {
    return parseInt(value)
  }
}