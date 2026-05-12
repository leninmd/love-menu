"use strict";

const { nanoid } = require("nanoid");
const { now } = require("../utils");

async function ensureSampleMenu(db, restaurantId) {
  const dishes = await db.all(
    "SELECT id FROM dishes WHERE restaurant_id = ? LIMIT 1",
    [restaurantId]
  );
  if (dishes.length > 0) {
    return;
  }

  const categoryId = nanoid();
  await db.run(
    "INSERT INTO categories (id, restaurant_id, name, sort_order, created_at) VALUES (?, ?, ?, ?, ?)",
    [categoryId, restaurantId, "主厨推荐", 1, now()]
  );

  const sample = [
    { name: "番茄牛肉盖饭", price: 2900 },
    { name: "香煎三文鱼", price: 4800 },
    { name: "青柠气泡水", price: 1200 }
  ];

  for (const item of sample) {
    await db.run(
      "INSERT INTO dishes (id, restaurant_id, category_id, name, image_url, description, price, sources, is_deleted, order_count, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        nanoid(),
        restaurantId,
        categoryId,
        item.name,
        null,
        null,
        item.price,
        null,
        0,
        0,
        now()
      ]
    );
  }
}

async function getMenu(db, restaurantId, search) {
  const categories = await db.all(
    "SELECT id, name, sort_order FROM categories WHERE restaurant_id = ? ORDER BY sort_order ASC",
    [restaurantId]
  );

  const searchClause = search ? "%" + search + "%" : null;
  const dishes = await db.all(
    "SELECT id, category_id, name, description, price, image_url, sources FROM dishes WHERE restaurant_id = ? AND is_deleted = 0" +
      (searchClause ? " AND name LIKE ?" : "") +
      " ORDER BY created_at DESC",
    searchClause ? [restaurantId, searchClause] : [restaurantId]
  );

  return { categories, dishes };
}

module.exports = { ensureSampleMenu, getMenu };
