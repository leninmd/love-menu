"use strict";

const express = require("express");
const { config } = require("./config");
const { requestEmailCode, verifyEmailCode } = require("./email");
const { migrate } = require("./migrate");
const {
  authRequired,
  createEmailSession,
  verifyToken,
  extractToken
} = require("./auth");
const {
  registerStart,
  registerFinish,
  loginStart,
  loginFinish
} = require("./webauthn");
const { createDatabase } = require("./db");
const { ensureSampleRestaurant } = require("./services/restaurants");
const { ensureSampleMenu, getMenu } = require("./services/menu");
const {
  ensureCart,
  listCartItems,
  addCartItem,
  updateCartItem,
  removeCartItem
} = require("./services/cart");
const {
  createOrderFromCart,
  listOrdersByCustomer,
  listOrdersByRestaurant,
  updateOrderStatusForOwner
} = require("./services/orders");
const { ensureRestaurantOwner } = require("./services/restaurants");
const { sendPush, isReady: isPushReady } = require("./push");
const { createRateLimiter } = require("./rate-limit");

const app = express();
app.use(express.json());

app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    const log = {
      level: "info",
      type: "request",
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration_ms: duration
    };
    console.log(JSON.stringify(log));
  });
  next();
});

const authLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 10,
  keyFn: (req) => `${req.ip}:auth`
});

const migrationPromise = migrate();
const dbPromise = createDatabase();

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.post("/v1/auth/email/start", authLimiter, async (req, res) => {
  const email = String(req.body.email || "").trim();
  if (!email) {
    return res.status(400).json({ error: "email_required" });
  }

  try {
    const result = await requestEmailCode(email);
    return res.json(result);
  } catch (error) {
    return res.status(error.status || 500).json({ error: error.message });
  }
});

app.post("/v1/auth/email/verify", authLimiter, (req, res) => {
  const email = String(req.body.email || "").trim();
  const code = String(req.body.code || "").trim();
  if (!email || !code) {
    return res.status(400).json({ error: "email_and_code_required" });
  }

  try {
    verifyEmailCode(email, code);
    const session = createEmailSession(email);
    return res.json({ token: session.token, user: session.user });
  } catch (error) {
    return res.status(error.status || 400).json({ error: error.message });
  }
});

app.post("/v1/auth/webauthn/register/start", authLimiter, async (req, res) => {
  const email = String(req.body.email || "").trim();
  const deviceName = String(req.body.deviceName || "").trim();
  try {
    const { db } = await dbPromise;
    const result = await registerStart(db, email, deviceName);
    return res.json(result);
  } catch (error) {
    return res.status(error.status || 400).json({ error: error.message });
  }
});

app.post("/v1/auth/webauthn/register/finish", authLimiter, async (req, res) => {
  const userId = String(req.body.userId || "").trim();
  const response = req.body.response;
  const deviceName = String(req.body.deviceName || "").trim();
  if (!userId || !response) {
    return res.status(400).json({ error: "invalid_input" });
  }
  try {
    const { db } = await dbPromise;
    const result = await registerFinish(db, userId, response, deviceName);
    const session = createEmailSession(result.user.email);
    return res.json({ token: session.token, user: session.user });
  } catch (error) {
    return res.status(error.status || 400).json({ error: error.message });
  }
});

app.post("/v1/auth/webauthn/login/start", authLimiter, async (req, res) => {
  const email = String(req.body.email || "").trim();
  try {
    const { db } = await dbPromise;
    const result = await loginStart(db, email);
    return res.json(result);
  } catch (error) {
    return res.status(error.status || 400).json({ error: error.message });
  }
});

app.post("/v1/auth/webauthn/login/finish", authLimiter, async (req, res) => {
  const userId = String(req.body.userId || "").trim();
  const response = req.body.response;
  if (!userId || !response) {
    return res.status(400).json({ error: "invalid_input" });
  }
  try {
    const { db } = await dbPromise;
    const result = await loginFinish(db, userId, response);
    const session = createEmailSession(result.user.email);
    return res.json({ token: session.token, user: session.user });
  } catch (error) {
    return res.status(error.status || 400).json({ error: error.message });
  }
});

app.post("/v1/dev/seed", authRequired, async (req, res) => {
  const { db } = await dbPromise;
  const restaurantId = await ensureSampleRestaurant(db, req.user.id);
  await ensureSampleMenu(db, restaurantId);
  return res.json({ restaurantId });
});

