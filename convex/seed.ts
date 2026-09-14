import { internalMutation } from "./_generated/server";
import { slugify } from "./lib/format";
import { nextSku } from "./lib/ids";

/**
 * Fills an empty deployment with enough real inventory to exercise every screen.
 *   npx convex run seed:run
 * Safe to re-run: it does nothing if products already exist.
 */

const CATEGORIES = [
  { name: "Nigerian & African Writing", kind: "book" as const, sortOrder: 10 },
  { name: "Fiction", kind: "book" as const, sortOrder: 20 },
  { name: "Business & Finance", kind: "book" as const, sortOrder: 30 },
  { name: "Faith & Devotional", kind: "book" as const, sortOrder: 40 },
  { name: "Children & Young Readers", kind: "book" as const, sortOrder: 50 },
  { name: "Academic & Exam Prep", kind: "book" as const, sortOrder: 60 },
  { name: "Stationery", kind: "gift" as const, sortOrder: 70 },
  { name: "Gift Sets & Hampers", kind: "gift" as const, sortOrder: 80 },
];

type SeedProduct = {
  title: string;
  category: string;
  kind: "book" | "gift";
  author?: string;
  publisher?: string;
  isbn?: string;
  format?: "paperback" | "hardcover" | "boxset";
  pages?: number;
  publishedYear?: number;
  price: number; // naira
  compareAtPrice?: number;
  costPrice?: number;
  stock: number;
  description: string;
  tags: string[];
  featured?: boolean;
};

