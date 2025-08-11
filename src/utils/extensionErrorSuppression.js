// Chrome Extension Error Suppression
// Bu dosya tarayıcı eklentilerinden gelen hataları susturur

/**
 * Chrome eklentilerinden gelen "message channel closed" hatalarını sustur
 * Bu hatalar genellikle AdBlock, uBlock Origin gibi eklentilerden kaynaklanır
 */
export function suppressExtensionErrors() {
  // Console.error'larını filtrele // cspell:disable-line
  const originalError = console.error
  console.error = (...args) => {
    const message = args.join(' ')

    // Chrome extension hatalarını sustur
    if (
      message.includes('message channel closed') ||
      message.includes('Extension context invalidated') ||
      message.includes('listener indicated an asynchronous response') ||
      message.includes('Unchecked runtime.lastError')
    ) {
      return // Bu hataları gösterme
    }

    // Diğer hataları normal şekilde göster
    originalError.apply(console, args)
  }

  // Window error event'ini yakala
  window.addEventListener('error', (event) => {
    const message = event.message || ''

    if (
      message.includes('message channel closed') ||
      message.includes('Extension context invalidated') ||
      message.includes('listener indicated an asynchronous response')
    ) {
      event.preventDefault()
      return false
    }
  })

  // Promise rejection'larını yakala // cspell:disable-line
  window.addEventListener('unhandledrejection', (event) => {
    const message = event.reason?.message || event.reason || ''

    if (
      message.includes('message channel closed') ||
      message.includes('Extension context invalidated') ||
      message.includes('listener indicated an asynchronous response')
    ) {
      event.preventDefault()
      return false
    }
  })

  console.log('🔇 Chrome extension error suppression active')
}

/**
 * Geliştirme ortamında ek bilgiler göster
 */
export function setupDevelopmentHelpers() {
  if (import.meta.env.DEV) {
    // Firebase connection status checker
    window.checkFirebaseStatus = () => {
      const checks = {
        auth: 'http://localhost:9099',
        firestore: 'http://localhost:8080', // cspell:disable-line
        database: 'http://localhost:9000',
        functions: 'http://localhost:5001',
        ui: 'http://localhost:4000',
      }

      console.log('🔍 Firebase Emulator Status Check:')

      Object.entries(checks).forEach(async ([service, url]) => {
        try {
          // Fetch ile bağlantı testi - response'a bakmaya gerek yok
          await fetch(url)
          console.log(`✅ ${service}: Connected (${url})`)
        } catch {
          // Hata detayına ihtiyaç yok
          console.log(`❌ ${service}: Disconnected (${url})`)
        }
      })
    }

    // Global error tracker
    window.errorCount = 0
    const originalError = console.error
    console.error = (...args) => {
      window.errorCount++
      originalError.apply(console, args)
    }

    console.log('🛠️ Development helpers loaded')
    console.log('💡 Run window.checkFirebaseStatus() to check emulator connections')
  }
}
