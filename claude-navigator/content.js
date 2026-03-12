(() => {
  let dots = [];
  let sidebar = null;
  let activeIndex = -1;
  let scrollContainer = null; // 儲存目前的捲動容器

  function createSidebar() {
    if (sidebar) return;
    sidebar = document.createElement('div');
    sidebar.id = 'cn-sidebar';
    document.body.appendChild(sidebar);
  }

  function getUserMessages() {
    // Claude 使用 data-testid="user-message"
    return Array.from(document.querySelectorAll('[data-testid="user-message"]'));
  }

  // ── 關鍵修正：尋找真正負責捲動的 div ──────────────────────
  function updateScrollContainer() {
    const firstMsg = document.querySelector('[data-testid="user-message"]');
    if (firstMsg) {
      // 往上找最近一個擁有捲動屬性的父節點
      const container = firstMsg.closest('.overflow-y-auto') || 
                        firstMsg.closest('[class*="scroll"]') || 
                        window;
      
      if (container !== scrollContainer) {
        if (scrollContainer) scrollContainer.removeEventListener('scroll', updateActive);
        scrollContainer = container;
        scrollContainer.addEventListener('scroll', updateActive, { passive: true });
        console.log('Scroll container updated:', scrollContainer);
      }
    }
  }

  function getPreview(el) {
    const text = el.innerText || el.textContent || '';
    return text.trim().slice(0, 60) + (text.trim().length > 60 ? '…' : '');
  }

  // ── 關鍵修正：改用相對視窗座標判定 ────────────────────────
  function updateActive() {
    if (dots.length === 0) return;

    // 判定點設定在視窗上方 1/3 處
    const triggerThreshold = window.innerHeight / 3;
    let currentActive = 0;

    dots.forEach(({ target }, i) => {
      const rect = target.getBoundingClientRect();
      // rect.top 是元素頂部相對於瀏覽器視窗頂部的距離
      // 只要 top 小於判定點，就代表我們「正在看」或「已經看過」這則訊息
      if (rect.top <= triggerThreshold) {
        currentActive = i;
      }
    });

    if (currentActive !== activeIndex) {
      dots.forEach(({ el }, i) => {
        el.classList.toggle('cn-dot--active', i === currentActive);
      });
      activeIndex = currentActive;
    }
  }

  function createDot(msgEl, index) {
    const dot = document.createElement('div');
    dot.className = 'cn-dot';
    
    const label = document.createElement('span');
    label.className = 'cn-dot-label';
    label.textContent = index + 1;
    dot.appendChild(label);

    const tip = document.createElement('div');
    tip.className = 'cn-tip';
    tip.textContent = getPreview(msgEl);
    dot.appendChild(tip);

    dot.addEventListener('click', () => {
      msgEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    return dot;
  }

  // 防抖處理，避免頻繁重建
  function debounce(func, delay) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => func.apply(this, args), delay);
    };
  }

  function rebuildDots() {
    if (!sidebar) return;
    const messages = getUserMessages();
    
    // 如果數量沒變，僅更新內容
    if (messages.length === dots.length) {
      dots.forEach(({ el, target }, i) => {
        el.querySelector('.cn-tip').textContent = getPreview(target);
      });
      return;
    }

    sidebar.innerHTML = '';
    dots = [];
    messages.forEach((msgEl, i) => {
      const dotEl = createDot(msgEl, i);
      sidebar.appendChild(dotEl);
      dots.push({ el: dotEl, target: msgEl });
    });

    updateScrollContainer(); // 每次重建時重新確認捲動容器
    updateActive();
  }

  function init() {
    createSidebar();
    rebuildDots();

    const observer = new MutationObserver(debounce(() => {
      rebuildDots();
    }, 300));

    observer.observe(document.body, { childList: true, subtree: true });
    updateScrollContainer();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();