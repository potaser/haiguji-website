// 轮播功能
let currentSlideIndex = 1;
showSlides(currentSlideIndex);

function currentSlide(n) {
    showSlides(currentSlideIndex = n);
}

function showSlides(n) {
    const slides = document.querySelectorAll('.hero-slide');
    const dots = document.querySelectorAll('.carousel-dot');

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

// 自动轮播
setInterval(() => {
    currentSlideIndex++;
    showSlides(currentSlideIndex);
}, 5000);

// 按钮点击事件
document.querySelectorAll('.btn-primary').forEach(btn => {
    btn.addEventListener('click', function() {
        const targetId = this.textContent.includes('了解') ? '#products' : '#contact';
        // 这里可以添加页面跳转逻辑
        console.log('按钮被点击');
    });
});
