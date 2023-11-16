const i18n = require('i18n');

i18n.configure({
    locales: ['en', 'zh'],
    directory: __dirname + '/locales',
    defaultLocale: 'en',
    objectNotation: true
});

module.exports = i18n;
