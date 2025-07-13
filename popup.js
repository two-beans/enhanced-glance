// Enhanced popup.js with save pulse animation

function getDomain(url) {
  try {
    return new URL(url).hostname
  } catch {
    return null
  }
}

function getPath(url) {
  try {
    return new URL(url).pathname
  } catch {
    return "/"
  }
}

function updateToggleState(toggle, enabled) {
  if (enabled) {
    toggle.classList.add("active")
  } else {
    toggle.classList.remove("active")
  }
}

function updateUIState(enabled) {
  const whitelistGroup = document.getElementById("whitelistGroup")
  const whitelistArea = document.getElementById("whitelistArea")

  if (enabled) {
    whitelistGroup.classList.remove("disabled")
    whitelistArea.disabled = false
  } else {
    whitelistGroup.classList.add("disabled")
    whitelistArea.disabled = true
  }
}

function showSaveAnimation() {
  const whitelistGroup = document.getElementById("whitelistGroup")
  whitelistGroup.classList.add("saving")

  setTimeout(() => {
    whitelistGroup.classList.remove("saving")
  }, 600)
}

document.addEventListener("DOMContentLoaded", async () => {
  const whitelistArea = document.getElementById("whitelistArea")
  const enableToggle = document.getElementById("enableToggle")
  const modifierSegmentedControl = document.getElementById("modifierSegmentedControl")
  const modifierButtons = modifierSegmentedControl.querySelectorAll(".segment-button")

  // Declare browser and chrome variables
  const browser = window.browser || window.chrome
  const chrome = window.chrome || window.browser
  const storage = typeof browser !== "undefined" ? browser.storage : chrome.storage

  // Load settings from storage
  const result = await new Promise((resolve) => {
    storage.local.get(["globalWhitelist", "modifierKey", "extensionEnabled"], resolve)
  })

  let { globalWhitelist, modifierKey, extensionEnabled } = result

  // Set initial filter if not present
  if (!Array.isArray(globalWhitelist) || globalWhitelist.length === 0) {
    globalWhitelist = ['*.reddit.com/r/*/comments/*']
    await new Promise((resolve) => {
      storage.local.set({ globalWhitelist }, resolve)
    })
  }

  // Initialize UI
  const patterns = Array.isArray(globalWhitelist) ? globalWhitelist : []
  whitelistArea.value = patterns.join("\n")

  // Set active modifier button
  let currentModifier = modifierKey || "altKey"
  modifierButtons.forEach(btn => {
    if (btn.dataset.modifier === currentModifier) {
      btn.classList.add("active")
    } else {
      btn.classList.remove("active")
    }
  })

  // Modifier button click event
  modifierButtons.forEach(btn => {
    btn.addEventListener("click", async () => {
      modifierButtons.forEach(b => b.classList.remove("active"))
      btn.classList.add("active")
      await new Promise((resolve) => {
        storage.local.set({ modifierKey: btn.dataset.modifier }, resolve)
      })
    })
  })

  const enabled = extensionEnabled !== false
  updateToggleState(enableToggle, enabled)
  updateUIState(enabled)

  // Toggle switch functionality
  enableToggle.addEventListener("click", async () => {
    const newState = !enableToggle.classList.contains("active")
    updateToggleState(enableToggle, newState)
    updateUIState(newState)
    await new Promise((resolve) => {
      storage.local.set({ extensionEnabled: newState }, resolve)
    })
    enableToggle.style.transform = "scale(0.95)"
    setTimeout(() => {
      enableToggle.style.transform = ""
    }, 100)
  })

  // Auto-save functionality for textarea with pulse animation
  let saveTimeout
  whitelistArea.addEventListener("input", () => {
    clearTimeout(saveTimeout)
    saveTimeout = setTimeout(async () => {
      if (enableToggle.classList.contains("active")) {
        const newPatterns = whitelistArea.value
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean)
        await new Promise((resolve) => {
          storage.local.set({ globalWhitelist: newPatterns }, resolve)
        })
        showSaveAnimation()
      }
    }, 500)
  })

  // Smooth focus effects
  whitelistArea.addEventListener("focus", () => {
    whitelistArea.parentElement.style.boxShadow = "0 0 0 3px rgba(0, 122, 255, 0.2)"
  })
  whitelistArea.addEventListener("blur", () => {
    whitelistArea.parentElement.style.boxShadow = ""
  })
  modifierButtons.forEach(btn => {
    btn.addEventListener("focus", () => {
      btn.parentElement.style.boxShadow = "0 0 0 3px rgba(0, 122, 255, 0.2)"
    })
    btn.addEventListener("blur", () => {
      btn.parentElement.style.boxShadow = ""
    })
  })
})