app.get("/v1/restaurants/:id/menu", async (req, res) => {
  const { db } = await dbPromise;
  const restaurantId = req.params.id;
  const search = String(req.query.search || "").trim();
  const menu = await getMenu(db, restaurantId, search);
  return res.json(menu);
});

app.get("/v1/restaurants/:id/menu/owner", authRequired, async (req, res) => {
  const { db } = await dbPromise;
  try {
    await ensureRestaurantOwner(db, req.params.id, req.user.id);
    const categories = await db.all(
      "SELECT id, name, sort_order, created_at FROM categories WHERE restaurant_id = ? ORDER BY sort_order ASC",
      [req.params.id]
    );
    const dishes = await db.all(
      "SELECT id, category_id, name, description, price, image_url, sources, is_deleted, created_at FROM dishes WHERE restaurant_id = ? ORDER BY created_at DESC",
      [req.params.id]
    );
    return res.json({ categories, dishes });
  } catch (error) {
    return res.status(error.status || 403).json({ error: error.message });
  }
});

app.post("/v1/restaurants/:id/categories", authRequired, async (req, res) => {
  const { db } = await dbPromise;
  const name = String(req.body.name || "").trim();
  const sortOrder = Number.parseInt(req.body.sortOrder, 10) || 0;
  if (!name) {
    return res.status(400).json({ error: "name_required" });
  }
  try {
    await ensureRestaurantOwner(db, req.params.id, req.user.id);
    const id = require("nanoid").nanoid();
    await db.run(
      "INSERT INTO categories (id, restaurant_id, name, sort_order, created_at) VALUES (?, ?, ?, ?, ?)",
      [id, req.params.id, name, sortOrder, Date.now()]
    );
    return res.json({ id });
  } catch (error) {
    return res.status(error.status || 403).json({ error: error.message });
  }
});

app.put("/v1/restaurants/:id/categories/:categoryId", authRequired, async (req, res) => {
  const { db } = await dbPromise;
  const name = String(req.body.name || "").trim();
  const sortOrder = Number.parseInt(req.body.sortOrder, 10) || 0;
  if (!name) {
    return res.status(400).json({ error: "name_required" });
  }
  try {
    await ensureRestaurantOwner(db, req.params.id, req.user.id);
    await db.run(
      "UPDATE categories SET name = ?, sort_order = ? WHERE id = ? AND restaurant_id = ?",
      [name, sortOrder, req.params.categoryId, req.params.id]
    );
    return res.json({ status: "ok" });
  } catch (error) {
    return res.status(error.status || 403).json({ error: error.message });
  }
});

app.delete("/v1/restaurants/:id/categories/:categoryId", authRequired, async (req, res) => {
  const { db } = await dbPromise;
  try {
    await ensureRestaurantOwner(db, req.params.id, req.user.id);
    const count = await db.get(
      "SELECT COUNT(1) as count FROM dishes WHERE category_id = ? AND is_deleted = 0",
      [req.params.categoryId]
    );
    if (count?.count > 0) {
      return res.status(409).json({ error: "category_not_empty" });
    }
    await db.run(
      "DELETE FROM categories WHERE id = ? AND restaurant_id = ?",
      [req.params.categoryId, req.params.id]
    );
    return res.json({ status: "ok" });
  } catch (error) {
    return res.status(error.status || 403).json({ error: error.message });
  }
});

app.post("/v1/restaurants/:id/dishes", authRequired, async (req, res) => {
  const { db } = await dbPromise;
  const name = String(req.body.name || "").trim();
  const categoryId = String(req.body.categoryId || "").trim() || null;
  const description = String(req.body.description || "").trim() || null;
  const price = req.body.price === null || req.body.price === undefined
    ? null
    : Number.parseInt(req.body.price, 10);
  const sources = req.body.sources ? String(req.body.sources) : null;
  if (!name) {
    return res.status(400).json({ error: "name_required" });
  }
  try {
    await ensureRestaurantOwner(db, req.params.id, req.user.id);
    const id = require("nanoid").nanoid();
    await db.run(
      "INSERT INTO dishes (id, restaurant_id, category_id, name, image_url, description, price, sources, is_deleted, order_count, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [id, req.params.id, categoryId, name, null, description, price, sources, 0, 0, Date.now()]
    );
    return res.json({ id });
  } catch (error) {
    return res.status(error.status || 403).json({ error: error.message });
  }
});

