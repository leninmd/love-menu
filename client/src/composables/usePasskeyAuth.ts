import { shallowRef } from 'vue'
import {
  webauthnRegisterStart,
  webauthnRegisterFinish,
  webauthnLoginStart,
  webauthnLoginFinish
} from '../api/client'
import {
  startRegistration,
  startAuthentication
} from '@simplewebauthn/browser'

export function usePasskeyAuth() {
  const loading = shallowRef(false)
  const error = shallowRef('')

  function mapPasskeyError(err: unknown, fallback: string) {
    if (!(err instanceof Error)) return fallback
    const message = err.message.toLowerCase()
    if (message.includes('notallowed')) {
      return '已取消或超时，请重试'
    }
    if (message.includes('invalidstate')) {
      return '该设备已注册过通行密钥'
    }
    if (message.includes('notfound')) {
      return '未找到可用的通行密钥'
    }
    if (message.includes('security')) {
      return '仅支持 HTTPS 或 localhost 环境'
    }
    return err.message || fallback
  }

  function isSupported() {
    return typeof window !== 'undefined' && !!window.PublicKeyCredential
  }

  async function register(email: string, deviceName: string) {
    loading.value = true
    error.value = ''
    try {
      const start = await webauthnRegisterStart(email, deviceName)
      const credential = await startRegistration(start.options as any)
      const result = await webauthnRegisterFinish(
        start.userId,
        credential,
        deviceName
      )
      return result
    } catch (err) {
      error.value = mapPasskeyError(err, '通行密钥注册失败')
      throw err
    } finally {
      loading.value = false
    }
  }

  async function login(email: string) {
    loading.value = true
    error.value = ''
    try {
      const start = await webauthnLoginStart(email)
      const assertion = await startAuthentication(start.options as any)
      const result = await webauthnLoginFinish(start.userId, assertion)
      return result
    } catch (err) {
      error.value = mapPasskeyError(err, '通行密钥登录失败')
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    error,
    isSupported,
    register,
    login
  }
}
