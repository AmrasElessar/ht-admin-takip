// src/utils/__tests__/errorHandler.test.js

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { handleError } from '../errorHandler'

// Mock vue-toastification
const mockToast = {
  error: vi.fn(),
}

vi.mock('vue-toastification', () => ({
  useToast: () => mockToast,
}))

// Mock console.error
const originalConsoleError = console.error
beforeEach(() => {
  console.error = vi.fn()
  mockToast.error.mockClear()
})

afterEach(() => {
  console.error = originalConsoleError
})

describe('errorHandler', () => {
  describe('handleError function', () => {
    it('should log error to console with prefix', () => {
      const testError = new Error('Test error message')
      const userMessage = 'User friendly message'

      handleError(testError, userMessage)

      expect(console.error).toHaveBeenCalledWith('MERKEZİ HATA YAKALAYICI:', testError)
    })

    it('should show toast notification with error message', () => {
      const testError = new Error('Test error message')
      const userMessage = 'User friendly message'

      handleError(testError, userMessage)

      expect(mockToast.error).toHaveBeenCalledWith('Test error message')
    })

    it('should use user message when error has no message', () => {
      const testError = {} // Error object without message
      const userMessage = 'User friendly message'

      handleError(testError, userMessage)

      expect(mockToast.error).toHaveBeenCalledWith('User friendly message')
    })

    it('should use default message when no parameters provided', () => {
      const testError = {} // Error object without message

      handleError(testError)

      expect(mockToast.error).toHaveBeenCalledWith('Beklenmedik bir hata oluştu.')
    })

    it('should prefer error.message over user message', () => {
      const testError = new Error('Original error message')
      const userMessage = 'User friendly message'

      handleError(testError, userMessage)

      expect(mockToast.error).toHaveBeenCalledWith('Original error message')
    })

    it('should handle Firebase errors correctly', () => {
      const firebaseError = {
        code: 'auth/user-not-found',
        message: 'Firebase: There is no user record corresponding to this identifier.',
      }

      handleError(firebaseError, 'Kullanıcı bulunamadı')

      expect(mockToast.error).toHaveBeenCalledWith(
        'Firebase: There is no user record corresponding to this identifier.',
      )
    })

    it('should handle network errors', () => {
      const networkError = new Error('Network Error')
      networkError.code = 'NETWORK_ERROR'

      handleError(networkError, 'Bağlantı hatası')

      expect(mockToast.error).toHaveBeenCalledWith('Network Error')
    })

    it('should handle undefined/null errors gracefully', () => {
      handleError(null, 'Null error test')
      expect(mockToast.error).toHaveBeenCalledWith('Null error test')

      handleError(undefined, 'Undefined error test')
      expect(mockToast.error).toHaveBeenCalledWith('Undefined error test')
    })
  })

  describe('error logging', () => {
    it('should always log errors to console for debugging', () => {
      const testError = new Error('Debug test')

      handleError(testError, 'User message')

      expect(console.error).toHaveBeenCalledTimes(1)
      expect(console.error).toHaveBeenCalledWith('MERKEZİ HATA YAKALAYICI:', testError)
    })

    it('should log even when toast fails', () => {
      const testError = new Error('Toast failure test')
      mockToast.error.mockImplementation(() => {
        throw new Error('Toast failed')
      })

      // Should not throw, should still log
      expect(() => handleError(testError, 'Test message')).not.toThrow()
      expect(console.error).toHaveBeenCalledWith('MERKEZİ HATA YAKALAYICI:', testError)
    })
  })

  describe('edge cases', () => {
    it('should handle circular reference objects', () => {
      const circularError = {}
      circularError.self = circularError
      circularError.message = 'Circular reference error'

      expect(() => handleError(circularError, 'Circular test')).not.toThrow()
      expect(mockToast.error).toHaveBeenCalledWith('Circular reference error')
    })

    it('should handle very long error messages', () => {
      const longMessage = 'A'.repeat(1000)
      const longError = new Error(longMessage)

      handleError(longError, 'Long message test')

      expect(mockToast.error).toHaveBeenCalledWith(longMessage)
    })

    it('should handle special characters in error messages', () => {
      const specialError = new Error('Error with émojis 🚨 and üñîçødé')

      handleError(specialError, 'Special chars test')

      expect(mockToast.error).toHaveBeenCalledWith('Error with émojis 🚨 and üñîçødé')
    })
  })
})
