function pauseVideos(scope) {
    (scope || document).querySelectorAll('video').forEach(video => {
        if (!video.paused) video.pause();
    });
}

// 资源中心筛选与标签切换
(function () {
    function ready(fn) {
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
        else fn();
    }

    ready(function () {
        const fieldFilter = document.getElementById('field-filter');
        const productFilter = document.getElementById('product-filter');
        const yearFilter = document.getElementById('year-filter');
        const impactFilter = document.getElementById('impact-filter');
        const keywordFilter = document.getElementById('keyword-filter');
        const searchBtn = document.querySelector('.btn-search');
        const resetBtn = document.querySelector('.reset-link');
        const emptyResult = document.getElementById('empty-result');
        const tabs = Array.from(document.querySelectorAll('.resource-tab'));
        const sections = Array.from(document.querySelectorAll('[data-tab-panel]'));

        document.querySelectorAll('.nav-menu > li > .nav-link').forEach(link => {
            if ((link.getAttribute('href') || '').includes('resources')) link.classList.add('active');
        });

        function currentTab() {
            const active = document.querySelector('.resource-tab.active');
            return active ? active.dataset.tab : 'case';
        }

        function setDropdownActive(tabName) {
            const targetHash = '#' + tabName;
            document.querySelectorAll('.dropdown-menu a').forEach(link => {
                const href = link.getAttribute('href') || '';
                const hash = href.includes('#') ? href.substring(href.indexOf('#')) : href;
                link.classList.toggle('active', hash === targetHash);
            });
        }

        function activateTab(tabName, updateHash) {
            pauseVideos(document);
            tabs.forEach(tab => tab.classList.toggle('active', tab.dataset.tab === tabName));
            sections.forEach(section => section.classList.toggle('active-section', section.dataset.tabPanel === tabName));
            setDropdownActive(tabName);
            if (updateHash) history.replaceState(null, '', '#' + tabName);
            applyFilters();
        }

        function applyFilters() {
            const field = fieldFilter ? fieldFilter.value : '';
            const product = productFilter ? productFilter.value : '';
            const year = yearFilter ? yearFilter.value : '';
            const impact = impactFilter ? impactFilter.value : '';
            const keyword = ((keywordFilter && keywordFilter.value) || '').trim().toLowerCase();
            const activeTab = currentTab();
            let visibleInActiveTab = 0;

            document.querySelectorAll('.resource-card').forEach(card => {
                const text = [card.dataset.keywords, card.textContent].join(' ').toLowerCase();
                let show = true;
                if (field && card.dataset.field !== field) show = false;
                if (product && card.dataset.product !== product) show = false;
                if (year && card.dataset.year !== year) show = false;
                if (impact && card.dataset.impact !== impact) show = false;
                if (keyword && !text.includes(keyword)) show = false;

                card.classList.toggle('is-filtered-out', !show);
                if (show && card.dataset.type === activeTab) visibleInActiveTab += 1;
            });

            if (emptyResult) emptyResult.style.display = visibleInActiveTab === 0 ? 'block' : 'none';
        }

        tabs.forEach(tab => {
            tab.addEventListener('click', () => activateTab(tab.dataset.tab, true));
        });

        if (searchBtn) searchBtn.addEventListener('click', applyFilters);
        if (keywordFilter) {
            keywordFilter.addEventListener('keydown', event => {
                if (event.key === 'Enter') applyFilters();
            });
        }

        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                if (fieldFilter) fieldFilter.value = '';
                if (productFilter) productFilter.value = '';
                if (yearFilter) yearFilter.value = '';
                if (impactFilter) impactFilter.value = '';
                if (keywordFilter) keywordFilter.value = '';
                applyFilters();
            });
        }

        document.querySelectorAll('video').forEach(video => {
            video.addEventListener('play', () => {
                document.querySelectorAll('video').forEach(other => {
                    if (other !== video && !other.paused) other.pause();
                });
            });
        });

        document.querySelectorAll('.card-link').forEach(link => {
            link.addEventListener('click', event => {
                const href = link.getAttribute('href') || '';
                if (!href || href === '#') event.preventDefault();
            });
        });

        const hash = (window.location.hash || '#case').replace('#', '');
        const initial = tabs.some(tab => tab.dataset.tab === hash) ? hash : 'case';
        activateTab(initial, false);
        initImageLightbox();
        // 监听 hash 变化，支持导航栏下拉菜单点击跳转
        window.addEventListener('hashchange', function () {
            const newHash = (window.location.hash || '#case').replace('#', '');
            const tabExists = tabs.some(tab => tab.dataset.tab === newHash);
            if (tabExists) {
                activateTab(newHash, false);
            }
        });
    });
})();

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