const PRODUCTS: SeedProduct[] = [
  {
    title: "Things Fall Apart",
    author: "Chinua Achebe",
    category: "Nigerian & African Writing",
    kind: "book",
    publisher: "Heinemann",
    isbn: "9780435905255",
    format: "paperback",
    pages: 209,
    publishedYear: 1958,
    price: 8500,
    costPrice: 5200,
    stock: 42,
    featured: true,
    description:
      "Okonkwo is a wrestler and a man of standing in Umuofia until the arrival of missionaries unsettles everything he has built his life on. The novel that opened African literature to the world, and still the first book most Nigerian readers are handed.",
    tags: ["classic", "nigerian", "literary fiction", "school reading"],
  },
  {
    title: "Half of a Yellow Sun",
    author: "Chimamanda Ngozi Adichie",
    category: "Nigerian & African Writing",
    kind: "book",
    publisher: "Farafina",
    isbn: "9789785205640",
    format: "paperback",
    pages: 433,
    publishedYear: 2006,
    price: 12500,
    compareAtPrice: 15000,
    costPrice: 8000,
    stock: 27,
    featured: true,
    description:
      "Biafra through the eyes of a houseboy, a professor's lover and an English writer. Adichie's second novel won the Orange Prize and remains the book customers ask for by plot rather than title.",
    tags: ["biafra", "historical fiction", "award winner"],
  },
  {
    title: "Purple Hibiscus",
    author: "Chimamanda Ngozi Adichie",
    category: "Nigerian & African Writing",
    kind: "book",
    publisher: "Farafina",
    isbn: "9789785205633",
    format: "paperback",
    pages: 307,
    publishedYear: 2003,
    price: 9500,
    costPrice: 6100,
    stock: 31,
    description:
      "Kambili's father is a pillar of the church and a tyrant at home. A quiet, precise novel about a family coming apart, and a fixture on secondary school reading lists across the country.",
    tags: ["coming of age", "school reading", "nigerian"],
  },
  {
    title: "The Secret Lives of Baba Segi's Wives",
    author: "Lola Shoneyin",
    category: "Nigerian & African Writing",
    kind: "book",
    publisher: "Cassava Republic",
    isbn: "9781911115656",
    format: "paperback",
    pages: 245,
    publishedYear: 2010,
    price: 10000,
    costPrice: 6400,
    stock: 18,
    description:
      "Baba Segi has four wives, seven children and a problem he would rather not name. Sharp, funny and much less comfortable than its first fifty pages suggest.",
    tags: ["satire", "polygamy", "nigerian"],
  },
  {
    title: "Stay With Me",
    author: "Ayobami Adebayo",
    category: "Nigerian & African Writing",
    kind: "book",
    publisher: "Ouida Books",
    isbn: "9789789495511",
    format: "paperback",
    pages: 298,
    publishedYear: 2017,
    price: 11000,
    costPrice: 7000,
    stock: 22,
    featured: true,
    description:
      "Yejide wants a child. Her husband's family wants an heir, and they are prepared to arrange one. Set in Ilesa through the turbulence of the eighties.",
    tags: ["marriage", "literary fiction", "nigerian"],
  },
  {
    title: "Americanah",
    author: "Chimamanda Ngozi Adichie",
    category: "Fiction",
    kind: "book",
    publisher: "Farafina",
    isbn: "9789785205671",
    format: "paperback",
    pages: 477,
    publishedYear: 2013,
    price: 13000,
    costPrice: 8300,
    stock: 24,
    description:
      "Ifemelu leaves Lagos for America and starts a blog about race she could never have written at home. Obinze ends up in London instead. Fifteen years later they are both back in Lagos.",
    tags: ["diaspora", "romance", "race"],
  },
  {
    title: "My Sister, the Serial Killer",
    author: "Oyinkan Braithwaite",
    category: "Fiction",
    kind: "book",
    publisher: "Narrative Landscape",
    isbn: "9789789750146",
    format: "paperback",
    pages: 226,
    publishedYear: 2018,
    price: 9000,
    costPrice: 5700,
    stock: 35,
    description:
      "Korede is a nurse. Her beautiful younger sister keeps killing her boyfriends, and Korede keeps bringing the bleach. Short chapters, very dark, hard to put down.",
    tags: ["thriller", "lagos", "dark comedy"],
  },
  {
    title: "Atomic Habits",
    author: "James Clear",
    category: "Business & Finance",
    kind: "book",
    publisher: "Penguin Random House",
    isbn: "9781847941831",
    format: "paperback",
    pages: 320,
    publishedYear: 2018,
    price: 14500,
    compareAtPrice: 18000,
    costPrice: 9200,
    stock: 56,
    featured: true,
    description:
      "Small changes, repeated, beat big intentions. The most requested non-fiction title on our shelves and the one most often bought two at a time.",
    tags: ["habits", "productivity", "bestseller"],
  },
  {
    title: "Rich Dad Poor Dad",
    author: "Robert T. Kiyosaki",
    category: "Business & Finance",
    kind: "book",
    publisher: "Plata Publishing",
    isbn: "9781612680194",
    format: "paperback",
    pages: 336,
    publishedYear: 1997,
    price: 11000,
    costPrice: 6800,
    stock: 48,
    description:
      "The argument that your house is not an asset, told through two fathers with opposite instincts about money.",
    tags: ["money", "investing", "personal finance"],
  },
  {
    title: "The Psychology of Money",
    author: "Morgan Housel",
    category: "Business & Finance",
    kind: "book",
    publisher: "Harriman House",
    isbn: "9780857197689",
    format: "paperback",
    pages: 252,
    publishedYear: 2020,
    price: 13500,
    costPrice: 8600,
    stock: 29,
    description:
      "Nineteen short chapters on why sensible people do strange things with money. Less about spreadsheets than about temperament.",
    tags: ["money", "behaviour", "investing"],
  },
  {
    title: "Zero to One",
    author: "Peter Thiel",
    category: "Business & Finance",
    kind: "book",
    publisher: "Virgin Books",
    isbn: "9780753555194",
    format: "paperback",
    pages: 224,
    publishedYear: 2014,
    price: 12000,
    costPrice: 7500,
    stock: 14,
    description:
      "Notes from a Stanford course on building companies that make something new rather than copying what works.",
    tags: ["startups", "business"],
  },
  {
    title: "Open Heavens 2026",
    author: "Pastor E. A. Adeboye",
    category: "Faith & Devotional",
    kind: "book",
    publisher: "RCCG",
    format: "paperback",
    pages: 380,
    publishedYear: 2025,
    price: 3500,
    costPrice: 2000,
    stock: 120,
    description:
      "The daily devotional, in the standard edition. Bulk orders for churches and fellowships are welcome — call the shop for pricing above twenty copies.",
    tags: ["devotional", "daily", "bulk available"],
  },
  {
    title: "The Purpose Driven Life",
    author: "Rick Warren",
    category: "Faith & Devotional",
    kind: "book",
    publisher: "Zondervan",
    isbn: "9780310337508",
    format: "paperback",
    pages: 334,
    publishedYear: 2002,
    price: 9500,
    costPrice: 6000,
    stock: 26,
    description:
      "Forty short chapters, one for each day, on the question of what you are here for.",
    tags: ["christian living", "devotional"],
  },
  {
    title: "NIV Study Bible, Hardcover",
    author: "Zondervan",
    category: "Faith & Devotional",
    kind: "book",
    publisher: "Zondervan",
    isbn: "9780310448945",
    format: "hardcover",
    pages: 2400,
    price: 42000,
    costPrice: 28000,
    stock: 9,
    description:
      "Full study notes, maps and concordance, sewn binding. The edition to buy if it is going to be carried every Sunday for ten years.",
    tags: ["bible", "study", "gift"],
  },
  {
    title: "Chike and the River",
    author: "Chinua Achebe",
    category: "Children & Young Readers",
    kind: "book",
    publisher: "Anchor Books",
    isbn: "9780307473868",
    format: "paperback",
    pages: 96,
    publishedYear: 1966,
    price: 5500,
    costPrice: 3300,
    stock: 38,
    description:
      "Chike wants one thing: to cross the Niger by ferry. Achebe wrote it for his own children, and it still reads aloud beautifully at ages seven to eleven.",
    tags: ["children", "ages 7-11", "read aloud"],
  },
  {
    title: "The Gods Are Not to Blame",
    author: "Ola Rotimi",
    category: "Academic & Exam Prep",
    kind: "book",
    publisher: "University Press PLC",
    isbn: "9789781540042",
    format: "paperback",
    pages: 72,
    publishedYear: 1971,
    price: 4500,
    costPrice: 2600,
    stock: 64,
    description:
      "Rotimi's Yoruba retelling of Oedipus, set in Kutuje. A WAEC and NECO literature set text — we keep deep stock through exam season.",
    tags: ["drama", "waec", "neco", "set text"],
  },
  {
    title: "New School Physics for Senior Secondary Schools",
    author: "M. W. Anyakoha",
    category: "Academic & Exam Prep",
    kind: "book",
    publisher: "Africana First Publishers",
    format: "paperback",
    pages: 648,
    price: 8500,
    costPrice: 5400,
    stock: 3,
    description:
      "The standard SS1 to SS3 physics text, covering the full WAEC and JAMB syllabus with worked examples at the end of every chapter.",
    tags: ["physics", "jamb", "waec", "secondary school"],
  },
  {
    title: "Leather Hardcover Journal, A5",
    category: "Stationery",
    kind: "gift",
    price: 12500,
    compareAtPrice: 15000,
    costPrice: 7000,
    stock: 40,
    featured: true,
    description:
      "Two hundred pages of 100gsm cream paper, sewn so it lies flat, wrapped in full-grain leather with an elastic closure. Fountain pen ink does not bleed through.",
    tags: ["journal", "leather", "gift", "a5"],
  },
  {
    title: "Parker Jotter Ballpoint Pen",
    category: "Stationery",
    kind: "gift",
    price: 18000,
    costPrice: 11500,
    stock: 15,
    description:
      "Stainless steel barrel, medium blue refill, presented in the Parker gift box. The default choice when a signature has to look like it means something.",
    tags: ["pen", "gift", "executive"],
  },
  {
    title: "Reading Light, Rechargeable Clip-On",
    category: "Stationery",
    kind: "gift",
    price: 7500,
    costPrice: 4200,
    stock: 0,
    description:
      "Three brightness levels, warm and cool settings, about thirty hours on a charge. Made for reading in bed without lighting the whole room, and for when NEPA has other plans.",
    tags: ["reading light", "usb", "gift"],
  },
  {
    title: "The Reader's Hamper",
    category: "Gift Sets & Hampers",
    kind: "gift",
    price: 45000,
    compareAtPrice: 52000,
    costPrice: 29000,
    stock: 12,
    featured: true,
    description:
      "One bestselling paperback of your choice, an A5 leather journal, a Parker Jotter, a tin of loose-leaf tea and a bookmark, packed in a lined box and wrapped. Tell us the occasion at checkout and we will write the card.",
    tags: ["hamper", "gift set", "wrapped", "corporate"],
  },
  {
    title: "Congratulations Gift Box",
    category: "Gift Sets & Hampers",
    kind: "gift",
    price: 28000,
    costPrice: 17000,
    stock: 20,
    description:
      "A business or personal-growth title, a hardcover notebook and a pen, boxed and ribboned. Our most-ordered box for graduations, promotions and call-to-bar.",
    tags: ["gift set", "graduation", "corporate"],
  },
];

