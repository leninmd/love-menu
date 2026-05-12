import { request } from './http'

export interface MenuResponse {
  categories: { id: string; name: string; sort_order: number }[]
  dishes: {
    id: string
    category_id: string | null
    name: string
    description?: string | null
    price?: number | null
    image_url?: string | null
    sources?: string | null
    is_deleted?: number
  }[]
}

export interface OwnerMenuResponse {
  categories: { id: string; name: string; sort_order: number; created_at: number }[]
  dishes: {
    id: string
    category_id: string | null
    name: string
    description?: string | null
    price?: number | null
    image_url?: string | null
    sources?: string | null
    is_deleted: number
    created_at: number
  }[]
}

export interface CartResponse {
  cartId: string
  items: {
    id: string
    dish_id: string
    quantity: number
    name: string
    price?: number | null
    image_url?: string | null
    sources?: string | null
  }[]
}

export interface OrdersResponse {
  orders: {
    id: string
    restaurant_id: string
    status: string
    total_price: number
    created_at: number
  }[]
}

export interface OwnerOrdersResponse {
  orders: {
    id: string
    customer_id: string
    status: string
    total_price: number
    created_at: number
  }[]
}

export async function verifyEmail(email: string, code: string) {
  return request<{ token: string; user: { id: string; email: string } }>(
    '/v1/auth/email/verify',
    { method: 'POST', body: { email, code } }
  )
}

export async function requestEmailCode(email: string) {
  return request<{ status: string }>('/v1/auth/email/start', {
    method: 'POST',
    body: { email }
  })
}

export async function webauthnRegisterStart(email: string, deviceName: string) {
  return request<{ options: unknown; userId: string }>(
    '/v1/auth/webauthn/register/start',
    {
      method: 'POST',
      body: { email, deviceName }
    }
  )
}

export async function webauthnRegisterFinish(
  userId: string,
  response: unknown,
  deviceName: string
) {
  return request<{ token: string; user: { id: string; email: string } }>(
    '/v1/auth/webauthn/register/finish',
    {
      method: 'POST',
      body: { userId, response, deviceName }
    }
  )
}

export async function webauthnLoginStart(email: string) {
  return request<{ options: unknown; userId: string }>(
    '/v1/auth/webauthn/login/start',
    {
      method: 'POST',
      body: { email }
    }
  )
}

export async function webauthnLoginFinish(userId: string, response: unknown) {
  return request<{ token: string; user: { id: string; email: string } }>(
    '/v1/auth/webauthn/login/finish',
    {
      method: 'POST',
      body: { userId, response }
    }
  )
}

export async function seed(token: string) {
  return request<{ restaurantId: string }>('/v1/dev/seed', {
    method: 'POST',
    body: {},
    token
  })
}

export async function fetchMenu(restaurantId: string, search = '') {
  const query = search ? `?search=${encodeURIComponent(search)}` : ''
  return request<MenuResponse>(
    `/v1/restaurants/${restaurantId}/menu${query}`
  )
}

export async function fetchOwnerMenu(token: string, restaurantId: string) {
  return request<OwnerMenuResponse>(`/v1/restaurants/${restaurantId}/menu/owner`, {
    token
  })
}

export async function createCategory(
  token: string,
  restaurantId: string,
  name: string,
  sortOrder: number
) {
  return request<{ id: string }>(`/v1/restaurants/${restaurantId}/categories`, {
    method: 'POST',
    body: { name, sortOrder },
    token
  })
}

export async function updateCategory(
  token: string,
  restaurantId: string,
  categoryId: string,
  name: string,
  sortOrder: number
) {
  return request<{ status: string }>(
    `/v1/restaurants/${restaurantId}/categories/${categoryId}`,
    {
      method: 'PUT',
      body: { name, sortOrder },
      token
    }
  )
}

export async function deleteCategory(
  token: string,
  restaurantId: string,
  categoryId: string
) {
  return request<{ status: string }>(
    `/v1/restaurants/${restaurantId}/categories/${categoryId}`,
    {
      method: 'DELETE',
      body: {},
      token
    }
  )
}

