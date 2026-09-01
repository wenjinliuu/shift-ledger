import XCTest

/// 走一遍三个主页面并截图。产物用于 App Store 素材，也用于界面自查。
/// 用 `--demo-data` 启动，App 会加载示例班表而不读写用户数据。
final class ScreenshotTests: XCTestCase {

    private var app: XCUIApplication!

    override func setUp() {
        continueAfterFailure = false
        app = XCUIApplication()
        app.launchArguments += ["--demo-data"]
        app.launch()
    }

    func testCaptureMainScreens() {
        capture("01-calendar")

        tapTab("统计")
        capture("02-stats")

        tapTab("设置")
        capture("03-settings")

        tapTab("日历")
        // 打开循环排班，展示模板与序列
        let generator = app.buttons["循环排班"]
        if generator.waitForExistence(timeout: 5) {
            generator.tap()
            capture("04-cycle-generator")
            dismissSheet()
        }

        // 点日历上的一天，展示逐日编辑
        let firstDay = app.scrollViews.buttons.firstMatch
        if firstDay.waitForExistence(timeout: 3) {
            firstDay.tap()
            capture("05-day-editor")
        }
    }

    // MARK: - 工具

    private func tapTab(_ label: String) {
        let tab = app.tabBars.buttons[label]
        XCTAssertTrue(tab.waitForExistence(timeout: 10), "找不到标签：\(label)")
        tab.tap()
        // 等一帧，避免截到转场中间态
        Thread.sleep(forTimeInterval: 1.2)
    }

    private func dismissSheet() {
        let cancel = app.buttons["取消"]
        if cancel.exists { cancel.tap() }
        Thread.sleep(forTimeInterval: 0.8)
    }

    private func capture(_ name: String) {
        let screenshot = XCUIScreen.main.screenshot()
        let attachment = XCTAttachment(screenshot: screenshot)
        attachment.name = name
        attachment.lifetime = .keepAlways
        add(attachment)
    }
}
