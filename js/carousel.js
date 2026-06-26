let currentSlideIndex = 1;
let carouselTimer = null;
let carouselPausedByUser = false;
const carouselDelay = 9000;
const pauseStorageKey = 'haigujiCarouselPaused';

initCarousel();

function initCarousel() {
    const dots = document.querySelectorAll('.carousel-dot');

    dots.forEach(dot => {
        dot.addEventListener('click', () => {
            const targetSlide = Number(dot.dataset.slide);
            if (!Number.isNaN(targetSlide)) {
                currentSlide(targetSlide);
            }
        });
    });

    carouselPausedByUser = sessionStorage.getItem(pauseStorageKey) === 'true';
    showSlides(currentSlideIndex);

    if (!carouselPausedByUser) {
        startCarousel();
    }
}

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
    sessionStorage.setItem(pauseStorageKey, 'true');
    stopCarousel();
}

window.addEventListener('pagehide', () => {
    sessionStorage.removeItem(pauseStorageKey);
});

window.addEventListener('pageshow', event => {
    if (event.persisted) {
        carouselPausedByUser = false;
        startCarousel();
    }
});

document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        stopCarousel();
        return;
    }

    if (!carouselPausedByUser) {
        startCarousel();
    }
});
