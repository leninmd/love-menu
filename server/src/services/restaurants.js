"use strict";

const { nanoid } = require("nanoid");
const { now } = require("../utils");

async function ensureSampleRestaurant(db, ownerId) {
  const existing = await db
    .all("SELECT id FROM restaurants WHERE owner_id = ? LIMIT 1", [ownerId]);
  if (existing.length > 0) {
    return existing[0].id;
  }

  const restaurantId = nanoid();
  await db.run(
    "INSERT INTO restaurants (id, owner_id, name, avatar_url, intro, is_deleted, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [restaurantId, ownerId, "示例餐厅", null, null, 0, now()]
  );
  return restaurantId;
}

async function ensureRestaurantOwner(db, restaurantId, ownerId) {
  const record = await db.get(
    "SELECT id, owner_id, is_deleted FROM restaurants WHERE id = ?",
    [restaurantId]
  );
  if (!record) {
    const error = new Error("restaurant_missing");
    error.status = 404;
    throw error;
  }
  if (record.owner_id !== ownerId) {
    const error = new Error("forbidden");
    error.status = 403;
    throw error;
  }
  return record;
}

async function createRestaurant(db, ownerId, name, intro) {
  const id = nanoid();
  await db.run(
    "INSERT INTO restaurants (id, owner_id, name, avatar_url, intro, is_deleted, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [id, ownerId, name, null, intro || null, 0, now()]
  );
  return { id, name, intro };
}

async function listMyRestaurants(db, ownerId) {
  return db.all(
    "SELECT id, name, avatar_url, intro, is_deleted, created_at FROM restaurants WHERE owner_id = ? ORDER BY created_at DESC",
    [ownerId]
  );
}

async function updateRestaurant(db, restaurantId, name, intro, avatarUrl) {
  await db.run(
    "UPDATE restaurants SET name = ?, intro = ?, avatar_url = ? WHERE id = ?",
    [name, intro || null, avatarUrl || null, restaurantId]
  );
}

async function softDeleteRestaurant(db, restaurantId) {
  await db.run(
    "UPDATE restaurants SET is_deleted = 1 WHERE id = ?",
    [restaurantId]
  );
}

module.exports = {
  ensureSampleRestaurant,
  ensureRestaurantOwner,
  createRestaurant,
  listMyRestaurants,
  updateRestaurant,
  softDeleteRestaurant
};