app.put("/v1/restaurants/:id/dishes/:dishId", authRequired, async (req, res) => {
  const { db } = await dbPromise;
  const name = String(req.body.name || "").trim();
  const categoryId = String(req.body.categoryId || "").trim() || null;
  const description = String(req.body.description || "").trim() || null;
  const price = req.body.price === null || req.body.price === undefined
    ? null
    : Number.parseInt(req.body.price, 10);
  const sources = req.body.sources ? String(req.body.sources) : null;
  if (!name) {
    return res.status(400).json({ error: "name_required" });
  }
  try {
    await ensureRestaurantOwner(db, req.params.id, req.user.id);
    await db.run(
      "UPDATE dishes SET name = ?, category_id = ?, description = ?, price = ?, sources = ? WHERE id = ? AND restaurant_id = ?",
      [name, categoryId, description, price, sources, req.params.dishId, req.params.id]
    );
    return res.json({ status: "ok" });
  } catch (error) {
    return res.status(error.status || 403).json({ error: error.message });
  }
});

app.delete("/v1/restaurants/:id/dishes/:dishId", authRequired, async (req, res) => {
  const { db } = await dbPromise;
  try {
    await ensureRestaurantOwner(db, req.params.id, req.user.id);
    await db.run(
      "UPDATE dishes SET is_deleted = 1 WHERE id = ? AND restaurant_id = ?",
      [req.params.dishId, req.params.id]
    );
    return res.json({ status: "ok" });
  } catch (error) {
    return res.status(error.status || 403).json({ error: error.message });
  }
});

app.get("/v1/cart", authRequired, async (req, res) => {
  const { db } = await dbPromise;
  const restaurantId = String(req.query.restaurantId || "").trim();
  if (!restaurantId) {
    return res.status(400).json({ error: "restaurant_required" });
  }

  const cartId = await ensureCart(db, req.user.id, restaurantId);
  const items = await listCartItems(db, cartId);
  return res.json({ cartId, items });
});

