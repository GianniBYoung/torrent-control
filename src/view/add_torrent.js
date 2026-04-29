import {
    clientList,
    loadOptions,
} from '../util.js';

var options;

const restoreOptions = () => {
    const params = new URLSearchParams(window.location.search);
    document.querySelector('#url').value = params.get('url');

    document.querySelectorAll('[data-i18n]').forEach((element) => {
        element.textContent = chrome.i18n.getMessage(element.getAttribute('data-i18n'));
    });

    loadOptions().then((loadedOptions) => {
        options = loadedOptions;

        document.querySelector('#addpaused').checked = options.globals.addPaused;

        options.globals.labels.forEach((label) => {
            let element = document.createElement('option');
            element.setAttribute('value', label);
            element.textContent = label;
            document.querySelector('#labels').appendChild(element);
        });

        selectServer(0);
    });
}

const selectServer = (serverId) => {
    const serverOptions = options.servers[serverId];
    const client = clientList.find((client) => client.id === serverOptions.application);

    const directorySelect = document.querySelector('#directories');

    for (let i = directorySelect.options.length - 1; i >= 1; i--) {
        directorySelect.remove(i);
    }

    if (client.clientCapabilities && client.clientCapabilities.includes('path')) {
        serverOptions.directories.forEach((directory) => {
            let element = document.createElement('option');
            element.setAttribute('value', directory);
            element.textContent = directory;
            directorySelect.appendChild(element);
        });

        directorySelect.disabled = false;

        if (serverOptions.defaultDirectory) {
            directorySelect.value = serverOptions.defaultDirectory;
        }
    } else {
        directorySelect.value = '';
        directorySelect.disabled = true;
    }

    const labelSelect = document.querySelector('#labels');

    if (client.clientCapabilities && client.clientCapabilities.includes('label')) {
        labelSelect.disabled = false;

        if (serverOptions.defaultLabel) {
            if (Array.isArray(serverOptions.defaultLabel)) {
                Array.from(labelSelect.options).forEach((option) => {
                    option.selected = serverOptions.defaultLabel.includes(option.value);
                });
            } else {
                labelSelect.value = serverOptions.defaultLabel;
            }
        }
    } else {
        labelSelect.value = '';
        labelSelect.disabled = true;
    }

    if (!client.clientCapabilities || !client.clientCapabilities.includes('paused'))
        document.querySelector('#addpaused').disabled = true;
}

document.addEventListener('DOMContentLoaded', restoreOptions);
document.querySelector('#add-torrent').addEventListener('click', (e) => {
    e.preventDefault();

    const params = new URLSearchParams(window.location.search);
    const labels = Array.from(document.querySelector('#labels').selectedOptions).map((option) => option.value).filter((v) => v !== '');
    const path = document.querySelector('#directories').value;
    const addPaused = document.querySelector('#addpaused').checked;

    const options = {
        server: 0,
        paused: addPaused,
        label: labels.length > 0 ? labels : null,
        path: path !== '' ? path : null,
    };

    chrome.runtime.sendMessage({
        type: 'addTorrent',
        url: params.get('url'),
        tabId: params.has('tabId') ? parseInt(params.get('tabId'), 10) : null,
        options: options
    });

    window.close();
});
