const assert = require('node:assert/strict');
const test = require('node:test');
const app = require('../server');
const alternateApp = require('../public/app');
const { db, initDb } = require('../db/sequelize');

const servers = [];
let appUrls;

async function startApp(expressApp) {
    const server = expressApp.listen(0);
    await new Promise((resolve, reject) => {
        server.once('listening', resolve);
        server.once('error', reject);
    });
    servers.push(server);
    return `http://127.0.0.1:${server.address().port}`;
}

test.before(async () => {
    await initDb();
    appUrls = await Promise.all([startApp(app), startApp(alternateApp)]);
});

test.after(async () => {
    await Promise.all(servers.map(server => new Promise((resolve, reject) => {
        server.close(error => error ? reject(error) : resolve());
    })));
    await db.sequelize.close();
});

for (const [name, baseUrl] of [['main', () => appUrls[0]], ['alternate', () => appUrls[1]]]) {
    test(`${name} server renders the homepage`, async () => {
        const response = await fetch(`${baseUrl()}/`);
        assert.equal(response.status, 200);
        assert.match(await response.text(), /Ahoj, já jsem Vývojář!/);
    });

    test(`${name} server renders the about page`, async () => {
        const response = await fetch(`${baseUrl()}/about`);
        assert.equal(response.status, 200);
        assert.match(await response.text(), /O projektu \/ About/);
    });

    test(`${name} server returns 404 for unknown pages`, async () => {
        const response = await fetch(`${baseUrl()}/does-not-exist`);
        assert.equal(response.status, 404);
    });
}

test('comments can be added, displayed, and deleted', async () => {
    const post = await db.Post.create({
        title: `Comment test ${Date.now()}`,
        content: 'Temporary post used by the comment test'
    });
    const commentText = `Saved comment ${Date.now()}`;

    const createResponse = await fetch(`${appUrls[0]}/posts/${post.id}/comments`, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ author: 'Test user', content: commentText })
    });
    assert.equal(createResponse.status, 200);

    const detailResponse = await fetch(`${appUrls[0]}/posts/${post.id}`);
    assert.match(await detailResponse.text(), new RegExp(commentText));

    const comment = await db.Comment.findOne({ where: { postId: post.id } });
    const deleteResponse = await fetch(`${appUrls[0]}/posts/${post.id}/comments/${comment.id}/delete`, {
        method: 'POST',
        redirect: 'manual'
    });
    assert.equal(deleteResponse.status, 302);

    const afterDeleteResponse = await fetch(`${appUrls[0]}/posts/${post.id}`);
    assert.doesNotMatch(await afterDeleteResponse.text(), new RegExp(commentText));
    await post.destroy();
});
