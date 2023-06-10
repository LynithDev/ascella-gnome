const { St, Gtk } = imports.gi;
const { ScreenshotUI, Tooltip } = imports.ui.screenshot;

var ScreenshotUIHook = class ScreenshotUIHook {

    constructor(settings) {
        this.settings = settings;
    }

    enable() {
        ScreenshotUI.prototype._originalOpen = ScreenshotUI.prototype.open;

        const SETTINGS = this.settings;
        ScreenshotUI.prototype.open = function () {
            if (!this._ascellaHookInit) {
                this._useAscella = SETTINGS.get_boolean('upload');
                this._useAscellaButton = new St.Button({
                    style_class: 'screenshot-ui-show-pointer-button',
                    icon_name: 'network-workgroup-symbolic',
                    toggle_mode: true,
                });

                this._useAscellaButton.set_style('margin-left: 6px;');

                this._useAscellaButton.checked = this._useAscella;

                this._showPointerButtonContainer.add_child(this._useAscellaButton);
        
                this.add_child(new Tooltip(this._useAscellaButton, {
                    text: 'Upload to Ascella',
                    style_class: 'screenshot-ui-tooltip',
                    visible: false,
                }));

                this._useAscellaButton.connect('notify::checked', () => {
                    this._useAscella = this._useAscellaButton.checked;
                    SETTINGS.set_boolean('upload', this._useAscella);
                });

                this._ascellaHookInit = true;
            }

            return this._originalOpen();
        }
    }
    
    disable() {
        if (ScreenshotUI.prototype._originalOpen) {
            ScreenshotUI.prototype.open = function () {
                this._showPointerButtonContainer.remove_child(this._useAscellaButton);
                this._useAscellaButton.destroy();

                ScreenshotUI.prototype.open = this._originalOpen;
                delete this._useAscellaButton;
                delete this._useAscella;
                delete this._ascellaHookInit;
                delete this._originalOpen;

                return this.open();
            }
        };
    }

}