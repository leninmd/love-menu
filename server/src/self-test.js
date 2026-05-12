"use strict";

const http = require("http");
const { spawn } = require("child_process");
const path = require("path");

const serverPath = path.join(__dirname, "index.js");

function request(method, pathName, body, token) {
  const payload = body ? JSON.stringify(body) : null;
  const headers = {};
  if (payload) {
    headers["Content-Type"] = "application/json";
    headers["Content-Length"] = Buffer.byteLength(payload);
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const options = {
    hostname: "127.0.0.1",
    port: 3000,
    path: pathName,
    method,
    headers
  };

  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        resolve({ status: res.statusCode, body: data });
      });
    });
    req.on("error", reject);
    if (payload) {
      req.write(payload);
    }
    req.end();
  });
}

async function run() {
  const env = { ...process.env };
  env.DATABASE_PATH = env.DATABASE_PATH || "../data/lovemenu.db";
  env.JWT_SECRET = env.JWT_SECRET || "test-secret-please-change";
  env.PORT = env.PORT || "3000";
  env.EMAIL_TEST_CODE = env.EMAIL_TEST_CODE || "000000";
  const server = spawn(process.execPath, [serverPath], {
    env,
    stdio: ["ignore", "pipe", "pipe"]
  });

  server.stderr.on("data", (chunk) => {
    console.error(chunk.toString());
  });

  let ready = false;
  server.stdout.on("data", (chunk) => {
    const line = chunk.toString();
    if (line.includes("server:listening")) {
      ready = true;
    }
  });

  const deadline = Date.now() + 5000;
  while (!ready && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  if (!ready) {
    server.kill();
    throw new Error("server_not_ready");
  }

  const health = await request("GET", "/health");
  if (health.status !== 200) {
    throw new Error("health_failed");
  }

  const readyCheck = await request("GET", "/v1/ready");
  if (readyCheck.status !== 200) {
    throw new Error("ready_failed");
  }

  const startEmail = await request("POST", "/v1/auth/email/start", {
    email: "test@example.com"
  });
  if (startEmail.status !== 200) {
    throw new Error("email_start_failed");
  }

  const verify = await request("POST", "/v1/auth/email/verify", {
    email: "test@example.com",
    code: "000000"
  });
  if (verify.status !== 200) {
    throw new Error("email_verify_failed");
  }
  const token = JSON.parse(verify.body).token;
  if (!token) {
    throw new Error("token_missing");
  }

  const protectedRes = await new Promise((resolve, reject) => {
    const options = {
      hostname: "127.0.0.1",
      port: 3000,
      path: "/v1/protected",
      method: "GET",
      headers: { Authorization: `Bearer ${token}` }
    };
    const req = http.request(options, (res) => {
      res.on("data", () => undefined);
      res.on("end", () => resolve(res.statusCode));
    });
    req.on("error", reject);
    req.end();
  });

  if (protectedRes !== 200) {
    throw new Error("protected_failed");
  }

  const seed = await new Promise((resolve, reject) => {
    const payload = JSON.stringify({});
    const options = {
      hostname: "127.0.0.1",
      port: 3000,
      path: "/v1/dev/seed",
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(payload)
      }
    };
    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => resolve({ status: res.statusCode, body: data }));
    });
    req.on("error", reject);
    req.write(payload);
    req.end();
  });

  if (seed.status !== 200) {
    throw new Error("seed_failed");
  }

  const restaurantId = JSON.parse(seed.body).restaurantId;
  if (!restaurantId) {
    throw new Error("restaurant_missing");
  }

  const menu = await request("GET", `/v1/restaurants/${restaurantId}/menu`);
  if (menu.status !== 200) {
    throw new Error("menu_failed");
  }
  const menuData = JSON.parse(menu.body);
  const firstDish = menuData.dishes[0];
  if (!firstDish) {
    throw new Error("dish_missing");
  }

  const cart = await request(
    "GET",
    `/v1/cart?restaurantId=${restaurantId}`,
    null,
    token
  );
  if (cart.status !== 200) {
    throw new Error("cart_failed");
  }
  const cartData = JSON.parse(cart.body);
  if (!cartData.cartId) {
    throw new Error("cart_missing");
  }

  const addItem = await request(
    "POST",
    "/v1/cart/items",
    { restaurantId, dishId: firstDish.id, quantity: 1 },
    token
  );
  if (addItem.status !== 200) {
    throw new Error("cart_add_failed");
  }

  const order = await request(
    "POST",
    "/v1/orders",
    { cartId: cartData.cartId, restaurantId },
    token
  );
  if (order.status !== 200) {
    throw new Error("order_failed");
  }
  const orderId = JSON.parse(order.body).orderId;
  if (!orderId) {
    throw new Error("order_missing");
  }

  const ownerOrders = await request(
    "GET",
    `/v1/orders/restaurant/${restaurantId}`,
    null,
    token
  );
  if (ownerOrders.status !== 200) {
    throw new Error("order_list_failed");
  }

  const accept = await request(
    "PUT",
    `/v1/orders/${orderId}/accept`,
    { restaurantId },
    token
  );
  if (accept.status !== 200) {
    throw new Error("order_accept_failed");
  }

  const complete = await request(
    "PUT",
    `/v1/orders/${orderId}/complete`,
    { restaurantId },
    token
  );
  if (complete.status !== 200) {
    throw new Error("order_complete_failed");
  }

  server.kill();
}

run()
  .then(() => {
    console.log("self-test:ok");
  })
  .catch((error) => {
    console.error("self-test:failed", error.message);
    process.exit(1);
  });
