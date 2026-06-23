function pauseVideos(scope) {
    (scope || document).querySelectorAll('video').forEach(video => {
        if (!video.paused) video.pause();
    });
}

// 标签页切换功能：只切换当前模块内部内容，避免其他产品/服务出现空白
function switchTab(evt, tabName) {
    const section = evt.currentTarget.closest('.product-section, .about-section');
    const scope = section || document;
    pauseVideos(scope);
    const tabContents = scope.querySelectorAll('.tab-content');
    const tabBtns = evt.currentTarget.parentElement.querySelectorAll('.tab-btn');

    tabContents.forEach(content => content.classList.remove('active'));
    tabBtns.forEach(btn => btn.classList.remove('active'));

    const activeContent = document.getElementById(tabName);
    if (activeContent) activeContent.classList.add('active');
    evt.currentTarget.classList.add('active');
}

function normalizeSectionTarget(targetId) {
    if (!targetId) return targetId;
    if (targetId.indexOf('#wgs-') === 0) return '#wgs';
    return targetId;
}

function setDropdownActive(originalTargetId, targetId) {
    document.querySelectorAll('.dropdown-menu a').forEach(link => {
        const href = link.getAttribute('href') || '';
        const hash = href.includes('#') ? href.substring(href.indexOf('#')) : href;
        link.classList.toggle('active', hash === originalTargetId || hash === targetId);
    });
}

function showContentSection(targetId) {
    const originalTargetId = targetId;
    targetId = normalizeSectionTarget(targetId);
    pauseVideos(document);
    const sections = document.querySelectorAll('.product-content > section');
    const navItems = document.querySelectorAll('.nav-section .nav-item');
    const target = document.querySelector(targetId);

    if (!target || sections.length === 0) return;

    sections.forEach(section => section.classList.remove('active-section'));
    target.classList.add('active-section');

    navItems.forEach(nav => {
        nav.classList.toggle('active', nav.getAttribute('href') === targetId);
    });

    const firstTab = target.querySelector('.tab-btn');
    const firstContent = target.querySelector('.tab-content');
    if (firstTab && firstContent) {
        target.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        target.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        firstTab.classList.add('active');
        firstContent.classList.add('active');
    }

    setDropdownActive(originalTargetId, targetId);
    history.replaceState(null, '', originalTargetId || targetId);
}

document.addEventListener('DOMContentLoaded', function () {
    initImageLightbox();
    const navItems = document.querySelectorAll('.nav-section .nav-item');

    navItems.forEach(item => {
        item.addEventListener('click', function (e) {
            e.preventDefault();
            showContentSection(this.getAttribute('href'));
        });
    });

    const hash = window.location.hash;
    const normalizedHash = normalizeSectionTarget(hash);
    const initialItem = normalizedHash ? document.querySelector(`.nav-section .nav-item[href="${normalizedHash}"]`) : navItems[0];
    if (initialItem) showContentSection(hash || initialItem.getAttribute('href'));

    document.querySelectorAll('.dropdown-menu a[href*="#"]').forEach(link => {
        link.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            const targetHash = href.includes('#') ? href.substring(href.indexOf('#')) : href;
            const normalizedTarget = normalizeSectionTarget(targetHash);
            const matchingSidebar = document.querySelector(`.nav-section .nav-item[href="${normalizedTarget}"]`);
            const samePage = !href.includes('.html') || href.split('#')[0] === '' || window.location.pathname.endsWith(href.split('#')[0]);
            if (matchingSidebar && samePage) {
                e.preventDefault();
                showContentSection(targetHash);
            }
        });
    });

    const path = window.location.pathname;
    document.querySelectorAll('.nav-menu > li > .nav-link').forEach(link => {
        const href = link.getAttribute('href') || '';
        const isCurrent =
            (href.includes('products') && path.includes('products')) ||
            (href.includes('services') && path.includes('services')) ||
            (href.includes('applications') && path.includes('applications')) ||
            (href.includes('advantages') && path.includes('advantages')) ||
            (href.includes('resources') && path.includes('resources')) ||
            (href.includes('about') && path.includes('about'));
        if (isCurrent) link.classList.add('active');
    });
});

document.addEventListener('DOMContentLoaded', function () {
    const logoSection = document.querySelector('.logo-section');
    if (logoSection) {
        logoSection.addEventListener('click', () => {
            window.location.href = document.location.pathname.includes('pages/')
                ? '../index.html'
                : 'index.html';
        });
    }
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
    document.querySelectorAll('.product-content img, .resource-content img, .about-container img, .products-preview img, .hero-slide img').forEach(item => {
        item.addEventListener('click', () => {
            img.src = item.currentSrc || item.src;
            img.alt = item.alt || '图片预览';
            box.classList.add('open');
        });
    });
}
