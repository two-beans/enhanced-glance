// Content script for Modifier Link Clicker

// Pattern matching helpers (top-level for testability)
function wildcardMatch(pattern, str) {
  // Convert wildcard pattern to RegExp
  const re = new RegExp('^' + pattern.replace(/[.+^${}()|[\\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$');
  return re.test(str);
}

function patternToRegex(pattern) {
  if (pattern.startsWith('/')) {
    // If pattern ends with '/*', require at least one character after the slash
    let pat = pattern;
    pat = pat.replace(/\/\*$/, '/[^/]+');
    return new RegExp('^' + pat.replace(/[.+^${}()|[\\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$');
  } else {
    let pat = pattern;
    if (!/^https?:\/\//.test(pat)) {
      const protoOptional = 'https?:\/\/';
      pat = pat.replace(/^\/*/, '');
      pat = protoOptional + pat;
    }
    // If pattern ends with '/*', require at least one character after the slash
    pat = pat.replace(/\/\*$/, '/[^/]+');
    return new RegExp('^' + pat.replace(/[.+^${}()|[\\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$');
  }
}

// Simulate click with modifier (top-level)
function simulateModifiedClick(link, modifier) {
  const evt = new MouseEvent("click", {
    bubbles: true,
    cancelable: true,
    view: window,
    [modifier]: true
  });
  link.dispatchEvent(evt);
}

// Main extension logic
if (typeof window !== 'undefined' && typeof browser !== 'undefined') {
  let clickHandler = null;
  let enabled = true;

  function setupClickHandler(patterns, modifierKey) {
    if (clickHandler) {
      document.removeEventListener("click", clickHandler, true);
    }
    clickHandler = function(e) {
      const a = e.target.closest("a[href]");
      if (!a) return;
      // Only left click, no modifier
      if (e.button !== 0 || e.altKey || e.ctrlKey || e.shiftKey || e.metaKey) return;
      // Determine what to match against
      const url = new URL(a.href, location.origin);
      const fullUrl = url.protocol + '//' + url.hostname + url.pathname;
      const linkPath = url.pathname;
      let matched = false;
      patterns.forEach(pattern => {
        let testPattern = pattern;
        if (testPattern.startsWith('/')) {
          if (wildcardMatch(testPattern, linkPath)) {
            matched = true;
          }
        } else {
          let pat = testPattern;
          if (!/^https?:\/\//.test(pat)) {
            const protoOptional = 'https?:\/\/';
            pat = pat.replace(/^\/*/, '');
            pat = protoOptional + pat;
          }
          const re = new RegExp('^' + pat.replace(/[.+^${}()|[\\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$');
          if (re.test(fullUrl)) {
            matched = true;
          }
        }
      });
      if (!matched) return;
      e.preventDefault();
      e.stopPropagation();
      simulateModifiedClick(a, modifierKey || "altKey");
    };
    document.addEventListener("click", clickHandler, true);
  }

  async function applySettings() {
    const { globalWhitelist, modifierKey, extensionEnabled } = await new Promise(resolve => browser.storage.local.get(["globalWhitelist", "modifierKey", "extensionEnabled"]).then(resolve));
    enabled = extensionEnabled !== false;
    if (enabled) {
      const patterns = Array.isArray(globalWhitelist) ? globalWhitelist : [];
      if (patterns.length) {
        setupClickHandler(patterns, modifierKey);
      }
    } else {
      if (clickHandler) {
        document.removeEventListener("click", clickHandler, true);
        clickHandler = null;
      }
    }
  }

  applySettings();

  browser.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && (changes.extensionEnabled || changes.globalWhitelist || changes.modifierKey)) {
      applySettings();
    }
  });
}

// Exported for testing (Node.js/CommonJS)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    wildcardMatch,
    patternToRegex
  };
} 