export const run = internalMutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("products").take(1);
    if (existing.length > 0) {
      return "Products already exist — seed skipped. Clear the tables first if you want fresh data.";
    }

    const categoryIds = new Map<string, any>();
    for (const category of CATEGORIES) {
      const id = await ctx.db.insert("categories", {
        name: category.name,
        slug: slugify(category.name),
        kind: category.kind,
        sortOrder: category.sortOrder,
        active: true,
      });
      categoryIds.set(category.name, id);
    }

    const now = Date.now();
    let index = 0;

    for (const product of PRODUCTS) {
      const categoryId = categoryIds.get(product.category);
      if (!categoryId) continue;

      await ctx.db.insert("products", {
        title: product.title,
        slug: slugify(product.title),
        kind: product.kind,
        sku: await nextSku(ctx, product.kind),
        description: product.description,
        categoryId,
        author: product.author,
        publisher: product.publisher,
        isbn: product.isbn,
        format: product.format,
        pages: product.pages,
        language: product.kind === "book" ? "English" : undefined,
        publishedYear: product.publishedYear,
        price: product.price * 100,
        compareAtPrice: product.compareAtPrice ? product.compareAtPrice * 100 : undefined,
        costPrice: product.costPrice ? product.costPrice * 100 : undefined,
        stock: product.stock,
        lowStockThreshold: product.kind === "book" ? 5 : 3,
        imageStorageIds: [],
        imageUrls: [],
        tags: product.tags,
        published: true,
        featured: product.featured ?? false,
        archived: false,
        unitsSold: 0,
        // Stagger creation times so "newest" ordering looks natural.
        createdAt: now - index * 36e5,
        updatedAt: now - index * 36e5,
      });
      index++;
    }

    const settings = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", "store"))
      .unique();

    if (!settings) {
      await ctx.db.insert("settings", {
        key: "store",
        storeName: "Aperio Vici Bookshops & Gifts",
        tagline: "Books and gifts, delivered anywhere in Nigeria.",
        phone: "0803 000 0000",
        whatsapp: "2348030000000",
        email: "orders@aperiovici.ng",
        address: "12 Ahmadu Bello Way, Garki II, Abuja, FCT",
        pickupInstructions:
          "Bring your order number. We are open Monday to Saturday, 9am to 6pm. Orders are held for seven days after payment is confirmed.",
        bankAccounts: [
          {
            bankName: "Guaranty Trust Bank",
            accountName: "Aperio Vici Ventures Ltd",
            accountNumber: "0123456789",
            active: true,
          },
          {
            bankName: "Zenith Bank",
            accountName: "Aperio Vici Ventures Ltd",
            accountNumber: "1098765432",
            active: true,
          },
        ],
        deliveryFees: [
          { state: "FCT - Abuja", fee: 200000 },
          { state: "Lagos", fee: 350000 },
          { state: "Rivers", fee: 400000 },
          { state: "Kano", fee: 400000 },
          { state: "Oyo", fee: 380000 },
          { state: "Enugu", fee: 380000 },
          { state: "Kaduna", fee: 300000 },
        ],
        defaultDeliveryFee: 450000,
        freeDeliveryThreshold: 5000000,
        paymentWindowHours: 48,
      });
    }

    return `Seeded ${CATEGORIES.length} categories and ${PRODUCTS.length} products.`;
  },
});
