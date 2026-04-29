import TransmissionApi from './lib/transmission.js';

export const clientList = [
    {
        id: 'transmission',
        name: 'Transmission',
        addressPlaceholder: 'http://127.0.0.1:9091/',
        clientCapabilities: ['paused', 'label', 'path', 'httpAuth']
    }
];

export const getClient = (serverSettings) => {
    return new TransmissionApi(serverSettings);
}

export const loadOptions = () => {
    const defaults = {
        globals: {
            addPaused: false,
            addAdvanced: false,
            contextMenu: 1,
            enableNotifications: true,
            labels: []
        },
        servers: [
            {
                name: 'Default',
                application: 'transmission',
                hostname: '',
                username: '',
                password: '',
                directories: [],
                clientOptions: {},
                httpAuth: null,
                defaultLabel: null,
                defaultDirectory: null,
            }
        ]
    };

    return new Promise((resolve) => {
        chrome.storage.local.get(['globals', 'servers'], (options) => {
            mergeObjects(defaults, options);
            // Ensure only one server exists
            if (defaults.servers.length > 1) {
                defaults.servers = [defaults.servers[0]];
            }
            resolve(defaults);
        });
    });
}

export const saveOptions = (options) => {
    return chrome.storage.local.set(options);
}

export const isMagnetUrl = (url) => {
    return !!url.match(/^magnet:/);
}

export const getMagnetUrlName = (url) => {
    const match = url.match(/^magnet:(.+)$/);
    const params = new URLSearchParams(match ? match[1] : '');

    return (params.has('dn') ? params.get('dn') : false);
}

export const getTorrentName = (data) => {
    return new Promise((resolve) => {
        let reader = new FileReader();
        reader.onerror = () => resolve(false);
        reader.onload = () => {
            const offset = reader.result.match(/name(\d+):/) || false;
            let text = false;

            if (offset) {
                const index = offset.index + offset[0].length;
                let bytes = 0;
                text = '';

                while (bytes < offset[1]) {
                    let char = reader.result.charAt(index + text.length);

                    text += char;
                    bytes += unescape(encodeURI(char)).length;
                }
            }

            resolve(text);
        };
        reader.readAsText(data);
    });
}

const mergeObjects = (target, source) => {
    const isObject = obj => obj && typeof obj === 'object';

    Object.keys(source).forEach((key) =>
        isObject(target) && target.hasOwnProperty(key) && isObject(target[key]) ?
            mergeObjects(target[key], source[key]) : target[key] = source[key]
    );
}

export const getHostFilter = (hostname) => {
    const url = new URL(hostname);

    return `${url.protocol}//${url.hostname}/*`;
}
