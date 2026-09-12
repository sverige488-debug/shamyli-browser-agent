"""Fast contract smoke test for the Web UI -> BrowserProfile settings adapter.

This intentionally does not launch a browser. The real browser launch is already
covered by browser_smoke.py on Windows and Ubuntu. Here we only verify that the
modern UI contract is translated into Browser Use 0.13.10 native profile fields.
"""

from app import BrowserSettings, browser_settings_snapshot, build_browser_session


def main() -> None:
    settings = BrowserSettings(
        browserBinaryPath="",
        browserUserDataDir="",
        useOwnBrowser=False,
        keepBrowserOpen=True,
        headless=False,
        disableSecurity=False,
        cdpUrl="http://127.0.0.1:9222",
        windowWidth=1440,
        windowHeight=900,
    )

    session = build_browser_session(settings)
    profile = session.browser_profile

    assert profile.cdp_url == "http://127.0.0.1:9222"
    assert profile.keep_alive is True
    assert profile.headless is False
    assert profile.disable_security is False
    assert profile.window_size is not None
    assert profile.window_size.width == 1440
    assert profile.window_size.height == 900

    api_shape = browser_settings_snapshot(settings)
    assert api_shape["keepBrowserOpen"] is True
    assert api_shape["cdpUrl"] == "http://127.0.0.1:9222"
    assert api_shape["windowWidth"] == 1440
    assert api_shape["windowHeight"] == 900

    print("SHAMYLI browser settings adapter smoke: PASS")


if __name__ == "__main__":
    main()
