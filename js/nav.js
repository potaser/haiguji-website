// 导航栏功能
document.addEventListener('DOMContentLoaded', function() {
    // Logo 点击返回首页
    const logoSection = document.querySelector('.logo-section');
    if (logoSection) {
        logoSection.addEventListener('click', () => {
            window.location.href = 'index.html';
        });
    }

    // 响应式导航菜单（如果需要移动版本）
    const navMenu = document.querySelector('.nav-menu');
    if (navMenu) {
        // 点击菜单项后关闭下拉菜单（如果有特殊需求）
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                // 保留默认行为，允许正常跳转
            });
        });
    }

    // 响应式设计支持
    if (window.innerWidth <= 768) {
        adjustMobileNav();
    }

    window.addEventListener('resize', () => {
        if (window.innerWidth <= 768) {
            adjustMobileNav();
        }
    });

    const path = window.location.pathname;
    document.querySelectorAll('.nav-menu > li > .nav-link').forEach(link => {
        const href = link.getAttribute('href') || '';
        const isHome = (href === '#home' || href.endsWith('index.html')) && !path.includes('/pages/');
        const isCurrent =
            isHome ||
            (href.includes('products') && path.includes('products')) ||
            (href.includes('services') && path.includes('services')) ||
            (href.includes('applications') && path.includes('applications')) ||
            (href.includes('advantages') && path.includes('advantages')) ||
            (href.includes('resources') && path.includes('resources')) ||
            (href.includes('about') && path.includes('about'));
        if (isCurrent) link.classList.add('active');
    });
});

function adjustMobileNav() {
    const navMenu = document.querySelector('.nav-menu');
    if (navMenu) {
        // 移动设备上的调整
        // 可以根据需要添加汉堡菜单等功能
    }
}

// 平滑滚动
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

function initImageLightbox() {
    if (document.querySelector('.image-lightbox')) return;
    const box = document.createElement('div');
    box.className = 'image-lightbox';
    box.innerHTML = '<button type="button" aria-label="关闭">×</button><img alt="图片预览">';
    document.body.appendChild(box);
    const img = box.querySelector('img');
    const close = () => box.classList.remove('open');
    box.querySelector('button').addEventListener('click', close);
    box.addEventListener('click', event => { if (event.target === box) close(); });
    document.addEventListener('keydown', event => { if (event.key === 'Escape') close(); });
    document.querySelectorAll('.product-content img, .resource-content img, .about-container img, .products-preview img').forEach(item => {
        item.addEventListener('click', () => {
            img.src = item.currentSrc || item.src;
            img.alt = item.alt || '图片预览';
            box.classList.add('open');
        });
    });
}
