/* Malloyyo multi-dataset sandbox (2026-07-02) — ported from the Malloy build's WB16 engine and EXTENDED:
 * one live Malloy-subset engine, THREE switchable datasets mirroring the real malloyyo.vercel.app public
 * datasets (auto_recalls / baby_names / order_items). You write a query; it is parsed, compiled to SQL
 * (shown), and EXECUTED in your browser against a bundled deterministic sample, so results are really
 * computed from your input, not canned. Unsupported syntax fails with a friendly message; it never
 * fabricates output.
 *
 * DATA HONESTY: each bundled sample is SYNTHETIC data over the dataset's real schema (deterministic seed,
 * reproducible). The numbers are for demonstration only — the live Malloyyo serves real models to any MCP
 * client. The per-dataset caption says exactly this in the UI.
 *
 * Example arcs are grounded in the REAL example questions shown on the live site's dataset cards
 * (captured 2026-07-02, CAPTURE.md).
 *
 * Supported subset (grounded in docs.malloydata.dev/documentation/language/query):
 *   run: <source> -> { group_by: a, b   aggregate: name is count()|sum(x)|avg(x)|min(x)|max(x)|count(distinct x)
 *                      fn() { where: … }   where: col = 'x' and col > N   order_by: name desc   limit: N
 *                      nest: name is { … }   select: a, b }
 * No dependencies. Builds the UI inside #sandbox-app; degrades to the <noscript> block if absent.
 */
