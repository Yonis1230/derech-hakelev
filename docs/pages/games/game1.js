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
    console.log("Celebration function called.");
    const celebration = document.createElement("div");
    celebration.className = 'celebrate';
    celebration.innerHTML = '<h1 class="animate__animated animate__heartBeat">כשמתאמצים, אפשר למצוא לכל בעיה פתרון! כל הכבוד!</h1>';
    document.body.appendChild(celebration);

    const confettiSettings = { target: 'my-canvas' };
    const confetti = new ConfettiGenerator(confettiSettings);
    confetti.render();

    setTimeout(() => {
        document.body.removeChild(celebration);
        confetti.clear();  // עצירת הזיקוקים לאחר 4 שניות
        console.log("Celebration ended.");
    }, 4000);
}
 });
