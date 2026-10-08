/**
 * app.js —— 页面渲染与交互逻辑
 * 依赖 data.js 暴露的 window.LostFound
 */
(function () {
  'use strict';

  var LF = window.LostFound;

  /* ===== 工具函数 ===== */

  function toast(msg) {
    var t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function () { t.classList.add('show'); }, 10);
    setTimeout(function () {
      t.classList.remove('show');
      setTimeout(function () { t.remove(); }, 300);
    }, 1800);
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        toast('已复制：' + text);
      }).catch(function () {
        fallbackCopy(text);
      });
    } else {
      fallbackCopy(text);
    }
  }

  function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); toast('已复制：' + text); }
    catch (e) { toast('复制失败，请手动复制'); }
    ta.remove();
  }

  function getQuery(name) {
    var m = new RegExp('[?&]' + name + '=([^&]*)').exec(location.search);
    return m ? decodeURIComponent(m[1]) : null;
  }

  function escapeHtml(s) {
    if (!s) return '';
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ===== 物品卡片 HTML ===== */

  function cardHtml(it) {
    var thumbClass = it.status === 'resolved' ? 'resolved' : it.type;
    var typeBadge = it.type === 'found'
      ? '<span class="badge found">招领</span>'
      : '<span class="badge lost">寻物</span>';
    var resolvedBadge = it.status === 'resolved'
      ? '<span class="badge resolved">已解决</span>'
      : '';
    return (
      '<a class="item-card" href="detail.html?id=' + encodeURIComponent(it.id) + '">' +
        '<div class="item-thumb ' + thumbClass + '">' +
          (it.type === 'found' ? '???' : '?') +
        '</div>' +
        '<div class="item-info">' +
          '<div class="item-title">' + escapeHtml(it.title) + '</div>' +
          '<div class="item-tags">' + typeBadge + resolvedBadge + '</div>' +
          '<div class="item-location">📍 ' + escapeHtml(it.location || '未填写地点') + '</div>' +
          '<div class="item-date">🗓 ' + escapeHtml(it.date) + '</div>' +
        '</div>' +
      '</a>'
    );
  }

  function emptyHtml(text) {
    return '<div class="empty-state"><div class="emoji">🔍</div><p>' + text + '</p></div>';
  }

  /* ===== 首页 ===== */

  function initHome() {
    LF.seedIfEmpty();
    var listEl = document.getElementById('itemList');
    var tabs = document.querySelectorAll('.tab');
    var chips = document.querySelectorAll('.chip');
    var searchInput = document.getElementById('searchInput');

    var state = { type: 'all', category: 'all', keyword: '' };

    function render() {
      var items = LF.getAll();
      items = LF.filterByType(state.type, items);
      items = LF.filterByCategory(state.category, items);
      items = LF.search(state.keyword, items);

      if (items.length === 0) {
        listEl.innerHTML = emptyHtml('没有找到相关信息，换个关键词试试吧');
        return;
      }
      listEl.innerHTML = items.map(cardHtml).join('');
    }

    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        tabs.forEach(function (t) { t.classList.remove('active'); });
        tab.classList.add('active');
        state.type = tab.dataset.type;
        render();
      });
    });

    chips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        chips.forEach(function (c) { c.classList.remove('active'); });
        chip.classList.add('active');
        state.category = chip.dataset.category;
        render();
      });
    });

    searchInput.addEventListener('input', function () {
      state.keyword = this.value;
      render();
    });

    render();
  }

  /* ===== 详情页 ===== */

  function initDetail() {
    var id = getQuery('id');
    var item = LF.getById(id);
    if (!item) {
      document.getElementById('detailRoot').innerHTML =
        emptyHtml('物品不存在或已被删除');
      return;
    }

    var heroClass = item.status === 'resolved' ? 'resolved' : item.type;
    var typeBadge = item.type === 'found'
      ? '<span class="badge found">招领</span>'
      : '<span class="badge lost">寻物</span>';
    var catBadge = '<span class="badge" style="background:#f0f0f0;color:#666">' +
      escapeHtml(item.category) + '</span>';

    var root = document.getElementById('detailRoot');
    root.innerHTML =
      '<div class="detail-hero ' + heroClass + '">' +
        (item.type === 'found' ? '失物招领' : '寻物启事') +
      '</div>' +
      '<div class="detail-body">' +
        '<div class="detail-title">' + escapeHtml(item.title) + '</div>' +
        '<div class="detail-meta">' + typeBadge + catBadge +
          (item.status === 'resolved' ? '<span class="badge resolved">✓ 已解决</span>' : '') +
        '</div>' +

        '<div class="detail-section"><h4>详细描述</h4><p>' +
          escapeHtml(item.description || '（暂无描述）') + '</p></div>' +

        '<div class="detail-section"><h4>遗失/拾取地点</h4><p>📍 ' +
          escapeHtml(item.location || '未填写') + '</p></div>' +

        '<div class="detail-section"><h4>发布人</h4><p>👤 ' +
          escapeHtml(item.author) + ' · ' + escapeHtml(item.date) + '</p></div>' +

        '<div class="contact-box">' +
          '<div><div class="contact-label">联系方式</div>' +
          '<div class="contact-text">' + escapeHtml(item.contact || '未留联系方式') + '</div></div>' +
          '<button class="copy-btn" id="copyBtn">一键复制</button>' +
        '</div>' +
      '</div>';

    document.getElementById('copyBtn').addEventListener('click', function () {
      copyText(item.contact);
    });

    // 底部操作栏：如果是"我"发布的，显示状态更新按钮
    var actions = document.getElementById('detailActions');
    if (LF.isMine(item.id)) {
      if (item.status === 'active') {
        actions.innerHTML =
          '<button class="btn btn-primary" id="solveBtn">标记为' +
          (item.type === 'found' ? '已归还' : '已找到') + '</button>';
        document.getElementById('solveBtn').addEventListener('click', function () {
          LF.updateStatus(item.id, 'resolved');
          toast('已更新状态！');
          setTimeout(function () { location.reload(); }, 800);
        });
      } else {
        actions.innerHTML =
          '<button class="btn btn-outline" id="reopenBtn">重新打开</button>';
        document.getElementById('reopenBtn').addEventListener('click', function () {
          LF.updateStatus(item.id, 'active');
          toast('已重新打开');
          setTimeout(function () { location.reload(); }, 800);
        });
      }
    } else {
      actions.style.display = 'none';
    }
  }

  /* ===== 发布页 ===== */

  function initPublish() {
    var type = 'found';
    var opts = document.querySelectorAll('.type-option');
    opts.forEach(function (opt) {
      opt.addEventListener('click', function () {
        opts.forEach(function (o) { o.classList.remove('selected'); });
        opt.classList.add('selected');
        type = opt.dataset.type;
      });
    });
    // 默认选中"招领"
    document.querySelector('.type-option.found').classList.add('selected');

    document.getElementById('publishForm').addEventListener('submit', function (e) {
      e.preventDefault();
      try {
        var item = LF.add({
          type: type,
          title: document.getElementById('title').value,
          category: document.getElementById('category').value,
          location: document.getElementById('location').value,
          description: document.getElementById('description').value,
          contact: document.getElementById('contact').value,
          author: document.getElementById('author').value
        });
        toast('发布成功！');
        setTimeout(function () {
          location.href = 'detail.html?id=' + encodeURIComponent(item.id);
        }, 800);
      } catch (err) {
        toast(err.message);
      }
    });
  }

  /* ===== 我的发布 ===== */

  function initMy() {
    var listEl = document.getElementById('myList');
    var items = LF.getMine();

    if (items.length === 0) {
      listEl.innerHTML = emptyHtml('你还没有发布过信息');
      return;
    }

    listEl.innerHTML = items.map(function (it) {
      var base = cardHtml(it);
      // 在卡片右侧加操作按钮
      var solveBtn = it.status === 'active'
        ? '<button class="mini-btn solve" data-act="solve" data-id="' + it.id + '">标记解决</button>'
        : '<button class="mini-btn" data-act="reopen" data-id="' + it.id + '">重新打开</button>';
      var delBtn = '<button class="mini-btn danger" data-act="del" data-id="' + it.id + '">删除</button>';
      // 替换卡片右侧区域
      return base.replace('</a>',
        '<div class="item-right">' + solveBtn + delBtn + '</div></a>');
    }).join('');

    listEl.addEventListener('click', function (e) {
      var btn = e.target.closest('.mini-btn');
      if (!btn) return;
      e.preventDefault();
      var id = btn.dataset.id;
      var act = btn.dataset.act;
      if (act === 'solve') {
        LF.updateStatus(id, 'resolved');
        toast('已标记为解决');
        setTimeout(function () { location.reload(); }, 600);
      } else if (act === 'reopen') {
        LF.updateStatus(id, 'active');
        toast('已重新打开');
        setTimeout(function () { location.reload(); }, 600);
      } else if (act === 'del') {
        if (confirm('确定删除这条信息吗？')) {
          LF.remove(id);
          toast('已删除');
          setTimeout(function () { location.reload(); }, 600);
        }
      }
    });
  }

  /* ===== 入口 ===== */

  document.addEventListener('DOMContentLoaded', function () {
    var page = document.body.dataset.page;
    if (page === 'home') initHome();
    else if (page === 'detail') initDetail();
    else if (page === 'publish') initPublish();
    else if (page === 'my') initMy();
  });
})();