export async function createDish(
  token: string,
  restaurantId: string,
  payload: {
    name: string
    categoryId: string | null
    description?: string
    price?: number | null
    sources?: string | null
  }
) {
  return request<{ id: string }>(`/v1/restaurants/${restaurantId}/dishes`, {
    method: 'POST',
    body: payload,
    token
  })
}

export async function updateDish(
  token: string,
  restaurantId: string,
  dishId: string,
  payload: {
    name: string
    categoryId: string | null
    description?: string
    price?: number | null
    sources?: string | null
  }
) {
  return request<{ status: string }>(
    `/v1/restaurants/${restaurantId}/dishes/${dishId}`,
    {
      method: 'PUT',
      body: payload,
      token
    }
  )
}

export async function deleteDish(
  token: string,
  restaurantId: string,
  dishId: string
) {
  return request<{ status: string }>(
    `/v1/restaurants/${restaurantId}/dishes/${dishId}`,
    {
      method: 'DELETE',
      body: {},
      token
    }
  )
}

export async function fetchCart(token: string, restaurantId: string) {
  return request<CartResponse>(`/v1/cart?restaurantId=${restaurantId}`, {
    token
  })
}

export async function addCartItem(
  token: string,
  restaurantId: string,
  dishId: string,
  quantity: number
) {
  return request<{ itemId: string }>('/v1/cart/items', {
    method: 'POST',
    body: { restaurantId, dishId, quantity },
    token
  })
}

export async function updateCartItem(
  token: string,
  itemId: string,
  quantity: number
) {
  return request<{ status: string }>(`/v1/cart/items/${itemId}`, {
    method: 'PUT',
    body: { quantity },
    token
  })
}

export async function removeCartItem(token: string, itemId: string) {
  return request<{ status: string }>(`/v1/cart/items/${itemId}`, {
    method: 'DELETE',
    token
  })
}

export async function createOrder(
  token: string,
  cartId: string,
  restaurantId: string
) {
  return request<{ orderId: string }>('/v1/orders', {
    method: 'POST',
    body: { cartId, restaurantId },
    token
  })
}

export async function fetchOrders(token: string) {
  return request<OrdersResponse>('/v1/orders/mine', { token })
}

export interface OrderItemsResponse {
  items: {
    id: string
    dish_name: string
    quantity: number
    is_reviewed: number
  }[]
}

export async function fetchOrderItems(token: string, orderId: string) {
  return request<OrderItemsResponse>(`/v1/orders/${orderId}/items`, { token })
}

export async function submitReview(
  token: string,
  orderId: string,
  itemId: string,
  content: string
) {
  return request<{ status: string }>(
    `/v1/orders/${orderId}/items/${itemId}/review`,
    {
      method: 'POST',
      body: { content },
      token
    }
  )
}

export async function fetchOwnerOrders(token: string, restaurantId: string) {
  return request<OwnerOrdersResponse>(
    `/v1/orders/restaurant/${restaurantId}`,
    { token }
  )
}

export interface MessagesResponse {
  messages: {
    id: string
    restaurant_id?: string
    customer_id?: string
    status: string
    total_price: number
    created_at: number
  }[]
}

export async function fetchMessages(
  token: string,
  scope: 'customer' | 'owner',
  restaurantId?: string
) {
  const params = new URLSearchParams({ scope })
  if (restaurantId) {
    params.set('restaurantId', restaurantId)
  }
  return request<MessagesResponse>(`/v1/messages?${params.toString()}`, {
    token
  })
}

export async function acceptOwnerOrder(
  token: string,
  orderId: string,
  restaurantId: string
) {
  return request<{ status: string }>(`/v1/orders/${orderId}/accept`, {
    method: 'PUT',
    body: { restaurantId },
    token
  })
}

export async function completeOwnerOrder(
  token: string,
  orderId: string,
  restaurantId: string
) {
  return request<{ status: string }>(`/v1/orders/${orderId}/complete`, {
    method: 'PUT',
    body: { restaurantId },
    token
  })
}
