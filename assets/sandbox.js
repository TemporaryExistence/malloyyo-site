/* Malloyyo multi-dataset sandbox (2026-07-02) — ported from the Malloy build's WB16 engine and EXTENDED:
 * one live Malloy-subset engine, THREE switchable datasets mirroring the real malloyyo.vercel.app public
 * datasets (auto_recalls / baby_names / order_items). You write a query; it is parsed, compiled to SQL
 * (shown), and EXECUTED in your browser against a bundled deterministic sample, so results are really
 * computed from your input, not canned. Unsupported syntax fails with a friendly message; it never
 * fabricates output.
 *
 * DATA HONESTY: auto_recalls and baby_names run on REAL public data (assets/data-recalls.js +
 * assets/data-names.js — NHTSA recall flat files + SSA by-state baby names; sources, refresh date, and
 * the sampling rule are in each file's header). Each data file loads on demand when its dataset is
 * selected (recalls is the default and is preloaded from index.html), so first paint never waits on
 * the full 700KB+ corpus.
 * order_items is a deterministic synthetic demo corpus over the example schema. The per-dataset caption
 * says exactly which is which in the UI. The live Malloyyo serves real models to any MCP client.
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

  // ===== dataset builders ===================================================================================
  // recalls + names are REAL public data (assets/data-recalls.js + assets/data-names.js, built 2026-07-02
  // from the NHTSA recall flat files and the SSA by-state baby-names files — sources + sampling rule
  // documented in each file's header).
  function buildRecalls() {
    return window.MALLOYYO_DATA_RECALLS.recalls.map(function (r) {
      return { manufacturer: r[0], component: r[1], subject: r[2], year: r[3], vehicles_affected: r[4], do_not_drive: r[5], completion_pct: r[6] };
    });
  }

  function buildNames() {
    return window.MALLOYYO_DATA_NAMES.names.map(function (r) {
      return { name: r[0], sex: r[1], decade: r[2], state: r[3], births: r[4] };
    });
  }

  function buildOrders() {
    // enriched to carry the REAL example questions from the live app's order_items card
    // (brands per category, states, returns, customers) — still a deterministic synthetic corpus.
    var CATALOG = [
      ['Apparel', ['Summit Thread', 'North Bay Co', 'Fieldline'], [['Trail Jacket', 129], ['Merino Tee', 45], ['Storm Pants', 98], ['Rain Shell', 159], ['Fleece Pullover', 74], ['Hiking Socks 3pk', 22], ['Sun Hoodie', 58]]],
      ['Electronics', ['Deepwatch', 'Voltaic Labs', 'Trailtronic'], [['Dive Computer', 449], ['Headlamp', 59], ['Action Camera', 329], ['GPS Watch', 379], ['Solar Charger', 89], ['Two-Way Radio', 129]]],
      ['Home', ['Hearthstone Goods', 'Copperline', 'Kettle & Oak'], [['French Press', 39], ['Chef Knife', 89], ['Wool Blanket', 119], ['Cast Iron Skillet', 49], ['Espresso Grinder', 189], ['Cutting Board', 34]]],
      ['Outdoors', ['Basecamp Supply', 'Ridgeform', 'Cairn Works'], [['Tent 2P', 259], ['Sleeping Bag', 149], ['Trekking Poles', 79], ['Water Filter', 45], ['Camp Stove', 99], ['Bear Canister', 84], ['Climbing Harness', 69]]],
      ['Beauty', ['Solara', 'Tidepool Botanics'], [['Sunscreen SPF50', 18], ['Face Serum', 42], ['Lip Balm 4pk', 12], ['After-Sun Lotion', 16]]]
    ];
    var STATES = [['California', 14], ['Texas', 11], ['Florida', 9], ['New York', 8], ['Washington', 7], ['Colorado', 7], ['Illinois', 6], ['Ohio', 6], ['Georgia', 6], ['Oregon', 5], ['Arizona', 5], ['Michigan', 5], ['North Carolina', 5], ['Pennsylvania', 4], ['Utah', 2]];
    var statePool = [];
    STATES.forEach(function (s) { for (var i = 0; i < s[1]; i++) statePool.push(s[0]); });
    var rnd = makeRnd(8675309), rows = [];
    for (var n = 0; n < 2200; n++) {
      var cat = CATALOG[Math.floor(rnd() * CATALOG.length)];
      var prod = cat[2][Math.floor(rnd() * cat[2].length)];
      var brand = cat[1][Math.floor(rnd() * cat[1].length)];
      // seasonality: outdoors peaks in summer, everything lifts in Nov/Dec
      var m = 1 + Math.floor(rnd() * 12);
      if (cat[0] === 'Outdoors' && rnd() < 0.35) m = 5 + Math.floor(rnd() * 4);
      if (rnd() < 0.18) m = 11 + Math.floor(rnd() * 2);
      var qty = 1 + Math.floor(rnd() * 3);
      var total = prod[1] * qty;
      rows.push({
        product_category: cat[0], product: prod[0], brand: brand,
        customer: 'customer_' + (1 + Math.floor(rnd() * 320)),
        state: statePool[Math.floor(rnd() * statePool.length)],
        sale_price: prod[1], quantity: qty, line_total: total,
        cost: Math.round(total * (0.45 + rnd() * 0.25)),
        returned: rnd() < 0.08 ? 1 : 0,
        order_month: m
      });
    }
    return rows;
  }

  // ===== dataset registry — mirrors the live site's public dataset cards ===================================
  var DATASETS = [
    {
      key: 'auto_recalls', source: 'recalls', label: 'auto_recalls',
      data: { global: 'MALLOYYO_DATA_RECALLS', src: 'assets/data-recalls.js' },
      blurb: 'Real NHTSA vehicle recall campaigns, 1996 to now.',
      cols: ['manufacturer', 'component', 'subject', 'year', 'vehicles_affected', 'do_not_drive', 'completion_pct'],
      colAlias: { maker: 'manufacturer', vehicles: 'vehicles_affected' },
      plainCols: ['year'],
      note: 'Real NHTSA data: the largest campaigns per year, plus every Porsche and every do-not-drive campaign; completion rates from NHTSA quarterly reports where filed (aggregates ignore nulls, as in SQL).',
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
        { id: 'r-fix', ask: 'What fraction of recalled vehicles actually get fixed?', label: 'Completion rates', blurb: 'Real remedy rates from NHTSA quarterly reports: how much of each recall actually got fixed.',
          teach: 'completion_pct is null where no quarterly report was filed; aggregates ignore nulls, exactly like SQL.',
          try: "Rare but real:  where: do_not_drive = 1  shows the campaigns where the notice said stop driving.",
          malloy: "run: recalls -> {\n  group_by: manufacturer\n  aggregate:\n    campaigns is count()\n    fix_rate is avg(completion_pct)\n  order_by: campaigns desc\n  limit: 8\n}" },
        { id: 'r-free', ask: 'Porsche recalls grouped by subject.', label: 'Your turn', free: true,
          blurb: 'Everything composes: group_by, aggregate (with { where: … }), where, nest, order_by, limit, select.',
          teach: 'Columns: manufacturer, component, subject, year, vehicles_affected, do_not_drive, completion_pct.',
          try: "The card's Porsche question:  where: manufacturer = 'Porsche'  with  group_by: subject.",
          malloy: "run: recalls -> {\n  group_by: subject\n  aggregate: campaigns is count()\n  where: manufacturer = 'Porsche'\n  order_by: campaigns desc\n}" }
      ]
    },
    {
      key: 'baby_names', source: 'names', label: 'baby_names',
      data: { global: 'MALLOYYO_DATA_NAMES', src: 'assets/data-names.js' },
      blurb: 'Real SSA baby names by decade and state.',
      cols: ['name', 'sex', 'decade', 'state', 'births'],
      colAlias: {},
      plainCols: ['decade'],
      note: 'Real SSA data: state files aggregated to decades for 12 states, top names per decade.',
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
        { id: 'n-la', ask: 'Which names from the 1960s were most over-represented in Louisiana?', label: 'Louisiana, 1960s', blurb: 'The card\'s over-representation question, using a FILTERED aggregate: Louisiana births next to the 12-state total, in one row.',
          teach: 'sum(births) { where: state = \'LA\' } compiles to the CASE WHEN you would otherwise hand-build. Two measures, two scopes, one query. These are real SSA numbers.',
          try: 'Swap LA for GA, or 1960 for 1990.',
          malloy: "run: names -> {\n  group_by: name\n  aggregate:\n    la_births is sum(births) { where: state = 'LA' }\n    all_states is sum(births)\n  where: decade = 1960\n  order_by: la_births desc\n  limit: 8\n}" },
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
      cols: ['product_category', 'product', 'brand', 'customer', 'state', 'sale_price', 'quantity', 'line_total', 'cost', 'returned', 'order_month'],
      colAlias: { category: 'product_category', month: 'order_month', revenue: 'line_total' },
      plainCols: ['order_month'],
      note: 'Synthetic demo rows (deterministic; schema matches the live example_models set). The ★ questions are the real ones from the live card.',
      build: buildOrders,
      examples: [
        { id: 'o-brands', ask: 'What are the top brands within each product category, ranked by category total sales?', label: 'Top brands per category', blurb: 'The card\'s lead question: a ranked brand table inside every category.',
          teach: 'The same nest: shape as baby_names. The pattern transfers across datasets because the language is the same.',
          try: 'Change limit: 3 to 1 for just each category\'s champion brand.',
          malloy: "run: order_items -> {\n  group_by: product_category\n  aggregate: category_sales is sum(line_total)\n  nest: top_brands is {\n    group_by: brand\n    aggregate: sales is sum(line_total)\n    order_by: sales desc\n    limit: 3\n  }\n  order_by: category_sales desc\n}" },
        { id: 'o-trend', ask: 'Monthly sales trend.', label: 'Monthly trend', blurb: 'Straight from the card: sales by month, in order.',
          teach: 'order_by on the grouping column gives a time series; months render plain (no comma in 11).',
          try: 'Add  items is count()  to see volume next to revenue.',
          malloy: "run: order_items -> {\n  group_by: order_month\n  aggregate: sales is sum(line_total)\n  order_by: order_month asc\n}" },
        { id: 'o-states', ask: 'Top 10 states by total sales.', label: 'Top 10 states', blurb: 'From the card: where the sales actually are.',
          teach: 'group_by + one aggregate + limit is most of everyday analytics.',
          try: 'Swap sum(line_total) for count() to rank by order volume instead.',
          malloy: "run: order_items -> {\n  group_by: state\n  aggregate: sales is sum(line_total)\n  order_by: sales desc\n  limit: 10\n}" },
        { id: 'o-returns', ask: 'Which customers return a lot and what did they buy?', label: 'Returners', blurb: 'From the card: filtered aggregates + a nest, one readable block.',
          teach: 'returns counts only returned rows via the inline { where: } filter; the nest shows what those customers bought.',
          try: 'Raise limit: 8 or nest by brand instead of category.',
          malloy: "run: order_items -> {\n  group_by: customer\n  aggregate:\n    orders is count()\n    returns is count() { where: returned = 1 }\n  nest: bought is {\n    group_by: product_category\n    aggregate: items is count()\n    order_by: items desc\n    limit: 2\n  }\n  order_by: returns desc\n  limit: 8\n}" },
        { id: 'o-free', ask: 'Which categories spike in the holiday season?', label: 'Your turn', free: true,
          blurb: 'Columns: product_category, product, brand, customer, state, sale_price, quantity, line_total, cost, returned, order_month.',
          teach: 'Filtered aggregates work here too.',
          try: "holiday is sum(line_total) { where: order_month >= 11 }  next to a plain revenue sum.",
          malloy: "run: order_items -> {\n  group_by: product_category\n  aggregate:\n    revenue is sum(line_total)\n    holiday is sum(line_total) { where: order_month >= 11 }\n  order_by: revenue desc\n}" }
      ]
    }
  ];
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
      if (a.distinct && a.col) {
        var set = {};
        rows.forEach(function (r) { var v = r[a.col]; if (v !== null && v !== undefined && v !== '') set[v] = 1; });
        return Object.keys(set).length;
      }
      return rows.length;
    }
    // aggregates ignore nulls, exactly like SQL (real completion_pct is null where no report was filed)
    var nums = rows.map(function (r) { return r[a.col]; })
      .filter(function (v) { return v !== null && v !== undefined && v !== ''; })
      .map(Number).filter(isFinite);
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
          // structured nest result — the renderer shows it as a nested mini-table (like Malloy's own renderer)
          row[spec.nest.name] = {
            _nested: true,
            columns: spec.nest.spec.groupBy.concat(spec.nest.spec.aggregates.map(function (a) { return a.name; })),
            rows: sub.rows
          };
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
    if (!spec.nest) {
      var sel = spec.groupBy.concat(spec.aggregates.map(aggSQL));
      var lines = ['SELECT ' + sel.join(',\n       ')];
      lines.push('FROM ' + DS.source);
      if (spec.filters.length) lines.push('WHERE ' + fmtFilters(spec.filters));
      if (spec.groupBy.length) lines.push('GROUP BY ' + spec.groupBy.join(', '));
      if (spec.orderBy) lines.push('ORDER BY ' + spec.orderBy.name + ' ' + spec.orderBy.dir.toUpperCase());
      if (spec.limit) lines.push('LIMIT ' + spec.limit);
      return lines.join('\n');
    }
    // Nested query: real DuckDB shape — aggregate to (outer groups × nested groups) in a subquery,
    // then LIST(STRUCT_PACK(...)) the nested columns per outer group. Every column reference is real.
    var ns = spec.nest.spec;
    var innerAggs = ns.aggregates.map(aggSQL);
    var outerSel = [];
    spec.aggregates.forEach(function (a) {
      if (!a.filters && a.fn === 'count' && !a.distinct) {
        innerAggs.push('COUNT(*) AS _rows'); outerSel.push('SUM(_rows) AS ' + a.name);
      } else if (!a.filters && a.fn === 'sum') {
        innerAggs.push('SUM(' + a.col + ') AS _sum_' + a.col); outerSel.push('SUM(_sum_' + a.col + ') AS ' + a.name);
      } else if (!a.filters && (a.fn === 'min' || a.fn === 'max')) {
        var nm = '_' + a.fn + '_' + a.col;
        innerAggs.push(a.fn.toUpperCase() + '(' + a.col + ') AS ' + nm); outerSel.push(a.fn.toUpperCase() + '(' + nm + ') AS ' + a.name);
      } else if (!a.filters && a.fn === 'avg') {
        innerAggs.push('SUM(' + a.col + ') AS _sum_' + a.col); innerAggs.push('COUNT(' + a.col + ') AS _n_' + a.col);
        outerSel.push('SUM(_sum_' + a.col + ') / SUM(_n_' + a.col + ') AS ' + a.name);
      } else {
        outerSel.push(aggSQL(a) + ' -- abridged: computed over raw rows');
      }
    });
    innerAggs = innerAggs.filter(function (x, i) { return innerAggs.indexOf(x) === i; });
    var innerCols = spec.groupBy.concat(ns.groupBy);
    var packCols = ns.groupBy.concat(ns.aggregates.map(function (a) { return a.name; }));
    var listExpr = 'LIST(STRUCT_PACK(' + packCols.join(', ') + ')' +
      (ns.orderBy ? ' ORDER BY ' + ns.orderBy.name + ' ' + ns.orderBy.dir.toUpperCase() : '') + ')' +
      (ns.limit ? '[1:' + ns.limit + ']' : '') + ' AS ' + spec.nest.name;
    var out = ['SELECT ' + spec.groupBy.concat(outerSel).join(',\n       ') + (spec.groupBy.length || outerSel.length ? ',' : '')];
    out.push('       ' + listExpr + '  -- nested: ' + spec.nest.name);
    out.push('FROM (');
    out.push('  SELECT ' + innerCols.concat(innerAggs).join(', '));
    out.push('  FROM ' + DS.source);
    if (spec.filters.length) out.push('  WHERE ' + fmtFilters(spec.filters));
    out.push('  GROUP BY ' + innerCols.join(', '));
    out.push(')');
    if (spec.groupBy.length) out.push('GROUP BY ' + spec.groupBy.join(', '));
    if (spec.orderBy) out.push('ORDER BY ' + spec.orderBy.name + ' ' + spec.orderBy.dir.toUpperCase());
    if (spec.limit) out.push('LIMIT ' + spec.limit);
    return out.join('\n');
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

  // ===== per-dataset lazy loading ===========================================================================
  // Each real dataset carries {data: {global, src}}; its file is injected on first selection and the rows
  // are built once. order_items has no data file (deterministic synthetic corpus, built inline).
  var dataLoads = {};
  function ensureDataset(d, cb, onFail) {
    if (!d.data || window[d.data.global]) {
      if (!d.rows) d.rows = d.build();
      cb();
      return;
    }
    var st = dataLoads[d.key];
    if (!st) {
      st = dataLoads[d.key] = { cbs: [], failed: false, done: false };
      var s = document.createElement('script');
      s.src = d.data.src; s.async = true;
      s.onerror = function () { st.failed = true; };
      document.head.appendChild(s);
      (function poll(tries) {
        if (window[d.data.global]) { st.done = true; flushLoad(st); return; }
        if (st.failed || tries > 80) { st.failed = true; st.done = true; flushLoad(st); return; }
        setTimeout(function () { poll(tries + 1); }, 100);
      })(0);
    }
    st.cbs.push(function () {
      if (window[d.data.global]) { if (!d.rows) d.rows = d.build(); cb(); }
      else if (onFail) onFail();
    });
    if (st.done) flushLoad(st);
  }
  function flushLoad(st) {
    var list = st.cbs.slice(); st.cbs.length = 0;
    list.forEach(function (f) { f(); });
  }

  function selectDataset(d, initial, keepQuery, after) {
    // mark the intent immediately, load the dataset's file if needed, then apply.
    Array.prototype.forEach.call(dsBar.children, function (t) {
      t.classList.toggle('is-loading', t.dataset.key === d.key && !(d.rows));
    });
    if (d.data && !window[d.data.global] && caption) caption.textContent = 'Loading the ' + d.label + ' data…';
    ensureDataset(d, function () {
      Array.prototype.forEach.call(dsBar.children, function (t) { t.classList.remove('is-loading'); });
      applyDataset(d, initial, keepQuery);
      if (after) after();
    }, function () {
      Array.prototype.forEach.call(dsBar.children, function (t) { t.classList.remove('is-loading'); });
      if (caption) caption.textContent = 'The ' + d.label + ' data file did not load. Reload the page to try again.';
    });
  }

  function applyDataset(d, initial, keepQuery) {
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
    caption.innerHTML = 'Runs on a bundled ' + d.rows.length.toLocaleString() + '-row sample, right in your browser. ' +
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
  function setBusy(b) {
    runBtn.classList.toggle('is-busy', b);
    runBtn.innerHTML = b ? 'Running\u2026' : 'Compile to SQL <span aria-hidden="true">\u25b8</span>';
  }
  function compile() { setBusy(true); runQuery(false); }

  function runQuery(instant) {
    if (typeTimer) { clearInterval(typeTimer); typeTimer = null; }
    errBox.hidden = true; sqlNote.hidden = true;
    var spec, sql, result;
    try {
      spec = parseMalloy(editor.value);
      sql = toSQL(spec);
      result = runSpec(spec, DS.rows);
    } catch (e) {
      setBusy(false);
      sqlCode.textContent = ''; resultsWrap.innerHTML = '';
      errBox.hidden = false;
      errBox.innerHTML = '<strong>Could not compile.</strong> ' + escapeHtml(e.friendly ? e.message : 'unexpected error, check the query shape.');
      return;
    }
    if (spec.nest) { sqlNote.hidden = false; sqlNote.textContent = 'Shown as the equivalent DuckDB query; Malloy generates the full SQL in your warehouse’s own dialect.'; }
    showSql(sql, result, instant);
  }

  function showSql(sql, result, instant) {
    resultsWrap.innerHTML = '';
    if (instant || reduceMotion) { sqlCode.innerHTML = highlightSQL(sql); setBusy(false); renderResults(result); return; }
    sqlCode.textContent = '';
    var i = 0, step = Math.max(1, Math.round(sql.length / 80));
    typeTimer = setInterval(function () {
      i += step; sqlCode.textContent = sql.slice(0, i);
      if (i >= sql.length) { clearInterval(typeTimer); typeTimer = null; sqlCode.innerHTML = highlightSQL(sql); setBusy(false); renderResults(result); }
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
        if (v && v._nested) {
          // nested mini-table, like Malloy's own renderer: the nest's columns become real columns
          var nt = el('table', 'nested-table'), nth = document.createElement('thead'), nhr = document.createElement('tr');
          v.columns.forEach(function (nc) { var th = document.createElement('th'); th.textContent = nc; nhr.appendChild(th); });
          nth.appendChild(nhr); nt.appendChild(nth);
          var ntb = document.createElement('tbody');
          v.rows.forEach(function (nr) {
            var ntr = document.createElement('tr');
            v.columns.forEach(function (nc) {
              var ntd = document.createElement('td'); var nv = nr[nc];
              var nplain = (DS.plainCols || []).indexOf(nc) !== -1;
              ntd.textContent = (typeof nv === 'number') ? (nplain ? String(nv) : nv.toLocaleString()) : (nv == null ? '' : String(nv));
              ntr.appendChild(ntd);
            });
            ntb.appendChild(ntr);
          });
          nt.appendChild(ntb); td.appendChild(nt); td.className = 'has-nested';
        } else {
          td.textContent = (typeof v === 'number') ? (plain ? String(v) : v.toLocaleString()) : (v == null ? '' : String(v));
        }
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

  // dataset-card links — "Explore with" chips select the dataset; ★ question links (data-explore-q)
  // additionally load that question's Malloy and run it, like the live app's ltool permalinks.
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest ? e.target.closest('[data-explore-ds]') : null;
    if (!a) return;
    var hit = DATASETS.filter(function (d) { return d.key === a.getAttribute('data-explore-ds'); })[0];
    if (!hit) return;
    var qb = a.getAttribute('data-explore-q');
    if (qb) {
      var q;
      try { q = b64decode(qb); } catch (err2) { selectDataset(hit); return; }
      selectDataset(hit, false, true, function () {
        editor.value = q; editor.rows = Math.max(5, q.split('\n').length + 1);
        runQuery(true);
      });
    } else {
      selectDataset(hit); // the anchor's own #sandbox navigation handles the scroll
    }
  });

  // boot: pick the target dataset (share link #d=<dataset>&q=<base64>, else the first), let
  // selectDataset lazy-load its data file, then honor any shared query once the rows are ready.
  (function boot() {
    var dm = /[#&]d=([^&]+)/.exec(location.hash || '');
    var qm = /[#&]q=([^&]+)/.exec(location.hash || '');
    var ds = DATASETS[0];
    if (dm) { var hit = DATASETS.filter(function (d) { return d.key === decodeURIComponent(dm[1]); })[0]; if (hit) ds = hit; }
    var q = null;
    if (qm) { try { q = b64decode(decodeURIComponent(qm[1])); } catch (e) { /* malformed link — default */ } }
    if (q !== null) {
      selectDataset(ds, true, true, function () {
        editor.value = q; editor.rows = Math.max(5, q.split('\n').length + 1);
        runQuery(true);
      });
    } else {
      selectDataset(ds, true);
    }
  })();
})();
