document.addEventListener("DOMContentLoaded", function () {
  var slides = document.querySelectorAll(".slide");
  var currentIndex = 0;
  var prevButton = document.querySelector(".prev");
  var nextButton = document.querySelector(".next");
  var slideInterval = setInterval(function () {
    changeSlide(1);
  }, 5000);

  function preloadImage(slideIndex) {
    var index = (slideIndex + slides.length) % slides.length; // Wrap-around
    slides[index].src = slides[index].dataset.src; // Preload the image
    slides[index].classList.add("preloaded"); // Optional: add a class if needed
  }

  function showSlide(index) {
    slides.forEach(function (slide, idx) {
      slide.style.display = idx === index ? "block" : "none";
      slide.src = slide.dataset.src; // Ensure the current slide is loaded
    });
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
    }, 10000); // Adjusted to 10 seconds for demonstration
  }

  prevButton.addEventListener("click", function () {
    changeSlide(-1);
  });

  nextButton.addEventListener("click", function () {
    changeSlide(1);
  });

  // Initial setup to preload images on first load
  showSlide(0); // Show the first slide and preload next two
});
