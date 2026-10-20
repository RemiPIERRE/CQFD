/* CQFD — moteur : générateur d'énigmes de déduction, solveur humain, textes français */
var Engine = (function () {
  'use strict';

  /* ---------- aléatoire déterministe (même graine = même énigme) ---------- */
  function xmur3(str) {
    var h = 1779033703 ^ str.length;
    for (var i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    return function () {
      h = Math.imul(h ^ (h >>> 16), 2246822507);
      h = Math.imul(h ^ (h >>> 13), 3266489909);
      return (h ^= h >>> 16) >>> 0;
    };
  }
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function makeRng(seed) {
    var r = mulberry32(xmur3(String(seed))());
    return {
      next: r,
      int: function (n) { return Math.floor(r() * n); },
      pick: function (a) { return a[Math.floor(r() * a.length)]; },
      shuffle: function (a) {
        var b = a.slice();
        for (var i = b.length - 1; i > 0; i--) {
          var j = Math.floor(r() * (i + 1)), t = b[i]; b[i] = b[j]; b[j] = t;
        }
        return b;
      }
    };
  }

  var POP = [];
  (function () { for (var m = 0; m < 64; m++) { var c = 0, x = m; while (x) { c += x & 1; x >>= 1; } POP[m] = c; } })();

  /* ---------- catalogue ---------- */
  // l = libellé court, e = emoji, t = code texte, c = couleur, s = sujet de phrase, o = complément, n = complément négatif
  function E(l, e, s, o, n) { return { l: l, e: e, s: s, o: o, n: n }; }
  function T(l, t, s, o, n) { return { l: l, t: t, s: s, o: o, n: n }; }
  function C(l, c, o) { return { l: l, c: c, s: "l'habitant de " + o, o: o, n: o }; }

  var POOL = [
    { id: 'region', name: 'Région', verb: 'est', neg: "n'est pas", hue: 268, items: [
      T('Breton', 'Br', 'le Breton', 'breton', 'breton'),
      T('Basque', 'Ba', 'le Basque', 'basque', 'basque'),
      T('Corse', 'Co', 'le Corse', 'corse', 'corse'),
      T('Normand', 'No', 'le Normand', 'normand', 'normand'),
      T('Alsacien', 'Al', "l'Alsacien", 'alsacien', 'alsacien'),
      T('Lyonnais', 'Ly', 'le Lyonnais', 'lyonnais', 'lyonnais'),
      T('Parisien', 'Pa', 'le Parisien', 'parisien', 'parisien'),
      T('Savoyard', 'Sa', 'le Savoyard', 'savoyard', 'savoyard'),
      T('Auvergnat', 'Au', "l'Auvergnat", 'auvergnat', 'auvergnat')
    ] },
    { id: 'metier', name: 'Métier', verb: 'est', neg: "n'est pas", hue: 22, items: [
      E('boulanger', '🥖', 'le boulanger', 'boulanger', 'boulanger'),
      E('médecin', '🩺', 'le médecin', 'médecin', 'médecin'),
      E('peintre', '🎨', 'le peintre', 'peintre', 'peintre'),
      E('facteur', '✉️', 'le facteur', 'facteur', 'facteur'),
      E('pêcheur', '🎣', 'le pêcheur', 'pêcheur', 'pêcheur'),
      E('libraire', '📚', 'le libraire', 'libraire', 'libraire'),
      E('pilote', '✈️', 'le pilote', 'pilote', 'pilote'),
      E('jardinier', '🌿', 'le jardinier', 'jardinier', 'jardinier')
    ] },
    { id: 'animal', name: 'Animal', verb: 'possède', neg: 'ne possède pas', hue: 150, items: [
      E('chat', '🐱', 'le propriétaire du chat', 'un chat', 'de chat'),
      E('chien', '🐶', 'le propriétaire du chien', 'un chien', 'de chien'),
      E('lapin', '🐰', 'le propriétaire du lapin', 'un lapin', 'de lapin'),
      E('tortue', '🐢', 'le propriétaire de la tortue', 'une tortue', 'de tortue'),
      E('perroquet', '🦜', 'le propriétaire du perroquet', 'un perroquet', 'de perroquet'),
      E('poisson', '🐟', 'le propriétaire du poisson rouge', 'un poisson rouge', 'de poisson rouge'),
      E('cheval', '🐴', 'le propriétaire du cheval', 'un cheval', 'de cheval'),
      E('hamster', '🐹', 'le propriétaire du hamster', 'un hamster', 'de hamster')
    ] },
    { id: 'couleur', name: 'Maison', verb: 'habite', neg: "n'habite pas", hue: 200, color: true, items: [
      C('rouge', '#D8473E', 'la maison rouge'),
      C('bleue', '#3F6FD8', 'la maison bleue'),
      C('jaune', '#F2C230', 'la maison jaune'),
      C('verte', '#3FA46A', 'la maison verte'),
      C('blanche', '#F5F5EE', 'la maison blanche'),
      C('orange', '#F08A33', 'la maison orange'),
      C('rose', '#E985A8', 'la maison rose'),
      C('violette', '#8B5CD0', 'la maison violette')
    ] },
    { id: 'boisson', name: 'Boisson', verb: 'boit', neg: 'ne boit pas', hue: 205, items: [
      E('thé', '🍵', 'le buveur de thé', 'du thé', 'de thé'),
      E('café', '☕', 'le buveur de café', 'du café', 'de café'),
      E('lait', '🥛', 'le buveur de lait', 'du lait', 'de lait'),
      E('cidre', '🍏', 'le buveur de cidre', 'du cidre', 'de cidre'),
      E('eau', '💧', "le buveur d'eau", "de l'eau", "d'eau"),
      E('jus', '🍊', "le buveur de jus d'orange", "du jus d'orange", "de jus d'orange")
    ] },
    { id: 'musique', name: 'Musique', verb: 'joue', neg: 'ne joue pas', hue: 48, items: [
      E('guitare', '🎸', 'le guitariste', 'de la guitare', 'de guitare'),
      E('piano', '🎹', 'le pianiste', 'du piano', 'de piano'),
      E('violon', '🎻', 'le violoniste', 'du violon', 'de violon'),
      E('trompette', '🎺', 'le trompettiste', 'de la trompette', 'de trompette'),
      E('batterie', '🥁', 'le batteur', 'de la batterie', 'de batterie'),
      E('saxo', '🎷', 'le saxophoniste', 'du saxophone', 'de saxophone')
    ] }
  ];

  /* ---------- français ---------- */
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function de(np) {
    if (/^le /.test(np)) return 'du ' + np.slice(3);
    if (/^la /.test(np)) return 'de la ' + np.slice(3);
    if (/^l'/.test(np)) return "de l'" + np.slice(2);
    return 'de ' + np;
  }

  function clueText(pz, cl) {
    var N = pz.N;
    function I(i) { var c = Math.floor(i / N); return { cat: pz.cats[c], it: pz.cats[c].items[i % N] }; }
    var A = I(cl.i[0]), B = cl.i[1] != null ? I(cl.i[1]) : null, Cc = cl.i[2] != null ? I(cl.i[2]) : null;
    var S = cap(A.it.s), house = A.cat.color, p = cl.p, mid = (N % 2 === 1) ? (N - 1) / 2 : -1;
    switch (cl.t) {
      case 'same': return S + ' ' + B.cat.verb + ' ' + B.it.o + '.';
      case 'diff': return S + ' ' + B.cat.neg + ' ' + B.it.n + '.';
      case 'at':
        if (house) {
          var H = cap(A.it.o);
          if (p === 0) return H + ' est la première, tout à gauche.';
          if (p === N - 1) return H + ' est la dernière, tout à droite.';
          if (p === mid) return H + ' est celle du milieu.';
          return H + ' porte le numéro ' + (p + 1) + '.';
        }
        if (p === 0) return S + ' habite la première maison, tout à gauche.';
        if (p === N - 1) return S + ' habite la dernière maison, tout à droite.';
        if (p === mid) return S + ' habite la maison du milieu.';
        return S + ' habite la maison n°' + (p + 1) + '.';
      case 'notat':
        if (house) {
          var H2 = cap(A.it.o);
          if (p === 0) return H2 + " n'est pas la première.";
          if (p === N - 1) return H2 + " n'est pas la dernière.";
          return H2 + " ne porte pas le numéro " + (p + 1) + '.';
        }
        if (p === 0) return S + " n'habite pas la première maison.";
        if (p === N - 1) return S + " n'habite pas la dernière maison.";
        return S + " n'habite pas la maison n°" + (p + 1) + '.';
      case 'end':
        return house ? cap(A.it.o) + " est à l'une des deux extrémités de la rue."
                     : S + " habite à l'une des deux extrémités de la rue.";
      case 'notend':
        return house ? cap(A.it.o) + " n'est pas à une extrémité de la rue."
                     : S + " n'habite pas à une extrémité de la rue.";
      case 'imm':
        return cl.flip ? cap(B.it.s) + ' habite juste à droite ' + de(A.it.s) + '.'
                       : S + ' habite juste à gauche ' + de(B.it.s) + '.';
      case 'next': return S + ' habite à côté ' + de(B.it.s) + '.';
      case 'left':
        return cl.flip ? cap(B.it.s) + ' habite quelque part à droite ' + de(A.it.s) + '.'
                       : S + ' habite quelque part à gauche ' + de(B.it.s) + '.';
      case 'or': return S + ' ' + B.cat.verb + ' ' + B.it.o + ' ou ' + Cc.it.o + '.';
      case 'between': return S + ' habite quelque part entre ' + B.it.s + ' et ' + Cc.it.s + '.';
    }
    return '';
  }

  /* ---------- vérité d'un énoncé pour une solution P (P[item] = maison 0..N-1) ---------- */
  function holds(cl, P, N) {
    var pa = P[cl.i[0]], pb = cl.i.length > 1 ? P[cl.i[1]] : 0, pc = cl.i.length > 2 ? P[cl.i[2]] : 0;
    switch (cl.t) {
      case 'same': return pa === pb;
      case 'diff': return pa !== pb;
      case 'at': return pa === cl.p;
      case 'notat': return pa !== cl.p;
      case 'end': return pa === 0 || pa === N - 1;
      case 'notend': return !(pa === 0 || pa === N - 1);
      case 'imm': return pa + 1 === pb;
      case 'next': return Math.abs(pa - pb) === 1;
      case 'left': return pa < pb;
      case 'or': return pa === pb || pa === pc;
      case 'between': return (pb < pa && pa < pc) || (pc < pa && pa < pb);
    }
    return false;
  }

  /* ---------- solveur « humain » : propagation d'énoncés + règles « tout différent » ---------- */
  function relMask(t, x, N, full) {
    switch (t) {
      case 'same': return 1 << x;
      case 'diff': return full & ~(1 << x);
      case 'imm': return x + 1 < N ? 1 << (x + 1) : 0;
      case 'next': return (x > 0 ? 1 << (x - 1) : 0) | (x + 1 < N ? 1 << (x + 1) : 0);
      case 'left': return full & ~((1 << (x + 1)) - 1);
    }
    return 0;
  }

  function propagate(N, K, clues) {
    var full = (1 << N) - 1, endMask = 1 | (1 << (N - 1)), n = N * K;
    var D = new Array(n), steps = [], round = 0, rounds = 0, bad = false, i;
    for (i = 0; i < n; i++) D[i] = full;

    function rem(it, mask, why, by) {
      var r = D[it] & mask;
      if (!r) return false;
      D[it] &= ~mask;
      if (!D[it]) bad = true;
      for (var p = 0; p < N; p++) if ((r >> p) & 1) steps.push({ i: it, p: p, why: why, by: by, round: round });
      return true;
    }

    function applyClue(j) {
      var cl = clues[j], a = cl.i[0], b = cl.i[1], c = cl.i[2], ch = false, x, rm, sup;
      switch (cl.t) {
        case 'at': return rem(a, D[a] & ~(1 << cl.p), j);
        case 'notat': return rem(a, 1 << cl.p, j);
        case 'end': return rem(a, D[a] & ~endMask, j);
        case 'notend': return rem(a, endMask, j);
        case 'same': case 'diff': case 'imm': case 'next': case 'left':
          rm = 0;
          for (x = 0; x < N; x++) if (((D[a] >> x) & 1) && !(relMask(cl.t, x, N, full) & D[b])) rm |= 1 << x;
          if (rm) ch = rem(a, rm, j) || ch;
          sup = 0;
          for (x = 0; x < N; x++) if ((D[a] >> x) & 1) sup |= relMask(cl.t, x, N, full);
          if (D[b] & ~sup) ch = rem(b, D[b] & ~sup, j) || ch;
          return ch;
        case 'or':
          ch = rem(a, D[a] & ~(D[b] | D[c]), j) || ch;
          if (!(D[a] & D[c])) ch = rem(b, D[b] & ~D[a], j) || ch;
          if (!(D[a] & D[b])) ch = rem(c, D[c] & ~D[a], j) || ch;
          return ch;
        case 'between':
          var sa = 0, sb = 0, sc = 0, xa, xb, xc;
          for (xa = 0; xa < N; xa++) if ((D[a] >> xa) & 1)
            for (xb = 0; xb < N; xb++) if ((D[b] >> xb) & 1)
              for (xc = 0; xc < N; xc++) if ((D[c] >> xc) & 1)
                if ((xb < xa && xa < xc) || (xc < xa && xa < xb)) { sa |= 1 << xa; sb |= 1 << xb; sc |= 1 << xc; }
          ch = rem(a, D[a] & ~sa, j) || ch;
          ch = rem(b, D[b] & ~sb, j) || ch;
          ch = rem(c, D[c] & ~sc, j) || ch;
          return ch;
      }
      return false;
    }

    var changed = true, j, c, v, w, p, cnt, last;
    while (changed && !bad && round < 60) {
      changed = false; round++;
      for (j = 0; j < clues.length; j++) if (applyClue(j)) changed = true;
      for (c = 0; c < K; c++) {
        for (v = 0; v < N; v++) {                       // règle A : une valeur placée libère sa maison
          if (POP[D[c * N + v]] === 1) {
            for (w = 0; w < N; w++) if (w !== v && rem(c * N + w, D[c * N + v], 'A', c * N + v)) changed = true;
          }
        }
        for (p = 0; p < N; p++) {                       // règle B : une maison n'a qu'une seule valeur possible
          cnt = 0; last = -1;
          for (v = 0; v < N; v++) if ((D[c * N + v] >> p) & 1) { cnt++; last = v; }
          if (cnt === 0) bad = true;
          else if (cnt === 1 && D[c * N + last] !== (1 << p)) {
            if (rem(c * N + last, D[c * N + last] & ~(1 << p), 'B')) changed = true;
          }
        }
      }
      if (changed) rounds = round;
    }
    var solved = !bad;
    for (i = 0; i < n && solved; i++) if (POP[D[i]] !== 1) solved = false;
    return { D: D, steps: steps, rounds: rounds, solved: solved, bad: bad };
  }

  function bits(D) { var s = 0; for (var i = 0; i < D.length; i++) s += POP[D[i]]; return s; }

  /* ---------- génération ---------- */
  function wpick(rng, w) {
    var tot = 0, k, r;
    for (k in w) tot += w[k];
    r = rng.next() * tot;
    for (k in w) { r -= w[k]; if (r <= 0) return k; }
    return k;
  }

  function itemAt(st, c, p) { return c * st.N + st.Q[c * st.N + p]; }
  function catOf(st, i) { return Math.floor(i / st.N); }
  function otherCat(rng, K, c) { var d = rng.int(K - 1); return d >= c ? d + 1 : d; }

  function sampleClue(rng, st, t) {
    var N = st.N, K = st.K, P = st.P, n = N * K, a, b, c, p, c2, tries, q, pr;
    switch (t) {
      case 'same': a = rng.int(n); c2 = otherCat(rng, K, catOf(st, a)); return { t: t, i: [a, itemAt(st, c2, P[a])] };
      case 'diff':
        a = rng.int(n); c2 = otherCat(rng, K, catOf(st, a));
        do { b = c2 * N + rng.int(N); } while (P[b] === P[a]);
        return { t: t, i: [a, b] };
      case 'at': a = rng.int(n); return { t: t, i: [a], p: P[a] };
      case 'notat':
        a = rng.int(n);
        do { p = rng.int(N); } while (p === P[a]);
        return { t: t, i: [a], p: p };
      case 'end':
        tries = 0; do { a = rng.int(n); tries++; } while (!(P[a] === 0 || P[a] === N - 1) && tries < 60);
        return tries >= 60 ? null : { t: t, i: [a] };
      case 'notend':
        tries = 0; do { a = rng.int(n); tries++; } while ((P[a] === 0 || P[a] === N - 1) && tries < 60);
        return tries >= 60 ? null : { t: t, i: [a] };
      case 'imm':
        a = rng.int(n); if (P[a] === N - 1) return null;
        return { t: t, i: [a, itemAt(st, rng.int(K), P[a] + 1)], flip: rng.next() < 0.5 };
      case 'next':
        a = rng.int(n);
        var dirs = []; if (P[a] > 0) dirs.push(-1); if (P[a] < N - 1) dirs.push(1);
        return { t: t, i: [a, itemAt(st, rng.int(K), P[a] + rng.pick(dirs))] };
      case 'left':
        a = rng.int(n); if (P[a] === N - 1) return null;
        q = P[a] + 1 + rng.int(N - 1 - P[a]);
        return { t: t, i: [a, itemAt(st, rng.int(K), q)], flip: rng.next() < 0.5 };
      case 'or':
        a = rng.int(n); c2 = otherCat(rng, K, catOf(st, a)); b = itemAt(st, c2, P[a]);
        do { c = c2 * N + rng.int(N); } while (c === b);
        pr = rng.next() < 0.5 ? [b, c] : [c, b];
        return { t: t, i: [a, pr[0], pr[1]] };
      case 'between':
        a = rng.int(n); if (P[a] === 0 || P[a] === N - 1) return null;
        b = itemAt(st, rng.int(K), rng.int(P[a]));
        c = itemAt(st, rng.int(K), P[a] + 1 + rng.int(N - 1 - P[a]));
        pr = rng.next() < 0.5 ? [b, c] : [c, b];
        return { t: t, i: [a, pr[0], pr[1]] };
    }
    return null;
  }

  function clueKey(cl) {
    var ids = cl.i.slice();
    if (cl.t === 'same' || cl.t === 'diff' || cl.t === 'next') ids.sort(function (x, y) { return x - y; });
    return cl.t + ':' + ids.join(',') + ':' + (cl.p == null ? '' : cl.p);
  }

  function buildSolution(rng, prm) {
    var N = prm.N, K = prm.K, idx = [], i;
    for (i = 0; i < POOL.length; i++) idx.push(i);
    idx = rng.shuffle(idx).slice(0, K);
    var cats = [], P = new Array(N * K), Q = new Array(N * K), c, v;
    for (c = 0; c < K; c++) {
      var src = POOL[idx[c]];
      cats.push({ id: src.id, name: src.name, verb: src.verb, neg: src.neg, hue: src.hue, color: !!src.color,
                  items: rng.shuffle(src.items).slice(0, N) });
      var perm = rng.shuffle(Array.apply(null, { length: N }).map(function (_, k) { return k; }));
      for (v = 0; v < N; v++) { P[c * N + v] = perm[v]; Q[c * N + perm[v]] = v; }
    }
    return { N: N, K: K, cats: cats, P: P, Q: Q };
  }

  function fillClues(rng, st, prm) {
    var N = st.N, K = st.K, clues = [], seen = {}, cur = propagate(N, K, clues), guard = 0, M = prm.sample || 36;
    while (!cur.solved && guard++ < 70) {
      var cands = [], tries = 0;
      while (cands.length < 4 && tries++ < 4) {
        for (var s = 0; s < M; s++) {
          var cl = sampleClue(rng, st, wpick(rng, prm.w));
          if (!cl) continue;
          var key = clueKey(cl);
          if (seen[key]) continue;
          var res = propagate(N, K, clues.concat([cl]));
          if (res.bad) continue;
          var gain = bits(cur.D) - bits(res.D);
          if (gain > 0) { seen[key] = 1; cands.push({ cl: cl, gain: gain, res: res }); }
        }
      }
      if (!cands.length) return null;
      cands.sort(function (x, y) { return x.gain - y.gain; });
      var span = Math.max(1, Math.ceil(cands.length * prm.bias));
      var pickd = cands[rng.int(span)];
      clues.push(pickd.cl);
      cur = propagate(N, K, clues);
    }
    if (!cur.solved) return null;
    st.clues = clues;
    return true;
  }

  function finalize(rng, st, prm) {
    var N = st.N, K = st.K, clues = st.clues, order = rng.shuffle(clues), k, tmp;
    for (k = 0; k < order.length; k++) {
      if (rng.next() > prm.prune) continue;
      tmp = clues.filter(function (x) { return x !== order[k]; });
      if (propagate(N, K, tmp).solved) clues = tmp;
    }
    var res = propagate(N, K, clues), first = {}, s;
    for (s = 0; s < res.steps.length; s++) {
      var w = res.steps[s].why;
      if (typeof w === 'number' && first[w] == null) first[w] = s;
    }
    var idx = clues.map(function (_, j) { return j; });
    idx.sort(function (x, y) { return (first[x] == null ? 1e9 : first[x]) - (first[y] == null ? 1e9 : first[y]); });
    var ordered = idx.map(function (j) { return clues[j]; });
    st.clues = prm.shuffle ? rng.shuffle(ordered) : ordered;
    res = propagate(N, K, st.clues);
    st.steps = res.steps;
    st.rounds = res.rounds;
    st.solved = res.solved;
    st.solution = st.Q.slice();            // case (catégorie c, maison p) -> valeur
    for (k = 0; k < st.clues.length; k++) st.clues[k].text = clueText(st, st.clues[k]);
  }

  function generate(prm, seed) {
    var rng = makeRng(seed), best = null, att;
    for (att = 0; att < (prm.attempts || 40); att++) {
      var st = buildSolution(rng, prm);
      if (!fillClues(rng, st, prm)) continue;
      finalize(rng, st, prm);
      if (!st.solved) continue;
      st.attempts = att + 1;
      var okRounds = st.rounds >= prm.minRounds, okSize = st.clues.length >= (prm.minClues || 0) && st.clues.length <= (prm.maxClues || 99);
      if (okRounds && okSize) return st;
      var sc = Math.min(st.rounds, prm.minRounds) * 10 - Math.abs(st.clues.length - ((prm.minClues || 0) + (prm.maxClues || 99)) / 2);
      if (!best || sc > best.sc) { best = st; best.sc = sc; }
    }
    return best;
  }

  /* ---------- niveaux ---------- */
  var T_BASE = { same: 4, diff: 3, at: 2, notat: 1 };
  function mix(base, extra) { var o = {}, k; for (k in base) o[k] = base[k]; for (k in extra) o[k] = extra[k]; return o; }

  function levelParams(L) {
    L = Math.max(1, L | 0);
    var p;
    if (L <= 2)       p = { N: 3, K: 3, w: T_BASE, minRounds: 2, minClues: 3, maxClues: 7, prune: 0.4, bias: 1, shuffle: false, name: 'Initiation' };
    else if (L <= 5)  p = { N: 3, K: 4, w: mix(T_BASE, { imm: 1, next: 1, left: 1 }), minRounds: 3, minClues: 4, maxClues: 9, prune: 0.6, bias: 1, shuffle: false, name: 'Facile' };
    else if (L <= 9)  p = { N: 4, K: 3, w: mix(T_BASE, { imm: 2, next: 2, left: 2 }), minRounds: 3 + (L > 7 ? 1 : 0), minClues: 5, maxClues: 11, prune: 0.8, bias: 0.8, shuffle: false, name: 'Facile' };
    else if (L <= 14) p = { N: 4, K: 4, w: mix(T_BASE, { imm: 2, next: 2, left: 2, end: 1, notend: 1 }), minRounds: 4 + (L > 12 ? 1 : 0), minClues: 7, maxClues: 14, prune: 1, bias: 0.7, shuffle: true, name: 'Moyen' };
    else if (L <= 20) p = { N: 5, K: 4, w: mix(T_BASE, { imm: 2, next: 2, left: 2, end: 1, notend: 1, or: 2 }), minRounds: 4 + (L > 17 ? 1 : 0), minClues: 9, maxClues: 17, prune: 1, bias: 0.6, shuffle: true, name: 'Moyen' };
    else if (L <= 28) p = { N: 5, K: 5, w: mix(T_BASE, { imm: 2, next: 2, left: 2, end: 1, notend: 1, or: 2, between: 1 }), minRounds: 5 + (L > 24 ? 1 : 0), minClues: 11, maxClues: 20, prune: 1, bias: 0.5, shuffle: true, name: 'Difficile' };
    else              p = { N: 6, K: 5, w: mix({ same: 3, diff: 3, at: 1, notat: 1 }, { imm: 2, next: 2, left: 2, end: 1, notend: 1, or: 3, between: 2 }), minRounds: Math.min(6 + Math.floor((L - 29) / 5), 10), minClues: 14, maxClues: 26, prune: 1, bias: 0.4, shuffle: true, name: L > 40 ? 'Expert' : 'Difficile' };
    p.level = L;
    p.attempts = 30;
    return p;
  }

  // petite grille pour une partie de 2 à 3 minutes (même taille que les niveaux 1 et 2, avec un peu de relations spatiales)
  function quickParams() {
    return { N: 3, K: 3, w: mix(T_BASE, { imm: 1, next: 1, left: 1 }), minRounds: 3, minClues: 5, maxClues: 7, prune: 0.5, bias: 1, shuffle: false, name: 'Petite grille', level: 0, attempts: 40 };
  }

  function dailyParams() {
    var p = levelParams(16);
    p.name = 'Défi du jour';
    return p;
  }

  /* ---------- aides pour l'interface ---------- */
  // cand[c*N+p] = masque des valeurs encore possibles dans la case (catégorie c, maison p)
  function hint(pz, cand) {
    var N = pz.N, K = pz.K, s, c, v, p;
    for (s = 0; s < pz.steps.length; s++) {
      var st = pz.steps[s];
      if (st.why === 'B') continue;
      c = Math.floor(st.i / N); v = st.i % N;
      if ((cand[c * N + st.p] >> v) & 1) {
        if (typeof st.why === 'number') return { kind: 'clue', clue: st.why, c: c, v: v, p: st.p };
        return { kind: 'place', c: c, v: st.by % N, p: st.p };
      }
    }
    for (c = 0; c < K; c++) for (v = 0; v < N; v++) {
      var cnt = 0, at = -1;
      for (p = 0; p < N; p++) if ((cand[c * N + p] >> v) & 1) { cnt++; at = p; }
      if (cnt === 1 && POP[cand[c * N + at]] > 1) return { kind: 'place', c: c, v: v, p: at };
    }
    return null;
  }

  // état du joueur : marks[case] = valeurs éliminées à la main, given[case] = valeur validée (-1 sinon)
  // retourne cand[case] = valeurs encore possibles, avec les déductions automatiques « une case résolue libère la ligne »
  function derive(N, K, marks, given) {
    var full = (1 << N) - 1, cand = new Array(N * K), i, c, p, q, m, changed;
    for (i = 0; i < N * K; i++) cand[i] = given[i] >= 0 ? (1 << given[i]) : (full & ~marks[i]);
    do {
      changed = false;
      for (c = 0; c < K; c++) for (p = 0; p < N; p++) {
        m = cand[c * N + p];
        if (POP[m] === 1) {
          for (q = 0; q < N; q++) if (q !== p && (cand[c * N + q] & m)) { cand[c * N + q] &= ~m; changed = true; }
        }
      }
    } while (changed);
    return cand;
  }

  function checkBoard(pz, cand) {
    var N = pz.N, K = pz.K, wrong = [], complete = true, i;
    for (i = 0; i < N * K; i++) {
      if (POP[cand[i]] !== 1) complete = false;
      if (!((cand[i] >> pz.solution[i]) & 1)) wrong.push(i);
    }
    var correct = complete && wrong.length === 0;
    return { wrong: wrong, complete: complete, correct: correct };
  }

  var api = {
    POOL: POOL, POP: POP, generate: generate, levelParams: levelParams, dailyParams: dailyParams, quickParams: quickParams,
    propagate: propagate, holds: holds, clueText: clueText, hint: hint, derive: derive, checkBoard: checkBoard, makeRng: makeRng
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  return api;
})();

/* CQFD — interface */
(function () {
  'use strict';
  var E = Engine;

  /* ---------- utilitaires ---------- */
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function bitIndex(m) { for (var v = 0; v < 8; v++) if ((m >> v) & 1) return v; return -1; }
  function two(n) { return n < 10 ? '0' + n : '' + n; }
  function ymd(d) { d = d || new Date(); return d.getFullYear() + '-' + two(d.getMonth() + 1) + '-' + two(d.getDate()); }
  function yesterday() { var d = new Date(); d.setDate(d.getDate() - 1); return ymd(d); }
  function dateLabel() {
    try { return new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date()); }
    catch (e) { return ymd(); }
  }
  function fmtTime(s) { return Math.floor(s / 60) + ':' + two(s % 60); }

  /* ---------- progression (stockage facultatif) ---------- */
  var mem = {};
  var store = {
    get: function (k, d) {
      try { var v = window.localStorage.getItem('cqfd:' + k); return v == null ? (k in mem ? mem[k] : d) : JSON.parse(v); }
      catch (e) { return k in mem ? mem[k] : d; }
    },
    set: function (k, v) { mem[k] = v; try { window.localStorage.setItem('cqfd:' + k, JSON.stringify(v)); } catch (e) { /* stockage indisponible */ } }
  };
  var prog = store.get('prog', null) || { level: 1, solved: 0, stars: 0, streak: 0, best: 0, lastDaily: '', daily: {}, done: {}, seenHow: false };
  function save() { store.set('prog', prog); }
  var VERSION = 'test-1';
  function logAdd(r) {
    prog.log = prog.log || [];
    prog.log.push(r);
    if (prog.log.length > 300) prog.log.shift();
    save();
  }
  function streakNow() { return (prog.lastDaily === ymd() || prog.lastDaily === yesterday()) ? prog.streak : 0; }

  /* ---------- pièces graphiques ---------- */
  var ICON = {
    check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 12.5l5 5L19.5 6.5"/></svg>',
    cross: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>'
  };
  function gom(cat, it, size) {
    if (it.c) return '<span class="gom ' + size + ' gom-color" style="--gc:' + it.c + '"></span>';
    if (it.t) return '<span class="gom ' + size + ' gom-text" style="--h:' + cat.hue + '">' + it.t + '</span>';
    return '<span class="gom ' + size + '" style="--h:' + cat.hue + '">' + it.e + '</span>';
  }
  function houseSVG(n) {
    return '<svg class="house" viewBox="0 0 34 30" aria-hidden="true"><path d="M3.5 14.5L17 3.5l13.5 11M6.5 12.5v14h21v-14"/><text x="17" y="23.5" text-anchor="middle">' + n + '</text></svg>';
  }
  function sketchSVG(N, K, seed) {
    var r = E.makeRng('sk' + seed), s = 18, g = 5, w = N * (s + g) - g, h = K * (s + g) - g, out = '<svg viewBox="0 0 ' + w + ' ' + h + '" width="' + w + '" height="' + h + '">';
    for (var c = 0; c < K; c++) for (var p = 0; p < N; p++) {
      out += '<circle class="sk' + (r.next() < 0.2 ? ' on' : '') + '" cx="' + (p * (s + g) + s / 2) + '" cy="' + (c * (s + g) + s / 2) + '" r="' + (s / 2 - 1) + '"/>';
    }
    return out + '</svg>';
  }

  /* ---------- vues ---------- */
  function show(v) {
    $('#home').hidden = v !== 'home';
    $('#game').hidden = v !== 'game';
    if (v === 'home') renderHome();
  }

  function renderHome() {
    var L = prog.level, prm = E.levelParams(L), today = ymd(), d = prog.daily[today], st = streakNow();
    $('#lvl-n').textContent = L;
    $('#tier').textContent = prm.name;
    $('#lvl-meta').textContent = prm.N + ' maisons · ' + prm.K + ' catégories';
    $('#sketch').innerHTML = sketchSVG(prm.N, prm.K, L);
    $('#btn-play').textContent = L > 1 ? 'Reprendre le niveau ' + L : 'Commencer';
    $('#day-date').textContent = dateLabel();
    $('#day-state').innerHTML = d ? 'Résolu en <b>' + fmtTime(d.t) + '</b> · ' + d.s + ' étoile' + (d.s > 1 ? 's' : '') : 'Pas encore résolu';
    $('#btn-daily').textContent = d ? 'Rejouer' : 'Relever le défi';
    $('#streak-t').textContent = 'Série · ' + st + (st > 1 ? ' jours' : ' jour');
    $('#streak').classList.toggle('off', st === 0);
    $('#st-solved').textContent = prog.solved;
    $('#st-stars').textContent = prog.stars;
    $('#st-best').textContent = prog.best;
    $('#quick-sub').textContent = 'Une petite grille · environ 2 min' + (prog.quickBest ? ' · record ' + fmtTime(prog.quickBest) : '');
    var chips = '';
    [1, 4, 8, 12, 16, 22, 30, 40].forEach(function (n) { chips += '<button class="jchip" data-level="' + n + '" aria-label="Niveau ' + n + '">' + n + '</button>'; });
    $('#jump').innerHTML = chips;
  }

  /* ---------- couches ---------- */
  var layer = $('#layer'), lastFocus = null, adTimer = null;
  function openLayer(html, focusSel) {
    lastFocus = document.activeElement;
    layer.innerHTML = html;
    var f = focusSel && $(focusSel, layer);
    if (f) f.focus();
  }
  function closeLayer() {
    clearInterval(adTimer);
    layer.innerHTML = '';
    if (lastFocus && document.contains(lastFocus) && lastFocus.focus) lastFocus.focus();
    lastFocus = null;
  }

  /* ---------- partie ---------- */
  var G = null, timerId = null, noteTimer = null;

  function startGame(o) {
    closeLayer(); hideNote(); clearInterval(timerId);
    layer.innerHTML = '<div class="load" role="status">Préparation de la grille…</div>';
    setTimeout(function () {
      var prm, seed;
      if (o.mode === 'daily') { prm = E.dailyParams(); seed = 'cqfd-jour-' + o.date; }
      else if (o.mode === 'quick') { prm = E.quickParams(); seed = 'cqfd-rapide-' + Date.now().toString(36) + Math.floor(Math.random() * 1e6); }
      else { prm = E.levelParams(o.level); seed = 'cqfd-niveau-' + o.level; }
      var pz = E.generate(prm, seed), tries = 0;
      while (!pz && tries++ < 3) pz = E.generate(prm, seed + '-' + tries);
      layer.innerHTML = '';
      if (!pz) { show('home'); return; }
      var n = pz.N * pz.K;
      G = {
        mode: o.mode, level: o.level || 0, date: o.date || '', pz: pz, prm: prm, N: pz.N, K: pz.K,
        marks: new Array(n).fill(0), given: new Array(n).fill(-1), hist: [], clueDone: {}, elapsed: 0,
        hints: 0, mistakes: 0, won: false, sigWrong: '', err: [], hintCell: -1, hintClue: -1, sig: {}
      };
      G.cand = E.derive(G.N, G.K, G.marks, G.given);
      buildGame();
      show('game');
      startTimer();
      if (!prog.seenHow) openHow();
    }, 40);
  }

  function buildGame() {
    $('#g-name').textContent = G.mode === 'daily' ? 'Défi du jour' : G.mode === 'quick' ? 'Partie rapide' : 'Niveau ' + G.level;
    $('#g-sub').textContent = (G.mode === 'daily' ? dateLabel() : G.prm.name) + ' · ' + G.N + ' maisons, ' + G.K + ' catégories';
    var N = G.N, K = G.K, cats = G.pz.cats, h = '<div class="b-head"><span></span>', c, p;
    for (p = 0; p < N; p++) h += '<span class="b-house">' + houseSVG(p + 1) + '</span>';
    h += '</div>';
    for (c = 0; c < K; c++) {
      h += '<div class="b-row"><span class="b-lab">' + cats[c].name + '</span>';
      for (p = 0; p < N; p++) h += '<button class="cell" data-c="' + c + '" data-p="' + p + '"></button>';
      h += '</div>';
    }
    var b = $('#board');
    b.style.setProperty('--n', N);
    b.innerHTML = h;
    var ls = '';
    G.pz.clues.forEach(function (cl, i) {
      ls += '<li><button class="clue" data-i="' + i + '" aria-pressed="false"><span class="cn">' + (i + 1) + '</span><span class="ct"><span class="tx">' + esc(cl.text) + '</span></span></button></li>';
    });
    $('#clue-list').innerHTML = ls;
    $('.c-scroll').scrollTop = 0;
    updateBoard(); updateClues(); updateTools();
    $('#g-time').textContent = fmtTime(0);
  }

  function cellLabel(c, p, n, m) {
    var cat = G.pz.cats[c];
    return 'Maison ' + (p + 1) + ', ' + cat.name + ' : ' + (n === 1 ? cat.items[bitIndex(m)].l : n === 0 ? 'aucune possibilité' : n + ' possibilités');
  }
  function cellInner(c, p, n, m) {
    var cat = G.pz.cats[c], v, h;
    if (n === 0) return '<span class="bad-mark">!</span>';
    if (n === 1) { v = bitIndex(m); return gom(cat, cat.items[v], 'lg') + '<span class="lab">' + esc(cat.items[v].l) + '</span>'; }
    h = '<span class="cands">';
    for (v = 0; v < G.N; v++) if ((m >> v) & 1) h += gom(cat, cat.items[v], 'sm');
    return h + '</span>';
  }

  function updateBoard() {
    var N = G.N;
    $$('.cell').forEach(function (el) {
      var c = +el.dataset.c, p = +el.dataset.p, idx = c * N + p, m = G.cand[idx], n = E.POP[m], inner = cellInner(c, p, n, m);
      if (G.sig[idx] !== inner) {
        el.innerHTML = inner;
        if (G.sig[idx] !== undefined && n === 1) { el.classList.remove('fresh'); void el.offsetWidth; el.classList.add('fresh'); }
        G.sig[idx] = inner;
      }
      el.classList.toggle('hint', G.hintCell === idx);
      el.classList.toggle('bad', n === 0);
      el.classList.toggle('err', G.err.indexOf(idx) >= 0);
      el.setAttribute('aria-label', cellLabel(c, p, n, m));
    });
  }
  function updateClues() {
    var done = 0;
    $$('.clue').forEach(function (b) {
      var i = +b.dataset.i, d = !!G.clueDone[i];
      if (d) done++;
      b.setAttribute('aria-pressed', d ? 'true' : 'false');
      b.classList.toggle('hl', G.hintClue === i);
    });
    $('#c-count').textContent = done + ' / ' + G.pz.clues.length + ' barrés';
  }
  function updateTools() {
    var work = G.marks.some(function (x) { return x; }) || G.given.some(function (x) { return x >= 0; });
    $('#t-undo').disabled = !G.hist.length || G.won;
    $('#t-check').disabled = G.won;
    $('#t-hint').disabled = G.won;
    $('#t-clear').disabled = G.won || !work;
  }

  function startTimer() {
    clearInterval(timerId);
    timerId = setInterval(function () {
      if (!G || G.won || document.hidden || $('.ad', layer) || $('.dlg', layer)) return;
      G.elapsed++;
      $('#g-time').textContent = fmtTime(G.elapsed);
    }, 1000);
  }

  /* modifications du tableau */
  function commit(fn) {
    if (G.won) return;
    G.hist.push({ m: G.marks.slice(), g: G.given.slice() });
    if (G.hist.length > 300) G.hist.shift();
    fn();
    G.cand = E.derive(G.N, G.K, G.marks, G.given);
    G.err = []; G.hintCell = -1; G.hintClue = -1;
    if ($('#note').classList.contains('hint')) hideNote();
    updateBoard(); updateClues(); updateTools();
    afterChange();
  }
  function undo() {
    if (!G.hist.length || G.won) return;
    var s = G.hist.pop();
    G.marks = s.m; G.given = s.g;
    G.cand = E.derive(G.N, G.K, G.marks, G.given);
    G.err = []; G.hintCell = -1; G.hintClue = -1;
    hideNote(); updateBoard(); updateClues(); updateTools();
  }
  function afterChange() {
    var chk = E.checkBoard(G.pz, G.cand);
    if (chk.correct) { win(); return; }
    if (chk.complete) {
      var sig = G.cand.join(',');
      if (sig !== G.sigWrong) {
        G.sigWrong = sig; G.mistakes++;
        toast('La grille est remplie, mais il reste une erreur. Touche « Vérifier » pour la repérer.', 4600);
      }
    }
  }

  /* messages */
  function note(kind, html, ms) {
    var el = $('#note');
    clearTimeout(noteTimer);
    el.className = 'note ' + kind; el.hidden = false;
    el.innerHTML = kind === 'hint'
      ? '<div class="in"><span>' + html + '</span><button type="button" data-note-ok>OK</button></div>'
      : '<div class="in">' + html + '</div>';
    if (ms) noteTimer = setTimeout(hideNote, ms);
  }
  function toast(msg, ms) { note('toast', esc(msg), ms || 3000); }
  function hideNote() { clearTimeout(noteTimer); var el = $('#note'); el.hidden = true; el.innerHTML = ''; el.className = 'note'; }

  /* feuille de choix d'une case */
  var sheetCell = null;
  function placedElsewhere(c, p, v) {
    for (var q = 0; q < G.N; q++) if (q !== p && G.cand[c * G.N + q] === (1 << v)) return true;
    return false;
  }
  function sheetHTML(c, p) {
    var N = G.N, cat = G.pz.cats[c], idx = c * N + p, m = G.cand[idx], single = E.POP[m] === 1 ? bitIndex(m) : -1, gv = G.given[idx];
    var h = '<div class="scrim" data-close></div><div class="sheet" role="dialog" aria-modal="true" aria-labelledby="sh-t">' +
      '<div class="sh-head"><div><p>' + cat.name + '</p><h3 id="sh-t">Maison ' + (p + 1) + '</h3></div>' +
      '<button class="icon-btn" data-close aria-label="Fermer">' + ICON.cross + '</button></div><ul class="opts">';
    for (var v = 0; v < N; v++) {
      var it = cat.items[v], possible = ((m >> v) & 1) === 1, manual = ((G.marks[idx] >> v) & 1) === 1;
      var isSet = single === v, isGiven = gv === v, placed = placedElsewhere(c, p, v);
      var out = !possible, xDis = placed || gv >= 0, okDis = placed;
      var sub = placed ? '<small>déjà placé ailleurs</small>' : '';
      h += '<li class="opt' + (out ? ' out' : '') + '">' + gom(cat, it, 'xl') +
        '<span class="nm"><b>' + esc(it.l) + '</b>' + sub + '</span>' +
        '<button class="rb x" data-act="x" data-v="' + v + '" aria-pressed="' + (manual && !isGiven ? 'true' : 'false') + '" aria-label="Éliminer ' + esc(it.l) + '"' + (xDis ? ' disabled' : '') + '>' + ICON.cross + '</button>' +
        '<button class="rb ok" data-act="ok" data-v="' + v + '" aria-pressed="' + (isSet || isGiven ? 'true' : 'false') + '" aria-label="Valider ' + esc(it.l) + '"' + (okDis ? ' disabled' : '') + '>' + ICON.check + '</button></li>';
    }
    h += '</ul><div class="sh-foot"><button class="linkbtn" data-do="clear-cell">Effacer la case</button></div></div>';
    return h;
  }
  function openSheet(c, p) {
    sheetCell = { c: c, p: p };
    openLayer(sheetHTML(c, p), '.opt .rb:not(:disabled)');
  }
  function refreshSheet(f) {
    if (!sheetCell || !$('.sheet', layer)) return;
    layer.innerHTML = sheetHTML(sheetCell.c, sheetCell.p);
    if (f) { var el = $('[data-act="' + f.act + '"][data-v="' + f.v + '"]', layer); if (el && !el.disabled) el.focus(); }
  }
  function sheetAction(act, v) {
    var c = sheetCell.c, p = sheetCell.p, idx = c * G.N + p;
    if (act === 'x') {
      commit(function () { G.marks[idx] ^= (1 << v); });
      refreshSheet({ act: 'x', v: v });
    } else {
      var was = G.given[idx] === v;
      commit(function () {
        if (was) G.given[idx] = -1;
        else { G.given[idx] = v; G.marks[idx] &= ~(1 << v); }
      });
      refreshSheet(was ? { act: 'ok', v: v } : null);
      if (!was) setTimeout(function () {
        if (sheetCell && sheetCell.c === c && sheetCell.p === p && $('.sheet', layer)) closeLayer();
      }, 230);
    }
  }

  /* vérifier, indice, effacer */
  // cases où le joueur a lui-même validé une mauvaise valeur ou éliminé la bonne (les déductions automatiques qui en découlent ne comptent pas)
  function wrongCells() {
    var out = [];
    for (var i = 0; i < G.N * G.K; i++) {
      var sol = G.pz.solution[i];
      if ((G.given[i] >= 0 && G.given[i] !== sol) || ((G.marks[i] >> sol) & 1)) out.push(i);
    }
    return out;
  }
  function verify() {
    var wrong = wrongCells();
    if (!wrong.length) { toast('Aucune erreur pour l\'instant. Continue !', 2600); return; }
    G.mistakes++; G.err = wrong; updateBoard();
    var n = wrong.length;
    toast(n + (n > 1 ? ' cases sont à revoir : elles sont cerclées en rouge.' : ' case est à revoir : elle est cerclée en rouge.'), 4200);
  }

  function openAd() {
    if (G.won) return;
    openLayer('<div class="ad" role="dialog" aria-modal="true" aria-label="Publicité de démonstration"><div class="ad-in">' +
      '<span class="ad-tag">PUB · DÉMO</span>' +
      '<div class="ad-screen"><div class="ad-ring"><svg viewBox="0 0 72 72" aria-hidden="true"><circle class="bg" cx="36" cy="36" r="30"/><circle class="fg" id="ad-fg" cx="36" cy="36" r="30"/></svg><b id="ad-n">3</b></div></div>' +
      '<p id="ad-p">Ici, une courte vidéo récompensée (15 à 30 secondes) dans la vraie version. L\'indice est offert à la fin.</p>' +
      '<div class="row"><button class="btn" data-do="ad-cancel">Fermer</button><button class="btn primary" id="ad-ok" data-do="ad-claim" disabled>Récupérer l\'indice</button></div></div></div>',
      '[data-do="ad-cancel"]');
    var n = 3, fg = $('#ad-fg');
    if (fg) { fg.style.transition = 'stroke-dashoffset 3s linear'; requestAnimationFrame(function () { fg.style.strokeDashoffset = '0'; }); }
    adTimer = setInterval(function () {
      n--;
      var el = $('#ad-n');
      if (!el) { clearInterval(adTimer); return; }
      if (n > 0) { el.textContent = n; return; }
      clearInterval(adTimer);
      el.textContent = '✓';
      $('#ad-p').textContent = 'Merci ! Ton indice est prêt.';
      var ok = $('#ad-ok'); ok.disabled = false; ok.focus();
    }, 1000);
  }

  function giveHint() {
    var h = E.hint(G.pz, G.cand);
    if (!h) { toast('Rien de plus à déduire : il ne reste qu\'à valider des cases avec ✓.', 4000); return; }
    G.hints++;
    var cat = G.pz.cats[h.c], it = cat.items[h.v];
    G.hintCell = h.c * G.N + h.p;
    G.hintClue = h.kind === 'clue' ? h.clue : -1;
    note('hint', h.kind === 'clue'
      ? 'Relis l\'énoncé n°' + (h.clue + 1) + ' : il permet d\'éliminer <b>' + esc(it.l) + '</b> de la maison ' + (h.p + 1) + ' (ligne ' + cat.name + ').'
      : '<b>' + esc(it.l) + '</b> ne peut plus aller que dans la maison ' + (h.p + 1) + ' (ligne ' + cat.name + '). Touche la case et valide-la avec ✓.', 0);
    updateBoard(); updateClues();
    if (h.kind === 'clue') {
      var b = $('.clue[data-i="' + h.clue + '"]');
      if (b && b.scrollIntoView) b.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }

  var clearArmed = false, clearTimer = null;
  function disarmClear() {
    clearArmed = false; clearTimeout(clearTimer);
    $('#t-clear').classList.remove('warn'); $('#t-clear .tl').textContent = 'Effacer';
  }

  /* victoire */
  function recordWin(stars) {
    logAdd({ m: G.mode === 'daily' ? 'D' : G.mode === 'quick' ? 'Q' : 'L', l: G.level, t: G.elapsed, h: G.hints, e: G.mistakes, s: stars, r: 'ok', d: ymd() });
    if (G.mode === 'quick') {
      prog.quick = (prog.quick || 0) + 1;
      prog.quickBest = Math.min(prog.quickBest || 1e9, G.elapsed);
    } else if (G.mode === 'level') {
      var prev = prog.done[G.level] || 0;
      if (!prev) prog.solved++;
      if (stars > prev) { prog.stars += stars - prev; prog.done[G.level] = stars; }
      prog.level = Math.max(prog.level, G.level + 1);
    } else if (!prog.daily[G.date]) {
      prog.daily[G.date] = { t: G.elapsed, s: stars };
      prog.stars += stars;
      prog.streak = prog.lastDaily === yesterday() ? prog.streak + 1 : 1;
      prog.lastDaily = G.date;
      prog.best = Math.max(prog.best, prog.streak);
    }
    save();
  }
  function win() {
    G.won = true;
    G.stars = Math.max(1, 3 - (G.hints > 0 ? 1 : 0) - (G.mistakes > 0 ? 1 : 0));
    recordWin(G.stars);
    G.hintCell = -1; G.hintClue = -1; hideNote(); updateBoard(); updateClues(); updateTools();
    setTimeout(showWin, 700);
  }
  function showWin() {
    var grade = G.stars === 3 ? 'Très bien' : G.stars === 2 ? 'Bien' : 'Assez bien', stars = '', i;
    for (i = 0; i < 3; i++) stars += '<svg viewBox="0 0 24 24" class="' + (i < G.stars ? 'on' : '') + '" aria-hidden="true"><path d="M12 3.2l2.7 5.6 6.1.8-4.5 4.2 1.1 6-5.4-3-5.4 3 1.1-6L3.2 9.6l6.1-.8z"/></svg>';
    var res = 'Résolu en ' + fmtTime(G.elapsed) + (G.hints ? ', avec ' + G.hints + ' indice' + (G.hints > 1 ? 's' : '') : ', sans indice') + '.';
    var next = G.mode === 'level' ? '<button class="btn primary" data-do="next">Niveau ' + (G.level + 1) + '</button>'
      : G.mode === 'quick' ? '<button class="btn primary" data-do="quick-again">Une autre partie rapide</button>' : '';
    openLayer('<div class="win"><div class="copy" role="dialog" aria-modal="true" aria-label="Grille résolue">' +
      '<p class="lv">' + (G.mode === 'daily' ? 'Défi du jour' : G.mode === 'quick' ? 'Partie rapide' : 'Niveau ' + G.level) + '</p>' +
      '<p class="stamp">CQFD</p>' +
      '<div class="grade"><span>' + grade + '</span><span class="stars" role="img" aria-label="' + G.stars + ' étoile' + (G.stars > 1 ? 's' : '') + ' sur 3">' + stars + '</span></div>' +
      '<p class="res">' + res + '</p>' +
      '<div class="acts">' + next + '<button class="btn' + (next ? '' : ' primary') + '" data-do="home">Accueil</button></div></div></div>',
      '.btn.primary');
  }

  // une grille quittée sans être finie compte comme un abandon (sauf si elle a duré moins de 10 s)
  function logQuit() {
    if (!G || G.won || G.elapsed < 10) return;
    logAdd({ m: G.mode === 'daily' ? 'D' : G.mode === 'quick' ? 'Q' : 'L', l: G.level, t: G.elapsed, h: G.hints, e: G.mistakes, s: 0, r: 'quit', d: ymd() });
  }
  function reportText() {
    var rows = prog.log || [], out = ['CQFD · journal de jeu (version ' + VERSION + ')', 'Écran ' + window.innerWidth + '×' + window.innerHeight + ' · ' + new Date().toLocaleDateString('fr-FR'), ''];
    rows.forEach(function (x) {
      var what = x.m === 'L' ? 'Niveau ' + x.l : x.m === 'Q' ? 'Partie rapide' : 'Défi du jour';
      out.push(what + ' · ' + (x.r === 'ok'
        ? 'résolu en ' + fmtTime(x.t) + ' · ' + x.h + ' indice' + (x.h > 1 ? 's' : '') + ' · ' + x.e + ' erreur' + (x.e > 1 ? 's' : '')
        : 'abandonné après ' + fmtTime(x.t) + ' · ' + x.h + ' indice' + (x.h > 1 ? 's' : '')));
    });
    if (!rows.length) out.push('(aucune partie jouée pour l\'instant)');
    return out.join('\n');
  }
  function openLog(text, copied) {
    openLayer('<div class="scrim" data-close></div><div class="dlg" role="dialog" aria-modal="true" aria-labelledby="log-t">' +
      '<h3 id="log-t">Mon journal de jeu</h3>' +
      '<p class="meta">' + (copied ? 'Copié ! Colle-le dans un message pour l\'envoyer.' : 'Sélectionne ce texte, copie-le, puis colle-le dans un message.') + '</p>' +
      '<textarea id="log-ta" readonly rows="9">' + esc(text) + '</textarea>' +
      '<button class="btn primary" data-close>Fermer</button></div>', '#log-ta');
    var ta = $('#log-ta');
    if (ta && !copied) ta.select();
  }

  function openHow() {
    openLayer('<div class="scrim" data-do="how-ok"></div><div class="dlg" role="dialog" aria-modal="true" aria-labelledby="how-t">' +
      '<h3 id="how-t">Comment jouer</h3><ol>' +
      '<li>Les maisons sont alignées de gauche à droite, du n°1 au dernier numéro. Chaque ligne du tableau est une catégorie : région, animal, boisson…</li>' +
      '<li>Chaque maison abrite exactement un élément de chaque catégorie, et aucun ne se répète.</li>' +
      '<li>Lis les énoncés, puis touche une case. <svg class="ic-x" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg> élimine une possibilité, <svg class="ic-ok" viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 12.5l5 5L19.5 6.5"/></svg> la valide.</li>' +
      '<li>Touche un énoncé pour le barrer quand tu l\'as exploité.</li>' +
      '<li>Bloqué ? Un indice, offert après une courte pub, te montre l\'énoncé à relire.</li>' +
      '</ol><button class="btn primary" data-do="how-ok">C\'est parti</button></div>', '.dlg .btn');
  }

  /* ---------- événements ---------- */
  $('#btn-play').addEventListener('click', function () { startGame({ mode: 'level', level: prog.level }); });
  $('#btn-daily').addEventListener('click', function () { startGame({ mode: 'daily', date: ymd() }); });
  $('#btn-quick').addEventListener('click', function () { startGame({ mode: 'quick' }); });
  $('#btn-how').addEventListener('click', openHow);
  $('#btn-log').addEventListener('click', function () {
    var text = reportText();
    try { navigator.clipboard.writeText(text).then(function () { openLog(text, true); }, function () { openLog(text, false); }); }
    catch (e) { openLog(text, false); }
  });
  $('#jump').addEventListener('click', function (e) {
    var b = e.target.closest('[data-level]');
    if (b) startGame({ mode: 'level', level: +b.dataset.level });
  });

  $('#g-back').addEventListener('click', function () {
    logQuit(); clearInterval(timerId); closeLayer(); hideNote(); disarmClear(); G = null; show('home');
  });
  $('#board').addEventListener('click', function (e) {
    var cell = e.target.closest('.cell');
    if (cell && G && !G.won) openSheet(+cell.dataset.c, +cell.dataset.p);
  });
  $('#clue-list').addEventListener('click', function (e) {
    var b = e.target.closest('.clue');
    if (!b || !G) return;
    var i = +b.dataset.i;
    G.clueDone[i] = !G.clueDone[i];
    updateClues();
  });
  $('#t-undo').addEventListener('click', undo);
  $('#t-check').addEventListener('click', verify);
  $('#t-hint').addEventListener('click', openAd);
  $('#t-clear').addEventListener('click', function () {
    if (!clearArmed) {
      clearArmed = true; this.classList.add('warn'); $('#t-clear .tl').textContent = 'Sûr ?';
      clearTimer = setTimeout(disarmClear, 2600);
      return;
    }
    disarmClear();
    commit(function () { G.marks.fill(0); G.given.fill(-1); });
    G.clueDone = {}; updateClues();
  });
  $('#note').addEventListener('click', function (e) {
    if (!e.target.closest('[data-note-ok]')) return;
    G.hintCell = -1; G.hintClue = -1; hideNote(); updateBoard(); updateClues();
  });

  layer.addEventListener('click', function (e) {
    var t = e.target.closest('[data-close],[data-act],[data-do]');
    if (!t) return;
    if (t.hasAttribute('data-act')) { sheetAction(t.dataset.act, +t.dataset.v); return; }
    var d = t.dataset['do'];
    if (d === 'clear-cell') {
      var idx = sheetCell.c * G.N + sheetCell.p;
      commit(function () { G.marks[idx] = 0; G.given[idx] = -1; });
      refreshSheet();
    } else if (d === 'how-ok') { prog.seenHow = true; save(); closeLayer(); }
    else if (d === 'ad-cancel') closeLayer();
    else if (d === 'ad-claim') { closeLayer(); giveHint(); }
    else if (d === 'next') startGame({ mode: 'level', level: G.level + 1 });
    else if (d === 'quick-again') startGame({ mode: 'quick' });
    else if (d === 'home') { clearInterval(timerId); closeLayer(); hideNote(); G = null; show('home'); }
    else if (t.hasAttribute('data-close')) closeLayer();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && ($('.sheet', layer) || $('.dlg', layer))) {
      if ($('#how-t', layer)) { prog.seenHow = true; save(); }
      closeLayer();
    }
  });

  /* ---------- démarrage ---------- */
  show('home');
  // hors ligne : uniquement pour la version publiée sur un site (présence du manifeste)
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol) && document.querySelector('link[rel="manifest"]')) {
    window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () { /* non bloquant */ }); });
  }
})();
