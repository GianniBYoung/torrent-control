import {
    clientList,
    loadOptions,
    saveOptions,
    getClient,
    isMagnetUrl,
    getHostFilter,
    getTorrentName,
    getMagnetUrlName,
} from './util.js';

var options;

chrome.storage.onChanged.addListener((changes) => {
    Object.keys(changes).forEach((key) => options[key] = changes[key].newValue);

    removeContextMenu();

    if (options.globals.contextMenu && isConfigured())
        createContextMenu();

    createDefaultMenu();
});

loadOptions().then((newOptions) => {
    options = newOptions;

    if (options.globals.contextMenu && isConfigured())
        createContextMenu();

    createDefaultMenu();
    registerHandler();
});

const isConfigured = () => options.servers[0].hostname !== '';

const addTorrent = (url, tabId, torrentOptions = {}) => {
    const serverSettings = options.servers[0];

    const addTorrentOptions = {
        paused: false,
        path: serverSettings.defaultDirectory || null,
        label: serverSettings.defaultLabel || null,
        ...torrentOptions,
    };

    const connection = getClient(serverSettings);
    const networkErrors = [
        'NetworkError when attempting to fetch resource.',
    ];

    if (isMagnetUrl(url)) {
        connection.logIn()
            .then(() => connection.addTorrentUrl(url, addTorrentOptions)
                .then(() => {
                    const torrentName = getMagnetUrlName(url);
                    notification(chrome.i18n.getMessage('torrentAddedNotification') + (torrentName ? ' ' + torrentName : ''));
                    connection.logOut();
                })
            ).catch((error) => {
                connection.removeEventListeners();

                if (networkErrors.includes(error.message))
                    notification('❌ ' + chrome.i18n.getMessage('torrentAddError', 'Network error'));
                else
                    notification('❌ ' + error.message);
            });
    } else {
        fetchTorrent(url, tabId)
            .then(({torrent, torrentName}) => connection.logIn()
                .then(() => connection.addTorrent(torrent, addTorrentOptions)
                    .then(() => {
                        notification(chrome.i18n.getMessage('torrentAddedNotification') + (torrentName ? ' ' + torrentName : ''));
                        connection.logOut();
                    })
                )
            ).catch((error) => {
                connection.removeEventListeners();

                if (networkErrors.includes(error.message))
                    notification('❌ ' + chrome.i18n.getMessage('torrentAddError', 'Network error'));
                else
                    notification('❌ ' + error.message);
            });
    }
}

export const fetchTorrent = (url, tabId) => {
    return new Promise(async (resolve, reject) => {
        if (tabId === null || await tabExists(tabId) === false) {
            return reject(new Error(chrome.i18n.getMessage('sourceTabDestroyedError')));
        }

        chrome.tabs.sendMessage(tabId, {
            type: 'fetchTorrent',
            url: url,
        }, (response) => {
            if (response instanceof Error)
                return reject(response);

            if (!response.ok)
                return reject(new Error(chrome.i18n.getMessage('torrentFetchError', response.status.toString() + ': ' + response.statusText)));

            if (response.content.type !== '' && !response.content.type.match(/(application\/x-bittorrent|application\/octet-stream)/gi))
                return reject(new Error(chrome.i18n.getMessage('torrentParseError', 'Unknown type: ' + response.content.type)));

            getTorrentName(response.content).then((name) => resolve({
                torrent: response.content,
                torrentName: name,
            }));
        })
    });
}

const createDefaultMenu = () => {
    chrome.contextMenus.create({
        id: 'add-paused',
        type: 'checkbox',
        checked: options.globals.addPaused,
        title: chrome.i18n.getMessage('addPausedOption'),
        contexts: ['browser_action']
    });
}

const createContextMenu = () => {
    const serverOptions = options.servers[0];

    chrome.contextMenus.create({
      id: 'add-torrent',
      title: chrome.i18n.getMessage('addTorrentAction'),
      contexts: ['link']
    });

    if (options.globals.contextMenu === 1) {
        chrome.contextMenus.create({
          id: 'add-torrent-advanced',
          title: chrome.i18n.getMessage('addTorrentAction') + ' (' + chrome.i18n.getMessage('advancedModifier') + ')',
          contexts: ['link']
        });

        if (options.globals.labels.length) {
            chrome.contextMenus.create({
                id: 'add-torrent-label',
                title: chrome.i18n.getMessage('addTorrentLabelAction'),
                contexts: ['link']
            });

            options.globals.labels.forEach((label, i) => {
                chrome.contextMenus.create({
                    id: 'add-torrent-label-' + i,
                    parentId: 'add-torrent-label',
                    title: label,
                    contexts: ['link']
                });
            });
        }

        if (serverOptions.directories.length) {
            chrome.contextMenus.create({
                id: 'add-torrent-path',
                title: chrome.i18n.getMessage('addTorrentPathAction'),
                contexts: ['link']
            });

            serverOptions.directories.forEach((directory, i) => {
                chrome.contextMenus.create({
                    id: 'add-torrent-path-' + i,
                    parentId: 'add-torrent-path',
                    title: directory,
                    contexts: ['link']
                });
            });
        }
    } else {
        if (options.globals.labels.length) {
            chrome.contextMenus.create({
                contexts: ['link'],
                type: 'separator'
            });

            options.globals.labels.forEach((label, i) => {
                chrome.contextMenus.create({
                    id: 'add-torrent-label-' + i,
                    title: label,
                    contexts: ['link']
                });
            });
        }

        if (serverOptions.directories.length) {
            chrome.contextMenus.create({
                contexts: ['link'],
                type: 'separator'
            });

            serverOptions.directories.forEach((directory, i) => {
                chrome.contextMenus.create({
                    id: 'add-torrent-path-' + i,
                    title: directory,
                    contexts: ['link']
                });
            });
        }
    }
}

