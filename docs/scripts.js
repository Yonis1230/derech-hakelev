document.addEventListener('DOMContentLoaded', function() {
    const gameBoard = document.getElementById('gameBoard');
    const images = [
      'p1.webp', 's1.webp',
      'p2.webp', 's2.webp',
      'p3.webp', 's3.webp',
      'p4.webp', 's4.webp',
      'p5.webp', 's5.webp'
    ];
    images.sort(() => Math.random() - 0.5); // לערבב את התמונות

    images.forEach(image => {
      const card = document.createElement('div');
      card.classList.add('card');
      card.addEventListener('click', function() {
        if (!card.classList.contains('flipped') && !card.classList.contains('matched')) {
            if (document.querySelectorAll('.flipped:not(.matched)').length < 2) {
                card.classList.add('flipped');
                card.style.backgroundImage = `url('${image}')`;
                checkForMatch();
            }
        }
      });
      gameBoard.appendChild(card);
    });

    function checkForMatch() {
      const flippedCards = document.querySelectorAll('.flipped:not(.matched)');
      if (flippedCards.length === 2) {
        setTimeout(() => {
          const firstImage = flippedCards[0].style.backgroundImage;
          const secondImage = flippedCards[1].style.backgroundImage;
          if (firstImage === secondImage) {
            flippedCards.forEach(card => card.classList.add('matched'));
            // Check if all cards are matched
            if (document.querySelectorAll('.card:not(.matched)').length === 0) {
                celebrateWin();
            }
          } else {
            flippedCards.forEach(card => {
              card.classList.remove('flipped');
              card.style.backgroundImage = 'none';
            });
          }
        }, 3000); // Increased time to see second card
      }
    }

    function celebrateWin() {
        const celebration = document.createElement('div');
        celebration.innerHTML = '<h1 class="animate__animated animate__bounce">Congratulations!</h1>';
        document.body.appendChild(celebration);

        // Optionally remove the celebration message after a few seconds
        setTimeout(() => {
            document.body.removeChild(celebration);
        }, 4000);
    }
});
