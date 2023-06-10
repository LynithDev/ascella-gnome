const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const Spawn = Me.imports.lib.spawn;
const { ScreenshotHook } = Me.imports.patches.screenshotHook;
const { ScreenshotUIHook } = Me.imports.patches.screenshotUIHook;

class Extension {
    constructor() {
        this.hook = null;
        this.uiHook = null;
        this.settings = null;
    }

    enable() {
        this.settings = ExtensionUtils.getSettings();

        this.hook = new ScreenshotHook(this.settings);
        this.hook.enable();

        this.uiHook = new ScreenshotUIHook(this.settings);
        this.uiHook.enable();
    }

    disable() {
        this.hook.disable();
        this.hook = null;

        this.uiHook.disable();
        this.uiHook = null;
    }
}

function init() {
    return new Extension();
}
