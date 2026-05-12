<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { requestEmailCode, verifyEmail } from '../../api/client'
import { usePasskeyAuth } from '../../composables/usePasskeyAuth'

const emit = defineEmits<{
  success: [token: string]
}>()

const email = shallowRef('')
const code = shallowRef('')
const status = shallowRef('idle')
const message = shallowRef('')
const deviceName = shallowRef('本机设备')
const passkey = usePasskeyAuth()
const passkeySupported = computed(() => passkey.isSupported())

async function sendCode() {
  if (!email.value.trim()) {
    message.value = '请输入邮箱'
    return
  }
  status.value = 'sending'
  message.value = ''
  try {
    await requestEmailCode(email.value.trim())
    message.value = '验证码已发送'
    status.value = 'sent'
  } catch (err) {
    message.value = err instanceof Error ? err.message : '发送失败'
    status.value = 'idle'
  }
}

async function verify() {
  if (!email.value.trim() || !code.value.trim()) {
    message.value = '请输入邮箱和验证码'
    return
  }
  status.value = 'verifying'
  message.value = ''
  try {
    const result = await verifyEmail(email.value.trim(), code.value.trim())
    emit('success', result.token)
  } catch (err) {
    message.value = err instanceof Error ? err.message : '验证失败'
    status.value = 'sent'
  }
}

async function registerPasskey() {
  if (!email.value.trim()) {
    message.value = '请输入邮箱'
    return
  }
  status.value = 'registering'
  message.value = ''
  try {
    const result = await passkey.register(
      email.value.trim(),
      deviceName.value.trim() || '本机设备'
    )
    emit('success', result.token)
  } catch (err) {
    message.value = err instanceof Error ? err.message : '通行密钥注册失败'
    status.value = 'idle'
  }
}

async function loginPasskey() {
  if (!email.value.trim()) {
    message.value = '请输入邮箱'
    return
  }
  status.value = 'logging'
  message.value = ''
  try {
    const result = await passkey.login(email.value.trim())
    emit('success', result.token)
  } catch (err) {
    message.value = err instanceof Error ? err.message : '通行密钥登录失败'
    status.value = 'idle'
  }
}
</script>

<template>
  <section class="auth">
    <h2 class="auth-title">登录</h2>
    <p class="auth-desc">优先使用通行密钥，邮箱验证码作为兜底。</p>
    <p v-if="!passkeySupported" class="auth-hint">
      当前环境不支持通行密钥（需 HTTPS 或 localhost）。
    </p>
    <div class="auth-field">
      <label class="auth-label" for="auth-email">邮箱</label>
      <input
        id="auth-email"
        v-model="email"
        class="auth-input"
        type="email"
        placeholder="you@example.com"
      />
    </div>
    <div v-if="passkeySupported" class="auth-field">
      <label class="auth-label" for="auth-device">设备名称</label>
      <input
        id="auth-device"
        v-model="deviceName"
        class="auth-input"
        type="text"
        placeholder="例如：我的手机"
      />
    </div>
    <div v-if="passkeySupported" class="auth-actions">
      <button
        class="primary"
        type="button"
        @click="registerPasskey"
        :disabled="status === 'registering' || passkey.loading.value"
      >
        注册通行密钥
      </button>
      <button
        class="ghost"
        type="button"
        @click="loginPasskey"
        :disabled="status === 'logging' || passkey.loading.value"
      >
        通行密钥登录
      </button>
    </div>
    <div class="auth-field">
      <label class="auth-label" for="auth-code">验证码</label>
      <input
        id="auth-code"
        v-model="code"
        class="auth-input"
        type="text"
        placeholder="6 位验证码"
      />
    </div>
    <div class="auth-actions">
      <button
        class="ghost"
        type="button"
        @click="sendCode"
        :disabled="status === 'sending'"
      >
        发送验证码
      </button>
      <button
        class="primary"
        type="button"
        @click="verify"
        :disabled="status === 'verifying'"
      >
        登录
      </button>
    </div>
    <p v-if="message" class="auth-message">{{ message }}</p>
    <p v-else-if="passkey.error.value" class="auth-message">
      {{ passkey.error.value }}
    </p>
  </section>
</template>

<style scoped>
.auth {
  border: 1px solid var(--color-border);
  border-radius: 20px;
  padding: 20px;
  background: var(--color-surface);
  display: grid;
  gap: 12px;
}

.auth-title {
  margin: 0;
  font-size: 18px;
  color: var(--color-text-strong);
}

.auth-desc {
  margin: 0;
  font-size: 12px;
  color: var(--color-muted);
}

.auth-hint {
  margin: 0;
  font-size: 12px;
  color: var(--color-muted);
}

.auth-field {
  display: grid;
  gap: 6px;
}

.auth-label {
  font-size: 12px;
  color: var(--color-muted);
}

.auth-input {
  border-radius: 12px;
  border: 1px solid var(--color-border);
  padding: 8px 12px;
}

.auth-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.primary,
.ghost {
  border-radius: 999px;
  padding: 8px 16px;
  cursor: pointer;
  border: 1px solid var(--color-border);
  background: transparent;
}

.primary {
  background: var(--color-accent);
  border-color: var(--color-accent);
  color: #fff;
}

.auth-message {
  margin: 0;
  font-size: 12px;
  color: var(--color-muted);
}
</style>
