document.addEventListener("DOMContentLoaded", function () {
  var slides = document.querySelectorAll(".slide");
  var currentIndex = 0;
  var prevButton = document.querySelector(".prev");
  var nextButton = document.querySelector(".next");
  var slideInterval = setInterval(function () {
    changeSlide(1);
  }, 5000);

  function showSlide(index) {
    slides.forEach(function (slide, idx) {
      slide.style.display = idx === index ? "block" : "none";
    });
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
  });
  nextButton.addEventListener("click", function () {
    changeSlide(1);
  });
});
