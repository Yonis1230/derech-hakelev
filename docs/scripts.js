document.addEventListener("DOMContentLoaded", function () {
  function setupSlider(sliderClass) {
    var slides = document.querySelectorAll(sliderClass + " .slide");
    if (!slides.length) {
        console.error("No slides found for the given slider class: " + sliderClass);
        return;
    }

    var currentIndex = 0;
    var prevButton = document.querySelector(sliderClass + " .prev");
    var nextButton = document.querySelector(sliderClass + " .next");

    if (!prevButton || !nextButton) {
        console.error("Previous or next button not found for the given slider class: " + sliderClass);
        return;
    }
    var slideInterval = setInterval(function () {
      changeSlide(1);
    }, 10000); // Interval set for 10 seconds

    function preloadImage(slideIndex) {
      var index = (slideIndex + slides.length) % slides.length;
      var slide = slides[index];
      if (!slide.src || slide.src !== slide.dataset.src) {
        slide.src = slide.dataset.src; // Load the image if not loaded
      }
    }

    function showSlide(index) {
      slides.forEach(function (slide, idx) {
        slide.style.display = idx === index ? "block" : "none";
      });
      preloadImage(index + 1);
      preloadImage(index - 1);
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

    // Initialize the slider with the first slide
    preloadImage(0);
    showSlide(0);
  }

  // Setup each slider by passing the unique class name of its container
  setupSlider(".slider1");
  setupSlider(".slider2");
  setupSlider(".slider6");
  setupSlider(".slider3");
  setupSlider(".slider4");
  setupSlider(".slider5");
  setupSlider(".slider7");
});
