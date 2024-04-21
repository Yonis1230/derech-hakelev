document.addEventListener("DOMContentLoaded", function () {
  const gameBoard = document.getElementById("gameBoard");
  const images = [
    { id: 1, src: "../../assets/images/games/1/p1.webp" },
    { id: 1, src: "../../assets/images/games/1/s1.webp" },
    { id: 2, src: "../../assets/images/games/1/p2.webp" },
    { id: 2, src: "../../assets/images/games/1/s2.webp" },
    { id: 3, src: "../../assets/images/games/1/p3.webp" },
    { id: 3, src: "../../assets/images/games/1/s3.webp" },
    { id: 4, src: "../../assets/images/games/1/p4.webp" },
    { id: 4, src: "../../assets/images/games/1/s4.webp" },
    { id: 5, src: "../../assets/images/games/1/p5.webp" },
    { id: 5, src: "../../assets/images/games/1/s5.webp" },
  ];

  images.sort(() => Math.random() - 0.5);

  images.forEach((image) => {
    const card = document.createElement("div");
    card.classList.add("card");
    card.dataset.id = image.id;
    card.style.backgroundImage = "none";
    card.addEventListener("click", function () {
      if (
        !card.classList.contains("flipped") &&
        !card.classList.contains("matched")
      ) {
        if (document.querySelectorAll(".flipped:not(.matched)").length < 2) {
          card.classList.add("flipped");
          card.style.backgroundImage = `url('${image.src}')`;
          checkForMatch();
        }
      }
    });
    gameBoard.appendChild(card);
  });

  function checkForMatch() {
    const flippedCards = document.querySelectorAll(".flipped:not(.matched)");
    console.log("Checking for match..."); // הדפסה לקונסול לבדיקה
    if (flippedCards.length === 2) {
      setTimeout(() => {
        const firstId = flippedCards[0].dataset.id;
        const secondId = flippedCards[1].dataset.id;
        if (firstId === secondId) {
          flippedCards.forEach((card) => card.classList.add("matched"));
          console.log("Pair matched!"); // הדפסה לקונסול כשזוג נמצא
          if (document.querySelectorAll(".card:not(.matched)").length === 0) {
            console.log("All pairs matched, celebrating!"); // הדפסה לקונסול כשכל הזוגות נמצאו
            celebrateWin();
          }
        } else {
          flippedCards.forEach((card) => {
            card.classList.remove("flipped");
            card.style.backgroundImage = "none"; // הסרת התמונה בסגירת הקלף
          });
        }
      }, 2000);
    }
  }

function celebrateWin() {
    const canvas = document.getElementById("my-canvas");
    canvas.style.pointerEvents = 'auto'; // Enable interaction with the canvas for the celebration

    const confettiSettings = { target: 'my-canvas' };
    const confetti = new ConfettiGenerator(confettiSettings);
    confetti.render();

    // Create a celebration message
    const celebration = document.createElement("div");
    celebration.style.position = 'fixed';
    celebration.style.top = '50%';
    celebration.style.left = '50%';
    celebration.style.transform = 'translate(-50%, -50%)';
    celebration.style.zIndex = '99999';
    celebration.style.color = 'white'; // White color for visibility
    celebration.style.textAlign = 'center';
    celebration.style.fontSize = '2rem'; // Large font size for visibility
    celebration.style.padding = '20px';
    celebration.style.borderRadius = '10px';
    celebration.style.backgroundColor = 'rgba(0,0,0,0.7)'; // Semi-transparent black background
    celebration.innerHTML = '<h1 class="animate__animated animate__heartBeat">כשמתאמצים, אפשר למצוא פתרון לכל בעיה! כל הכבוד!</h1>';
    document.body.appendChild(celebration);

    setTimeout(() => {
        confetti.clear(); // Stop the confetti effect
        document.body.removeChild(celebration); // Remove the celebration message
        canvas.style.pointerEvents = 'none'; // Re-disable interaction to allow clicks to pass through
    }, 5000);
}

}
 });
