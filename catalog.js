// Existing website catalog retained for visual review; not confirmed for Taif.
(function (root, factory) {
  const catalog = factory();
  if (typeof module === 'object' && module.exports) module.exports = catalog;
  else root.RATIO_CATALOG = catalog;
})(typeof window === 'undefined' ? globalThis : window, function () {
  const products = [
  {
    "id": "bean-1",
    "preview": true,
    "image": "beans",
    "category": "beans",
    "name": {
      "ar": "إثيوبيا يرغاتشيف - 250g",
      "en": "Ethiopia Yirgacheffe - 250g"
    },
    "desc": {
      "ar": "محصول استثنائي معالج بالتجفيف الطبيعي. قوام حريري وإيحاءات عطرية فاخرة.",
      "en": "Specialty lot naturally processed. Silky body with exquisite floral aroma."
    },
    "origin": {
      "ar": "إثيوبيا • ارتفاع 2100م",
      "en": "Ethiopia • 2100m"
    },
    "process": {
      "ar": "مجففة طبيعية",
      "en": "Natural"
    },
    "notes": {
      "ar": [
        "توت بري",
        "خوخ",
        "ياسمين"
      ],
      "en": [
        "Blackberry",
        "Peach",
        "Jasmine"
      ]
    },
    "price": 64,
    "isBean": true
  },
  {
    "id": "bean-2",
    "category": "beans",
    "name": {
      "ar": "كولومبيا غيشا سييرا - 250g",
      "en": "Colombia Geisha Sierra - 250g"
    },
    "desc": {
      "ar": "سلالة الغيشا النادرة معالجة بالتخمير اللاهوائي 72 ساعة. نكهات معقدة وفاتنة.",
      "en": "Rare Geisha varietal anaerobic fermented 72h. Complex notes of fruits and florals."
    },
    "origin": {
      "ar": "كولومبيا • ارتفاع 1950م",
      "en": "Colombia • 1950m"
    },
    "process": {
      "ar": "تخمير لاهوائي",
      "en": "Anaerobic Ferment"
    },
    "notes": {
      "ar": [
        "مانجو",
        "لافندر",
        "عسل الزهور"
      ],
      "en": [
        "Mango",
        "Lavender",
        "Blossom Honey"
      ]
    },
    "price": 88,
    "isBean": true
  },
  {
    "id": "bean-3",
    "category": "beans",
    "name": {
      "ar": "برازيلي موجيانا - 250g",
      "en": "Brazil Mogiana - 250g"
    },
    "desc": {
      "ar": "خيار الاسبريسو المثالي وقوام غني ينسجم مع الحليب ونكهة مكسرات محمصة.",
      "en": "Perfect espresso roast with rich crema, roasted hazelnuts and dark cacao."
    },
    "origin": {
      "ar": "البرازيل • ارتفاع 1200م",
      "en": "Brazil • 1200m"
    },
    "process": {
      "ar": "مجففة",
      "en": "Natural Dry"
    },
    "notes": {
      "ar": [
        "شوكولاتة داكنة",
        "بندق",
        "كراميل"
      ],
      "en": [
        "Dark Chocolate",
        "Hazelnut",
        "Toffee"
      ]
    },
    "price": 54,
    "isBean": true
  },
  {
    "id": "bean-4",
    "category": "beans",
    "name": {
      "ar": "سلفادور سانتا آنا - 250g",
      "en": "El Salvador Santa Ana - 250g"
    },
    "desc": {
      "ar": "معالجة عسلية مميزة تمنح حلاوة طبيعية متوازنة وحمضية تفاح ناعمة.",
      "en": "Yellow honey process offering bright apple acidity and honey sweetness."
    },
    "origin": {
      "ar": "السلفادور • ارتفاع 1650م",
      "en": "El Salvador • 1650m"
    },
    "process": {
      "ar": "معالجة عسلية",
      "en": "Honey Process"
    },
    "notes": {
      "ar": [
        "برتقال مكرمل",
        "تفاح أحمر",
        "فانيلا"
      ],
      "en": [
        "Candied Orange",
        "Red Apple",
        "Vanilla"
      ]
    },
    "price": 58,
    "isBean": true
  },
  {
    "id": "drip-1",
    "category": "drip",
    "name": {
      "ar": "كولومبيا غيشا V60 مقطرة",
      "en": "Colombia Geisha V60"
    },
    "desc": {
      "ar": "تقطير يدوي فائق الدقة بنسبة استخلاص 1:16 تبرز أعمق النكهات الزهرية.",
      "en": "Artisanal manual pour-over extracted at exact 1:16 ratio."
    },
    "origin": {
      "ar": "محصول كولومبي فاخر",
      "en": "Single Origin Colombia"
    },
    "notes": {
      "ar": [
        "فاكهي زاهي",
        "حمضية متزنة"
      ],
      "en": [
        "Bright Fruity",
        "Balanced Acidity"
      ]
    },
    "price": 28,
    "isBean": false
  },
  {
    "id": "drip-2",
    "preview": true,
    "image": "v60",
    "category": "drip",
    "name": {
      "ar": "إثيوبيا يرغاتشيف V60",
      "en": "Ethiopia Yirgacheffe V60"
    },
    "desc": {
      "ar": "تقطير بارد أو ساخن يتميز بإيحاءات الخوخ والياسمين العطرة.",
      "en": "Hot or iced manual pour-over with jasmine fragrance and stone fruit notes."
    },
    "origin": {
      "ar": "إثيوبي مجفف",
      "en": "Natural Ethiopia"
    },
    "notes": {
      "ar": [
        "خوخ",
        "ياسمين",
        "توت"
      ],
      "en": [
        "Peach",
        "Jasmine",
        "Berries"
      ]
    },
    "price": 22,
    "isBean": false
  },
  {
    "id": "drip-3",
    "category": "drip",
    "name": {
      "ar": "قهوة اليوم المقطرة (كوب اليوم)",
      "en": "Drip Coffee of the Day"
    },
    "desc": {
      "ar": "قهوة اليوم المحضرة طازجة كل ساعة من أفضل محاصيلنا الموسمية.",
      "en": "Freshly batch-brewed seasonal roast with vibrant notes."
    },
    "origin": {
      "ar": "محصول موسمي متجدد",
      "en": "Seasonal Selection"
    },
    "notes": {
      "ar": [
        "قوام معتدل",
        "نقاء عالي"
      ],
      "en": [
        "Medium Body",
        "Clean Finish"
      ]
    },
    "price": 16,
    "isBean": false
  },
  {
    "id": "esp-1",
    "category": "espresso",
    "name": {
      "ar": "فلات وايت ريشيو الذهبي",
      "en": "Ratio Golden Flat White"
    },
    "desc": {
      "ar": "دبل ريستريتو مركز مع حليب مبخر ميكروفوم حريري ورسمة ريشيو.",
      "en": "Double ristretto with silky textured microfoam and custom latte art."
    },
    "origin": {
      "ar": "مزيج ريشيو الخاص",
      "en": "Ratio Blend"
    },
    "notes": {
      "ar": [
        "قوام كريمي",
        "شوكولاتة بالحليب"
      ],
      "en": [
        "Creamy",
        "Milk Chocolate"
      ]
    },
    "price": 18,
    "isBean": false
  },
  {
    "id": "esp-2",
    "category": "espresso",
    "name": {
      "ar": "سبانش لاتيه ريشيو المميز",
      "en": "Ratio Signature Spanish Latte"
    },
    "desc": {
      "ar": "توازن ساحر بين الاسبريسو المركز ولمسة الحليب المكرمل المكثف.",
      "en": "Signature blend of bold espresso and velvety caramelized milk."
    },
    "origin": {
      "ar": "حار أو بارد",
      "en": "Hot or Iced"
    },
    "notes": {
      "ar": [
        "حلاوة موزونة",
        "كراميل"
      ],
      "en": [
        "Balanced Sweet",
        "Caramel"
      ]
    },
    "price": 24,
    "isBean": false
  },
  {
    "id": "esp-3",
    "preview": true,
    "image": "cortado",
    "category": "espresso",
    "name": {
      "ar": "كورتادو ريشيو (Cortado)",
      "en": "Ratio Cortado"
    },
    "desc": {
      "ar": "نسبة 1:1 متعادلة بين الاسبريسو النقي والحليب المبخر الخفيف.",
      "en": "Equal 1:1 ratio between double espresso and velvety textured milk."
    },
    "origin": {
      "ar": "ريشيو سبيشالتي",
      "en": "Specialty Roast"
    },
    "notes": {
      "ar": [
        "تركيز عالي",
        "طعم غني"
      ],
      "en": [
        "Bold Kick",
        "Rich Flavor"
      ]
    },
    "price": 16,
    "isBean": false
  },
  {
    "id": "cold-1",
    "category": "cold",
    "name": {
      "ar": "آيس كاسكارا كولد برو",
      "en": "Iced Cascara Cold Brew"
    },
    "desc": {
      "ar": "استخلاص بطيء لقشور كرز القهوة 18 ساعة مع لمسة فواكه منعشة ومكعب ثلج نقي.",
      "en": "18h slow steep of organic coffee cherry husks with crystal ice block."
    },
    "origin": {
      "ar": "كاسكارا طبيعية",
      "en": "Pure Cascara"
    },
    "notes": {
      "ar": [
        "كرز",
        "توت العليق",
        "ورد مجفف"
      ],
      "en": [
        "Cherry",
        "Raspberry",
        "Rose"
      ]
    },
    "price": 26,
    "isBean": false
  },
  {
    "id": "cold-2",
    "preview": true,
    "image": "matcha",
    "category": "cold",
    "name": {
      "ar": "آيس ماتشا لاتيه احترافي",
      "en": "Ceremonial Iced Matcha Latte"
    },
    "desc": {
      "ar": "بودرة ماتشا يابانية عضوية من أوجي اليابان مع حليب الشوفان البارد.",
      "en": "Ceremonial Japanese Uji Matcha whisked with creamy chilled oat milk."
    },
    "origin": {
      "ar": "أوجي - اليابان",
      "en": "Uji, Japan"
    },
    "notes": {
      "ar": [
        "أومامي ناعم",
        "حلاوة طبيعية"
      ],
      "en": [
        "Smooth Umami",
        "Natural Sweetness"
      ]
    },
    "price": 25,
    "isBean": false
  },
  {
    "id": "cold-3",
    "category": "cold",
    "name": {
      "ar": "آيسد في 60 كولومبي بارد",
      "en": "Iced V60 Colombian Pour-Over"
    },
    "desc": {
      "ar": "تقطير مباشر على مكعبات الثلج يحافظ على الزيوت العطرية والانتعاش الفوري.",
      "en": "Flash-chilled pour over directly over crystal ice cubes."
    },
    "origin": {
      "ar": "كولومبيا",
      "en": "Colombia"
    },
    "notes": {
      "ar": [
        "خوخ",
        "فواكه حمراء"
      ],
      "en": [
        "Stone Fruits",
        "Red Berries"
      ]
    },
    "price": 24,
    "isBean": false
  },
  {
    "id": "sweet-1",
    "preview": true,
    "image": "cheesecake",
    "category": "sweets",
    "name": {
      "ar": "سان سيباستيان ريشيو الفاخرة",
      "en": "Ratio San Sebastian Cheesecake"
    },
    "desc": {
      "ar": "قوام ذائب كريمي وطبقة علوية مكرملة، تقدم مع شلال الشوكولاتة البلجيكية الدافئة.",
      "en": "Molten creamy center with caramelized crust and warm Belgian chocolate ganache."
    },
    "origin": {
      "ar": "تحضير يومي طازج",
      "en": "Fresh Daily"
    },
    "notes": {
      "ar": [
        "شوكولاتة بلجيكية",
        "جبنة كريمية"
      ],
      "en": [
        "Belgian Ganache",
        "Cream Cheese"
      ]
    },
    "price": 28,
    "isBean": false
  },
  {
    "id": "sweet-2",
    "category": "sweets",
    "name": {
      "ar": "تارت البيكان الملكي بالكراميل",
      "en": "Royal Pecan Tart with Salted Caramel"
    },
    "desc": {
      "ar": "عجينة تارت هشة محشوة بجوز البيكان المحمص وصوص الكراميل المملح الذهبي.",
      "en": "Buttery crisp crust packed with roasted pecans and sea salted caramel."
    },
    "origin": {
      "ar": "مخبوزات ريشيو",
      "en": "Artisanal Bakery"
    },
    "notes": {
      "ar": [
        "كراميل مملح",
        "بيكان مقرمش"
      ],
      "en": [
        "Salted Caramel",
        "Crunchy Pecans"
      ]
    },
    "price": 26,
    "isBean": false
  },
  {
    "id": "sweet-3",
    "category": "sweets",
    "name": {
      "ar": "فرينش توست البريوش المكرمل",
      "en": "Caramelized Brioche French Toast"
    },
    "desc": {
      "ar": "خبز بريوش طري مشبع بالزبدة والكراميل، يقدم مع آيسكريم الفانيلا والتوت.",
      "en": "Golden fluffy brioche toast with maple butter and Madagascar vanilla scoop."
    },
    "origin": {
      "ar": "يقدم دافئاً",
      "en": "Served Warm"
    },
    "notes": {
      "ar": [
        "فانيلا مدغشقر",
        "توت مشكل"
      ],
      "en": [
        "Vanilla",
        "Mixed Berries"
      ]
    },
    "price": 32,
    "isBean": false
  },
  {
    "id": "box-1",
    "category": "boxes",
    "name": {
      "ar": "بوكس الجمعات الفاخر (1.5 لتر)",
      "en": "Ratio Gathering Box (1.5L)"
    },
    "desc": {
      "ar": "ترمس حفظ حرارة فاخر يكفي 8-10 أشخاص مع أكواب ريشيو وشوكولاتة ضيافة.",
      "en": "Luxury thermal dispenser serving 8-10 cups with branded paper cups."
    },
    "origin": {
      "ar": "قهوة مقطرة أو حليب",
      "en": "Drip or Latte"
    },
    "notes": {
      "ar": [
        "يكفي 10 أكواب",
        "يحفظ الحرارة 6 ساعات"
      ],
      "en": [
        "Serves 10",
        "Keeps Hot 6h"
      ]
    },
    "price": 120,
    "isBean": false
  },
  {
    "id": "box-2",
    "preview": true,
    "image": "drip-bags",
    "category": "boxes",
    "name": {
      "ar": "بوكس أظرف التقطير الذاتية (10 أظرف)",
      "en": "Drip Bag Explorer Box (10 pcs)"
    },
    "desc": {
      "ar": "أظرف تقطير فردية جاهزة ومطحونة بالنيتروجين للحفاظ على النكهة أثناء السفر والمكتب.",
      "en": "10 single-serve nitrogen flushed drip bags for instant specialty brew anywhere."
    },
    "origin": {
      "ar": "5 محاصيل متنوعة",
      "en": "5 Varietals"
    },
    "notes": {
      "ar": [
        "سريع التحضير",
        "مناسب للسفر"
      ],
      "en": [
        "Instant Brew",
        "Travel Friendly"
      ]
    },
    "price": 55,
    "isBean": false
  }
  ];
  // Prices used by both calculations and customization labels.
  const optionPrices = {
    size: { large: 3 },
    milk: { oat: 4, almond: 4 },
    extraShot: { true: 4 }
  };
  return { products, optionPrices };
});