app.post("/v1/cart/items", authRequired, async (req, res) => {
  const { db } = await dbPromise;
  const restaurantId = String(req.body.restaurantId || "").trim();
  const dishId = String(req.body.dishId || "").trim();
  const quantity = Number.parseInt(req.body.quantity, 10);
  if (!restaurantId || !dishId || !Number.isInteger(quantity) || quantity <= 0) {
    return res.status(400).json({ error: "invalid_input" });
  }

  try {
    const cartId = await ensureCart(db, req.user.id, restaurantId);
    const itemId = await addCartItem(db, cartId, dishId, quantity);
    return res.json({ itemId });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

app.put("/v1/cart/items/:id", authRequired, async (req, res) => {
  const { db } = await dbPromise;
  const quantity = Number.parseInt(req.body.quantity, 10);
  if (!Number.isInteger(quantity) || quantity <= 0) {
    return res.status(400).json({ error: "invalid_input" });
  }
  try {
    await updateCartItem(db, req.params.id, quantity);
    return res.json({ status: "ok" });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

app.delete("/v1/cart/items/:id", authRequired, async (req, res) => {
  const { db } = await dbPromise;
  await removeCartItem(db, req.params.id);
  return res.json({ status: "ok" });
});

app.post("/v1/orders", authRequired, async (req, res) => {
  const { db } = await dbPromise;
  const cartId = String(req.body.cartId || "").trim();
  const restaurantId = String(req.body.restaurantId || "").trim();
  if (!cartId || !restaurantId) {
    return res.status(400).json({ error: "invalid_input" });
  }

  try {
    const orderId = await createOrderFromCart(
      db,
      cartId,
      req.user.id,
      restaurantId
    );
    return res.json({ orderId });
  } catch (error) {
    return res.status(error.status || 400).json({ error: error.message });
  }
});

app.get("/v1/orders/mine", authRequired, async (req, res) => {
  const { db } = await dbPromise;
  const orders = await listOrdersByCustomer(db, req.user.id);
  return res.json({ orders });
});

app.get("/v1/orders/:id/items", authRequired, async (req, res) => {
  const { db } = await dbPromise;
  const order = await db.get(
    "SELECT id, customer_id, status FROM orders WHERE id = ?",
    [req.params.id]
  );
  if (!order || order.customer_id !== req.user.id) {
    return res.status(404).json({ error: "order_missing" });
  }
  if (order.status !== "completed") {
    return res.status(409).json({ error: "order_not_completed" });
  }
  const items = await db.all(
    "SELECT id, dish_name, quantity, is_reviewed FROM order_items WHERE order_id = ?",
    [req.params.id]
  );
  return res.json({ items });
});

app.post("/v1/orders/:orderId/items/:itemId/review", authRequired, async (req, res) => {
  const { db } = await dbPromise;
  const content = String(req.body.content || "").trim();
  if (!content) {
    return res.status(400).json({ error: "content_required" });
  }
  if (content.length > 200) {
    return res.status(400).json({ error: "content_too_long" });
  }
  const order = await db.get(
    "SELECT id, customer_id, status FROM orders WHERE id = ?",
    [req.params.orderId]
  );
  if (!order || order.customer_id !== req.user.id) {
    return res.status(404).json({ error: "order_missing" });
  }
  if (order.status !== "completed") {
    return res.status(409).json({ error: "order_not_completed" });
  }
  const item = await db.get(
    "SELECT id, is_reviewed FROM order_items WHERE id = ? AND order_id = ?",
    [req.params.itemId, req.params.orderId]
  );
  if (!item) {
    return res.status(404).json({ error: "item_missing" });
  }
  if (item.is_reviewed === 1) {
    return res.status(409).json({ error: "already_reviewed" });
  }
  const reviewId = require("nanoid").nanoid();
  await db.run(
    "INSERT INTO reviews (id, order_item_id, user_id, content, created_at) VALUES (?, ?, ?, ?, ?)",
    [reviewId, item.id, req.user.id, content, Date.now()]
  );
  await db.run("UPDATE order_items SET is_reviewed = 1 WHERE id = ?", [item.id]);
  return res.json({ status: "ok" });
});

app.get("/v1/messages", authRequired, async (req, res) => {
  const { db } = await dbPromise;
  const scope = String(req.query.scope || "customer").trim();
  if (scope !== "customer" && scope !== "owner") {
    return res.status(400).json({ error: "invalid_scope" });
  }

  if (scope === "customer") {
    const rows = await db.all(
      "SELECT id, restaurant_id, status, total_price, created_at FROM orders WHERE customer_id = ? ORDER BY created_at DESC",
      [req.user.id]
    );
    return res.json({ messages: rows });
  }

  const restaurantId = String(req.query.restaurantId || "").trim();
  if (!restaurantId) {
    return res.status(400).json({ error: "restaurant_required" });
  }
  try {
    await ensureRestaurantOwner(db, restaurantId, req.user.id);
    const rows = await db.all(
      "SELECT id, customer_id, status, total_price, created_at FROM orders WHERE restaurant_id = ? ORDER BY created_at DESC",
      [restaurantId]
    );
    return res.json({ messages: rows });
  } catch (error) {
    return res.status(error.status || 403).json({ error: error.message });
  }
});

app.get("/v1/orders/restaurant/:id", authRequired, async (req, res) => {
  const { db } = await dbPromise;
  try {
    await ensureRestaurantOwner(db, req.params.id, req.user.id);
    const orders = await listOrdersByRestaurant(db, req.params.id);
    return res.json({ orders });
  } catch (error) {
    return res.status(error.status || 403).json({ error: error.message });
  }
});

app.put("/v1/orders/:id/accept", authRequired, async (req, res) => {
  const { db } = await dbPromise;
  const restaurantId = String(req.body.restaurantId || "").trim();
  if (!restaurantId) {
    return res.status(400).json({ error: "restaurant_required" });
  }
  try {
    const order = await updateOrderStatusForOwner(
      db,
      req.params.id,
      restaurantId,
      req.user.id,
      "accepted"
    );
    await sendPushForOrder(db, order, "订单已接单");
    return res.json({ status: "ok" });
  } catch (error) {
    return res.status(error.status || 403).json({ error: error.message });
  }
});

app.put("/v1/orders/:id/complete", authRequired, async (req, res) => {
  const { db } = await dbPromise;
  const restaurantId = String(req.body.restaurantId || "").trim();
  if (!restaurantId) {
    return res.status(400).json({ error: "restaurant_required" });
  }
  try {
    const order = await updateOrderStatusForOwner(
      db,
      req.params.id,
      restaurantId,
      req.user.id,
      "completed"
    );
    await sendPushForOrder(db, order, "订单已完成");
    return res.json({ status: "ok" });
  } catch (error) {
    return res.status(error.status || 403).json({ error: error.message });
  }
});

app.get("/v1/protected", authRequired, (req, res) => {
  res.json({ status: "ok", user: req.user });
});

app.get("/v1/ready", async (req, res) => {
  try {
    await migrationPromise;
    return res.json({ status: "ready" });
  } catch (error) {
    return res.status(500).json({ status: "error" });
  }
});

app.get("/v1/orders/stream", async (req, res) => {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ error: "missing_token" });
  }

  let payload;
  try {
    payload = verifyToken(token);
  } catch (error) {
    return res.status(401).json({ error: "invalid_token" });
  }

  const isOwner = String(req.query.owner || "") === "true";
  const restaurantId = String(req.query.restaurantId || "").trim();
  if (!isOwner && restaurantId) {
    return res.status(400).json({ error: "unexpected_restaurant" });
  }
  if (isOwner && !restaurantId) {
    return res.status(400).json({ error: "restaurant_required" });
  }
  if (isOwner) {
    try {
      const { db } = await dbPromise;
      await ensureRestaurantOwner(db, restaurantId, payload.sub);
    } catch (error) {
      return res.status(error.status || 403).json({ error: error.message });
    }
  }

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive"
  });

  const { db } = await dbPromise;
  let lastSnapshot = Date.now();

  async function pushSnapshot() {
    try {
      let orders = [];
      if (isOwner) {
        orders = await listOrdersByRestaurant(db, restaurantId);
      } else {
        orders = await listOrdersByCustomer(db, payload.sub);
      }
      const snapshot = { time: Date.now(), orders };
      res.write(`event: orders\n`);
      res.write(`data: ${JSON.stringify(snapshot)}\n\n`);
      lastSnapshot = snapshot.time;
    } catch (error) {
      res.write(`event: error\n`);
      res.write(`data: ${JSON.stringify({ message: "stream_failed" })}\n\n`);
    }
  }

  await pushSnapshot();
  const interval = setInterval(pushSnapshot, 15000);

  req.on("close", () => {
    clearInterval(interval);
  });
});

app.post("/v1/push/subscribe", authRequired, async (req, res) => {
  const { db } = await dbPromise;
  const subscription = req.body?.subscription;
  if (!subscription?.endpoint) {
    return res.status(400).json({ error: "invalid_subscription" });
  }
  const recordId = `${req.user.id}:${subscription.endpoint}`;
  await db.run(
    "INSERT OR REPLACE INTO push_subscriptions (id, user_id, endpoint, payload, created_at) VALUES (?, ?, ?, ?, ?)",
    [recordId, req.user.id, subscription.endpoint, JSON.stringify(subscription), Date.now()]
  );
  return res.json({ status: "ok" });
});

app.delete("/v1/push/unsubscribe", authRequired, async (req, res) => {
  const { db } = await dbPromise;
  const endpoint = String(req.body.endpoint || "").trim();
  if (!endpoint) {
    return res.status(400).json({ error: "invalid_subscription" });
  }
  await db.run("DELETE FROM push_subscriptions WHERE user_id = ? AND endpoint = ?", [
    req.user.id,
    endpoint
  ]);
  return res.json({ status: "ok" });
});

async function sendPushForOrder(db, order, title) {
  if (!order || !isPushReady()) return;
  const subscriptions = await db.all(
    "SELECT payload FROM push_subscriptions WHERE user_id = ?",
    [order.customer_id]
  );
  if (!subscriptions.length) return;

  const payload = {
    title,
    body: `订单 ${order.id} 状态更新：${order.status}`,
    data: { orderId: order.id, restaurantId: order.restaurant_id }
  };

  await Promise.all(
    subscriptions.map(async (row) => {
      try {
        await sendPush(JSON.parse(row.payload), payload);
      } catch (error) {
        if (error?.statusCode === 410) {
          const endpoint = JSON.parse(row.payload).endpoint;
          await db.run(
            "DELETE FROM push_subscriptions WHERE user_id = ? AND endpoint = ?",
            [order.customer_id, endpoint]
          );
        }
      }
    })
  );
}

app.use((err, req, res, next) => {
  const log = {
    level: "error",
    type: "handler",
    path: req.path,
    message: err?.message || "unknown_error"
  };
  console.error(JSON.stringify(log));
  return res.status(500).json({ error: "internal_error" });
});

app.listen(config.port, () => {
  console.log(`server:listening:${config.port}`);
});
