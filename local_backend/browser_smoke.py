import asyncio
from urllib.parse import quote

from browser_use import BrowserProfile, BrowserSession


async def main() -> None:
    browser = BrowserSession(
        browser_profile=BrowserProfile(
            headless=True,
            user_data_dir=None,
            keep_alive=False,
            enable_default_extensions=False,
        )
    )

    await browser.start()
    try:
        html = "<title>SHAMYLI Smoke</title><main>Browser Use local smoke PASS</main>"
        await browser.navigate_to("data:text/html," + quote(html))

        screenshot = await browser.take_screenshot(full_page=False)
        current_url = await browser.get_current_page_url()
        current_title = await browser.get_current_page_title()

        assert screenshot and len(screenshot) > 100, "Browser screenshot was empty"
        assert current_url.startswith("data:text/html,"), current_url
        assert current_title == "SHAMYLI Smoke", current_title
        print("SHAMYLI local Browser Use smoke: PASS")
    finally:
        await browser.kill()


if __name__ == "__main__":
    asyncio.run(main())
