"use strict";

const { nanoid } = require("nanoid");
const { now } = require("../utils");
const { ensureRestaurantOwner } = require("./restaurants");

function calcTotal(items) {
  return items.reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0);
}

async function createOrderFromCart(db, cartId, customerId, restaurantId) {
  const cartItems = await db.all(
    "SELECT cart_items.id, cart_items.quantity, dishes.id AS dish_id, dishes.name, dishes.price, dishes.sources, dishes.image_url, dishes.is_deleted FROM cart_items JOIN dishes ON cart_items.dish_id = dishes.id WHERE cart_items.cart_id = ?",
    [cartId]
  );

  if (cartItems.length === 0) {
    const error = new Error("empty_cart");
    error.status = 400;
    throw error;
  }

  const invalid = cartItems.filter((item) => item.is_deleted === 1);
  if (invalid.length > 0) {
    const invalidIds = invalid.map((item) => item.id);
    await db.run(
      "DELETE FROM cart_items WHERE id IN (" + invalidIds.map(() => "?").join(",") + ")",
      invalidIds
    );
    const error = new Error("dish_deleted");
    error.status = 409;
    throw error;
  }

  const orderId = nanoid();
  const snapshotAt = now();
  const total = calcTotal(cartItems);
  await db.run(
    "INSERT INTO orders (id, customer_id, restaurant_id, status, total_price, snapshot_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [orderId, customerId, restaurantId, "submitted", total, snapshotAt, now()]
  );

  for (const item of cartItems) {
    await db.run(
      "INSERT INTO order_items (id, order_id, dish_name, dish_price, dish_sources, dish_image, quantity, is_reviewed, original_dish_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        nanoid(),
        orderId,
        item.name,
        item.price,
        item.sources,
        item.image_url,
        item.quantity,
        0,
        item.dish_id
      ]
    );
  }

  await db.run("DELETE FROM cart_items WHERE cart_id = ?", [cartId]);
  return orderId;
}

async function listOrdersByCustomer(db, customerId) {
  return db.all(
    "SELECT id, restaurant_id, status, total_price, created_at FROM orders WHERE customer_id = ? ORDER BY created_at DESC",
    [customerId]
  );
}

async function listOrdersByRestaurant(db, restaurantId) {
  return db.all(
    "SELECT id, customer_id, status, total_price, created_at FROM orders WHERE restaurant_id = ? ORDER BY created_at DESC",
    [restaurantId]
  );
}

async function updateOrderStatus(db, orderId, nextStatus) {
  await db.run("UPDATE orders SET status = ? WHERE id = ?", [
    nextStatus,
    orderId
  ]);
}

async function updateOrderStatusForOwner(
  db,
  orderId,
  restaurantId,
  ownerId,
  nextStatus
) {
  await ensureRestaurantOwner(db, restaurantId, ownerId);
  const existing = await db.get(
    "SELECT id, customer_id, restaurant_id, status, total_price, created_at FROM orders WHERE id = ? AND restaurant_id = ?",
    [orderId, restaurantId]
  );
  if (!existing) {
    const error = new Error("order_missing");
    error.status = 404;
    throw error;
  }
  if (existing.status !== nextStatus) {
    await db.run(
      "UPDATE orders SET status = ? WHERE id = ? AND restaurant_id = ?",
      [nextStatus, orderId, restaurantId]
    );
    return { ...existing, status: nextStatus };
  }
  return existing;
 }

module.exports = {
  createOrderFromCart,
  listOrdersByCustomer,
  listOrdersByRestaurant,
  updateOrderStatus,
  updateOrderStatusForOwner
};
