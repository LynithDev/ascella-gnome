const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const { Adw, Gio, Gtk } = imports.gi;

function init() {

}

function fillPreferencesWindow(window) {
    const settings = ExtensionUtils.getSettings();

    const page = new Adw.PreferencesPage();
    window.add(page);

    const group = new Adw.PreferencesGroup();
    group.title = 'Ascella';
    page.add(group);

    const row = new Adw.EntryRow();
    row.title = 'Ascella Bin';
    row.description = 'The path to the Ascella binary';
    row.text = settings.get_string('ascella-bin');
    row.set_show_apply_button(true);

    row.connect('apply', (entry) => {
        settings.set_string('ascella-bin', entry.text);
    });

    group.add(row);
}