(function () {
  'use strict';
  var app = document.getElementById('sandbox-app');
  if (!app) return;
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var SEP = '~|~';

  // ===== deterministic PRNG shared by the dataset builders ==================================================
  function makeRnd(seed) { var s = seed; return function () { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; }; }

  // ===== dataset builders (synthetic rows, real schema, deterministic) =====================================
  function buildRecalls() {
    var MFRS = [['Ford', 14], ['General Motors', 13], ['Toyota', 11], ['Honda', 10], ['Stellantis', 10], ['Nissan', 8],
      ['Hyundai', 7], ['Volkswagen', 6], ['BMW', 5], ['Mercedes-Benz', 5], ['Kia', 5], ['Tesla', 4], ['Subaru', 4], ['Porsche', 3], ['Volvo', 2]];
    var COMPONENTS = [
      ['Air Bags', ['Inflator may rupture', 'Airbag may not deploy']],
      ['Electrical System', ['Wiring may short circuit', 'Software error disables safety feature']],
      ['Fuel System', ['Fuel leak may cause fire', 'Fuel pump may fail']],
      ['Brakes', ['Brake fluid leak', 'ABS module failure']],
      ['Steering', ['Steering column may separate', 'Loss of power steering']],
      ['Suspension', ['Control arm may fracture']],
      ['Seat Belts', ['Buckle may unlatch in a crash']],
      ['Powertrain', ['Transmission may shift to neutral', 'Engine stall risk']],
      ['Structure', ['Frame corrosion']],
      ['Backover Prevention', ['Rearview image may not display']]
    ];
    var weighted = [];
    MFRS.forEach(function (m) { for (var i = 0; i < m[1]; i++) weighted.push(m[0]); });
    var rnd = makeRnd(20260702), rows = [];
    for (var n = 0; n < 700; n++) {
      var mfr = weighted[Math.floor(rnd() * weighted.length)];
      var comp = COMPONENTS[Math.floor(rnd() * COMPONENTS.length)];
      var subject = comp[1][Math.floor(rnd() * comp[1].length)];
      var year = 2026 - Math.floor(Math.pow(rnd(), 1.6) * 30);            // weighted toward recent years
      var vehicles = Math.round(Math.pow(10, 3 + rnd() * 3.2));           // ~1k .. ~1.6M, long tail
      rows.push({
        manufacturer: mfr, component: comp[0], subject: subject, year: year,
        vehicles_affected: vehicles, do_not_drive: rnd() < 0.025 ? 1 : 0,
        completion_pct: 15 + Math.floor(rnd() * 80)
      });
    }
    return rows;
  }

  function buildNames() {
    // [name, sex, peak decade, base size, southern lean]
    var NAMES = [
      ['Mary', 'F', 1940, 95, 1], ['John', 'M', 1930, 90, 0], ['Betty', 'F', 1930, 70, 1], ['William', 'M', 1930, 75, 0],
      ['Dorothy', 'F', 1930, 65, 1], ['Charles', 'M', 1930, 60, 0], ['Robert', 'M', 1940, 88, 0], ['Barbara', 'F', 1940, 72, 0],
      ['Richard', 'M', 1940, 66, 0], ['Willie', 'M', 1940, 40, 1], ['Linda', 'F', 1950, 92, 0], ['James', 'M', 1950, 94, 1],
      ['Patricia', 'F', 1950, 78, 0], ['David', 'M', 1960, 85, 0], ['Susan', 'F', 1960, 74, 0], ['Karen', 'F', 1960, 70, 0],
      ['Lisa', 'F', 1960, 76, 0], ['Michael', 'M', 1970, 96, 0], ['Jennifer', 'F', 1970, 90, 0], ['Brian', 'M', 1970, 62, 0],
      ['Kevin', 'M', 1970, 58, 0], ['Amy', 'F', 1970, 60, 0], ['Amanda', 'F', 1980, 68, 0], ['Melissa', 'F', 1980, 64, 0],
      ['Sarah', 'F', 1980, 72, 0], ['Joshua', 'M', 1980, 70, 0], ['Daniel', 'M', 1980, 68, 0], ['Jessica', 'F', 1990, 88, 0],
      ['Kyle', 'M', 1990, 66, 0], ['Ashley', 'F', 1990, 80, 1], ['Matthew', 'M', 1990, 78, 0], ['Tyler', 'M', 1990, 62, 0],
      ['Brandon', 'M', 1990, 60, 0], ['Madison', 'F', 2000, 70, 0], ['Ethan', 'M', 2000, 68, 0], ['Jacob', 'M', 2000, 74, 0],
      ['Emily', 'F', 2000, 76, 0], ['Hannah', 'F', 2000, 64, 0], ['Emma', 'F', 2010, 82, 0], ['Liam', 'M', 2010, 80, 0],
      ['Olivia', 'F', 2010, 78, 0], ['Noah', 'M', 2010, 76, 0], ['Sophia', 'F', 2010, 72, 0], ['Aiden', 'M', 2010, 58, 0]
    ];
    var STATES = [['CA', 12], ['TX', 10], ['NY', 10], ['FL', 8], ['LA', 4], ['IL', 7], ['OH', 6], ['GA', 5], ['PA', 7], ['NC', 5]];
    var SOUTH = { TX: 1, FL: 1, LA: 1, GA: 1, NC: 1 };
    var rnd = makeRnd(19620314), rows = [];
    NAMES.forEach(function (nm) {
      for (var d = 1930; d <= 2020; d += 10) {
        var dist = Math.abs(d - nm[2]) / 10;
        var decay = Math.max(0, 1 - dist * 0.34);                         // popularity fades away from the peak
        if (decay <= 0.02) continue;
        STATES.forEach(function (st) {
          var southern = nm[4] && SOUTH[st[0]] ? (d <= 1970 ? 2.2 : 1.3) : 1;  // the LA/1960s story lives here
          var births = Math.round(nm[3] * decay * st[1] * southern * (60 + rnd() * 80));
          if (births < 400) return;
          rows.push({ name: nm[0], sex: nm[1], decade: d, state: st[0], births: births });
        });
      }
    });
    return rows;
  }

  function buildOrders() {
    var CATALOG = [
      ['Apparel', [['Trail Jacket', 129], ['Merino Tee', 45], ['Storm Pants', 98]]],
      ['Electronics', [['Dive Computer', 449], ['Headlamp', 59], ['Action Camera', 329]]],
      ['Home', [['French Press', 39], ['Chef Knife', 89], ['Wool Blanket', 119]]],
      ['Outdoors', [['Tent 2P', 259], ['Sleeping Bag', 149], ['Trekking Poles', 79]]],
      ['Beauty', [['Sunscreen SPF50', 18], ['Face Serum', 42]]]
    ];
    var REGIONS = ['West', 'South', 'Midwest', 'Northeast'];
    var rnd = makeRnd(8675309), rows = [];
    for (var n = 0; n < 1400; n++) {
      var cat = CATALOG[Math.floor(rnd() * CATALOG.length)];
      var prod = cat[1][Math.floor(rnd() * cat[1].length)];
      rows.push({
        product_category: cat[0], product: prod[0], region: REGIONS[Math.floor(rnd() * REGIONS.length)],
        sale_price: prod[1], quantity: 1 + Math.floor(rnd() * 4), order_month: 1 + Math.floor(rnd() * 12)
      });
    }
    return rows;
  }

  // ===== dataset registry — mirrors the live site's public dataset cards ===================================
  var DATASETS = [
    {
      key: 'auto_recalls', source: 'recalls', label: 'auto_recalls',
      blurb: 'Vehicle recall campaigns (real NHTSA schema, synthetic sample).',
      cols: ['manufacturer', 'component', 'subject', 'year', 'vehicles_affected', 'do_not_drive', 'completion_pct'],
      colAlias: { maker: 'manufacturer', vehicles: 'vehicles_affected' },
      plainCols: ['year'],
      note: 'The live dataset answers from real NHTSA data.',
      build: buildRecalls,
      examples: [
        { id: 'r-mfr', ask: 'Which manufacturers have recalled the most vehicles in total?', label: 'By manufacturer', blurb: 'The card\'s first question: which manufacturers have recalled the most vehicles in total?',
          teach: 'Two aggregates in one block, each named up front. order_by points at the OUTPUT name, not a SQL expression.',
          try: 'Swap sum(vehicles_affected) for count() to rank by number of campaigns instead of vehicles.',
          malloy: "run: recalls -> {\n  group_by: manufacturer\n  aggregate:\n    campaigns is count()\n    vehicles is sum(vehicles_affected)\n  order_by: vehicles desc\n  limit: 8\n}" },
        { id: 'r-year', ask: 'Recall counts by year since 2000.', label: 'Trend since 2000', blurb: 'Recall counts by year since 2000, straight from the card.',
          teach: 'The where: filter sits inside the query block, next to the logic it guards.',
          try: 'Change 2000 to 2015, or group by component instead of year.',
          malloy: "run: recalls -> {\n  group_by: year\n  aggregate: campaigns is count()\n  where: year >= 2000\n  order_by: year desc\n  limit: 12\n}" },
        { id: 'r-dnd', ask: 'The largest Do Not Drive recalls, and what fraction of owners actually got the fix?', label: 'Do Not Drive', blurb: 'The severe ones: Do Not Drive campaigns, and what fraction of owners actually got the fix.',
          teach: 'completion_pct is averaged per manufacturer; do_not_drive is a 0/1 flag, so the filter reads like a sentence.',
          try: "Group by component instead, or add  where: year >= 2015.",
          malloy: "run: recalls -> {\n  group_by: manufacturer\n  aggregate:\n    vehicles is sum(vehicles_affected)\n    fix_rate is avg(completion_pct)\n  where: do_not_drive = 1\n  order_by: vehicles desc\n}" },
        { id: 'r-free', ask: 'Porsche recalls grouped by subject.', label: 'Your turn', free: true,
          blurb: 'Everything composes: group_by, aggregate (with { where: … }), where, nest, order_by, limit, select.',
          teach: 'Columns: manufacturer, component, subject, year, vehicles_affected, do_not_drive, completion_pct.',
          try: "The card's Porsche question:  where: manufacturer = 'Porsche'  with  group_by: subject.",
          malloy: "run: recalls -> {\n  group_by: subject\n  aggregate: campaigns is count()\n  where: manufacturer = 'Porsche'\n  order_by: campaigns desc\n}" }
      ]
    },
    {
      key: 'baby_names', source: 'names', label: 'baby_names',
      blurb: 'US baby names by decade and state (real SSA schema, synthetic sample).',
      cols: ['name', 'sex', 'decade', 'state', 'births'],
      colAlias: {},
      plainCols: ['decade'],
      note: 'The live dataset answers from real SSA data.',
      build: buildNames,
      examples: [
        { id: 'n-top', ask: 'Top names in each decade.', label: 'Top per decade', blurb: 'The card\'s first question, and Malloy\'s signature move: a small ranked table inside each decade.',
          teach: 'nest: returns a sub-table per group. In SQL this needs window functions; in Malloy it is one readable block.',
          try: 'Change limit: 3 to 1 to get just each decade\'s #1.',
          malloy: "run: names -> {\n  group_by: decade\n  nest: top_names is {\n    group_by: name\n    aggregate: births is sum(births)\n    order_by: births desc\n    limit: 3\n  }\n  order_by: decade asc\n}" },
        { id: 'n-kyle', ask: 'Tell me about the name Kyle: popularity over time.', label: 'The name Kyle', blurb: 'Straight from the card: Kyle\'s popularity over time.',
          teach: 'One filter, one grouping: the whole story of a name in five lines.',
          try: "Try your own name. Or group_by: state to see where Kyle peaked.",
          malloy: "run: names -> {\n  group_by: decade\n  aggregate: births is sum(births)\n  where: name = 'Kyle'\n  order_by: decade asc\n}" },
        { id: 'n-la', ask: 'Which names from the 1960s were most over-represented in Louisiana?', label: 'Louisiana, 1960s', blurb: 'The card\'s over-representation question, using a FILTERED aggregate: Louisiana births next to national births, in one row.',
          teach: 'sum(births) { where: state = \'LA\' } compiles to the CASE WHEN you would otherwise hand-build. Two measures, two scopes, one query.',
          try: 'Swap LA for GA, or 1960 for 1990.',
          malloy: "run: names -> {\n  group_by: name\n  aggregate:\n    la_births is sum(births) { where: state = 'LA' }\n    national is sum(births)\n  where: decade = 1960\n  order_by: la_births desc\n  limit: 8\n}" },
        { id: 'n-free', ask: 'How many distinct names appear in each decade?', label: 'Your turn', free: true,
          blurb: 'Columns: name, sex, decade, state, births. Compose anything.',
          teach: 'count(distinct name) per decade shows naming diversity rising.',
          try: 'aggregate: distinct_names is count(distinct name)  grouped by decade.',
          malloy: "run: names -> {\n  group_by: decade\n  aggregate: distinct_names is count(distinct name)\n  order_by: decade asc\n}" }
      ]
    },
    {
      key: 'order_items', source: 'order_items', label: 'order_items',
      blurb: 'Ecommerce order lines from the example models set (synthetic sample).',
      cols: ['product_category', 'product', 'region', 'sale_price', 'quantity', 'order_month'],
      colAlias: { category: 'product_category', month: 'order_month' },
      note: 'Matches the live example_models set.',
      build: buildOrders,
      examples: [
        { id: 'o-rev', ask: 'Where does the revenue come from, by category?', label: 'Revenue by category', blurb: 'The basic pitch question: where does the money come from?',
          teach: 'sale_price sums per category; the name revenue is defined right where it is used.',
          try: 'Add  avg_ticket is avg(sale_price)  to the aggregate list.',
          malloy: "run: order_items -> {\n  group_by: product_category\n  aggregate: revenue is sum(sale_price)\n  order_by: revenue desc\n}" },
        { id: 'o-region', ask: 'What does each region buy the most of?', label: 'Regional mix', blurb: 'A nested breakdown: each region\'s top categories, one query.',
          teach: 'The same nest: shape as baby_names. The pattern transfers across datasets because the language is the same.',
          try: 'Nest by product instead of product_category.',
          malloy: "run: order_items -> {\n  group_by: region\n  aggregate: revenue is sum(sale_price)\n  nest: top_categories is {\n    group_by: product_category\n    aggregate: revenue is sum(sale_price)\n    order_by: revenue desc\n    limit: 2\n  }\n  order_by: revenue desc\n}" },
        { id: 'o-free', ask: 'Which categories spike in the holiday season?', label: 'Your turn', free: true,
          blurb: 'Columns: product_category, product, region, sale_price, quantity, order_month.',
          teach: 'Filtered aggregates work here too.',
          try: "holiday is sum(sale_price) { where: order_month >= 11 }  next to a plain revenue sum.",
          malloy: "run: order_items -> {\n  group_by: product_category\n  aggregate:\n    revenue is sum(sale_price)\n    holiday is sum(sale_price) { where: order_month >= 11 }\n  order_by: revenue desc\n}" }
      ]
    }
  ];
  DATASETS.forEach(function (d) { d.rows = d.build(); });

  var DS = DATASETS[0];   // active dataset (switched by the dataset tabs)

  // ===== Malloy subset parser (identical engine; column/source resolution is per-dataset) ===================
  function err(msg) { var e = new Error(msg); e.friendly = true; return e; }
  function resolveCol(name) {
    name = name.trim();
    var c = DS.colAlias[name] || name;
    if (DS.cols.indexOf(c) === -1) throw err('unknown column “' + name + '” in ' + DS.label + '. Columns: ' + DS.cols.join(', ') + '.');
    return c;
  }
  function checkSource(src) {
    var m = /^\s*run\s*:\s*([A-Za-z_]\w*)/.exec(src);
    if (m && m[1] !== DS.source) {
      var owner = DATASETS.filter(function (d) { return d.source === m[1]; })[0];
      throw err('“' + m[1] + '” is not this dataset\'s source. This tab queries `' + DS.source + '`' +
        (owner ? '; switch to the ' + owner.label + ' dataset above to query `' + m[1] + '`.' : '.'));
    }
  }
  function topBlock(src) {
    var open = src.indexOf('{'), close = src.lastIndexOf('}');
    if (open === -1 || close === -1 || close < open) throw err('expected a query block: run: ' + DS.source + ' -> { … }');
    return src.slice(open + 1, close);
  }
  function splitClauses(body) {
    var kw = /\b(group_by|aggregate|where|having|order_by|limit|nest|select|calculate)\s*:/g;
    var marks = [], depth = 0;
    for (var i = 0; i < body.length; i++) {
      var ch = body[i];
      if (ch === '{') depth++;
      else if (ch === '}') depth--;
      else if (depth === 0) { kw.lastIndex = i; var hit = kw.exec(body); if (hit && hit.index === i) { marks.push({ key: hit[1], valStart: i + hit[0].length, start: i }); i = hit.index + hit[0].length - 1; } }
    }
    if (!marks.length) throw err('no query operators found. Try group_by:, aggregate:, where:, order_by:, limit: or nest:');
    var clauses = [];
    for (var j = 0; j < marks.length; j++) { var end = (j + 1 < marks.length) ? marks[j + 1].start : body.length; clauses.push({ key: marks[j].key, val: body.slice(marks[j].valStart, end).trim() }); }
    return clauses;
  }
  function splitList(s) { return s.split(/[,\n]/).map(function (x) { return x.trim(); }).filter(Boolean); }

  function parseAgg(item) {
    var name = null, expr = item, aggFilters = null;
    var fwm = /^([\s\S]*?)\{\s*where\s*:\s*([\s\S]*?)\}\s*$/.exec(expr);
    if (fwm) { expr = fwm[1].trim(); aggFilters = parseFilters(fwm[2].trim()); }
    var isM = /^([A-Za-z_]\w*)\s+is\s+(.+)$/.exec(expr);
    if (isM) { name = isM[1]; expr = isM[2].trim(); }
    var fm = /^(count|sum|avg|min|max)\s*\(\s*(.*?)\s*\)$/i.exec(expr);
    if (!fm) throw err('can\'t read aggregate “' + item + '”. Use count(), sum(col), avg(col), min(col), max(col), or count(distinct col).');
    var fn = fm[1].toLowerCase(), arg = fm[2].trim(), distinct = false;
    if (/^distinct\s+/i.test(arg)) { distinct = true; arg = arg.replace(/^distinct\s+/i, '').trim(); }
    if (fn !== 'count' && !arg) throw err(fn + '() needs a column, e.g. ' + fn + '(' + (DS.cols[3] || DS.cols[0]) + ').');
    var col = arg ? resolveCol(arg) : null;
    return { name: name || (fn + (col ? '_' + col : '')), fn: fn, col: col, distinct: distinct, filters: aggFilters };
  }
  function parseFilters(s) {
    var parts = s.split(/\s+(and|or)\s+/i), out = [];
    for (var i = 0; i < parts.length; i += 2) {
      var term = parts[i].trim(), conj = i === 0 ? null : parts[i - 1].toLowerCase();
      var tm = /^([A-Za-z_]\w*)\s*(=|!=|>=|<=|>|<)\s*(.+)$/.exec(term);
      if (!tm) throw err('can\'t read filter “' + term + '”. Use e.g. ' + DS.cols[0] + " = 'x' or " + (DS.cols[3] || DS.cols[1]) + ' > 100.');
      var col = resolveCol(tm[1]), op = tm[2], raw = tm[3].trim(), val;
      if (/^'.*'$/.test(raw) || /^".*"$/.test(raw)) val = raw.slice(1, -1);
      else if (/^-?\d+(\.\d+)?$/.test(raw)) val = parseFloat(raw);
      else throw err('filter value should be a number or a \'quoted string\' (got ' + raw + ').');
      out.push({ col: col, op: op, val: val, conj: conj });
    }
    return out;
  }
  function parseBlock(body) {
    var spec = { groupBy: [], aggregates: [], filters: [], orderBy: null, limit: null, nest: null, select: null };
    splitClauses(body).forEach(function (c) {
      if (c.key === 'group_by') spec.groupBy = splitList(c.val).map(resolveCol);
      else if (c.key === 'aggregate') spec.aggregates = splitList(c.val).map(parseAgg);
      else if (c.key === 'where' || c.key === 'having') spec.filters = spec.filters.concat(parseFilters(c.val));
      else if (c.key === 'order_by') {
        var om = /^([A-Za-z_]\w*)\s*(asc|desc)?$/i.exec(splitList(c.val)[0] || '');
        if (!om) throw err('order_by should be a field name + optional asc/desc.');
        spec.orderBy = { name: om[1], dir: (om[2] || 'asc').toLowerCase() };
      } else if (c.key === 'limit') {
        if (!/^\d+$/.test(c.val.trim())) throw err('limit should be a whole number.');
        spec.limit = parseInt(c.val, 10);
      } else if (c.key === 'select') spec.select = splitList(c.val).map(resolveCol);
      else if (c.key === 'nest') {
        var nm = /^([A-Za-z_]\w*)\s+is\s*\{([\s\S]*)\}\s*$/.exec(c.val);
        if (!nm) throw err('nest should look like: nest: name is { group_by: … aggregate: … }');
        spec.nest = { name: nm[1], spec: parseBlock(nm[2]) };
        if (spec.nest.spec.nest) throw err('this playground supports one level of nesting.');
      } else throw err('“' + c.key + '” isn\'t supported in this playground yet.');
    });
    if (!spec.groupBy.length && !spec.aggregates.length && !spec.select) throw err('add a group_by, an aggregate, or a select.');
    return spec;
  }
  function parseMalloy(src) {
    var s = src.trim();
    if (!s) throw err('type a query, e.g. run: ' + DS.source + ' -> { group_by: ' + DS.cols[0] + '  aggregate: n is count() }');
    checkSource(s);
    return parseBlock(topBlock(s));
  }

  // ===== executor ===========================================================================================
  function applyFilters(rows, filters) {
    if (!filters.length) return rows;
    return rows.filter(function (r) {
      var acc = null;
      filters.forEach(function (f) {
        var v = r[f.col], res;
        switch (f.op) {
          case '=': res = v == f.val; break;
          case '!=': res = v != f.val; break;
          case '>': res = v > f.val; break;
          case '<': res = v < f.val; break;
          case '>=': res = v >= f.val; break;
          case '<=': res = v <= f.val; break;
        }
        acc = acc === null ? res : (f.conj === 'or' ? (acc || res) : (acc && res));
      });
      return acc;
    });
  }
  function computeAgg(rows, a) {
    if (a.filters) rows = applyFilters(rows, a.filters);
    if (a.fn === 'count') {
      if (a.distinct && a.col) { var set = {}; rows.forEach(function (r) { set[r[a.col]] = 1; }); return Object.keys(set).length; }
      return rows.length;
    }
    var nums = rows.map(function (r) { return Number(r[a.col]); });
    if (!nums.length) return 0;
    if (a.fn === 'sum') return nums.reduce(function (x, y) { return x + y; }, 0);
    if (a.fn === 'avg') return Math.round(nums.reduce(function (x, y) { return x + y; }, 0) / nums.length);
    if (a.fn === 'min') return Math.min.apply(null, nums);
    if (a.fn === 'max') return Math.max.apply(null, nums);
  }
  function runSpec(spec, rows) {
    rows = applyFilters(rows, spec.filters);
    if (spec.select && !spec.groupBy.length && !spec.aggregates.length) {
      var sel = rows.slice(0, spec.limit || 50).map(function (r) { var o = {}; spec.select.forEach(function (c) { o[c] = r[c]; }); return o; });
      return { columns: spec.select.slice(), rows: sel };
    }
    var cols = spec.groupBy.slice(), aggCols = spec.aggregates.map(function (a) { return a.name; });
    if (spec.nest) aggCols.push(spec.nest.name);
    var out;
    if (!spec.groupBy.length) {
      var one = {}; spec.aggregates.forEach(function (a) { one[a.name] = computeAgg(rows, a); }); out = [one];
    } else {
      var groups = {};
      rows.forEach(function (r) {
        var k = spec.groupBy.map(function (c) { return r[c]; }).join(SEP);
        if (!groups[k]) groups[k] = { rows: [], rep: r };
        groups[k].rows.push(r);
      });
      out = Object.keys(groups).map(function (k) {
        var grp = groups[k].rows, row = {};
        spec.groupBy.forEach(function (c) { row[c] = groups[k].rep[c]; });
        spec.aggregates.forEach(function (a) { row[a.name] = computeAgg(grp, a); });
        if (spec.nest) {
          var sub = runSpec(spec.nest.spec, grp);
          row[spec.nest.name] = sub.rows.map(function (sr) {
            var label = spec.nest.spec.groupBy[0] ? sr[spec.nest.spec.groupBy[0]] : '';
            var metric = spec.nest.spec.aggregates[0] ? sr[spec.nest.spec.aggregates[0].name] : '';
            return label + (metric !== '' ? ':' + metric : '');
          }).join(' · ');
        }
        return row;
      });
    }
    if (spec.orderBy) {
      var key = spec.orderBy.name, dir = spec.orderBy.dir === 'desc' ? -1 : 1;
      out.sort(function (a, b) { var x = a[key], y = b[key]; if (x === undefined) return 0; return (x < y ? -1 : x > y ? 1 : 0) * dir; });
    }
    if (spec.limit) out = out.slice(0, spec.limit);
    return { columns: cols.concat(aggCols), rows: out };
  }

  // ===== SQL generation (display, derived from the same spec) ==============================================
  function fmtFilters(filters) {
    return filters.map(function (f, i) {
      var v = typeof f.val === 'string' ? "'" + f.val + "'" : f.val;
      return (i ? (f.conj === 'or' ? 'OR ' : 'AND ') : '') + f.col + ' ' + f.op + ' ' + v;
    }).join(' ');
  }
  function aggSQL(a) {
    if (a.filters) {
      var cond = fmtFilters(a.filters);
      if (a.fn === 'count') return 'COUNT(CASE WHEN ' + cond + ' THEN 1 END) AS ' + a.name;
      return a.fn.toUpperCase() + '(CASE WHEN ' + cond + ' THEN ' + a.col + ' END) AS ' + a.name;
    }
    var inner = a.fn === 'count' ? (a.distinct ? 'DISTINCT ' + a.col : '1') : a.col;
    return a.fn.toUpperCase() + '(' + inner + ') AS ' + a.name;
  }
  function toSQL(spec) {
    if (spec.select && !spec.groupBy.length && !spec.aggregates.length) {
      return 'SELECT ' + spec.select.join(', ') + '\nFROM ' + DS.source +
        (spec.filters.length ? '\nWHERE ' + fmtFilters(spec.filters) : '') + (spec.limit ? '\nLIMIT ' + spec.limit : '');
    }
    var sel = spec.groupBy.concat(spec.aggregates.map(aggSQL));
    var lines = ['SELECT ' + sel.join(',\n       ')];
    if (spec.nest) {
      var ns = spec.nest.spec, na = ns.aggregates[0];
      lines[0] = lines[0] + ',';
      lines.push('       LIST(STRUCT_PACK(        -- nested: ' + spec.nest.name);
      ns.groupBy.forEach(function (c) { lines.push('         ' + c + ','); });
      lines.push('         ' + (na ? na.name + ' := ' + (na.fn === 'count' ? 'cnt' : na.fn + '_' + na.col) : 'cnt'));
      lines.push('       )' + (ns.orderBy ? ' ORDER BY ' + (na ? na.name : 'cnt') + ' ' + ns.orderBy.dir.toUpperCase() : '') +
        ')' + (ns.limit ? '[1:' + ns.limit + ']' : '') + ' AS ' + spec.nest.name);
    }
    lines.push('FROM ' + DS.source);
    if (spec.filters.length) lines.push('WHERE ' + fmtFilters(spec.filters));
    if (spec.groupBy.length) lines.push('GROUP BY ' + spec.groupBy.join(', '));
    if (spec.orderBy) lines.push('ORDER BY ' + spec.orderBy.name + ' ' + spec.orderBy.dir.toUpperCase());
    if (spec.limit) lines.push('LIMIT ' + spec.limit);
    return lines.join('\n');
  }

  // ===== UI =================================================================================================
  var current = null, typeTimer = null;
  app.innerHTML = ''; app.classList.add('sandbox-ready');

  // dataset switcher — echoes the live site's dataset browser (name + public pill)
  var dsBar = el('div', 'sandbox-datasets'); dsBar.setAttribute('role', 'tablist'); dsBar.setAttribute('aria-label', 'Datasets');
  DATASETS.forEach(function (d) {
    var b = el('button', 'sandbox-ds'); b.type = 'button'; b.dataset.key = d.key;
    b.setAttribute('role', 'tab');
    b.innerHTML = '<strong>' + escapeHtml(d.label) + '</strong><em>public</em><span>' + escapeHtml(d.blurb) + '</span>';
    b.addEventListener('click', function () { selectDataset(d); });
    dsBar.appendChild(b);
  });

  var tabs = el('div', 'sandbox-tabs'); tabs.setAttribute('role', 'tablist'); tabs.setAttribute('aria-label', 'Real questions');

  // the "talk to your data" line: the plain-language question the selected example answers.
  // This is the loop the page teaches: you ask -> the AI composes Malloy -> it compiles to SQL -> your answer.
  var askRow = el('div', 'sandbox-ask');
  askRow.innerHTML = '<span class="sandbox-ask-you">you:</span> <q class="sandbox-ask-q"></q>';
  var askQ = askRow.querySelector('.sandbox-ask-q');
  var askTimer = null;
  function setAsk(text, instant) {
    if (askTimer) { clearInterval(askTimer); askTimer = null; }
    if (!text) { askRow.hidden = true; return; }
    askRow.hidden = false;
    if (instant || reduceMotion) { askQ.textContent = text; return; }
    askQ.textContent = '';
    var i = 0;
    askTimer = setInterval(function () {
      i += 2; askQ.textContent = text.slice(0, i);
      if (i >= text.length) { clearInterval(askTimer); askTimer = null; }
    }, 14);
  }

  var grid = el('div', 'sandbox-grid');
  var left = el('div', 'sandbox-pane sandbox-in');
  var leftHead = el('div', 'sandbox-pane-head'); leftHead.innerHTML = '<span class="sandbox-dot sandbox-dot-malloy"></span> Malloy · what your AI composes';
  leftHead.appendChild(copyBtn(function () { return editor.value; }, 'Copy Malloy'));
  var editor = document.createElement('textarea');
  editor.className = 'sandbox-editor'; editor.setAttribute('spellcheck', 'false'); editor.setAttribute('aria-label', 'Malloy query (editable)');
  var learn = document.createElement('details'); learn.className = 'sandbox-learn';
  var learnSum = document.createElement('summary'); learnSum.textContent = 'What is going on here?';
  var learnBody = el('div', 'sandbox-learn-body');
  learn.appendChild(learnSum); learn.appendChild(learnBody);
  var schema = document.createElement('details'); schema.className = 'sandbox-schema';
  var schemaSum = document.createElement('summary'); schemaSum.textContent = 'Model reference';
  var schemaBody = el('div');
  schema.appendChild(schemaSum); schema.appendChild(schemaBody);
  left.appendChild(leftHead); left.appendChild(editor); left.appendChild(learn); left.appendChild(schema);

  var right = el('div', 'sandbox-pane sandbox-out');
  var rightHead = el('div', 'sandbox-pane-head'); rightHead.innerHTML = '<span class="sandbox-dot sandbox-dot-sql"></span> Compiled SQL';
  rightHead.appendChild(copyBtn(function () { return sqlCode.textContent; }, 'Copy SQL'));
  var sqlPre = el('pre', 'code sandbox-sql'); var sqlCode = document.createElement('code'); sqlPre.appendChild(sqlCode);
  var sqlNote = el('p', 'sandbox-note sandbox-sqlnote');
  var errBox = el('div', 'sandbox-error'); errBox.hidden = true;
  var resultsWrap = el('div', 'sandbox-results');
  right.appendChild(rightHead); right.appendChild(sqlPre); right.appendChild(sqlNote); right.appendChild(errBox); right.appendChild(resultsWrap);

  grid.appendChild(left); grid.appendChild(right);

  var bar = el('div', 'sandbox-bar');
  var runBtn = el('button', 'cta sandbox-run'); runBtn.type = 'button'; runBtn.innerHTML = 'Compile to SQL <span aria-hidden="true">▸</span>';
  runBtn.addEventListener('click', compile);
  var hint = el('span', 'sandbox-editnote'); hint.textContent = 'Edit anything and re-run. (Ctrl+Enter)';
  var shareBtn = el('button', 'sandbox-share'); shareBtn.type = 'button'; shareBtn.textContent = 'Share'; shareBtn.title = 'Copy a link that opens this exact query';
  shareBtn.addEventListener('click', function () {
    var url = location.origin + location.pathname + '#d=' + encodeURIComponent(DS.key) + '&q=' + encodeURIComponent(b64encode(editor.value));
    var done = function () { shareBtn.textContent = 'Link copied'; setTimeout(function () { shareBtn.textContent = 'Share'; }, 1500); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(done, function () { legacyCopy(url); done(); });
    else { legacyCopy(url); done(); }
    try { history.replaceState(null, '', url); } catch (e) {}
  });
  bar.appendChild(runBtn); bar.appendChild(shareBtn); bar.appendChild(hint);
  left.appendChild(bar);

  var caption = el('p', 'sandbox-caption');
  right.appendChild(caption);

  app.appendChild(dsBar); app.appendChild(tabs); app.appendChild(askRow); app.appendChild(grid);

  editor.addEventListener('keydown', function (e) { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); compile(); } });

  function selectDataset(d, initial, keepQuery) {
    DS = d;
    Array.prototype.forEach.call(dsBar.children, function (t) {
      var on = t.dataset.key === d.key; t.classList.toggle('is-active', on); t.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    tabs.innerHTML = '';
    d.examples.forEach(function (ex) {
      var b = el('button', 'sandbox-tab' + (ex.free ? ' sandbox-tab-yours' : '')); b.type = 'button';
      b.textContent = (ex.free ? '' : '★ ') + ex.label;
      b.setAttribute('role', 'tab'); b.dataset.id = ex.id;
      b.addEventListener('click', function () { selectExample(ex); });
      tabs.appendChild(b);
    });
    schemaBody.innerHTML = '<code>' + d.source + '</code> · columns ' +
      d.cols.map(function (c) { return '<code>' + c + '</code>'; }).join(' ') +
      ' · <code>count()</code> <code>sum()</code> <code>avg()</code> <code>min()</code> <code>max()</code> <code>count(distinct …)</code>' +
      ' · operators <code>group_by</code> <code>aggregate</code> <code>where</code> <code>fn() { where: … }</code> <code>nest</code> <code>order_by</code> <code>limit</code> <code>select</code>';
    caption.innerHTML = 'Runs on a bundled ' + d.rows.length.toLocaleString() + '-row deterministic sample (real schema, synthetic rows), right in your browser. ' +
      escapeHtml(d.note) + ' The live Malloyyo serves real models to any MCP client.';
    if (!keepQuery) selectExample(d.examples[0], initial);
  }

  function selectExample(ex, initial) {
    current = ex;
    setAsk(ex.ask || '', initial);
    editor.value = ex.malloy;
    editor.rows = Math.max(5, ex.malloy.split('\n').length + 1);
    learnBody.innerHTML = escapeHtml(ex.blurb || '') + (ex.teach ? ' ' + escapeHtml(ex.teach) : '') +
      (ex.try ? '<span class="cap cap-try">Try it</span>' + escapeHtml(ex.try) : '');
    learn.hidden = !(ex.teach || ex.try);
    learn.open = false;
    Array.prototype.forEach.call(tabs.children, function (t) {
      var on = t.dataset.id === ex.id; t.classList.toggle('is-active', on); t.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    runQuery(initial);
  }
  function compile() { runBtn.classList.add('is-busy'); runQuery(false); }

  function runQuery(instant) {
    if (typeTimer) { clearInterval(typeTimer); typeTimer = null; }
    errBox.hidden = true; sqlNote.hidden = true;
    var spec, sql, result;
    try {
      spec = parseMalloy(editor.value);
      sql = toSQL(spec);
      result = runSpec(spec, DS.rows);
    } catch (e) {
      runBtn.classList.remove('is-busy');
      sqlCode.textContent = ''; resultsWrap.innerHTML = '';
      errBox.hidden = false;
      errBox.innerHTML = '<strong>Could not compile.</strong> ' + escapeHtml(e.friendly ? e.message : 'unexpected error, check the query shape.');
      return;
    }
    if (spec.nest) { sqlNote.hidden = false; sqlNote.textContent = 'Nested SQL is abridged for readability, Malloy generates the full warehouse-specific query.'; }
    showSql(sql, result, instant);
  }

  function showSql(sql, result, instant) {
    resultsWrap.innerHTML = '';
    if (instant || reduceMotion) { sqlCode.innerHTML = highlightSQL(sql); runBtn.classList.remove('is-busy'); renderResults(result); return; }
    sqlCode.textContent = '';
    var i = 0, step = Math.max(1, Math.round(sql.length / 80));
    typeTimer = setInterval(function () {
      i += step; sqlCode.textContent = sql.slice(0, i);
      if (i >= sql.length) { clearInterval(typeTimer); typeTimer = null; sqlCode.innerHTML = highlightSQL(sql); runBtn.classList.remove('is-busy'); renderResults(result); }
    }, 12);
  }

  function renderResults(result) {
    resultsWrap.innerHTML = '';
    var cap = el('div', 'sandbox-results-cap');
    cap.textContent = 'Your answer · ' + result.rows.length + ' row' + (result.rows.length === 1 ? '' : 's') + (result.rows.length >= 50 ? ' (first 50)' : '');
    resultsWrap.appendChild(cap);
    if (!result.rows.length) { var none = el('p', 'sandbox-note'); none.textContent = 'No rows matched.'; resultsWrap.appendChild(none); return; }
    var table = document.createElement('table'); table.className = 'sandbox-table';
    var thead = document.createElement('thead'), htr = document.createElement('tr');
    result.columns.forEach(function (c) { var th = document.createElement('th'); th.textContent = c; htr.appendChild(th); });
    thead.appendChild(htr);
    var tbody = document.createElement('tbody');
    result.rows.slice(0, 50).forEach(function (r) {
      var tr = document.createElement('tr');
      result.columns.forEach(function (c) {
        var td = document.createElement('td'); var v = r[c];
        // year-like columns (year, decade) render plain: "1,970" in a trust-the-numbers demo is fatal
        var plain = (DS.plainCols || []).indexOf(c) !== -1;
        td.textContent = (typeof v === 'number') ? (plain ? String(v) : v.toLocaleString()) : (v == null ? '' : String(v));
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    table.appendChild(thead); table.appendChild(tbody); resultsWrap.appendChild(table);
  }

  function el(tag, cls) { var n = document.createElement(tag); if (cls) n.className = cls; return n; }
  function escapeHtml(s) { return String(s).replace(/[&<>"]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]; }); }

  function highlightSQL(sql) {
    var html = escapeHtml(sql);
    html = html.replace(/('[^']*')/g, '<span class="sql-s">$1</span>');
    html = html.replace(/\b(SELECT|FROM|WHERE|GROUP BY|ORDER BY|LIMIT|AS|AND|OR|DISTINCT|CASE|WHEN|THEN|END|ASC|DESC|COUNT|SUM|AVG|MIN|MAX|LIST|STRUCT_PACK)\b/g, '<span class="sql-k">$1</span>');
    return html;
  }

  function copyBtn(getText, label) {
    var b = el('button', 'sandbox-copy'); b.type = 'button'; b.title = label; b.setAttribute('aria-label', label);
    b.innerHTML = '<span class="sandbox-copy-txt">Copy</span>';
    b.addEventListener('click', function () {
      var txt = getText() || '';
      var done = function () { var t = b.querySelector('.sandbox-copy-txt'); b.classList.add('is-done'); if (t) t.textContent = 'Copied'; setTimeout(function () { b.classList.remove('is-done'); if (t) t.textContent = 'Copy'; }, 1400); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(done, function () { legacyCopy(txt); done(); });
      else { legacyCopy(txt); done(); }
    });
    return b;
  }
  function legacyCopy(txt) { var ta = document.createElement('textarea'); ta.value = txt; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch (e) {} document.body.removeChild(ta); }
  function b64encode(s) { return btoa(unescape(encodeURIComponent(s))); }
  function b64decode(s) { return decodeURIComponent(escape(atob(s))); }

  // boot: honor a share link (#d=<dataset>&q=<base64>), else default to the first dataset
  (function boot() {
    var dm = /[#&]d=([^&]+)/.exec(location.hash || '');
    var qm = /[#&]q=([^&]+)/.exec(location.hash || '');
    var ds = DATASETS[0];
    if (dm) { var hit = DATASETS.filter(function (d) { return d.key === decodeURIComponent(dm[1]); })[0]; if (hit) ds = hit; }
    if (qm) {
      try {
        var q = b64decode(decodeURIComponent(qm[1]));
        selectDataset(ds, true, true);
        editor.value = q; editor.rows = Math.max(5, q.split('\n').length + 1);
        runQuery(true);
        return;
      } catch (e) { /* malformed link — fall through to the default */ }
    }
    selectDataset(ds, true);
  })();
})();
