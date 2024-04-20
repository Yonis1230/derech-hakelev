document.addEventListener("DOMContentLoaded", function () {
  var slides = document.querySelectorAll(".slide");
  var currentIndex = 0;
  var prevButton = document.querySelector(".prev");
  var nextButton = document.querySelector(".next");
  var slideInterval = setInterval(function () {
    changeSlide(1);
  }, 10000); // Interval set for 10 seconds

  function preloadImage(slideIndex) {
    var index = (slideIndex + slides.length) % slides.length;
    var slide = slides[index];
    if (!slide.src || slide.src !== slide.dataset.src) {
      // Check if not already loaded
    }
    slide.src = slide.dataset.src;
  }

  function showSlide(index) {
    slides.forEach(function (slide, idx) {
      slide.style.display = idx === index ? "block" : "none";
    });
    // Ensure the current slide is loaded
    if (slides[index].src !== slides[index].dataset.src) {
      slides[index].src = slides[index].dataset.src;
    }
    // Preload the next two images
    preloadImage(index + 1);
    preloadImage(index - 1);
    preloadImage(index + 2);
    preloadImage(index - 2);
  }

  function changeSlide(step) {
    currentIndex = (currentIndex + step + slides.length) % slides.length;
    showSlide(currentIndex);
    resetInterval();
  }

  function resetInterval() {
    clearInterval(slideInterval);
    slideInterval = setInterval(function () {
      changeSlide(1);
    }, 10000);
  }

  prevButton.addEventListener("click", function () {
    changeSlide(-1);
    resetInterval(); // Resets the timer when the user navigates manually
  });

  nextButton.addEventListener("click", function () {
    changeSlide(1);
    resetInterval(); // Resets the timer when the user navigates manually
  });

  // Initial setup to preload images on first load
  showSlide(0); // Show the first slide and preload the next two
});
document.addEventListener('DOMContentLoaded', function() {
    const gameBoard = document.getElementById('gameBoard');
     const images = [
  { id: 1, src: 'p1.webp' },
  { id: 1, src: 's1.webp' },
  { id: 2, src: 'p2.webp' },
  { id: 2, src: 's2.webp' },
  { id: 3, src: 'p3.webp' },
  { id: 3, src: 's3.webp' },
  { id: 4, src: 'p4.webp' },
  { id: 4, src: 's4.webp' },
  { id: 5, src: 'p5.webp' },
  { id: 5, src: 's5.webp' },
];
    images.sort(() => Math.random() - 0.5); // לערבב את התמונות

    images.forEach(image => {
      const card = document.createElement('div');
      card.classList.add('card');
      card.addEventListener('click', function() {
        if (!card.classList.contains('flipped') && !card.classList.contains('matched')) {
            if (document.querySelectorAll('.flipped:not(.matched)').length < 2) {
                card.classList.add('flipped');
                card.style.backgroundImage = `url('${image}')`; // הוסף את התמונה כאשר הקלף מתהפך
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
            flippedCards.forEach(card => {
              card.classList.add('matched'); // הוסף מחלקת 'matched'
            });
          } else {
            flippedCards.forEach(card => {
              card.classList.remove('flipped');
              card.style.backgroundImage = 'none'; // הסר את התמונה
            });
          }
        }, 2000);
      }
    }
});
