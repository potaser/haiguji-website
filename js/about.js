// 关于我们页面功能
document.addEventListener('DOMContentLoaded', function () {
    const navItems = document.querySelectorAll('.nav-section .nav-item');

    function showSection(targetId) {
        const sections = document.querySelectorAll('.product-content > section');
        const target = document.querySelector(targetId);
        if (!target) return;

        sections.forEach(section => section.classList.remove('active-section'));
        target.classList.add('active-section');

        navItems.forEach(nav => {
            nav.classList.toggle('active', nav.getAttribute('href') === targetId);
        });

        setDropdownActive(targetId);
        history.replaceState(null, '', targetId);
    }

    navItems.forEach(item => {
        item.addEventListener('click', function (e) {
            e.preventDefault();
            showSection(this.getAttribute('href'));
        });
    });

    document.querySelectorAll('.dropdown-menu a[href^="#"]').forEach(link => {
        link.addEventListener('click', function (e) {
            const targetId = this.getAttribute('href');
            if (document.querySelector(`.nav-section .nav-item[href="${targetId}"]`)) {
                e.preventDefault();
                showSection(targetId);
            }
        });
    });


    document.querySelectorAll('a[href^="#"]').forEach(link => {
        link.addEventListener('click', function (e) {
            const targetId = this.getAttribute('href');
            if (document.querySelector(`.nav-section .nav-item[href="${targetId}"]`)) {
                e.preventDefault();
                showSection(targetId);
            }
        });
    });
    const hash = window.location.hash;
    const initialItem = hash ? document.querySelector(`.nav-section .nav-item[href="${hash}"]`) : navItems[0];
    if (initialItem) showSection(initialItem.getAttribute('href'));

    document.querySelectorAll('.nav-menu > li > .nav-link').forEach(link => {
        if ((link.getAttribute('href') || '').includes('about')) link.classList.add('active');
    });

    initContactFormControls();
    // 在 about.js 的 DOMContentLoaded 末尾添加
    window.addEventListener('hashchange', function () {
        const hash = window.location.hash;
        if (hash) {
            const targetItem = document.querySelector(`.nav-section .nav-item[href="${hash}"]`);
            if (targetItem) {
                showSection(hash);
            }
        }
    });
});

// 处理联系表单提交
function setDropdownActive(targetId) {
    document.querySelectorAll('.dropdown-menu a').forEach(link => {
        const href = link.getAttribute('href') || '';
        const hash = href.includes('#') ? href.substring(href.indexOf('#')) : href;
        link.classList.toggle('active', hash === targetId);
    });
}

function getInquiryTypeLabel(value) {
    const labels = {
        technical: '技术咨询',
        business: '商务合作',
        academic: '学术支持',
        sample: '样品寄送'
    };
    return labels[value] || value;
}

function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function normalizePhone(phone) {
    return phone.replace(/[\s()-]/g, '');
}

function validateCountryCode(countryCode) {
    return /^\+[1-9]\d{0,3}$/.test(countryCode);
}

function validatePhone(countryCode, phone) {
    if (!phone) return true;
    const normalized = normalizePhone(phone);
    const rules = {
        '+86': /^1[3-9]\d{9}$/,
        '+1': /^[2-9]\d{2}[2-9]\d{6}$/,
        '+44': /^7\d{9}$/,
        '+81': /^0?\d{9,10}$/,
        '+65': /^[689]\d{7}$/,
        other: /^\d{6,15}$/
    };
    return (rules[countryCode] || rules.other).test(normalized);
}

function showFormError(form, message) {
    let box = form.querySelector('.form-error');
    if (!box) {
        box = document.createElement('p');
        box.className = 'form-error';
        form.querySelector('button[type="submit"]').insertAdjacentElement('beforebegin', box);
    }
    box.textContent = message;
}

