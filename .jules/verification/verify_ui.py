from playwright.sync_api import sync_playwright

def verify_file_selection(page):
    # Mock the API response for preview since we can't easily go through the full flow
    page.route("**/projects/genproj/api/preview", lambda route: route.fulfill(
        status=200,
        content_type="application/json",
        body='''
        {
            "files": [
                {
                    "type": "folder",
                    "name": "src",
                    "path": "/src",
                    "size": 0,
                    "children": [
                        {
                            "type": "file",
                            "name": "main.js",
                            "path": "/src/main.js",
                            "size": 1024
                        }
                    ]
                },
                {
                    "type": "file",
                    "name": "README.md",
                    "path": "/README.md",
                    "size": 500
                }
            ]
        }
        '''
    ))

    # Mock the authentication state to bypass login
    # This might depend on how the app checks auth, but usually cookies or local storage
    # The memory says: "The genproj page automatically triggers project generation on mount if the URL contains a successful GitHub authentication result"
    # But we want to stay on the confirmation page.
    # The confirmation page expects 'data' from the load function.
    # Since we are testing client-side behavior, we might need to intercept the page load or mock the data passed to the component.
    # However, hitting the page directly might trigger redirects if not authenticated.

    # Let's try to hit the page with some dummy query params that might be expected
    # The page at +page.svelte expects `data` which comes from +page.server.js

    # If we can't easily bypass the server-side checks, we might need to use `page.evaluate` to inject the component or data.
    # But simpler is to mock the network requests if the page makes them.
    # Wait, the file tree is rendered from `data.previewData`.

    # Let's try navigating to the page. If it redirects, we might have issues.
    # The memory says "The genproj tool no longer requires explicit authentication for Doppler, CircleCI, or SonarCloud; only GitHub authentication is enforced for project generation."

    # We can use the memory item: "When verifying genproj preview functionality with Playwright, mocking the API response for **/projects/genproj/api/preview allows for testing the preview pane state without completing the full capability selection flow."
    # But that's for the preview pane (PreviewMode), not the confirmation page.

    # Let's try to mock the page data by intercepting the network request for the data?
    # No, SvelteKit loads data on the server.

    # Alternative: We can use the PreviewMode component test strategy but applied to the full page if possible.
    # Or, we can try to navigate to `/projects/genproj/generate` and see what happens.
    # It likely requires a cookie or session.

    # Let's try to set a cookie if needed.
    # Memory: "The genproj GitHub authentication flow persists user selections (project name, capabilities) across the OAuth redirect by encoding them in a state cookie."

    # Let's try to just visit the page and see if it loads or redirects.
    # If it redirects to login, we might need to simulate a login state.

    # Actually, for UI verification of a specific component's behavior (file tree item),
    # if we can't easily reach the page, we rely on the unit test we just wrote.
    # But the instructions say "If your changes introduce any user-visible modifications... you must call the frontend_verification_instructions tool."

    # I will try to run the app and visit the page.
    # I need to start the app first.

    page.goto("http://localhost:4173/projects/genproj/generate?name=test-project&selected=core")

    # Wait for the page to load.
    # If it redirects to /notauthorised or similar, we know we need auth.
    page.wait_for_timeout(2000)

    # Take a screenshot to see where we are
    page.screenshot(path=".jules/verification/page_load.png")

    # If we are on the generate page, we should see "Confirm Project Generation"
    if page.get_by_text("Confirm Project Generation").is_visible():
        print("On confirmation page")

        # Check if file tree is visible
        # It might be empty if data is missing.
        # The +page.server.js likely constructs the preview data.

        # If the file tree is empty, we can't verify the item selection behavior visually.
        pass
    else:
        print("Not on confirmation page, likely redirected.")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            verify_file_selection(page)
        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()
