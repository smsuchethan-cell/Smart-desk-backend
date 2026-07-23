"""Lightweight User-Agent parsing — no external dependency, just enough
regex/substring matching to label a scan with a device + browser name for
the admin dashboard. Not exhaustive, but covers the common cases."""


def parse_user_agent(ua: str):
    """Returns (device, browser) parsed from a raw User-Agent header string."""
    if not ua:
        return "Unknown", "Unknown"

    if "iPhone" in ua:
        device = "iPhone"
    elif "iPad" in ua:
        device = "iPad"
    elif "Android" in ua:
        device = "Android"
    elif "Macintosh" in ua:
        device = "Mac"
    elif "Windows" in ua:
        device = "Windows"
    elif "Linux" in ua:
        device = "Linux"
    else:
        device = "Unknown"

    # Order matters — Chrome/Edge UAs also contain "Safari"; iOS Chrome/Firefox
    # UAs contain "Safari"/"Firefox" substrings too, so check the iOS-specific
    # tokens (CriOS/FxiOS) before the generic ones.
    if "EdgA" in ua or "Edg/" in ua:
        browser = "Edge"
    elif "SamsungBrowser" in ua:
        browser = "Samsung Internet"
    elif "CriOS" in ua:
        browser = "Chrome"
    elif "FxiOS" in ua:
        browser = "Firefox"
    elif "Firefox" in ua:
        browser = "Firefox"
    elif "Chrome" in ua:
        browser = "Chrome"
    elif "Safari" in ua:
        browser = "Safari"
    else:
        browser = "Unknown"

    return device, browser
