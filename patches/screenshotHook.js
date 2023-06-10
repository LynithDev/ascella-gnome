const { _storeScreenshot, ScreenshotUI } = imports.ui.screenshot;
const { Cogl, Gio, GLib, St } = imports.gi;
const MessageTray = imports.ui.messageTray;
const Main = imports.ui.main;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const Spawn = Me.imports.lib.spawn;

var ScreenshotHook = class ScreenshotHook {
    constructor(settings) {
        this.settings = settings;
        this.originalStoreScreenshotFunction = null;
    }

    enable() {
        this.originalStoreScreenshotFunction = _storeScreenshot;

        const SETTINGS = this.settings;
        imports.ui.screenshot._storeScreenshot = function (bytes, pixbuf) {
            const clipboard = St.Clipboard.get_default();
            clipboard.set_content(St.ClipboardType.CLIPBOARD, 'image/png', bytes);
            const time = GLib.DateTime.new_now_local();

            let file;
        
            function* suffixes() {
                yield '';
        
                for (let i = 1; ; i++)
                    yield `-${i}`;
            }
        
            function saveRecentFile(screenshotFile) {
                const recentFile =
                    GLib.build_filenamev([GLib.get_user_data_dir(), 'recently-used.xbel']);
                const uri = screenshotFile.get_uri();
                let bookmarks;
                try {
                    bookmarks = new GLib.BookmarkFile();
                    bookmarks.load_from_file(recentFile);
                } catch (e) {
                    if (!e.matches(GLib.BookmarkFileError, GLib.BookmarkFileError.FILE_NOT_FOUND)) {
                        log(`Could not open recent file ${uri}: ${e.message}`);
                        return;
                    }
                }
        
                try {
                    bookmarks.add_application(uri, GLib.get_prgname(), 'gio open %u');
                    bookmarks.to_file(recentFile);
                } catch (e) {
                    log(`Could not save recent file ${uri}: ${e.message}`);
                }
            }
        
            const lockdownSettings =
                new Gio.Settings({ schema_id: 'org.gnome.desktop.lockdown' });
            const disableSaveToDisk =
                lockdownSettings.get_boolean('disable-save-to-disk');
        
            if (!disableSaveToDisk) {
                const dir = Gio.File.new_for_path(GLib.build_filenamev([
                    GLib.get_user_special_dir(GLib.UserDirectory.DIRECTORY_PICTURES) || GLib.get_home_dir(),
                    _('Screenshots'),
                ]));
        
                try {
                    dir.make_directory_with_parents(null);
                } catch (e) {
                    if (!e.matches(Gio.IOErrorEnum, Gio.IOErrorEnum.EXISTS))
                        throw e;
                }
        
                const timestamp = time.format('%Y-%m-%d %H-%M-%S');
                const name = _('Screenshot from %s').format(timestamp);
        
                for (const suffix of suffixes()) {
                    file = Gio.File.new_for_path(GLib.build_filenamev([
                        dir.get_path(), `${name}${suffix}.png`,
                    ]));
        
                    try {
                        const stream = file.create(Gio.FileCreateFlags.NONE, null);
                        stream.write_bytes(bytes, null);
                        break;
                    } catch (e) {
                        if (!e.matches(Gio.IOErrorEnum, Gio.IOErrorEnum.EXISTS))
                            throw e;
                    }
                }
        
                saveRecentFile(file);
            }
        
            const pixels = pixbuf.read_pixel_bytes();
            const content =
                St.ImageContent.new_with_preferred_size(pixbuf.width, pixbuf.height);
            content.set_bytes(
                pixels,
                Cogl.PixelFormat.RGBA_8888,
                pixbuf.width,
                pixbuf.height,
                pixbuf.rowstride
            );
        
            const source = new MessageTray.Source(
                _('Screenshot'),
                'screenshot-recorded-symbolic'
            );
            const notification = new MessageTray.Notification(
                source,
                _('Screenshot captured'),
                _('You can paste the image from the clipboard.'),
                { datetime: time, gicon: content }
            );
        
            if (!disableSaveToDisk) {
                notification.addAction(_('Show in Files'), () => {
                    const app =
                        Gio.app_info_get_default_for_type('inode/directory', false);
        
                    if (app === null) {
                        log('Error showing in files: no default app set for inode/directory');
                        return;
                    }
        
                    app.launch([file], global.create_app_launch_context(0, -1));
                });

                notification.connect('activated', () => {
                    try {
                        Gio.app_info_launch_default_for_uri(
                            file.get_uri(), global.create_app_launch_context(0, -1));
                    } catch (err) {
                        logError(err, 'Error opening screenshot');
                    }
                });

                if (SETTINGS.get_boolean('upload')) {
                    const reader = new Spawn.SpawnReader();

                    const ascella = {
                        link: undefined,
                        delete: undefined
                    }

                    reader.spawn("./", [SETTINGS.get_string("ascella-bin"), "upload", file.get_path()], (line) => {
                        const split = new TextDecoder().decode(line).split(" ");
                        
                        if (!ascella.delete && ascella.link) {
                            ascella.delete = split[2];
                        }

                        if (!ascella.link) {
                            ascella.link = split[2];
                        }

                        if (ascella.link && ascella.delete) {
                            notification.addAction(_('Open URL'), () => {
                                try {
                                    Gio.app_info_launch_default_for_uri(
                                        ascella.link, global.create_app_launch_context(0, -1));
                                } catch (err) {
                                    console.error(err, 'Error opening screenshot');
                                }
                            });

                            notification.addAction(_('Delete from Ascella'), () => {
                                try {
                                    Gio.app_info_launch_default_for_uri(
                                        ascella.delete, global.create_app_launch_context(0, -1));
                                } catch (err) {
                                    console.error(err, 'Error opening screenshot');
                                }
                            });

                            notification.setTransient(true);
                            Main.messageTray.add(source);
                            source.showNotification(notification);
                            return;
                        }
                    });
                    return;
                }
            }
        
            notification.setTransient(true);
            Main.messageTray.add(source);
            source.showNotification(notification);
        }
    }

    disable() {
        imports.ui.screenshot._storeScreenshot = this.originalStoreScreenshotFunction;
        this.originalStoreScreenshotFunction = null;
    }
}