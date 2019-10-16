// Copyright (c) 2019 by Audere
//
// Use of this source code is governed by an MIT-style license that
// can be found in the LICENSE file distributed with this file.

require('chromedriver');
const assert = require('assert');
const {Builder, Key, By, until} = require('selenium-webdriver');
const email_password = process.env.GMAIL_PASS;

describe('Login to Jasmine', function () {
    let driver;
    beforeAll(async function() {
        driver = await new Builder().forBrowser('chrome').build();
    });

    test('Login with google', async function() {

        await driver.get('https://flows-app-staging.firebaseapp.com/');

        let title = await driver.getTitle();
        assert.equal(title, 'React App'); //someone should make a better title

        await driver.findElement(By.className('firebaseui-idp-google')).click();
        await driver.wait(until.elementLocated(By.id('identifierId')), 10000);
        await driver.findElement(By.id('identifierId')).sendKeys('sam@auderenow.org');
        await driver.findElement(By.id('identifierNext')).click();
        await driver.wait(until.elementLocated(By.name('password')), 10000);
        await driver.sleep(1000); //can't type in the box at first
        await driver.findElement(By.name('password')).sendKeys(email_password);
        await driver.findElement(By.id('passwordNext')).click();
        await driver.sleep(10000); //give time to see the next page load

    }, 20000);

    afterAll(() => driver && driver.quit());
})