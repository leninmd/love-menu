"use strict";

const { nanoid } = require("nanoid");
const { now, isPositiveInteger } = require("../utils");

async function ensureCart(db, userId, restaurantId) {
  const existing = await db.all(
    "SELECT id FROM carts WHERE user_id = ? AND restaurant_id = ? LIMIT 1",
    [userId, restaurantId]
  );
  if (existing.length > 0) {
    return existing[0].id;
  }

  const cartId = nanoid();
  await db.run(
    "INSERT INTO carts (id, user_id, restaurant_id, created_at) VALUES (?, ?, ?, ?)",
    [cartId, userId, restaurantId, now()]
  );
  return cartId;
}

async function listCartItems(db, cartId) {
  return db.all(
    "SELECT cart_items.id, cart_items.dish_id, cart_items.quantity, dishes.name, dishes.price, dishes.image_url, dishes.sources FROM cart_items JOIN dishes ON cart_items.dish_id = dishes.id WHERE cart_items.cart_id = ?",
    [cartId]
  );
}

async function addCartItem(db, cartId, dishId, quantity) {
  if (!isPositiveInteger(quantity)) {
    throw new Error("invalid_quantity");
  }

  const existing = await db.all(
    "SELECT id, quantity FROM cart_items WHERE cart_id = ? AND dish_id = ? LIMIT 1",
    [cartId, dishId]
  );

  if (existing.length > 0) {
    const current = existing[0].quantity;
    const next = current + quantity;
    await db.run(
      "UPDATE cart_items SET quantity = ? WHERE id = ?",
      [next, existing[0].id]
    );
    return existing[0].id;
  }

  const itemId = nanoid();
  await db.run(
    "INSERT INTO cart_items (id, cart_id, dish_id, quantity) VALUES (?, ?, ?, ?)",
    [itemId, cartId, dishId, quantity]
  );
  return itemId;
}

async function updateCartItem(db, itemId, quantity) {
  if (!isPositiveInteger(quantity)) {
    throw new Error("invalid_quantity");
  }

  await db.run("UPDATE cart_items SET quantity = ? WHERE id = ?", [
    quantity,
    itemId
  ]);
}

async function removeCartItem(db, itemId) {
  await db.run("DELETE FROM cart_items WHERE id = ?", [itemId]);
}

module.exports = {
  ensureCart,
  listCartItems,
  addCartItem,
  updateCartItem,
  removeCartItem
};
