/* 品牌方案核心：三套方案的矢量定义。build.mjs 用它导出独立 SVG，index.html 内联同一份代码。 */
var BRAND = (function () {
  var INK = '#1F1D1B';
  var SERIF_CN = "'Noto Serif SC','Source Han Serif SC','Songti SC','STSong','SimSun',serif";
  var SANS_CN = "'PingFang SC','Noto Sans SC','Source Han Sans SC','Microsoft YaHei',sans-serif";
  var SANS_EN = "'Inter','Helvetica Neue','Segoe UI',Arial,sans-serif";
  var SERIF_EN = "'Cormorant Garamond','Playfair Display',Georgia,'Times New Roman',serif";
  var uid = 0;
  function id(p) { uid += 1; return p + uid; }

  // 64×64 标志
  var marks = {
    a: function (c) {
      var m = id('lf');
      return '<mask id="' + m + '"><rect width="64" height="64" fill="#fff"/>' +
        '<path d="M19.5 44.5C28 36 37.5 25.5 45.5 15" fill="none" stroke="#000" stroke-width="2.4" stroke-linecap="round"/></mask>' +
        '<path mask="url(#' + m + ')" d="M16.5 47.5C17.5 31 31 15.5 49.5 10.5C48.5 28 36 42.5 16.5 47.5Z" fill="' + c + '"/>' +
        '<rect x="9" y="52.5" width="46" height="4.6" rx="2.3" fill="' + c + '"/>';
    },
    b: function (c) {
      return '<g fill="none" stroke="' + c + '" stroke-width="5" stroke-linecap="round">' +
        '<path d="M48.97 48.97A24 24 0 1 1 48.97 15.03"/>' +
        '<path d="M42.61 42.61A15 15 0 1 1 42.61 21.39"/></g>' +
        '<circle cx="32" cy="32" r="5.5" fill="' + c + '"/>';
    },
    c: function (c) {
      return '<path d="M27 52.5H11.5V11.5H52.5V52.5H37" fill="none" stroke="' + c + '" stroke-width="5.5" stroke-linejoin="miter"/>' +
        '<rect x="24" y="24" width="16" height="16" fill="' + c + '"/>';
    }
  };
  // 32×32 小尺寸简化标志（favicon / 16–32px）
  var smallMarks = {
    a: function (c) {
      return '<path d="M8.5 23.5C9 15.5 15.5 8 24.5 5.5C24 14 18 21 8.5 23.5Z" fill="' + c + '"/>' +
        '<rect x="4.5" y="26" width="23" height="2.8" rx="1.4" fill="' + c + '"/>';
    },
    b: function (c) {
      return '<path d="M23.07 23.07A10 10 0 1 1 23.07 8.93" fill="none" stroke="' + c + '" stroke-width="4" stroke-linecap="round"/>' +
        '<circle cx="16" cy="16" r="3.4" fill="' + c + '"/>';
    },
    c: function (c) {
      return '<path d="M13.5 26.5H5.5V5.5H26.5V26.5H18.5" fill="none" stroke="' + c + '" stroke-width="3.4"/>' +
        '<rect x="12" y="12" width="8" height="8" fill="' + c + '"/>';
    }
  };

  var concepts = {
    a: {
      key: 'a', cn: '桉岸', en: 'ANSHORE', enDisplay: 'Anshore',
      idea: '一片桉叶落在海岸线上：澳洲的树，安心的岸。',
      reading: '中文“桉岸”谐音“安岸”；英文 An + shore 为自创组合。',
      orange: '#F26522', deep: '#C2410C', soft: '#FFF1E8',
      tile: 'orange',
      fonts: '中文宋体衬线 · 英文宽字距无衬线',
      lockup: function (o) {
        return {
          w: 182, h: 80,
          body: '<g transform="translate(0 8)">' + marks.a(o.mark) + '</g>' +
            '<text x="80" y="43" font-family="' + SERIF_CN + '" font-size="34" font-weight="600" letter-spacing="6" fill="' + o.ink + '">桉岸</text>' +
            '<text x="81" y="66" font-family="' + SANS_EN + '" font-size="11.5" font-weight="600" letter-spacing="5.2" fill="' + o.accent + '">ANSHORE</text>'
        };
      }
    },
    b: {
      key: 'b', cn: '桉湾', en: 'EUCOVE', enDisplay: 'eucove',
      idea: '海湾等高线环抱一个点：被安稳守护的那套房。',
      reading: '英文 eucalyptus + cove 自创，小写更像 App；中文“桉湾”。',
      orange: '#FF6A2B', deep: '#C2410C', soft: '#FFF2EA',
      tile: 'white',
      fonts: '英文小写粗体无衬线为主 · 中文黑体',
      lockup: function (o) {
        return {
          w: 282, h: 80,
          body: '<g transform="translate(0 8)">' + marks.b(o.mark) + '</g>' +
            '<text x="78" y="53" font-family="' + SANS_EN + '" font-size="38" font-weight="700" letter-spacing="-1" fill="' + o.ink + '">eucove</text>' +
            '<line x1="216" y1="27" x2="216" y2="57" stroke="' + o.rule + '" stroke-width="1.5"/>' +
            '<text x="228" y="51" font-family="' + SANS_CN + '" font-size="22" font-weight="600" letter-spacing="2" fill="' + o.accent + '">桉湾</text>'
        };
      }
    },
    c: {
      key: 'c', cn: '衡庭', en: 'HENGTING', enDisplay: 'Hengting',
      idea: '俯视的庭院平面：四面有墙、留一道门，托管就是替你守好这个院子。',
      reading: '“衡”取公允、“庭”取家宅；英文采用中文拼音 Hengting。',
      orange: '#E8571E', deep: '#B93C0C', soft: '#FDF0E9',
      tile: 'orange',
      fonts: '英文大写衬线为主 · 中文衬线宽排',
      lockup: function (o) {
        return {
          w: 266, h: 80,
          body: '<g transform="translate(0 8)">' + marks.c(o.mark) + '</g>' +
            '<text x="80" y="40" font-family="' + SERIF_EN + '" font-size="25" font-weight="600" letter-spacing="2.6" fill="' + o.ink + '">HENGTING</text>' +
            '<text x="81" y="64" font-family="' + SERIF_CN + '" font-size="15" font-weight="600" letter-spacing="10" fill="' + o.accent + '">衡庭</text>'
        };
      }
    }
  };

  function wrap(w, h, body, attrs) {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + w + ' ' + h + '"' + (attrs || '') + '>' + body + '</svg>';
  }
  // mode: light | dark | orange | mono-white | mono-ink
  function lockupOpts(c, mode) {
    switch (mode) {
      case 'dark': return { mark: c.orange, ink: '#FFFFFF', accent: c.orange, rule: 'rgba(255,255,255,.3)' };
      case 'orange': return { mark: '#FFFFFF', ink: '#FFFFFF', accent: '#FFFFFF', rule: 'rgba(255,255,255,.5)' };
      case 'mono-white': return { mark: '#FFFFFF', ink: '#FFFFFF', accent: '#FFFFFF', rule: '#FFFFFF' };
      case 'mono-ink': return { mark: INK, ink: INK, accent: INK, rule: INK };
      default: return { mark: c.orange, ink: INK, accent: c.deep, rule: '#D9D2CA' };
    }
  }
  function logo(key, mode, attrs) {
    var c = concepts[key], l = c.lockup(lockupOpts(c, mode));
    return wrap(l.w, l.h, l.body, attrs);
  }
  function mark(key, color, attrs) {
    return wrap(64, 64, marks[key](color || concepts[key].orange), attrs);
  }
  function appIcon(key, attrs) {
    var c = concepts[key];
    var bg = c.tile === 'white' ? '#FFFFFF' : c.orange;
    var fg = c.tile === 'white' ? c.orange : '#FFFFFF';
    var stroke = c.tile === 'white' ? '<rect x="0.5" y="0.5" width="119" height="119" rx="26.5" fill="none" stroke="#EDE6DF"/>' : '';
    return wrap(120, 120, '<rect width="120" height="120" rx="27" fill="' + bg + '"/>' + stroke +
      '<g transform="translate(24 24) scale(1.125)">' + marks[key](fg) + '</g>', attrs);
  }
  function favicon(key, attrs) {
    var c = concepts[key];
    var bg = c.tile === 'white' ? '#FFFFFF' : c.orange;
    var fg = c.tile === 'white' ? c.orange : '#FFFFFF';
    var stroke = c.tile === 'white' ? '<rect x="0.5" y="0.5" width="31" height="31" rx="6.5" fill="none" stroke="#E8DFD6"/>' : '';
    return wrap(32, 32, '<rect width="32" height="32" rx="7" fill="' + bg + '"/>' + stroke +
      '<g transform="translate(4 4) scale(.75)">' + smallMarks[key](fg) + '</g>', attrs);
  }
  function smallMark(key, color, attrs) {
    return wrap(32, 32, smallMarks[key](color || concepts[key].orange), attrs);
  }
  function motionMark(key) {
    var body = marks[key](concepts[key].orange);
    if (key === 'a') body = body.replace('<path mask=', '<path class="motion-leaf" mask=').replace('<rect x="9"', '<rect class="motion-shore" x="9"');
    if (key === 'b') {
      var count = 0;
      body = body.replace(/<path /g, function () { count++; return '<path class="motion-ring-' + count + '" '; }).replace('<circle ', '<circle class="motion-center" ');
    }
    if (key === 'c') body = body.replace('<path ', '<path class="motion-court" pathLength="1" ').replace('<rect ', '<rect class="motion-room" ');
    return wrap(64, 64, body, ' role="img" aria-label="' + concepts[key].cn + '标志动效"');
  }

  var icons = [
    { key: 'letting', cn: '招租', en: 'Letting', body: '<path d="M5 21V3.5"/><path d="M5 5h14"/><path d="M9 5v2.5M16 5v2.5"/><rect x="7.5" y="7.5" width="10.5" height="7" rx="1.5"/><path d="M10.5 11h4.5"/>' },
    { key: 'management', cn: '托管', en: 'Management', body: '<path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3"/><path d="M19.5 3.6v3.6h-3.6"/><rect x="9.5" y="9.5" width="5" height="5" rx="1"/>' },
    { key: 'sales', cn: '买卖', en: 'Sales', body: '<path d="M4 8.5h15"/><path d="M15.5 5 19 8.5 15.5 12"/><path d="M20 15.5H5"/><path d="M8.5 12 5 15.5 8.5 19"/>' },
    { key: 'listings', cn: '房源', en: 'Listings', body: '<rect x="3.5" y="3.5" width="17" height="17" rx="2"/><path d="M3.5 11h7v9.5"/><path d="M10.5 15h10"/><path d="M14 3.5v4"/>' },
    { key: 'cities', cn: '城市', en: 'Cities', body: '<path d="M12 21s-6.5-5.7-6.5-11a6.5 6.5 0 0 1 13 0c0 5.3-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>' },
    { key: 'consult', cn: '咨询', en: 'Consult', body: '<path d="M4 6.5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-7l-4.5 3.5v-3.5H6a2 2 0 0 1-2-2z"/><path d="M8 9.5h8M8 12.5h5"/>' }
  ];
  function icon(i, color, attrs) {
    return wrap(24, 24, '<g fill="none" stroke="' + (color || 'currentColor') + '" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' + i.body + '</g>', attrs);
  }

  return { INK: INK, concepts: concepts, logo: logo, mark: mark, smallMark: smallMark, appIcon: appIcon, favicon: favicon, icons: icons, icon: icon, motionMark: motionMark };
})();
