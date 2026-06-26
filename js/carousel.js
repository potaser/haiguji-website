let currentSlideIndex = 1;
let carouselTimer = null;
let carouselPausedByUser = false;
const carouselDelay = 9000;

showSlides(currentSlideIndex);
startCarousel();

function currentSlide(n) {
    currentSlideIndex = n;
    showSlides(currentSlideIndex);
    pauseCarousel();
}

function showSlides(n) {
    const slides = document.querySelectorAll('.hero-slide');
    const dots = document.querySelectorAll('.carousel-dot');

    if (!slides.length || !dots.length) {
        return;
    }

    if (n > slides.length) {
        currentSlideIndex = 1;
    }
    if (n < 1) {
        currentSlideIndex = slides.length;
    }

    slides.forEach(slide => slide.classList.remove('active'));
    dots.forEach(dot => dot.classList.remove('active'));

    slides[currentSlideIndex - 1].classList.add('active');
    dots[currentSlideIndex - 1].classList.add('active');
}

function nextSlide() {
    currentSlideIndex++;
    showSlides(currentSlideIndex);
}

function startCarousel() {
    stopCarousel();
    carouselTimer = setInterval(nextSlide, carouselDelay);
}

function stopCarousel() {
    if (carouselTimer) {
        clearInterval(carouselTimer);
        carouselTimer = null;
    }
}

function pauseCarousel() {
    carouselPausedByUser = true;
    stopCarousel();
}

document.addEventListener('visibilitychange', () => {
    stopCarousel();

    if (!document.hidden) {
        carouselPausedByUser = false;
        startCarousel();
    }
});
