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
    if (!slide.src || slide.src !== slide.dataset.src) { // Check if not already loaded
      slide.src = slide.dataset.src;
    }
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
    preloadImage(index + 2);
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
