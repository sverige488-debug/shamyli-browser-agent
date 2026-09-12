"""Fast contract smoke tests for the thin modern-UI -> Browser Use adapters.

This intentionally does not launch a browser. The real browser launch is already
covered by browser_smoke.py on Windows and Ubuntu. Here we verify that modern UI
contracts translate into Browser Use 0.13.10 native profile/agent fields.
"""

from app import BrowserSettings, RunRequest, browser_settings_snapshot, build_browser_session


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
        saveRecordingPath="./tmp/recordings",
        tracePath="./tmp/traces",
        saveDownloadPath="./tmp/downloads",
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
    assert str(profile.record_video_dir).replace("\\", "/").endswith("tmp/recordings")
    assert str(profile.traces_dir).replace("\\", "/").endswith("tmp/traces")
    assert str(profile.downloads_path).replace("\\", "/").endswith("tmp/downloads")

    api_shape = browser_settings_snapshot(settings)
    assert api_shape["keepBrowserOpen"] is True
    assert api_shape["cdpUrl"] == "http://127.0.0.1:9222"
    assert api_shape["windowWidth"] == 1440
    assert api_shape["windowHeight"] == 900
    assert api_shape["saveRecordingPath"] == "./tmp/recordings"
    assert api_shape["tracePath"] == "./tmp/traces"
    assert api_shape["saveDownloadPath"] == "./tmp/downloads"

    run = RunRequest(task="smoke", maxSteps=12, maxActionsPerStep=3, useVision=False)
    assert run.max_steps == 12
    assert run.max_actions_per_step == 3
    assert run.use_vision is False

    print("SHAMYLI settings adapter smoke: PASS")


if __name__ == "__main__":
    main()
