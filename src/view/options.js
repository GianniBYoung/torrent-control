import {
    clientList,
    loadOptions,
    saveOptions,
} from '../util.js';

var options;

const saveButton = document.querySelector('#save-options');
/** @type {HTMLSelectElement} */
const defaultDirectorySelect = document.querySelector('#defaultDirectory');

/**
 * @param {string[]} directories
 */
function refreshDefaultDirectorySelect(directories) {
    const startingValue = defaultDirectorySelect.value;

    for (let i = defaultDirectorySelect.options.length - 1; i >= 1; i--) {
        defaultDirectorySelect.remove(i);
    }

    const cleanDirectories = directories
        .map((directory) => directory.trim())
        .filter((directory) => directory.length > 0);

    for (const directory of cleanDirectories) {
        let element = document.createElement('option');
        element.setAttribute('value', directory);
        element.textContent = directory;
        defaultDirectorySelect.appendChild(element);
    }

    if (cleanDirectories.includes(startingValue)) {
        defaultDirectorySelect.value = startingValue;
    }
}

const persistOptions = () => {
    options.globals.contextMenu = ~~document.querySelector('[name="contextmenu"]:checked').value;
    options.globals.addPaused = document.querySelector('#addpaused').checked;
    options.globals.addAdvanced = document.querySelector('#addadvanced').checked;
    options.globals.enableNotifications = document.querySelector('#enablenotifications').checked;

    const labels = document.querySelector('#labels').value.split(/\n/g) || [];
    options.globals.labels = labels.map((label) => label.trim()).filter((label) => label.length);

    const directories = document.querySelector('#directories').value.split(/\n/g) || [];

    let clientOptions = {};
    Array.from(document.querySelectorAll('*[id^="clientOptions"]')).forEach((element) => {
        if (element.tagName.toLowerCase() === 'select') {
            clientOptions[element.id.match(/\[(.+?)]$/)[1]] = element.value;
        } else {
            clientOptions[element.id.match(/\[(.+?)]$/)[1]] = element.checked;
        }
    });

    let httpAuth = null;
    if (document.querySelector('#httpAuth').checked) {
        httpAuth = {
            username: document.querySelector('#httpAuthUsername').value.trim(),
            password: document.querySelector('#httpAuthPassword').value.trim()
        };
    }

    options.servers[0] = {
        application: document.querySelector('#application').value,
        hostname: document.querySelector('#hostname').value.replace(/\s+/, '').replace(/\/?$/, '/'),
        username: document.querySelector('#username').value,
        password: document.querySelector('#password').value,
        directories: directories.map((directory) => directory.trim()).filter((directory) => directory.length),
        clientOptions: clientOptions,
        httpAuth: httpAuth,
        defaultDirectory: document.querySelector('#defaultDirectory').value || null,
        defaultLabel: null,
    };

    saveOptions(options);

    saveButton.setAttribute('disabled', 'true');
}

const restoreOptions = () => {
    document.querySelectorAll('textarea, input, select:not(#server-list)').forEach((element) => {
        element.addEventListener('input', () => {
            saveButton.removeAttribute('disabled');
        }, { passive: true });
    });

    document.querySelector('#labels').placeholder = 'Label\nAnother label'.replace(/\\n/g, '\n');
    document.querySelector('#directories').placeholder = '/home/user/downloads\n/data/incomplete'.replace(/\\n/g, '\n');

    document.querySelectorAll('[data-i18n]').forEach((element) => {
        element.textContent = chrome.i18n.getMessage(element.getAttribute('data-i18n'));
    });

    loadOptions().then((newOptions) => {
        options = newOptions;

        document.querySelector('[name="contextmenu"][value="' + options.globals.contextMenu + '"]').checked = true;
        document.querySelector('#addpaused').checked = options.globals.addPaused;
        document.querySelector('#addadvanced').checked = options.globals.addAdvanced;
        document.querySelector('#enablenotifications').checked = options.globals.enableNotifications;

        document.querySelector('#labels').value = options.globals.labels.join('\n');

        restoreServer();
    });

    saveButton.setAttribute('disabled', 'true');
}

const restoreServer = () => {
    const server = options.servers[0];
    options.globals.currentServer = 0;
    saveOptions(options);

    refreshDefaultDirectorySelect(server.directories);

    document.querySelector('#application').value = server.application;
    document.querySelector('#hostname').value = server.hostname;
    document.querySelector('#username').value = server.username;
    document.querySelector('#password').value = server.password;
    document.querySelector('#directories').value = server.directories.join('\n');
    document.querySelector('#defaultDirectory').value = server.defaultDirectory || '';

    if (server.httpAuth) {
        document.querySelector('#httpAuth').checked = true;
        document.querySelector('#httpAuthUsername').disabled = false;
        document.querySelector('#httpAuthUsername').value = server.httpAuth.username;
        document.querySelector('#httpAuthPassword').disabled = false;
        document.querySelector('#httpAuthPassword').value = server.httpAuth.password;
    } else {
        document.querySelector('#httpAuth').checked = false;
        document.querySelector('#httpAuthUsername').disabled = true;
        document.querySelector('#httpAuthUsername').value = '';
        document.querySelector('#httpAuthPassword').disabled = true;
        document.querySelector('#httpAuthPassword').value = '';
    }

    document.querySelector('#application').dispatchEvent(new Event('change'));
}

const validateUrl = (str) => {
    try {
        new URL(str);
    } catch (e) {
        return false;
    }
    return true;
}

document.querySelector('#httpAuth').addEventListener('change', (e) => {
    document.querySelector('#httpAuthUsername').disabled = !e.currentTarget.checked;
    document.querySelector('#httpAuthPassword').disabled = !e.currentTarget.checked;
});
document.querySelector('#directories').addEventListener('change', (e) => {
    refreshDefaultDirectorySelect(e.currentTarget.value.split('\n'));
});

document.addEventListener('DOMContentLoaded', restoreOptions);
document.querySelector('#save-options').addEventListener('click', (e) => {
    e.preventDefault();

    const hostname = document.querySelector('#hostname').value.replace(/\s+/, '').replace(/\/?$/, '/');

    if (validateUrl(hostname)) {
        persistOptions();
    } else {
        alert('Server address is invalid');
    }
});
document.querySelector('#application').addEventListener('change', (e) => {
    const client = clientList[0];

    if (client) {
        document.querySelector('#hostname').setAttribute('placeholder', client.addressPlaceholder);

        const currentAddress = document.querySelector('#hostname').value;

        if (currentAddress === '' || (client.addressPlaceholder === currentAddress))
            document.querySelector('#hostname').value = client.addressPlaceholder;

        document.querySelector('[data-panel="directories"]').style.display = 'flex';
        document.querySelector('[data-panel="defaultDirectory"]').style.display = 'flex';

        document.querySelector('[data-panel="labels"]').style.display = 'flex';

        document.querySelector('[data-panel="httpAuth"]').style.display = 'none';

        document.querySelector('#username').removeAttribute('disabled');

        let clientOptionsPanel = document.querySelector('[data-panel="clientOptions"]');
        Array.from(clientOptionsPanel.childNodes).forEach((element) =>
            element.parentNode.removeChild(element));
    }
});
document.querySelector('#hostname').addEventListener('input', (e) => {
    const hostname = e.target.value.replace(/\s+/, '').replace(/\/?$/, '/');

    if (validateUrl(hostname))
        document.querySelector('#hostname').setAttribute('style', '');
    else
        document.querySelector('#hostname').setAttribute('style', 'border-color:red;');
});