const removeContextMenu = () => {
    chrome.contextMenus.removeAll();
}

const registerHandler = () => {
    chrome.contextMenus.onClicked.addListener((info, tab) => {
        const labelId = info.menuItemId.match(/^add-torrent-label-(\d+)$/);
        const pathId = info.menuItemId.match(/^add-torrent-path-(\d+)$/);

        const clientOptions = options.servers[0].clientOptions || {};

        if (info.menuItemId === 'add-paused')
            toggleAddPaused();
        else if (info.menuItemId === 'add-torrent')
            addTorrent(info.linkUrl, tab.id, {
                paused: options.globals.addPaused,
                ...clientOptions
            });
        else if (labelId)
            addTorrent(info.linkUrl, tab.id, {
                paused: options.globals.addPaused,
                label: options.globals.labels[~~labelId[1]],
                ...clientOptions
            });
        else if (pathId)
            addTorrent(info.linkUrl, tab.id, {
                paused: options.globals.addPaused,
                path: options.servers[0].directories[~~pathId[1]],
                ...clientOptions
            });
        else if (info.menuItemId === 'add-torrent-advanced')
            addAdvancedDialog(info.linkUrl, !isMagnetUrl(info.linkUrl) ? tab.id : null);
    });

    chrome.browserAction.onClicked.addListener(async () => {
        if (!isConfigured()) {
            chrome.runtime.openOptionsPage();

            return;
        }

        const {hostname, username, password} = options.servers[0];

        const tab = await new Promise((resolve) => {
            chrome.tabs.create({
                url: hostname,
            }, (tab) => resolve(tab));
        });

        if (username && password) {
            let pendingRequests = [];

            const onAuthRequiredListener = (details) => {
                if (pendingRequests.includes(details.requestId)) {
                    return;
                }

                pendingRequests.push(details.requestId);

                return {
                    authCredentials: {
                        username: username,
                        password: password,
                    },
                };
            };

            const onAuthCompletedListener = (details) => {
                let index = pendingRequests.indexOf(details.requestId);

                if (index > -1) {
                    pendingRequests.splice(index, 1);
                }
            };

            chrome.webRequest.onAuthRequired.addListener(
                onAuthRequiredListener,
                {
                    urls: [getHostFilter(hostname)],
                    tabId: tab.id,
                },
                ['blocking'],
            );

            chrome.webRequest.onCompleted.addListener(
                onAuthCompletedListener,
                {
                    urls: [getHostFilter(hostname)],
                    tabId: tab.id,
                },
            );

            chrome.webRequest.onErrorOccurred.addListener(
                onAuthCompletedListener,
                {
                    urls: [getHostFilter(hostname)],
                    tabId: tab.id,
                },
            );

            const onTabRemovedListener = (tabId) => {
                if (tabId !== tab.id) {
                    return;
                }

                chrome.webRequest.onAuthRequired.removeListener(onAuthRequiredListener);
                chrome.webRequest.onCompleted.removeListener(onAuthCompletedListener);
                chrome.webRequest.onErrorOccurred.removeListener(onAuthCompletedListener);

                chrome.tabs.onRemoved.removeListener(onTabRemovedListener);
            }

            chrome.tabs.onRemoved.addListener(onTabRemovedListener)
        }
    });

    chrome.webRequest.onBeforeRequest.addListener((details) => {
            let parser = document.createElement('a');
            parser.href = details.url;
            let magnetUri = decodeURIComponent(parser.pathname).substr(1);

            if (options.globals.addAdvanced) {
                addAdvancedDialog(magnetUri);
            } else {
                const clientOptions = options.servers[0].clientOptions || {};
                addTorrent(magnetUri, null, {
                    paused: options.globals.addPaused,
                    ...clientOptions
                });
            }
            return {cancel: true}
        },
        {urls: ['https://torrent-control.invalid/*']},
        ['blocking']
    );

    chrome.runtime.onMessage.addListener(
        (request, sender, sendResponse) => {
            if (request.type === 'addTorrent') {
                const clientOptions = options.servers[0].clientOptions || {};

                addTorrent(request.url, request.tabId, {
                    ...clientOptions,
                    ...request.options
                });
            }
        }
    );
}

const addAdvancedDialog = (url, tabId = null) => {
    let params = new URLSearchParams();
    params.append('url', url);

    if (tabId) {
        params.append('tabId', tabId);
    }

    const height = 450;
    const width = 500;
    const top = Math.round((screen.height / 2) - (height / 2));
    const left = Math.round((screen.width / 2) - (width / 2));

    chrome.windows.create({
        url: 'view/add_torrent.html?' + params.toString(),
        type: 'panel',
        top: top,
        left: left,
        height: height,
        width: width,

        // @crossplatform allowScriptsToClose, titlePreface are Firefox specific
        allowScriptsToClose: true,
        titlePreface: chrome.i18n.getMessage('addTorrentAction')
    });
}

/**
 * @param tabId {number}
 * @returns {Promise<boolean>}
 */
const tabExists = (tabId) => {
    return new Promise((resolve) => {
        chrome.tabs.get(tabId, (tab) => resolve(tab !== undefined));
    });
}

export const notification = (message) => {
    if (options && !options.globals.enableNotifications) {
        return;
    }

    chrome.notifications.create({
        type: 'basic',
        iconUrl: chrome.runtime.getURL('icon/default-48.png'),
        title: 'Torrent Control',
        message: message
    }, (id) => setTimeout(() => chrome.notifications.clear(id), 5000));
}

const toggleAddPaused = () => {
    options.globals.addPaused = !options.globals.addPaused;
    saveOptions(options);
}
