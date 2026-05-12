"use strict";

const { sqliteTable, text, integer } = require("drizzle-orm/sqlite-core");

const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").unique().notNull(),
  nickname: text("nickname"),
  avatarUrl: text("avatar_url"),
  createdAt: integer("created_at").notNull()
});

const credentials = sqliteTable("credentials", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  publicKey: text("public_key").notNull(),
  counter: integer("counter").notNull(),
  deviceName: text("device_name"),
  createdAt: integer("created_at").notNull()
});

const restaurants = sqliteTable("restaurants", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id").notNull(),
  name: text("name").notNull(),
  avatarUrl: text("avatar_url"),
  intro: text("intro"),
  isDeleted: integer("is_deleted").notNull(),
  createdAt: integer("created_at").notNull()
});

const categories = sqliteTable("categories", {
  id: text("id").primaryKey(),
  restaurantId: text("restaurant_id").notNull(),
  name: text("name").notNull(),
  sortOrder: integer("sort_order").notNull(),
  createdAt: integer("created_at").notNull()
});

const dishes = sqliteTable("dishes", {
  id: text("id").primaryKey(),
  restaurantId: text("restaurant_id").notNull(),
  categoryId: text("category_id"),
  name: text("name").notNull(),
  imageUrl: text("image_url"),
  description: text("description"),
  price: integer("price"),
  sources: text("sources"),
  isDeleted: integer("is_deleted").notNull(),
  orderCount: integer("order_count").notNull(),
  createdAt: integer("created_at").notNull()
});

const carts = sqliteTable("carts", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  restaurantId: text("restaurant_id").notNull(),
  createdAt: integer("created_at").notNull()
});

const cartItems = sqliteTable("cart_items", {
  id: text("id").primaryKey(),
  cartId: text("cart_id").notNull(),
  dishId: text("dish_id").notNull(),
  quantity: integer("quantity").notNull()
});

const orders = sqliteTable("orders", {
  id: text("id").primaryKey(),
  customerId: text("customer_id").notNull(),
  restaurantId: text("restaurant_id").notNull(),
  status: text("status").notNull(),
  totalPrice: integer("total_price").notNull(),
  snapshotAt: integer("snapshot_at").notNull(),
  createdAt: integer("created_at").notNull()
});

const orderItems = sqliteTable("order_items", {
  id: text("id").primaryKey(),
  orderId: text("order_id").notNull(),
  dishName: text("dish_name").notNull(),
  dishPrice: integer("dish_price"),
  dishSources: text("dish_sources"),
  dishImage: text("dish_image"),
  quantity: integer("quantity").notNull(),
  isReviewed: integer("is_reviewed").notNull(),
  originalDishId: text("original_dish_id")
});

const reviews = sqliteTable("reviews", {
  id: text("id").primaryKey(),
  orderItemId: text("order_item_id").notNull(),
  userId: text("user_id").notNull(),
  content: text("content").notNull(),
  createdAt: integer("created_at").notNull()
});

const pushSubscriptions = sqliteTable("push_subscriptions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  endpoint: text("endpoint").notNull(),
  payload: text("payload").notNull(),
  createdAt: integer("created_at").notNull()
});

module.exports = {
  users,
  credentials,
  restaurants,
  categories,
  dishes,
  carts,
  cartItems,
  orders,
  orderItems,
  reviews,
  pushSubscriptions
};