// 处理联系表单提交
async function handleContactForm(event) {
    event.preventDefault();

    const form = event.target;
    const inquirySelect = document.getElementById('inquiry-type');
    const customInquiryInput = document.getElementById('custom-inquiry-type');
    const countrySelect = document.getElementById('country-code');
    const customCountryInput = document.getElementById('custom-country-code');
    const rawInquiryType = inquirySelect.style.display === 'none' ? 'other' : inquirySelect.value;
    const customInquiryType = customInquiryInput.value.trim();
    const rawCountryCode = countrySelect.style.display === 'none' ? 'other' : countrySelect.value;
    const customCountryCode = customCountryInput.value.trim();
    const countryCode = rawCountryCode === 'other' ? customCountryCode : rawCountryCode;
    const email = document.getElementById('email').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const submitButton = form.querySelector('button[type="submit"]');

    const formData = {
        name: document.getElementById('name').value.trim(),
        email,
        countryCode,
        customCountryCode,
        phone,
        inquiryType: rawInquiryType === 'other' ? 'other' : getInquiryTypeLabel(rawInquiryType),
        customInquiryType,
        otherInquiryType: customInquiryType,
        message: document.getElementById('message').value.trim()
    };

    if (!formData.name) {
        showFormError(form, '请填写姓名。');
        return;
    }

    if (!email && !phone) {
        showFormError(form, '邮箱和手机至少填写一项。');
        return;
    }

    if (email && !validateEmail(email)) {
        showFormError(form, '请填写正确的邮箱格式。');
        return;
    }

    if (phone && rawCountryCode === 'other' && !validateCountryCode(customCountryCode)) {
        showFormError(form, '请填写正确的国家/地区代码，例如 +66。');
        return;
    }

    if (phone && !validatePhone(rawCountryCode, phone)) {
        showFormError(form, '请填写正确的手机号码。左侧已选择国家/地区代码，右侧只需填写号码本身。');
        return;
    }

    if (rawInquiryType === 'other' && !customInquiryType) {
        showFormError(form, '选择“其他”时，请填写咨询类型。');
        return;
    }

    if (!formData.message) {
        showFormError(form, '请填写消息内容。');
        return;
    }

    submitButton.disabled = true;
    submitButton.textContent = '提交中...';

    try {
        const response = await fetch('https://haiguji-website.onrender.com/api/contact', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || !result.ok) {
            throw new Error((result.errors || ['提交失败，请稍后再试。']).join('；'));
        }
        showFormError(form, '');
        alert('感谢您的消息！我们会尽快与您联系。');
        form.reset();
        resetInlineControls();
    } catch (error) {
        showFormError(form, error.message || '提交失败，请稍后再试。');
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = '提交消息';
    }
}

function resetInlineControls() {
    const inquirySelect = document.getElementById('inquiry-type');
    const customInquiryInput = document.getElementById('custom-inquiry-type');
    const countrySelect = document.getElementById('country-code');
    const customCountryInput = document.getElementById('custom-country-code');
    if (inquirySelect && customInquiryInput) {
        inquirySelect.style.display = '';
        customInquiryInput.style.display = 'none';
        customInquiryInput.value = '';
        customInquiryInput.required = false;
    }
    if (countrySelect && customCountryInput) {
        countrySelect.style.display = '';
        customCountryInput.style.display = 'none';
        customCountryInput.value = '';
        customCountryInput.required = false;
    }
}

function initContactFormControls() {
    const inquirySelect = document.getElementById('inquiry-type');
    const customInquiryInput = document.getElementById('custom-inquiry-type');
    const countrySelect = document.getElementById('country-code');
    const customCountryInput = document.getElementById('custom-country-code');

    if (inquirySelect && customInquiryInput) {
        inquirySelect.addEventListener('change', () => {
            if (inquirySelect.value === 'other') {
                inquirySelect.style.display = 'none';
                customInquiryInput.style.display = 'block';
                customInquiryInput.required = true;
                customInquiryInput.focus();
            }
        });
        customInquiryInput.addEventListener('blur', () => {
            if (!customInquiryInput.value.trim()) {
                inquirySelect.value = 'technical';
                inquirySelect.style.display = '';
                customInquiryInput.style.display = 'none';
                customInquiryInput.required = false;
            }
        });
    }

    if (countrySelect && customCountryInput) {
        countrySelect.addEventListener('change', () => {
            if (countrySelect.value === 'other') {
                countrySelect.style.display = 'none';
                customCountryInput.style.display = 'block';
                customCountryInput.required = true;
                customCountryInput.focus();
            }
        });
        customCountryInput.addEventListener('blur', () => {
            if (!customCountryInput.value.trim()) {
                countrySelect.value = '+86';
                countrySelect.style.display = '';
                customCountryInput.style.display = 'none';
                customCountryInput.required = false;
            }
        });
    }
}
// 页面加载时处理锚点导航

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




