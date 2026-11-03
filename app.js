(function(){
  var $ = function(s, r){ return (r || document).querySelector(s); };
  var $$ = function(s, r){ return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  // Master data state
  var data = window.WATCH_DATA || { watches: [], categories: ["Luxury", "Vintage", "Smart Watches", "Clocks"], genders: ["Men", "Women", "Kids"] };
  var current = 'All', currentGender = 'Men';
  var pages = ['home', 'products', 'pricelist', 'technology', 'gallery', 'locator', 'support', 'about', 'contact'];

  // Currency Formatter: Pakistani Rupee (PKR / Rs.)
  function money(n) {
    if (typeof n !== 'number') n = parseFloat(n) || 0;
    return 'Rs. ' + Math.round(n).toLocaleString('en-PK');
  }

  // Cards data comes from data/products.json (fetch ... then ... style)
  // If the file is opened by double click (no server), the bundled watches.js data is used instead.
  function initData() {
    fetch('data/products.json')
      .then(response => response.json())
      .then(json => {
        if (Array.isArray(json) && json.length > 0) {
          data.watches = json;
          renderGenderFilters();
          renderFilters();
          renderGrid();
          renderPriceList();
          renderGallery();
          updateHeaderBagBadge();
        }
      })
      .catch(err => {
        console.log('Alberto: using bundled catalogue data (open with Live Server to load JSON).');
      });
  }

  // Team cards come from data/team.json
  function initTeam() {
    var box = document.getElementById('teamGrid');
    if (!box) return;
    fetch('data/team.json')
      .then(response => response.json())
      .then(json => {
        let cards = '';
        for (let member of json) {
          cards += `<article class="team-card">
            <img src="${member.image}" alt="${member.name}" loading="lazy">
            <h4>${member.name}</h4>
            <p>${member.role}</p>
          </article>`;
        }
        box.innerHTML = cards;
      })
      .catch(err => {
        box.innerHTML = '<p style="color:#9b9a95">Team cards could not be loaded. Please open the site with VS Code Live Server.</p>';
      });
  }

  // Open products page with a gender and/or line-up already selected
  function setProductFilter(gender, cat) {
    if (gender) currentGender = gender;
    current = cat || 'All';
    renderGenderFilters();
    renderFilters();
    renderGrid();
  }

  // Breadcrumb: Home > Current page
  var pageNames = { home: 'Home', products: 'Products', pricelist: 'Price List', technology: 'Technology', gallery: 'Gallery', locator: 'Store Locator', support: 'Support', about: 'About', contact: 'Contact' };
  function updateBreadcrumb(p) {
    var bc = document.getElementById('breadcrumb');
    if (!bc) return;
    bc.innerHTML = p === 'home'
      ? '<li aria-current="page">Home</li>'
      : '<li><a href="#home" data-page="home">Home</a></li><li aria-current="page">' + pageNames[p] + '</li>';
  }

  /* Stable deterministic photo mapping pointing to real renamed images */
  function stablePhotoFor(w) {
    if (w.image) return w.image;
    if (w.photo) return w.photo;
    var nameSlug = w.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    return 'images/' + nameSlug + '.jpg';
  }

  function imgBox(w) {
    var local = stablePhotoFor(w);
    var failed = "this.style.opacity='0.85';";
    return '<div class="imgbox"><img class="bgfill" src="' + local + '" alt="" onerror="' + failed + '"><img src="' + local + '" alt="' + w.name + '" loading="lazy" onerror="' + failed + '"></div>';
  }

  /* SPA navigation with smooth fade */
  var busy = null;
  function show(p) {
    if (pages.indexOf(p) < 0) p = 'home';
    updateBreadcrumb(p);
    $$('.nav-link').forEach(function(a){ a.classList.toggle('active', a.getAttribute('data-page') === p); });
    var old = $('.page.show'), nw = document.getElementById(p);
    clearTimeout(busy);
    function reveal() {
      $$('.page').forEach(function(x){ x.classList.remove('show', 'in'); });
      if (nw) {
        nw.classList.add('show');
        window.scrollTo(0, 0);
        requestAnimationFrame(function(){
          requestAnimationFrame(function(){ nw.classList.add('in'); });
        });
      }
    }
    if (old && old !== nw) {
      old.classList.remove('in');
      busy = setTimeout(reveal, 220);
    } else {
      reveal();
    }
    var menu = $('#menu');
    if (menu) menu.classList.remove('show');
  }

  // Update Header Shopping Bag Badge Counter
  function updateHeaderBagBadge() {
    var cart = window.albertoCart || {};
    var watchCount = Object.keys(cart).reduce(function(n, id){ return n + (cart[id].qty || 0); }, 0);
    var clockCount = Object.keys(clockCart).reduce(function(n, id){ return n + (clockCart[id].qty || 0); }, 0);
    var totalCount = watchCount + clockCount;
    var badge = document.getElementById('headerBagCount');
    if (badge) {
      badge.textContent = totalCount;
      badge.style.transform = 'scale(1.25)';
      setTimeout(function(){ badge.style.transform = 'scale(1)'; }, 200);
    }
  }

  /* Global Event Listeners */
  document.addEventListener('click', function(e) {
    // SPA navigation links
    var a = e.target.closest('[data-page]');
    if (a) {
      e.preventDefault();
      var p = a.getAttribute('data-page');
      if (p === 'products' && (a.getAttribute('data-gender') || a.getAttribute('data-cat'))) {
        setProductFilter(a.getAttribute('data-gender'), a.getAttribute('data-cat'));
      }
      history.replaceState(null, '', '#' + p);
      show(p);
      return;
    }

    // Gender Filter Buttons
    var gf = e.target.closest('#genderFilters .btn');
    if (gf) {
      currentGender = gf.getAttribute('data-gender');
      current = 'All';
      $$('#genderFilters .btn').forEach(function(b){ b.classList.toggle('on', b === gf); });
      renderFilters();
      var g = $('#productGrid');
      if (g) {
        g.style.opacity = 0;
        setTimeout(function(){ renderGrid(); g.style.opacity = 1; }, 150);
      }
      return;
    }

    // Gallery filter chips
    var gal = e.target.closest('#galleryFilters .btn');
    if (gal) {
      galleryFilter = gal.getAttribute('data-gallery');
      renderGallery();
      return;
    }

    // Category Filter Buttons
    var f = e.target.closest('#filters .btn');
    if (f) {
      current = f.getAttribute('data-cat');
      $$('#filters .btn').forEach(function(b){ b.classList.toggle('on', b === f); });
      var g = $('#productGrid');
      if (g) {
        g.style.opacity = 0;
        setTimeout(function(){ renderGrid(); g.style.opacity = 1; }, 150);
      }
      return;
    }

    // ADD TO CART button on product card
    var addBtn = e.target.closest('.btn-card-add-cart');
    if (addBtn) {
      e.stopPropagation();
      var id = +addBtn.getAttribute('data-card-cart');
      var w = data.watches.find(function(x){ return x.id === id; });
      if (w) {
        if (!window.albertoCart) window.albertoCart = {};
        var key = String(w.id), photo = stablePhotoFor(w);
        if (!window.albertoCart[key]) window.albertoCart[key] = { id: w.id, name: w.name, price: w.price, photo: photo, qty: 0 };
        window.albertoCart[key].qty++;
        updateHeaderBagBadge();
        var origText = addBtn.innerHTML;
        addBtn.innerHTML = 'ADDED ✓';
        addBtn.classList.add('added');
        setTimeout(function(){
          addBtn.innerHTML = origText;
          addBtn.classList.remove('added');
        }, 1200);
      }
      return;
    }

    // Quick View button on card
    var qvBtn = e.target.closest('.btn-card-quick-view');
    if (qvBtn) {
      e.stopPropagation();
      openModal(+qvBtn.getAttribute('data-id'));
      return;
    }

    // Click on Watch Card to open Details Popup
    var c = e.target.closest('.wcard');
    if (c && !e.target.closest('button')) {
      openModal(+c.getAttribute('data-id'));
      return;
    }

    // Watch Details Modal Close
    if (e.target.id === 'watchModal' || e.target.id === 'mClose') {
      closeModal();
    }

    // Site map: open button (any element with data-open-sitemap)
    if (e.target.closest('[data-open-sitemap]')) {
      e.preventDefault();
      openSitemapFlowchart();
      return;
    }

    // Site map: shopping bag boxes
    if (e.target.closest('[data-bag]')) {
      e.preventDefault();
      closeSitemapFlowchart();
      showCheckoutCart();
      return;
    }

    // Site map: any box jumps to its page (and filter / section)
    var fcNode = e.target.closest('[data-nav]');
    if (fcNode) {
      e.preventDefault();
      var navTarget = fcNode.getAttribute('data-nav');
      if (navTarget === 'products' && (fcNode.getAttribute('data-gender') || fcNode.getAttribute('data-cat'))) {
        setProductFilter(fcNode.getAttribute('data-gender'), fcNode.getAttribute('data-cat'));
      }
      closeSitemapFlowchart();
      history.replaceState(null, '', '#' + navTarget);
      show(navTarget);
      var scrollId = fcNode.getAttribute('data-scroll');
      if (scrollId) {
        setTimeout(function(){
          var t = document.getElementById(scrollId);
          if (t) t.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 500);
      }
      return;
    }
  });

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      closeModal();
      closeSitemapFlowchart();
    }
  });

  // Mobile menu toggle
  var navToggle = $('#navToggle');
  if (navToggle) {
    navToggle.onclick = function(){ $('#menu').classList.toggle('show'); };
  }

  // Back to top control
  var backTop = document.getElementById('backTop');
  window.addEventListener('scroll', function(){
    if (backTop) backTop.classList.toggle('show', window.scrollY > 450);
  });
  if (backTop) {
    backTop.onclick = function(){ window.scrollTo({ top: 0, behavior: 'smooth' }); };
  }

  /* Watch Details Popup Modal */
  function openModal(id) {
    var w = data.watches.find(function(x){ return x.id === id; });
    if (!w) return;
    var local = stablePhotoFor(w);
    var mTitle = $('#mTitle'), mImg = $('#mImg'), mDesc = $('#mDesc'), mPrice = $('#mPrice'), mSpecs = $('#mSpecs');
    if (mTitle) mTitle.textContent = w.name;
    if (mImg) {
      mImg.innerHTML = '<div class="imgbox modal-imgbox"><img class="bgfill" src="' + local + '" alt="" onerror="this.style.display=\'none\'"><img src="' + local + '" alt="' + w.name + '"></div>';
    }
    if (mDesc) mDesc.textContent = w.desc;
    if (mPrice) mPrice.textContent = money(w.price);
    if (mSpecs) {
      var s = '';
      for (var k in w.specs) {
        s += '<li><strong>' + k + '</strong><span>' + w.specs[k] + '</span></li>';
      }
      mSpecs.innerHTML = s;
    }

    var cart = $('#mCartBtn');
    if (cart) {
      cart.textContent = 'ADD TO CART +';
      cart.classList.remove('added');
      cart.onclick = function(){
        if (!window.albertoCart) window.albertoCart = {};
        var key = String(w.id), photo = stablePhotoFor(w);
        if (!window.albertoCart[key]) window.albertoCart[key] = { id: w.id, name: w.name, price: w.price, photo: photo, qty: 0 };
        window.albertoCart[key].qty++;
        updateHeaderBagBadge();
        cart.textContent = 'ADDED TO CART ✓';
        cart.classList.add('added');
        // Keep the product details open; customers can open the bag from the header when ready.
      };
    }
    var watchModal = $('#watchModal');
    if (watchModal) watchModal.classList.add('open');
  }

  function closeModal() {
    var watchModal = $('#watchModal');
    if (watchModal) watchModal.classList.remove('open');
  }

  /* Checkout Shopping Bag Drawer / Overlay */
  function showCheckoutCart() {
    var cart = window.albertoCart || {};
    var overlay = document.getElementById('albertoCheckout');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'albertoCheckout';
      overlay.className = 'aw-checkout-overlay';
      document.body.appendChild(overlay);
    }

    function draw() {
      // Merge watchCart and clockCart into bag
      var watchItems = Object.keys(cart);
      var clockItems = Object.keys(clockCart);
      var total = watchItems.reduce(function(n, id){ return n + cart[id].price * cart[id].qty; }, 0) +
                  clockItems.reduce(function(n, id){ return n + clockCart[id].price * clockCart[id].qty; }, 0);

      var hasItems = watchItems.length > 0 || clockItems.length > 0;

      var itemsHtml = '';
      if (watchItems.length > 0) {
        itemsHtml += watchItems.map(function(id){
          var p = cart[id];
          return '<article class="aw-item"><img src="' + p.photo + '" alt=""><div class="aw-item-info"><strong>' + p.name + '</strong><span>' + money(p.price) + '</span><div class="aw-controls"><button data-aw="minus" data-id="' + id + '">−</button><b>' + p.qty + '</b><button data-aw="plus" data-id="' + id + '">+</button><button class="aw-remove" data-aw="remove" data-id="' + id + '">Remove</button></div></div><strong>' + money(p.price * p.qty) + '</strong></article>';
        }).join('');
      }
      if (clockItems.length > 0) {
        itemsHtml += clockItems.map(function(id){
          var p = clockCart[id];
          return '<article class="aw-item"><img src="' + p.photo + '" alt=""><div class="aw-item-info"><strong>' + p.name + ' (Clock)</strong><span>' + money(p.price) + '</span><div class="aw-controls"><button data-aw-clock="minus" data-id="' + id + '">−</button><b>' + p.qty + '</b><button data-aw-clock="plus" data-id="' + id + '">+</button><button class="aw-remove" data-aw-clock="remove" data-id="' + id + '">Remove</button></div></div><strong>' + money(p.price * p.qty) + '</strong></article>';
        }).join('');
      }

      overlay.innerHTML = '<section class="aw-checkout">' +
        '<button type="button" class="aw-x" id="awCheckoutClose" aria-label="Close">×</button>' +
        '<p class="eyebrow">ALBERTO · PRIVATE CLIENT SERVICE</p>' +
        '<h2>Your Shopping Bag</h2>' +
        '<p class="aw-sub">Review or update your selected timepieces. Use the delivery option below when you are ready to continue.</p>' +
        '<div class="aw-items">' + (hasItems ? itemsHtml : '<p style="padding: 24px 0; color: #a9a192;">Your shopping bag is currently empty. Explore our collection to add timepieces.</p>') + '</div>' +
        '<div class="aw-total"><span>Total (PKR)</span><strong>' + money(total) + '</strong></div>' +
        (hasItems ? '<button class="aw-continue" id="awContinue">PROCEED TO DELIVERY DETAILS ↗</button>' : '') +
        '<form id="awDetails" class="aw-details" hidden>' +
          '<h3>Delivery &amp; Client Details</h3>' +
          '<div class="aw-form-grid">' +
            '<label>Full name *<input required name="name" autocomplete="name" placeholder="Your full name"></label>' +
            '<label>Phone number *<input required name="phone" type="tel" autocomplete="tel" placeholder="+92 300 1234567"></label>' +
            '<label>Email address *<input required name="email" type="email" autocomplete="email" placeholder="you@example.com"></label>' +
            '<label>City *<input required name="city" placeholder="Karachi, Lahore, Islamabad, etc."></label>' +
            '<label class="aw-wide">Complete Delivery Address *<textarea required name="address" rows="3" autocomplete="street-address" placeholder="House/Apartment #, Street, Area, City"></textarea></label>' +
            '<label class="aw-wide">Special Delivery Instructions<textarea name="notes" rows="2" placeholder="Optional security or timing instructions"></textarea></label>' +
          '</div>' +
          '<button class="aw-continue" type="submit">CONFIRM DEMO ORDER</button>' +
          '<p class="aw-sub" style="margin-top: 10px;">Official client simulation: No payment processing required. An Alberto concierge representative will verify your order.</p>' +
        '</form>' +
        '<div id="awSuccess" class="aw-success" hidden>' +
          '<div class="aw-check">✓</div>' +
          '<h2>Thank you for choosing Alberto.</h2>' +
          '<p>Your order reference #ALT-' + Math.floor(100000 + Math.random() * 900000) + ' has been registered. Our horology client manager will contact you for dispatch confirmation.</p>' +
          '<button class="aw-continue" id="awDone">CONTINUE BROWSING</button>' +
        '</div>' +
      '</section>';

      document.getElementById('awCheckoutClose').onclick = function(){ overlay.classList.remove('open'); };

      // Watch controls
      overlay.querySelectorAll('[data-aw]').forEach(function(b){
        b.onclick = function(){
          var id = b.dataset.id;
          if (!cart[id]) return;
          if (b.dataset.aw === 'plus') cart[id].qty++;
          else if (b.dataset.aw === 'minus') cart[id].qty--;
          else delete cart[id];
          if (cart[id] && cart[id].qty < 1) delete cart[id];
          updateHeaderBagBadge();
          draw();
        };
      });

      // Clock controls
      overlay.querySelectorAll('[data-aw-clock]').forEach(function(b){
        b.onclick = function(){
          var id = b.dataset.id;
          if (!clockCart[id]) return;
          if (b.dataset.awClock === 'plus') clockCart[id].qty++;
          else if (b.dataset.awClock === 'minus') clockCart[id].qty--;
          else delete clockCart[id];
          if (clockCart[id] && clockCart[id].qty < 1) delete clockCart[id];
          renderClockCart();
          updateHeaderBagBadge();
          draw();
        };
      });

      var contBtn = document.getElementById('awContinue');
      if (contBtn) {
        contBtn.onclick = function(){
          document.getElementById('awDetails').hidden = false;
          this.hidden = true;
          document.getElementById('awDetails').scrollIntoView({ behavior: 'smooth', block: 'start' });
        };
      }

      var detailsForm = document.getElementById('awDetails');
      if (detailsForm) {
        detailsForm.onsubmit = function(e){
          e.preventDefault();
          detailsForm.hidden = true;
          overlay.querySelector('.aw-items').hidden = true;
          overlay.querySelector('.aw-total').hidden = true;
          document.getElementById('awSuccess').hidden = false;
          // Clear cart
          window.albertoCart = {};
          clockCart = {};
          renderClockCart();
          updateHeaderBagBadge();
        };
      }

      var doneBtn = document.getElementById('awDone');
      if (doneBtn) {
        doneBtn.onclick = function(){ overlay.classList.remove('open'); };
      }
    }

    draw();
    overlay.classList.add('open');
  }

  // Header bag button triggers checkout
  var headerBagBtn = document.getElementById('headerBagBtn');
  if (headerBagBtn) {
    headerBagBtn.onclick = showCheckoutCart;
  }

  /* Render Filter Tabs */
  function renderGenderFilters() {
    var gfEl = $('#genderFilters');
    if (!gfEl) return;
    var h = '';
    (data.genders || ['Men', 'Women', 'Kids']).forEach(function(g){
      h += '<button class="btn ' + (currentGender === g ? 'on' : '') + '" data-gender="' + g + '">' + g + '</button>';
    });
    gfEl.innerHTML = h;
  }

  function renderFilters() {
    var fEl = $('#filters');
    if (!fEl) return;
    var h = '<span class="filter-label">Line-up:</span><button class="btn ' + (current === 'All' ? 'on' : '') + '" data-cat="All">All</button>';
    (data.categories || ['Luxury', 'Vintage', 'Smart Watches']).forEach(function(c){
      h += '<button class="btn ' + (current === c ? 'on' : '') + '" data-cat="' + c + '">' + c + '</button>';
    });
    fEl.innerHTML = h;
  }

  /* Render Product Cards Grid */
  function renderGrid() {
    var gridEl = $('#productGrid');
    if (!gridEl) return;

    var clockBlock = document.querySelector('.clock-collection-block');
    if (clockBlock) clockBlock.style.display = (current === 'All' || current === 'Clocks') ? '' : 'none';

    var filtered = data.watches.filter(function(w){
      return w.gender === currentGender && w.category !== 'Clocks' && (current === 'All' || w.category === current);
    });

    if (filtered.length === 0) {
      gridEl.innerHTML = '<div class="col-12 text-center py-5"><p style="color: #aaa397;">No timepieces match the current filters. Select "All" to view the full collection.</p></div>';
      return;
    }

    gridEl.innerHTML = filtered.map(function(w, i){
      return '<div class="col-6 col-md-4" style="--i:' + i + '">' +
        '<div class="wcard" data-id="' + w.id + '">' +
          imgBox(w) +
          '<div class="card-content-wrap">' +
            '<span class="tag">' + w.gender + ' · ' + w.category + '</span>' +
            '<h5>' + w.name + '</h5>' +
            '<div class="rating-stars" aria-label="5 out of 5 stars">★★★★★ <span style="font-size:.72rem;color:#aaa08f;letter-spacing:0">(5.0)</span></div>' +
            '<div class="card-pricing-row">' +
              '<div class="price">' + money(w.price) + '</div>' +
            '</div>' +
          '</div>' +
          '<div class="wcard-actions">' +
            '<button type="button" class="btn-card-add-cart" data-card-cart="' + w.id + '">+ Add to Cart</button>' +
            '<button type="button" class="btn-card-quick-view" data-id="' + w.id + '" title="View Specs">Details ↗</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  /* Gallery cards (filter chips + cards from the same JSON) */
  var galleryFilter = 'All';
  function renderGallery() {
    var fBox = document.getElementById('galleryFilters');
    var gBox = document.getElementById('galleryGrid');
    if (!fBox || !gBox) return;

    var chips = ['All', 'Men', 'Women', 'Kids', 'Luxury', 'Vintage', 'Smart Watches', 'Clocks'];
    var chipHtml = '';
    for (let c of chips) {
      chipHtml += '<button type="button" class="btn ' + (galleryFilter === c ? 'on' : '') + '" data-gallery="' + c + '">' + c + '</button>';
    }
    fBox.innerHTML = chipHtml;

    var cards = '';
    var i = 0;
    for (let w of data.watches) {
      if (galleryFilter !== 'All' && w.gender !== galleryFilter && w.category !== galleryFilter) continue;
      cards += '<div class="col-6 col-md-4 col-lg-3" style="--i:' + i + '">' +
        '<div class="wcard gallery-card" data-id="' + w.id + '">' +
          imgBox(w) +
          '<div class="card-content-wrap">' +
            '<span class="tag">' + w.gender + ' · ' + w.category + '</span>' +
            '<h5>' + w.name + '</h5>' +
          '</div>' +
        '</div>' +
      '</div>';
      i++;
    }
    gBox.innerHTML = cards || '<p style="color:#9b9a95">No images in this group yet.</p>';
  }

  /* Clock Collection & Dedicated Shopping Bag */
  var clockCart = {};
  function renderClockCart() {
    var ids = Object.keys(clockCart);
    var count = ids.reduce(function(n, id){ return n + clockCart[id].qty; }, 0);
    var total = ids.reduce(function(n, id){ return n + clockCart[id].price * clockCart[id].qty; }, 0);
    var countEl = document.getElementById('clockCartCount');
    var totalEl = document.getElementById('clockCartTotal');
    var itemsEl = document.getElementById('clockCartItems');
    if (countEl) countEl.textContent = count;
    if (totalEl) totalEl.textContent = money(total);
    if (!itemsEl) return;
    if (!ids.length) {
      itemsEl.innerHTML = '<p class="clock-cart-empty">Your bag is empty. Add a clock to get started.</p>';
      return;
    }
    itemsEl.innerHTML = ids.map(function(id){
      var p = clockCart[id];
      return '<div class="clock-cart-item">' +
        '<img src="' + p.photo + '" alt="">' +
        '<div class="clock-cart-info">' +
          '<strong>' + p.name + '</strong>' +
          '<span>' + money(p.price) + '</span>' +
          '<div class="clock-qty">' +
            '<button type="button" data-cart-action="minus" data-cart-id="' + id + '" aria-label="Decrease quantity">−</button>' +
            '<span>' + p.qty + '</span>' +
            '<button type="button" data-cart-action="plus" data-cart-id="' + id + '" aria-label="Increase quantity">+</button>' +
            '<button type="button" class="clock-remove" data-cart-action="remove" data-cart-id="' + id + '">Remove</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    }).join('');
    updateHeaderBagBadge();
  }

  function renderClocks() {
    var box = document.getElementById('clockGrid');
    if (!box) return;
    var clocks = [
      { id: 101, name: 'Ocean Marble Wall Clock', price: 25000, photo: 'images/ocean-marble-wall-clock.jpg' },
      { id: 102, name: 'Black Elegance Wall Clock', price: 22500, photo: 'images/black-elegance-wall-clock.jpg' },
      { id: 103, name: 'White Marble Wall Clock', price: 19500, photo: 'images/white-marble-wall-clock.jpg' },
      { id: 104, name: 'Floral Gold Wall Clock', price: 28000, photo: 'images/floral-gold-wall-clock.jpg' },
      { id: 105, name: 'Gold Marble Wall Clock', price: 26500, photo: 'images/gold-marble-wall-clock.jpg' }
    ];

    box.innerHTML = clocks.map(function(w, i){
      return '<div class="col-6 col-md-4 col-lg-3" style="--i:' + i + '">' +
        '<article class="clock-product-card">' +
          '<button class="clock-photo-button" type="button" data-id="' + w.id + '" aria-label="View ' + w.name + '">' +
            '<img src="' + w.photo + '" alt="' + w.name + '" loading="lazy">' +
          '</button>' +
          '<div class="clock-product-info">' +
            '<span class="tag">Handcrafted Clock</span>' +
            '<h5>' + w.name + '</h5>' +
            '<div class="price">' + money(w.price) + '</div>' +
            '<button class="clock-add-btn" type="button" data-clock-add="' + i + '">＋ Add to Bag</button>' +
          '</div>' +
        '</article>' +
      '</div>';
    }).join('');

    box.querySelectorAll('[data-clock-add]').forEach(function(btn){
      btn.addEventListener('click', function(){
        var i = +btn.getAttribute('data-clock-add');
        var w = clocks[i];
        var id = String(w.id);
        if (!clockCart[id]) clockCart[id] = { name: w.name, price: w.price, photo: w.photo, qty: 0 };
        clockCart[id].qty++;
        renderClockCart();
        updateHeaderBagBadge();
        btn.textContent = '✓ Added to Bag';
        setTimeout(function(){ btn.textContent = '＋ Add to Bag'; }, 900);
      });
    });

    renderClockCart();
  }

  var cartItems = document.getElementById('clockCartItems');
  if (cartItems) {
    cartItems.addEventListener('click', function(e){
      var b = e.target.closest('[data-cart-action]');
      if (!b) return;
      var id = b.getAttribute('data-cart-id');
      var action = b.getAttribute('data-cart-action');
      if (!clockCart[id]) return;
      if (action === 'plus') clockCart[id].qty++;
      else if (action === 'minus') clockCart[id].qty--;
      else delete clockCart[id];
      if (clockCart[id] && clockCart[id].qty <= 0) delete clockCart[id];
      renderClockCart();
      updateHeaderBagBadge();
    });
  }

  var clearCartBtn = document.getElementById('clearClockCart');
  if (clearCartBtn) {
    clearCartBtn.addEventListener('click', function(){
      clockCart = {};
      renderClockCart();
      updateHeaderBagBadge();
    });
  }

  /* Price List Rendering in Pakistani Rupees (PKR) */
  function renderPriceList() {
    var searchEl = document.getElementById('priceSearch');
    var catEl = document.getElementById('priceCategory');
    var genderEl = document.getElementById('priceGender');
    var search = (searchEl ? searchEl.value : '').trim().toLowerCase();
    var category = catEl ? catEl.value : 'All';
    var gender = genderEl ? genderEl.value : 'All';

    var list = data.watches.filter(function(w){
      return (category === 'All' || w.category === category) &&
             (gender === 'All' || w.gender === gender) &&
             (!search || (w.name + ' ' + w.category + ' ' + w.gender + ' ' + (w.desc || '')).toLowerCase().includes(search));
    });

    var pBody = $('#priceBody');
    if (pBody) {
      pBody.innerHTML = list.map(function(w){
        return '<tr>' +
          '<td>' +
            '<div class="price-watch-cell">' +
              '<div class="price-monogram" aria-hidden="true"><svg width="20" height="15" viewBox="0 0 64 48"><path d="M6 11l12 15 14-20 14 20 12-15-5 28H11L6 11z" fill="none" stroke="currentColor" stroke-width="4" stroke-linejoin="round"/><path d="M10 41h44" stroke="currentColor" stroke-width="4" stroke-linecap="round"/></svg><img src="' + stablePhotoFor(w) + '" alt="' + w.name + '" loading="lazy" onerror="this.style.display=\'none\'"></div>' +
              '<div><strong>' + w.name + '</strong><small>' + (w.desc || '') + '</small></div>' +
            '</div>' +
          '</td>' +
          '<td><span class="price-collection-pill">' + w.category + '</span></td>' +
          '<td><span class="price-audience">' + w.gender + '</span></td>' +
          '<td class="text-end"><strong class="price-amount">' + money(w.price) + '</strong></td>' +
          '<td class="text-center"><button class="price-view-btn" data-price-watch="' + w.id + '">VIEW ↗</button></td>' +
        '</tr>';
      }).join('');
    }

    var pCount = $('#priceCount');
    if (pCount) pCount.textContent = list.length + ' ' + (list.length === 1 ? 'timepiece' : 'timepieces');
    var pEmpty = $('#priceEmpty');
    if (pEmpty) pEmpty.hidden = list.length !== 0;
  }

  ['priceSearch', 'priceCategory', 'priceGender'].forEach(function(id){
    var el = document.getElementById(id);
    if (el) el.addEventListener(id === 'priceSearch' ? 'input' : 'change', renderPriceList);
  });

  var priceBody = document.getElementById('priceBody');
  if (priceBody) {
    priceBody.addEventListener('click', function(e){
      var b = e.target.closest('[data-price-watch]');
      if (b) openModal(+b.getAttribute('data-price-watch'));
    });
  }

  // Populate footer sitemap links
  var sitemapList = $('#sitemapList');
  if (sitemapList) {
    sitemapList.innerHTML = $$('.nav-link').map(function(a){
      return '<li><a href="#' + a.getAttribute('data-page') + '" data-page="' + a.getAttribute('data-page') + '">' + a.textContent + '</a></li>';
    }).join('') + '<li><a href="#" data-open-sitemap>Site Map</a></li>';
  }

  /* Contact Form: complete real-time, blur and submit validation */
  var contactForm = document.getElementById('contactForm');
  if (contactForm) {
    var cName = $('#cName'), cMail = $('#cMail'), cPhone = $('#cPhone'), cTopic = $('#cTopic'), cMsg = $('#cMsg');
    var cNameErr = $('#cNameErr'), cMailErr = $('#cMailErr'), cPhoneErr = $('#cPhoneErr'), cTopicErr = $('#cTopicErr'), cMsgErr = $('#cMsgErr');
    var sendNote = $('#sendNote');

    var rules = [
      { input: cName, error: cNameErr, test: function(v){ return v.length >= 3 && v.length <= 80 && /^[\p{L}][\p{L}\s.'’-]*$/u.test(v) && v.replace(/[^\p{L}]/gu, '').length >= 3; } },
      { input: cMail, error: cMailErr, test: function(v){ return v.length <= 254 && /^[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?(?:\.[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?)+$/i.test(v); } },
      { input: cPhone, error: cPhoneErr, test: function(v){ var digits = v.replace(/\D/g, ''); return /^[0-9+()\s.-]+$/.test(v) && digits.length >= 10 && digits.length <= 15; } },
      { input: cTopic, error: cTopicErr, test: function(v){ return v.length > 0; } },
      { input: cMsg, error: cMsgErr, test: function(v){ return v.length >= 10 && v.length <= 2000 && v.replace(/\s/g, '').length >= 10; } }
    ];

    function validateField(rule) {
      if (!rule || !rule.input) return true;
      var value = rule.input.value.trim();
      var valid = rule.test(value);
      rule.input.classList.toggle('is-invalid', !valid);
      rule.input.classList.toggle('is-valid', valid);
      rule.input.setAttribute('aria-invalid', valid ? 'false' : 'true');
      if (rule.error) rule.error.classList.toggle('show', !valid);
      return valid;
    }

    rules.forEach(function(rule){
      if (!rule.input) return;
      var eventName = rule.input.tagName === 'SELECT' ? 'change' : 'input';
      rule.input.addEventListener(eventName, function(){
        validateField(rule);
        if (sendNote) { sendNote.textContent = ''; sendNote.classList.remove('success', 'error'); }
      });
      rule.input.addEventListener('blur', function(){ validateField(rule); });
    });

    contactForm.addEventListener('submit', function(e){
      e.preventDefault();
      var valid = rules.map(validateField).every(Boolean);
      if (!valid) {
        if (sendNote) {
          sendNote.textContent = 'Please correct the highlighted fields before sending your inquiry.';
          sendNote.classList.remove('success');
          sendNote.classList.add('error');
        }
        var firstInvalid = contactForm.querySelector('.is-invalid');
        if (firstInvalid) firstInvalid.focus();
        return;
      }

      var name = cName.value.trim();
      var topic = cTopic.value;
      var ref = 'ALB-' + Math.floor(10000 + Math.random() * 90000);
      if (sendNote) {
        sendNote.textContent = '✓ Thank you, ' + name + '. Your ' + topic.toLowerCase() + ' (Ref #' + ref + ') has been registered with the Alberto Horology Concierge. Our senior specialist will contact you shortly.';
        sendNote.classList.remove('error');
        sendNote.classList.add('success');
      }
      contactForm.reset();
      rules.forEach(function(rule){
        if (!rule.input) return;
        rule.input.classList.remove('is-valid', 'is-invalid');
        rule.input.setAttribute('aria-invalid', 'false');
        if (rule.error) rule.error.classList.remove('show');
      });
    });
  }

  /* Sitemap Flowchart Modal Controls */
  var sitemapModal = document.getElementById('sitemapFlowchartModal');
  var closeFlowchartBtn = document.getElementById('closeSitemapFlowchartBtn');

  function openSitemapFlowchart() {
    if (sitemapModal) sitemapModal.classList.add('open');
  }

  function closeSitemapFlowchart() {
    if (sitemapModal) sitemapModal.classList.remove('open');
  }

  if (closeFlowchartBtn) closeFlowchartBtn.onclick = closeSitemapFlowchart;
  if (sitemapModal) {
    sitemapModal.onclick = function(e){
      if (e.target === sitemapModal) closeSitemapFlowchart();
    };
  }

  /* Visitor Counter (localStorage) */
  try {
    var v = (parseInt(localStorage.getItem('aw_visits'), 10) || 0) + 1;
    localStorage.setItem('aw_visits', v);
    var vEl = $('#visitCount');
    if (vEl) vEl.textContent = v;
  } catch (e) {
    var vEl2 = $('#visitCount');
    if (vEl2) vEl2.textContent = '1';
  }

  /* Continuous Scrolling Ticker: Date, Time & HTML5 Geolocation */
  var loc = 'Locating Pakistan Flagship...';
  function setFooterLocation(text) {
    var f = document.getElementById('footerLocation');
    if (f) f.textContent = text;
  }
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      function(p){
        loc = 'Lat ' + p.coords.latitude.toFixed(4) + ', Lng ' + p.coords.longitude.toFixed(4);
        setFooterLocation(loc + ' (location detected)');
      },
      function(){
        loc = 'Karachi Flagship & Aptech Shahrah-e-Faisal';
        setFooterLocation('Location blocked - Karachi Flagship');
      },
      { timeout: 7000 }
    );
  } else {
    loc = 'Karachi Flagship & Aptech Shahrah-e-Faisal';
    setFooterLocation('Location not supported - Karachi Flagship');
  }

  function tickText() {
    var d = new Date();
    var tEl = $('#tickerText');
    if (tEl) {
      tEl.textContent = 'ALBERTO WATCH COMPANY   |   ' +
        d.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) +
        '   |   ' + d.toLocaleTimeString() +
        '   |   ' + loc +
        '   |   All Prices in Pakistani Rupees (PKR)   |   Master Servicing · Valuation Appraisal · Authorized Luxury Retail';
    }
  }
  tickText();
  setInterval(tickText, 1000);

  /* Live Automatic SVG Watch on Home Page */
  var NS = 'http://www.w3.org/2000/svg', s = document.getElementById('liveWatch');
  if (s) {
    var el = function(n, a){
      var e = document.createElementNS(NS, n);
      for (var k in a) e.setAttribute(k, a[k]);
      s.appendChild(e);
      return e;
    };
    el('rect', { x: 150, y: 0, width: 100, height: 400, rx: 18, fill: '#161616' });
    el('circle', { cx: 200, cy: 200, r: 178, fill: '#c9a45c' });
    el('circle', { cx: 200, cy: 200, r: 162, fill: '#0a0a0a' });
    el('circle', { cx: 200, cy: 200, r: 150, fill: 'none', stroke: '#777', 'stroke-width': 1 });
    for (var i = 0; i < 60; i++) {
      var a = i * Math.PI / 30, b = i % 5 === 0, r1 = b ? 128 : 138;
      el('line', {
        x1: 200 + r1 * Math.sin(a),
        y1: 200 - r1 * Math.cos(a),
        x2: 200 + 147 * Math.sin(a),
        y2: 200 - 147 * Math.cos(a),
        stroke: b ? '#f0d48a' : '#fff',
        'stroke-width': b ? 4 : 1
      });
    }
    el('text', {
      x: 200, y: 140, 'text-anchor': 'middle', fill: '#f0d48a',
      'font-size': 24, 'font-family': 'Cormorant Garamond, serif', 'letter-spacing': 4
    }).textContent = 'ALBERTO';
    el('text', {
      x: 200, y: 275, 'text-anchor': 'middle', fill: '#fff',
      'font-size': 11, 'font-family': 'Inter, sans-serif', 'letter-spacing': 3
    }).textContent = 'AUTOMATIC 28,800 VPH';
    var hh = el('line', { x1: 200, y1: 200, x2: 200, y2: 130, stroke: '#f0d48a', 'stroke-width': 7, 'stroke-linecap': 'round' }),
        mh = el('line', { x1: 200, y1: 200, x2: 200, y2: 90, stroke: '#fff', 'stroke-width': 4.5, 'stroke-linecap': 'round' }),
        sh = el('line', { x1: 200, y1: 225, x2: 200, y2: 75, stroke: '#c9a45c', 'stroke-width': 2 });
    el('circle', { cx: 200, cy: 200, r: 8, fill: '#f0d48a' });
    (function tick(){
      var d = new Date(), sec = d.getSeconds() + d.getMilliseconds() / 1000, min = d.getMinutes() + sec / 60, hr = (d.getHours() % 12) + min / 60;
      hh.setAttribute('transform', 'rotate(' + (hr * 30) + ' 200 200)');
      mh.setAttribute('transform', 'rotate(' + (min * 6) + ' 200 200)');
      sh.setAttribute('transform', 'rotate(' + (sec * 6) + ' 200 200)');
      requestAnimationFrame(tick);
    })();
  }

  // Initial render calls
  renderGenderFilters();
  renderFilters();
  renderGrid();
  renderClocks();
  renderPriceList();
  renderGallery();
  updateHeaderBagBadge();
  initData();
  initTeam();

  // Typing a different #page in the address bar also changes the page
  window.addEventListener('hashchange', function(){ show((location.hash || '#home').slice(1)); });

  // Show requested page or default to home
  show((location.hash || '#home').slice(1));
})();
