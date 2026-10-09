/**
 * data.js —— 校园失物招领 数据层
 * 基于 localStorage 的 CRUD，不依赖后端。
 * 所有核心业务函数都挂在 window.LostFound 命名空间下，
 * 方便 tests.html 直接调用进行单元测试。
 */
(function (global) {
  'use strict';

  var STORAGE_KEY = 'campus_lost_found_items';
  var MY_FLAG_KEY = 'campus_lost_found_mine'; // 记录"我"发布的 id 列表

  /* ---------- 内部工具 ---------- */

  function readStore() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      var arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      return [];
    }
  }

  function writeStore(list) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }

  function genId() {
    return 'item_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
  }

  function todayStr() {
    var d = new Date();
    var m = (d.getMonth() + 1).toString().padStart(2, '0');
    var day = d.getDate().toString().padStart(2, '0');
    return d.getFullYear() + '-' + m + '-' + day;
  }

  /* ---------- 我的发布标记 ---------- */

  function getMyIds() {
    try {
      return JSON.parse(localStorage.getItem(MY_FLAG_KEY) || '[]');
    } catch (e) {
      return [];
    }
  }

  function markMine(id) {
    var ids = getMyIds();
    if (ids.indexOf(id) === -1) {
      ids.push(id);
      localStorage.setItem(MY_FLAG_KEY, JSON.stringify(ids));
    }
  }

  /* ---------- 初始化示例数据 ---------- */

  function seedIfEmpty() {
    if (readStore().length > 0) return;
    var samples = [
      {
        id: genId(),
        type: 'found',
        title: '校园卡（尾号3847）',
        category: '证件',
        location: '图书馆二楼自习室',
        description: '在图书馆二楼靠窗自习桌捡到一张校园卡，尾号3847，卡面有照片。请到招领处认领。',
        contact: 'QQ 123456789',
        author: '热心同学',
        date: '2026-09-27',
        status: 'active'
      },
      {
        id: genId(),
        type: 'found',
        title: '黑色雨伞',
        category: '生活用品',
        location: '教学楼A301',
        description: '下课后在A301教室捡到一把黑色折叠伞，伞柄有白色绑带。',
        contact: '微信 xiaoming123',
        author: '小明',
        date: '2026-09-27',
        status: 'resolved'
      },
      {
        id: genId(),
        type: 'found',
        title: '钥匙串（3把）',
        category: '钥匙',
        location: '宿舍楼下快递点',
        description: '快递点桌上捡到一串钥匙，共3把，有一个小熊挂件。',
        contact: '电话 138****1234',
        author: '宿管阿姨',
        date: '2026-09-27',
        status: 'active'
      },
      {
        id: genId(),
        type: 'lost',
        title: 'AirPods Pro 耳机',
        category: '电子产品',
        location: '第三食堂',
        description: '中午在第三食堂二楼用餐时遗失，白色充电盒，有轻微划痕。拾到者必有重谢！',
        contact: 'QQ 987654321',
        author: '失主',
        date: '2026-09-26',
        status: 'active'
      },
      {
        id: genId(),
        type: 'lost',
        title: '《高等数学》教材',
        category: '书籍',
        location: '操场看台',
        description: '棕色封面同济版高数教材，书内有笔记，封面写有姓名。捡到请联系我。',
        contact: '微信 math_lover',
        author: '高数选手',
        date: '2026-09-26',
        status: 'active'
      }
    ];
    writeStore(samples);
  }

  /* ---------- CRUD ---------- */

  /** 获取全部物品，按日期倒序 */
  function getAll() {
    var list = readStore();
    return list.sort(function (a, b) {
      return a.date < b.date ? 1 : -1;
    });
  }

  function getById(id) {
    var list = readStore();
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) return list[i];
    }
    return null;
  }

  /**
   * 新增一条信息
   * @param {Object} data - {type,title,category,location,description,contact,author}
   * @returns {Object} 新建的 item
   */
  function add(data) {
    if (!data.title || !data.title.trim()) {
      throw new Error('物品名称不能为空');
    }
    var item = {
      id: genId(),
      type: data.type === 'lost' ? 'lost' : 'found',
      title: data.title.trim(),
      category: data.category || '其他',
      location: (data.location || '').trim(),
      description: (data.description || '').trim(),
      contact: (data.contact || '').trim(),
      author: (data.author || '').trim() || '匿名同学',
      date: todayStr(),
      status: 'active'
    };
    var list = readStore();
    list.push(item);
    writeStore(list);
    markMine(item.id);
    return item;
  }

  /**
   * 更新状态 active -> resolved
   * @param {string} id
   * @param {string} status - 'active' | 'resolved'
   */
  function updateStatus(id, status) {
    if (status !== 'active' && status !== 'resolved') {
      throw new Error('无效状态：' + status);
    }
    var list = readStore();
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) {
        list[i].status = status;
        writeStore(list);
        return list[i];
      }
    }
    return null;
  }

  function remove(id) {
    var list = readStore();
    var next = list.filter(function (it) { return it.id !== id; });
    writeStore(next);
  }

  /* ---------- 查询 / 筛选 ---------- */

  /**
   * 关键词搜索：匹配标题、描述、地点
   * @param {string} keyword
   * @param {Array} [list] - 可选，在指定列表内搜索
   */
  function search(keyword, list) {
    var src = list || getAll();
    if (!keyword || !keyword.trim()) return src;
    var kw = keyword.trim().toLowerCase();
    return src.filter(function (it) {
      return (
        (it.title && it.title.toLowerCase().indexOf(kw) !== -1) ||
        (it.description && it.description.toLowerCase().indexOf(kw) !== -1) ||
        (it.location && it.location.toLowerCase().indexOf(kw) !== -1)
      );
    });
  }

  /** 按类型筛选：all / lost / found */
  function filterByType(type, list) {
    var src = list || getAll();
    if (!type || type === 'all') return src;
    return src.filter(function (it) { return it.type === type; });
  }

  /** 按类别筛选 */
  function filterByCategory(category, list) {
    var src = list || getAll();
    if (!category || category === 'all') return src;
    return src.filter(function (it) { return it.category === category; });
  }

  /** 获取"我"发布的 */
  function getMine() {
    var ids = getMyIds();
    return getAll().filter(function (it) { return ids.indexOf(it.id) !== -1; });
  }

  function isMine(id) {
    return getMyIds().indexOf(id) !== -1;
  }

  /* ---------- 暴露 API ---------- */
  global.LostFound = {
    seedIfEmpty: seedIfEmpty,
    getAll: getAll,
    getById: getById,
    add: add,
    updateStatus: updateStatus,
    remove: remove,
    search: search,
    filterByType: filterByType,
    filterByCategory: filterByCategory,
    getMine: getMine,
    isMine: isMine,
    _reset: function () { localStorage.removeItem(STORAGE_KEY); localStorage.removeItem(MY_FLAG_KEY); }
  };
})(window);
